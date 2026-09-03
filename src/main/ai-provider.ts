import { z } from "zod";

import {
  fitAssessmentResultSchema,
  jobExtractionResultSchema,
  type AiConnectionStatus,
  type FitAssessmentResult,
  type FitProjectedContext,
  type JobExtractionRequest,
  type JobExtractionResult,
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
  });
}
