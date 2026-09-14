import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  coverLetterDraftSchema,
  opportunityReviewResultSchema,
  type AiConnectionStatus,
  type CoverLetterDraft,
  type OpportunityReviewResult,
  type ProviderCvTailoringResult,
  type ProviderDocumentAiContext,
  type ProviderOpportunityReviewContext,
  type ProviderJobExtractionRequest,
  type ProviderVariantRecommendationContext,
  type ProviderVariantRecommendationResult,
  providerCvTailoringResultSchema,
  providerJobExtractionResultSchema,
  providerVariantRecommendationResultSchema,
} from "../shared/ai-contracts";
import {
  aiOperationLabels,
  type AiOperation,
} from "../shared/ai-connection-contracts";
import {
  AI_EXCHANGE_DIAGNOSTIC_MARKER,
  aiExchangeDiagnosticSchema,
  type AiExchangeDiagnostic,
  type AiExchangeFailureKind,
  type AiStructuredOutputMode,
} from "../shared/ai-diagnostics";

const providerResponseSchema = z
  .object({
    choices: z
      .array(
        z
          .object({
            message: z.object({ content: z.string().min(1) }).passthrough(),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

export const AI_PROVIDER_SAFETY_CEILING_MS = 15 * 60 * 1000;

function diagnosticSuffix(diagnostic: AiExchangeDiagnostic): string {
  return `${AI_EXCHANGE_DIAGNOSTIC_MARKER}${Buffer.from(
    JSON.stringify(aiExchangeDiagnosticSchema.parse(diagnostic)),
    "utf8",
  ).toString("base64url")}`;
}

export class AiProviderError extends Error {
  readonly diagnostic?: AiExchangeDiagnostic;

  constructor(message: string, diagnostic?: AiExchangeDiagnostic) {
    super(diagnostic ? `${message}\n${diagnosticSuffix(diagnostic)}` : message);
    this.name = "AiProviderError";
    this.diagnostic = diagnostic;
  }
}

export interface ModelProvider {
  reviewOpportunity(
    connection: AiConnectionStatus,
    context: ProviderOpportunityReviewContext,
  ): Promise<OpportunityReviewResult>;
  extractJob(
    connection: AiConnectionStatus,
    request: ProviderJobExtractionRequest,
    signal?: AbortSignal,
  ): Promise<z.input<typeof providerJobExtractionResultSchema>>;
  recommendVariant(
    connection: AiConnectionStatus,
    context: ProviderVariantRecommendationContext,
  ): Promise<ProviderVariantRecommendationResult>;
  tailorCv(
    connection: AiConnectionStatus,
    context: ProviderDocumentAiContext,
  ): Promise<ProviderCvTailoringResult>;
  draftCoverLetter(
    connection: AiConnectionStatus,
    context: ProviderDocumentAiContext,
  ): Promise<CoverLetterDraft>;
}

function chatCompletionsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/chat/completions`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function timeoutFailure(reason: unknown): boolean {
  return reason instanceof DOMException && (reason.name === "TimeoutError" || reason.name === "AbortError");
}

function endpointForDiagnostic(endpoint: string): string {
  const url = new URL(endpoint);
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function diagnostic(
  connection: AiConnectionStatus,
  operation: AiOperation,
  instruction: string,
  userPayload: string,
  rawModelResponse: string,
  validationError: string,
  failureKind: AiExchangeFailureKind,
  structuredOutputMode: AiStructuredOutputMode,
): AiExchangeDiagnostic {
  return aiExchangeDiagnosticSchema.parse({
    id: randomUUID(),
    operation,
    endpoint: endpointForDiagnostic(connection.endpoint),
    model: connection.model,
    systemInstruction: instruction,
    userPayload,
    rawModelResponse,
    validationError,
    failureKind,
    structuredOutputMode,
  });
}

interface ProviderContent {
  readonly content: string;
  readonly structuredOutputMode: AiStructuredOutputMode;
}

function requestBody<T>(
  connection: AiConnectionStatus,
  operation: AiOperation,
  instruction: string,
  userPayload: string,
  schema: z.ZodType<T>,
  structured: boolean,
): Record<string, unknown> {
  return {
    model: connection.model,
    temperature: 0,
    reasoning_effort: "none",
    chat_template_kwargs: { enable_thinking: false },
    ...(structured
      ? {
          response_format: {
            type: "json_schema",
            json_schema: {
              name: `aaaat_${operation}`,
              strict: true,
              schema: z.toJSONSchema(schema),
            },
          },
        }
      : {}),
    messages: [
      { role: "system", content: instruction },
      { role: "user", content: userPayload },
    ],
  };
}

function mayRejectStructuredOutput(status: number): boolean {
  return status === 400 || status === 404 || status === 415 || status === 422;
}

async function requestContent<T>(
  fetchImpl: typeof fetch,
  connection: AiConnectionStatus,
  operation: AiOperation,
  instruction: string,
  context: unknown,
  schema: z.ZodType<T>,
  requestTimeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<ProviderContent> {
  const userPayload = JSON.stringify(context);
  const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutSignal])
    : timeoutSignal;

  const attempt = async (structured: boolean): Promise<{ response: Response; raw: string }> => {
    let response: Response;
    try {
      response = await fetchImpl(chatCompletionsUrl(connection.endpoint), {
        method: "POST",
        headers: { "content-type": "application/json" },
        redirect: "error",
        signal,
        body: JSON.stringify(
          requestBody(connection, operation, instruction, userPayload, schema, structured),
        ),
      });
    } catch (reason) {
      if (externalSignal?.aborted) {
        throw new AiProviderError("AI task cancelled.");
      }
      if (timeoutFailure(reason)) {
        throw new AiProviderError(
          "The AI provider did not finish before AAAAT's 15-minute safety limit. The model may still be healthy; retry the task or inspect the local provider if it remains stuck.",
          diagnostic(
            connection,
            operation,
            instruction,
            userPayload,
            "",
            "The request exceeded AAAAT's provider safety timeout.",
            "connection_unreachable",
            structured ? "json_schema" : "plain_json_fallback",
          ),
        );
      }
      throw new AiProviderError(
        "AAAAT could not reach the configured AI provider. Check that the endpoint is running and reachable, then retry.",
        diagnostic(
          connection,
          operation,
          instruction,
          userPayload,
          "",
          reason instanceof Error ? reason.message : "Network request failed before an HTTP response was received.",
          "connection_unreachable",
          structured ? "json_schema" : "plain_json_fallback",
        ),
      );
    }

    let raw: string;
    try {
      raw = await response.text();
    } catch (reason) {
      throw new AiProviderError(
        "The configured provider returned an unreadable response envelope.",
        diagnostic(
          connection,
          operation,
          instruction,
          userPayload,
          "",
          reason instanceof Error ? reason.message : "The provider response body could not be read.",
          "provider_envelope_invalid",
          structured ? "json_schema" : "plain_json_fallback",
        ),
      );
    }
    return { response, raw };
  };

  let mode: AiStructuredOutputMode = "json_schema";
  let current = await attempt(true);
  if (!current.response.ok && mayRejectStructuredOutput(current.response.status)) {
    mode = "plain_json_fallback";
    current = await attempt(false);
  }

  if (!current.response.ok) {
    throw new AiProviderError(
      `The configured AI provider returned HTTP ${current.response.status}. The endpoint is reachable, but the request was rejected.`,
      diagnostic(
        connection,
        operation,
        instruction,
        userPayload,
        current.raw,
        `HTTP ${current.response.status} ${current.response.statusText}`.trim(),
        "provider_http_failure",
        mode,
      ),
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(current.raw) as unknown;
  } catch (reason) {
    throw new AiProviderError(
      "The configured provider returned a malformed OpenAI-compatible response envelope.",
      diagnostic(
        connection,
        operation,
        instruction,
        userPayload,
        current.raw,
        reason instanceof Error ? reason.message : "The provider envelope was not valid JSON.",
        "provider_envelope_invalid",
        mode,
      ),
    );
  }

  const parsed = providerResponseSchema.safeParse(payload);
  const content = parsed.success ? parsed.data.choices[0]?.message.content : undefined;
  if (!content) {
    throw new AiProviderError(
      "The configured provider returned a malformed OpenAI-compatible response envelope.",
      diagnostic(
        connection,
        operation,
        instruction,
        userPayload,
        current.raw,
        parsed.success
          ? "The provider response did not contain choices[0].message.content."
          : z.prettifyError(parsed.error),
        "provider_envelope_invalid",
        mode,
      ),
    );
  }
  return { content, structuredOutputMode: mode };
}

function parseJson<T>(
  connection: AiConnectionStatus,
  operation: AiOperation,
  instruction: string,
  context: unknown,
  response: ProviderContent,
  schema: z.ZodType<T>,
): T {
  const userPayload = JSON.stringify(context);
  let parsed: unknown;
  try {
    parsed = JSON.parse(response.content) as unknown;
  } catch (reason) {
    throw new AiProviderError(
      `The model response was not valid JSON for ${aiOperationLabels[operation]}.`,
      diagnostic(
        connection,
        operation,
        instruction,
        userPayload,
        response.content,
        reason instanceof Error ? reason.message : "The model response was not valid JSON.",
        "model_response_invalid_json",
        response.structuredOutputMode,
      ),
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AiProviderError(
      `The model response did not satisfy the AAAAT ${aiOperationLabels[operation]} contract.`,
      diagnostic(
        connection,
        operation,
        instruction,
        userPayload,
        response.content,
        z.prettifyError(result.error),
        "operation_contract_invalid",
        response.structuredOutputMode,
      ),
    );
  }
  return result.data;
}

async function runStructuredOperation<T>(
  fetchImpl: typeof fetch,
  connection: AiConnectionStatus,
  operation: AiOperation,
  instruction: string,
  context: unknown,
  schema: z.ZodType<T>,
  requestTimeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<T> {
  const response = await requestContent(
    fetchImpl,
    connection,
    operation,
    instruction,
    context,
    schema,
    requestTimeoutMs,
    externalSignal,
  );
  return parseJson(connection, operation, instruction, context, response, schema);
}

export function createOpenAiCompatibleProvider(
  fetchImpl: typeof fetch = fetch,
  requestTimeoutMs: number = AI_PROVIDER_SAFETY_CEILING_MS,
): ModelProvider {
  return Object.freeze({
    async reviewOpportunity(
      connection: AiConnectionStatus,
      context: ProviderOpportunityReviewContext,
    ): Promise<OpportunityReviewResult> {
      return runStructuredOperation(
        fetchImpl,
        connection,
        "opportunity_review",
        "Review one opportunity using only the supplied context. Return only the final JSON object with keys summary, relevantEvidence, uncertainties, questions. Do not expose chain-of-thought or reasoning. Do not rate, score, rank, choose a winner, prescribe next actions, or define a career workflow. Missing candidature information is normal; do not invent facts.",
        context,
        opportunityReviewResultSchema,
        requestTimeoutMs,
      );
    },

    async extractJob(
      connection: AiConnectionStatus,
      request: ProviderJobExtractionRequest,
      signal?: AbortSignal,
    ): Promise<z.input<typeof providerJobExtractionResultSchema>> {
      return runStructuredOperation(
        fetchImpl,
        connection,
        "job_extraction",
        "Extract only facts supported by the supplied Source. Return only the final JSON object as {\"proposals\":[{\"fieldRef\":\"...\",\"value\":...}],\"newFields\":[{\"label\":\"...\",\"description\":\"...\",\"valueType\":\"text|long_text|number|boolean|date|url|choice\",\"cardinality\":\"one|many\",\"choices\":[\"...\"],\"value\":...}]}. Do not expose chain-of-thought or reasoning. For proposals, use only fieldRef values present in fields, obey each field type and cardinality, use only supplied choiceRef values for existing choice fields, and omit unsupported values. newFields is optional discovery for useful facts that clearly do not fit any supplied field: suggest at most 8 concise reusable candidature information kinds, never duplicate an existing field by meaning or name, use choices only for choice fields, and omit speculative or weakly supported facts. Return an empty array when there are no genuinely useful new fields.",
        request,
        providerJobExtractionResultSchema,
        requestTimeoutMs,
        signal,
      );
    },

    async recommendVariant(
      connection: AiConnectionStatus,
      context: ProviderVariantRecommendationContext,
    ): Promise<ProviderVariantRecommendationResult> {
      return runStructuredOperation(
        fetchImpl,
        connection,
        "variant_recommendation",
        "Choose exactly one supplied profile variant for the supplied candidature. Return only the final JSON object with keys variantRef and rationale. Do not expose chain-of-thought or reasoning. Never invent a variantRef or propose creating a new variant.",
        context,
        providerVariantRecommendationResultSchema,
        requestTimeoutMs,
      );
    },

    async tailorCv(
      connection: AiConnectionStatus,
      context: ProviderDocumentAiContext,
    ): Promise<ProviderCvTailoringResult> {
      return runStructuredOperation(
        fetchImpl,
        connection,
        "cv_tailoring",
        "Recommend the strongest supplied career items for this candidature. Return only the final JSON object with key recommendations, an array of objects with itemRef and rationale. Do not expose chain-of-thought or reasoning. Use only itemRef values supplied in context. Do not rewrite or invent career facts.",
        context,
        providerCvTailoringResultSchema,
        requestTimeoutMs,
      );
    },

    async draftCoverLetter(
      connection: AiConnectionStatus,
      context: ProviderDocumentAiContext,
    ): Promise<CoverLetterDraft> {
      return runStructuredOperation(
        fetchImpl,
        connection,
        "cover_letter_draft",
        "Draft a concise cover letter using only the supplied opportunity and career evidence. Return only the final JSON object with keys recipient, subject, bodyParagraphs, closing. Do not expose chain-of-thought or reasoning. Do not invent career facts or contact details; use empty strings when recipient or closing is unsupported.",
        context,
        coverLetterDraftSchema,
        requestTimeoutMs,
      );
    },
  });
}
