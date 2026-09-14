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

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
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

async function requestContent(
  fetchImpl: typeof fetch,
  connection: AiConnectionStatus,
  instruction: string,
  context: unknown,
  requestTimeoutMs: number,
  externalSignal?: AbortSignal,
): Promise<string> {
  let response: Response;
  const timeoutSignal = AbortSignal.timeout(requestTimeoutMs);
  const signal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutSignal])
    : timeoutSignal;
  try {
    response = await fetchImpl(chatCompletionsUrl(connection.endpoint), {
      method: "POST",
      headers: { "content-type": "application/json" },
      redirect: "error",
      signal,
      body: JSON.stringify({
        model: connection.model,
        temperature: 0,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
    });
  } catch (reason) {
    if (externalSignal?.aborted) {
      throw new AiProviderError("AI task cancelled.");
    }
    if (timeoutFailure(reason)) {
      throw new AiProviderError(
        "The AI provider did not finish before AAAAT's 15-minute safety limit. The model may still be healthy; retry the task or inspect the local provider if it remains stuck.",
      );
    }
    throw new AiProviderError(
      "AAAAT could not reach the configured AI provider. Check that the endpoint is running and reachable, then retry.",
    );
  }
  if (!response.ok) {
    throw new AiProviderError(
      `The configured AI provider rejected the request (${response.status}). Check the model name and provider logs, then retry.`,
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AiProviderError("The configured provider returned an unreadable response.");
  }
  const parsed = providerResponseSchema.safeParse(payload);
  const content = parsed.success ? parsed.data.choices[0]?.message.content : undefined;
  if (!content) {
    throw new AiProviderError("The configured provider returned an unreadable response.");
  }
  return content;
}

function parseJson<T>(content: string, schema: z.ZodType<T>, message: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content) as unknown;
  } catch {
    throw new AiProviderError(message);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new AiProviderError(message);
  return result.data;
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
      const content = await requestContent(
        fetchImpl,
        connection,
        "Review one opportunity using only the supplied context. Return JSON only with keys summary, relevantEvidence, uncertainties, questions. Do not rate, score, rank, choose a winner, prescribe next actions, or define a career workflow. Missing candidature information is normal; do not invent facts.",
        context,
        requestTimeoutMs,
      );
      return parseJson(
        content,
        opportunityReviewResultSchema,
        "The configured provider returned an invalid opportunity review.",
      );
    },

    async extractJob(
      connection: AiConnectionStatus,
      request: ProviderJobExtractionRequest,
      signal?: AbortSignal,
    ): Promise<z.input<typeof providerJobExtractionResultSchema>> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Extract only facts supported by the supplied Source. Return JSON only as {\"proposals\":[{\"fieldRef\":\"...\",\"value\":...}],\"newFields\":[{\"label\":\"...\",\"description\":\"...\",\"valueType\":\"text|long_text|number|boolean|date|url|choice\",\"cardinality\":\"one|many\",\"choices\":[\"...\"],\"value\":...}]}. For proposals, use only fieldRef values present in fields, obey each field type and cardinality, use only supplied choiceRef values for existing choice fields, and omit unsupported values. newFields is optional discovery for useful facts that clearly do not fit any supplied field: suggest at most 8 concise reusable candidature information kinds, never duplicate an existing field by meaning or name, use choices only for choice fields, and omit speculative or weakly supported facts. Return an empty array when there are no genuinely useful new fields.",
        request,
        requestTimeoutMs,
        signal,
      );
      return parseJson(
        content,
        providerJobExtractionResultSchema,
        "The configured provider returned invalid candidature field discovery.",
      );
    },

    async recommendVariant(
      connection: AiConnectionStatus,
      context: ProviderVariantRecommendationContext,
    ): Promise<ProviderVariantRecommendationResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Choose exactly one supplied profile variant for the supplied candidature. Return JSON only with keys variantRef and rationale. Never invent a variantRef or propose creating a new variant.",
        context,
        requestTimeoutMs,
      );
      return parseJson(
        content,
        providerVariantRecommendationResultSchema,
        "The configured provider returned an invalid profile variant recommendation.",
      );
    },

    async tailorCv(
      connection: AiConnectionStatus,
      context: ProviderDocumentAiContext,
    ): Promise<ProviderCvTailoringResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Recommend the strongest supplied career items for this candidature. Return JSON only with key recommendations, an array of objects with itemRef and rationale. Use only itemRef values supplied in context. Do not rewrite or invent career facts.",
        context,
        requestTimeoutMs,
      );
      return parseJson(
        content,
        providerCvTailoringResultSchema,
        "The configured provider returned an invalid CV tailoring proposal.",
      );
    },

    async draftCoverLetter(
      connection: AiConnectionStatus,
      context: ProviderDocumentAiContext,
    ): Promise<CoverLetterDraft> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Draft a concise cover letter using only the supplied opportunity and career evidence. Return JSON only with keys recipient, subject, bodyParagraphs, closing. Do not invent career facts or contact details; use empty strings when recipient or closing is unsupported.",
        context,
        requestTimeoutMs,
      );
      return parseJson(
        content,
        coverLetterDraftSchema,
        "The configured provider returned an invalid cover-letter draft.",
      );
    },
  });
}
