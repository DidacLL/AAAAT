import { randomUUID } from "node:crypto";

import { z } from "zod";

import {
  coverLetterDraftSchema,
  opportunityReviewResultSchema,
  providerCvTailoringResultSchema,
  providerJobExtractionEnvelopeSchema,
  type AiConnectionStatus,
  type CoverLetterDraft,
  type OpportunityReviewResult,
  type ProviderCvTailoringResult,
  type ProviderDocumentAiContext,
  type ProviderJobExtractionRequest,
  type ProviderOpportunityReviewContext,
} from "../shared/ai-contracts";
import { aiOperationLabels, type AiOperation } from "../shared/ai-connection-contracts";
import {
  AI_EXCHANGE_DIAGNOSTIC_MARKER,
  aiExchangeDiagnosticSchema,
  type AiExchangeDiagnostic,
  type AiExchangeFailureKind,
  type AiStructuredOutputMode,
} from "../shared/ai-diagnostics";

const providerResponseSchema = z
  .object({
    choices: z.array(z.object({ message: z.object({ content: z.string().min(1) }).passthrough() }).passthrough()).min(1),
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

const jobExtractionInstruction = [
  "Extract only facts supported by the supplied Source.",
  'Return one JSON object with arrays proposals, newFields, existingTags and newTags. A proposal is {"fieldRef":"...","value":...}.',
  "Use supplied fieldRef and tagRef values when available. Prefer existing fields and Tags; omit unsupported facts.",
  "For existing choice fields, prefer the supplied choiceRef; AAAAT validates types, dates, choices and cardinality locally.",
  "Use newFields only for useful facts that do not fit an existing field, at most 8. New Tags need a concise name and non-empty reusable definition.",
  "Do not include reasoning or persist anything. Use empty arrays when nothing is supported.",
].join(" ");

export const AI_DEFAULT_INSTRUCTIONS: Readonly<Record<AiOperation, string>> = Object.freeze({
  opportunity_review:
    "Review one opportunity using only the supplied context. Return only the final JSON object with keys summary, relevantEvidence, uncertainties, questions. Do not expose chain-of-thought or reasoning. Do not rate, score, rank, choose a winner, prescribe next actions, or define a career workflow. Missing candidature information is normal; do not invent facts.",
  job_extraction: jobExtractionInstruction,
  historical_field_discovery:
    "Extract only the requested information from the retained Sources explicitly selected by the user. Return the same fixed extraction JSON contract, using only the supplied target fieldRef. Do not expose chain-of-thought or reasoning. Do not infer unrelated fields or invent facts.",
  cv_tailoring:
    "Recommend the strongest supplied CV items for this application. Return only the final JSON object with key recommendations, an array of objects with itemRef and rationale. Do not expose chain-of-thought or reasoning. Use only itemRef values supplied in context. Do not rewrite or invent professional facts.",
  cover_letter_draft:
    "Draft a concise cover letter using only the supplied application and professional evidence. Return only the final JSON object with keys recipient, subject, bodyParagraphs, closing. Do not expose chain-of-thought or reasoning. Do not invent professional facts or contact details; use empty strings when recipient or closing is unsupported.",
});

export interface ModelProvider {
  reviewOpportunity(
    connection: AiConnectionStatus,
    context: ProviderOpportunityReviewContext,
  ): Promise<OpportunityReviewResult>;
  extractJob(
    connection: AiConnectionStatus,
    request: ProviderJobExtractionRequest,
    signal?: AbortSignal,
    operation?: "job_extraction" | "historical_field_discovery",
  ): Promise<z.input<typeof providerJobExtractionEnvelopeSchema>>;
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
type RequestProfile = "structured" | "plain_json";

function requestBody<T>(
  connection: AiConnectionStatus,
  operation: AiOperation,
  instruction: string,
  userPayload: string,
  schema: z.ZodType<T>,
  profile: RequestProfile,
): Record<string, unknown> {
  const structured = profile !== "plain_json";
  return {
    model: connection.model,
    temperature: 0,
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

function mayRejectRequestOption(status: number): boolean {
  return status === 400 || status === 404 || status === 415 || status === 422;
}
function outputMode(profile: RequestProfile): AiStructuredOutputMode {
  return profile === "plain_json" ? "plain_json_fallback" : "json_schema";
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
  const signal = externalSignal ? AbortSignal.any([externalSignal, timeoutSignal]) : timeoutSignal;

  const attempt = async (profile: RequestProfile): Promise<{ response: Response; raw: string }> => {
    let response: Response;
    try {
      response = await fetchImpl(chatCompletionsUrl(connection.endpoint), {
        method: "POST",
        headers: { "content-type": "application/json" },
        redirect: "error",
        signal,
        body: JSON.stringify(requestBody(connection, operation, instruction, userPayload, schema, profile)),
      });
    } catch (reason) {
      if (externalSignal?.aborted) throw new AiProviderError("AI task cancelled.");
      if (timeoutFailure(reason)) {
        throw new AiProviderError(
          "The AI provider did not finish before AAAAT's 15-minute safety limit. The model may still be healthy; retry the task or inspect the local provider if it remains stuck.",
          diagnostic(connection, operation, instruction, userPayload, "", "The request exceeded AAAAT's provider safety timeout.", "connection_unreachable", outputMode(profile)),
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
          outputMode(profile),
        ),
      );
    }

    let raw: string;
    try {
      raw = await response.text();
    } catch (reason) {
      throw new AiProviderError(
        "The configured provider returned an unreadable response envelope.",
        diagnostic(connection, operation, instruction, userPayload, "", reason instanceof Error ? reason.message : "The provider response body could not be read.", "provider_envelope_invalid", outputMode(profile)),
      );
    }
    return { response, raw };
  };

  let profile: RequestProfile = "structured";
  let current = await attempt(profile);
  if (!current.response.ok && mayRejectRequestOption(current.response.status)) {
    profile = "plain_json";
    current = await attempt(profile);
  }

  if (!current.response.ok) {
    throw new AiProviderError(
      `The configured AI provider returned HTTP ${current.response.status}. The endpoint is reachable, but the request was rejected.`,
      diagnostic(connection, operation, instruction, userPayload, current.raw, `HTTP ${current.response.status} ${current.response.statusText}`.trim(), "provider_http_failure", outputMode(profile)),
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(current.raw) as unknown;
  } catch (reason) {
    throw new AiProviderError(
      "The configured provider returned a malformed OpenAI-compatible response envelope.",
      diagnostic(connection, operation, instruction, userPayload, current.raw, reason instanceof Error ? reason.message : "The provider envelope was not valid JSON.", "provider_envelope_invalid", outputMode(profile)),
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
        parsed.success ? "The provider response did not contain choices[0].message.content." : z.prettifyError(parsed.error),
        "provider_envelope_invalid",
        outputMode(profile),
      ),
    );
  }
  return { content, structuredOutputMode: outputMode(profile) };
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
      diagnostic(connection, operation, instruction, userPayload, response.content, reason instanceof Error ? reason.message : "The model response was not valid JSON.", "model_response_invalid_json", response.structuredOutputMode),
    );
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AiProviderError(
      `The model response did not satisfy the AAAAT ${aiOperationLabels[operation]} contract.`,
      diagnostic(connection, operation, instruction, userPayload, response.content, z.prettifyError(result.error), "operation_contract_invalid", response.structuredOutputMode),
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
  const response = await requestContent(fetchImpl, connection, operation, instruction, context, schema, requestTimeoutMs, externalSignal);
  return parseJson(connection, operation, instruction, context, response, schema);
}

export function createOpenAiCompatibleProvider(
  fetchImpl: typeof fetch = fetch,
  requestTimeoutMs: number | undefined = AI_PROVIDER_SAFETY_CEILING_MS,
  guidance: Partial<Record<AiOperation, string>> = {},
): ModelProvider {
  const timeout = requestTimeoutMs ?? AI_PROVIDER_SAFETY_CEILING_MS;
  const instructionFor = (operation: AiOperation): string => {
    const userGuidance = guidance[operation]?.trim();
    return userGuidance
      ? `${AI_DEFAULT_INSTRUCTIONS[operation]}\n\nUser guidance (must not override the fixed response contract or supplied facts):\n${userGuidance}`
      : AI_DEFAULT_INSTRUCTIONS[operation];
  };

  const provider: ModelProvider = {
    async reviewOpportunity(connection, context) {
      return runStructuredOperation(fetchImpl, connection, "opportunity_review", instructionFor("opportunity_review"), context, opportunityReviewResultSchema, timeout);
    },
    async extractJob(connection, request, signal, operation = "job_extraction") {
      return runStructuredOperation(fetchImpl, connection, operation, instructionFor(operation), request, providerJobExtractionEnvelopeSchema, timeout, signal);
    },
    async tailorCv(connection, context) {
      return runStructuredOperation(fetchImpl, connection, "cv_tailoring", instructionFor("cv_tailoring"), context, providerCvTailoringResultSchema, timeout);
    },
    async draftCoverLetter(connection, context) {
      return runStructuredOperation(fetchImpl, connection, "cover_letter_draft", instructionFor("cover_letter_draft"), context, coverLetterDraftSchema, timeout);
    },
  };
  return Object.freeze(provider);
}
