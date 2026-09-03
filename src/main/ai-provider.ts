import { z } from "zod";

import {
  coverLetterDraftSchema,
  cvTailoringResultSchema,
  fitAssessmentResultSchema,
  jobExtractionResultSchema,
  variantRecommendationResultSchema,
  type AiConnectionStatus,
  type CoverLetterDraft,
  type CvTailoringResult,
  type DocumentAiContext,
  type FitAssessmentResult,
  type FitProjectedContext,
  type JobExtractionRequest,
  type JobExtractionResult,
  type VariantRecommendationContext,
  type VariantRecommendationResult,
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

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

export interface ModelProvider {
  assessFit(
    connection: AiConnectionStatus,
    context: FitProjectedContext,
  ): Promise<FitAssessmentResult>;
  extractJob(
    connection: AiConnectionStatus,
    request: JobExtractionRequest,
  ): Promise<JobExtractionResult>;
  recommendVariant(
    connection: AiConnectionStatus,
    context: VariantRecommendationContext,
  ): Promise<VariantRecommendationResult>;
  tailorCv(
    connection: AiConnectionStatus,
    context: DocumentAiContext,
  ): Promise<CvTailoringResult>;
  draftCoverLetter(
    connection: AiConnectionStatus,
    context: DocumentAiContext,
  ): Promise<CoverLetterDraft>;
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
      signal: AbortSignal.timeout(30_000),
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
    parsed = JSON.parse(content);
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
      context: FitProjectedContext,
    ): Promise<FitAssessmentResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Assess job fit using only the supplied context. Return JSON only with keys fit, summary, strengths, gaps, focus. fit must be weak, possible, or strong. Do not invent facts that are absent from the context.",
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
      request: JobExtractionRequest,
    ): Promise<JobExtractionResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Extract only facts supported by the supplied job source. Return JSON only with keys company, role, location, workMode, salaryText. Use an empty string when a value is not supported. Do not infer lifecycle status, dates, next actions, or personal career data.",
        request,
      );
      return parseJson(
        content,
        jobExtractionResultSchema,
        "The configured provider returned an invalid job extraction.",
      );
    },

    async recommendVariant(
      connection: AiConnectionStatus,
      context: VariantRecommendationContext,
    ): Promise<VariantRecommendationResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Choose exactly one existing profile variant from the supplied variants for the supplied candidature. Return JSON only with keys variantId and rationale. Never invent a variant ID or propose creating a new variant.",
        context,
      );
      return parseJson(
        content,
        variantRecommendationResultSchema,
        "The configured provider returned an invalid profile variant recommendation.",
      );
    },

    async tailorCv(
      connection: AiConnectionStatus,
      context: DocumentAiContext,
    ): Promise<CvTailoringResult> {
      const content = await requestContent(
        fetchImpl,
        connection,
        "Recommend the strongest existing career items for this candidature. Return JSON only with key recommendations, an array of objects with itemId and rationale. Use only item IDs supplied in context. Do not rewrite or invent career facts.",
        context,
      );
      return parseJson(
        content,
        cvTailoringResultSchema,
        "The configured provider returned an invalid CV tailoring proposal.",
      );
    },

    async draftCoverLetter(
      connection: AiConnectionStatus,
      context: DocumentAiContext,
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
  });
}
