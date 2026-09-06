import { z } from "zod";

import {
  coverLetterDraftSchema,
  fitAssessmentResultSchema,
  type AiConnectionStatus,
  type CoverLetterDraft,
  type FitAssessmentResult,
  type ProviderCvTailoringResult,
  type ProviderDocumentAiContext,
  type ProviderFitProjectedContext,
  type ProviderJobExtractionRequest,
  type ProviderJobExtractionResult,
  type ProviderVariantRecommendationContext,
  type ProviderVariantRecommendationResult,
  providerCvTailoringResultSchema,
  providerJobExtractionResultSchema,
  providerVariantRecommendationResultSchema,
} from "../shared/ai-contracts";
import {
  providerCandidatureComparisonResultSchema,
  type ProviderCandidatureComparisonContext,
  type ProviderCandidatureComparisonResult,
} from "../shared/candidature-comparison-contracts";

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

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

export interface ModelProvider {
  assessFit(
    connection: AiConnectionStatus,
    context: ProviderFitProjectedContext,
  ): Promise<FitAssessmentResult>;
  extractJob(
    connection: AiConnectionStatus,
    request: ProviderJobExtractionRequest,
  ): Promise<ProviderJobExtractionResult>;
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
  compareCandidatures(
    connection: AiConnectionStatus,
    context: ProviderCandidatureComparisonContext,
  ): Promise<ProviderCandidatureComparisonResult>;
}

function chatCompletionsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/chat/completions`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

async function requestContent(
  fetchImpl: typeof fetch,
  connection: AiConnectionStatus,
  instruction: string,
  context: unknown,
): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(chatCompletionsUrl(connection.endpoint), {
      method: "POST",
      headers: { "content-type": "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        model: connection.model,
        temperature: 0,
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: JSON.stringify(context) },
        ],
      }),
    });
  } catch {
    throw new AiProviderError("AAAAT could not reach the configured local model provider.");
  }
  if (!response.ok) {
    throw new AiProviderError("The configured local model provider rejected the request.");
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
): ModelProvider {
  return Object.freeze({
    async assessFit(
      connection: AiConnectionStatus,
      context: ProviderFitProjectedContext,
    ): Promise<FitAssessmentResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Assess opportunity fit using only the supplied context. Return JSON only with keys fit, summary, strengths, gaps, focus. fit must be weak, possible, or strong. Missing candidature information is normal; do not invent facts.",
        context,
      );
      return parseJson(
        content,
        fitAssessmentResultSchema,
        "The configured provider returned an invalid fit assessment.",
      );
    },

    async extractJob(
      connection: AiConnectionStatus,
      request: ProviderJobExtractionRequest,
    ): Promise<ProviderJobExtractionResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Discover only facts supported by the supplied Source for the explicitly requested fields. Return JSON only as {\"proposals\":[{\"fieldRef\":\"...\",\"value\":...}]}. Use only fieldRef values present in fields, obey each field type and cardinality, use only supplied choiceRef values for choice fields, omit unsupported values, and never propose or create new field definitions.",
        request,
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
      );
      return parseJson(
        content,
        coverLetterDraftSchema,
        "The configured provider returned an invalid cover-letter draft.",
      );
    },

    async compareCandidatures(
      connection: AiConnectionStatus,
      context: ProviderCandidatureComparisonContext,
    ): Promise<ProviderCandidatureComparisonResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Compare only the supplied candidatures without ranking, scoring, choosing a winner, or recommending which opportunity the user should choose. Missing information is normal. Return JSON only with keys analyses and considerations. analyses must contain exactly one object per supplied candidatureRef with keys candidatureRef, strengths, concerns, questions. Use only supplied candidatureRef values and only the supplied information.",
        context,
      );
      return parseJson(
        content,
        providerCandidatureComparisonResultSchema,
        "The configured provider returned an invalid candidature comparison.",
      );
    },
  });
}
