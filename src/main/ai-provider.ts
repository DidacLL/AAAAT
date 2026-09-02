import { z } from "zod";

import {
  fitAssessmentResultSchema,
  type AiConnectionStatus,
  type FitAssessmentResult,
  type FitProjectedContext,
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

export interface FitModelProvider {
  assessFit(
    connection: AiConnectionStatus,
    credential: string | null,
    context: FitProjectedContext,
  ): Promise<FitAssessmentResult>;
}

function chatCompletionsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/chat/completions`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function parseProviderResult(content: string): FitAssessmentResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new AiProviderError("The configured provider returned an invalid fit assessment.");
  }
  const result = fitAssessmentResultSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiProviderError("The configured provider returned an invalid fit assessment.");
  }
  return result.data;
}

export function createOpenAiCompatibleProvider(
  fetchImpl: typeof fetch = fetch,
): FitModelProvider {
  return Object.freeze({
    async assessFit(connection, credential, context) {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      if (credential) {
        headers.authorization = `Bearer ${credential}`;
      }

      let response: Response;
      try {
        response = await fetchImpl(chatCompletionsUrl(connection.endpoint), {
          method: "POST",
          headers,
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            model: connection.model,
            temperature: 0,
            messages: [
              {
                role: "system",
                content:
                  "Assess job fit using only the supplied context. Return JSON only with keys fit, summary, strengths, gaps, focus. fit must be weak, possible, or strong. Do not invent facts that are absent from the context.",
              },
              {
                role: "user",
                content: JSON.stringify(context),
              },
            ],
          }),
        });
      } catch {
        throw new AiProviderError("AAAAT could not reach the configured model provider.");
      }

      if (!response.ok) {
        throw new AiProviderError("The configured model provider rejected the request.");
      }

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new AiProviderError("The configured provider returned an unreadable response.");
      }
      const parsed = providerResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new AiProviderError("The configured provider returned an unreadable response.");
      }
      const content = parsed.data.choices[0]?.message.content;
      if (!content) {
        throw new AiProviderError("The configured provider returned an empty response.");
      }
      return parseProviderResult(content);
    },
  });
}
