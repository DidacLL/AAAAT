import {
  coverLetterDraftSchema,
  opportunityReviewResultSchema,
  providerCvTailoringResultSchema,
  providerDocumentAiContextSchema,
  providerJobExtractionRequestSchema,
  providerJobExtractionEnvelopeSchema,
  providerOpportunityReviewContextSchema,
  type AiConnectionStatus,
} from "../shared/ai-contracts";
import type { AiOperation } from "../shared/ai-connection-contracts";
import { aiExchangeDiagnosticSchema } from "../shared/ai-diagnostics";
import { AiProviderError, type ModelProvider } from "./ai-provider";

const fieldRef = "aaaat_validation_field";
const itemRef = "aaaat_validation_item";
const candidature = { label: "Validation opportunity", information: [], sources: [] };

async function validateExtraction(
  connection: AiConnectionStatus,
  provider: ModelProvider,
): Promise<void> {
  const request = providerJobExtractionRequestSchema.parse({
    sourceText: "Validation source: the role title is Validation Engineer.",
    sourceTitle: "AAAAT capability validation",
    sourceUrl: "",
    fields: [
      {
        fieldRef,
        label: "Role",
        description: "Role title used only to validate this configured AI operation.",
        valueType: "text",
        cardinality: "one",
        choices: [],
      },
    ],
    tags: [],
  });
  const result = providerJobExtractionEnvelopeSchema.parse(await provider.extractJob(connection, request));
  for (const proposal of result.proposals) {
    if (!proposal || typeof proposal !== "object") continue;
    const candidate = proposal as { fieldRef?: unknown };
    if (typeof candidate.fieldRef === "string" && candidate.fieldRef !== fieldRef) {
      throw new Error("The configured provider returned an out-of-scope validation field reference.");
    }
  }
}

async function runValidation(check: () => Promise<void>): Promise<void> {
  try {
    await check();
  } catch (reason) {
    if (
      reason instanceof AiProviderError &&
      reason.diagnostic &&
      (reason.diagnostic.failureKind === "model_response_invalid_json" ||
        reason.diagnostic.failureKind === "operation_contract_invalid")
    ) {
      throw new AiProviderError(
        "The endpoint is reachable, but this model is incompatible with this AAAAT operation. Inspect the AI exchange for the exact response and validation error.",
        aiExchangeDiagnosticSchema.parse({
          ...reason.diagnostic,
          failureKind: "operation_incompatible",
          validationError: `Capability validation failed: ${reason.diagnostic.validationError}`,
        }),
      );
    }
    throw reason;
  }
}

export async function validateAiOperation(
  connection: AiConnectionStatus,
  operation: AiOperation,
  provider: ModelProvider,
): Promise<void> {
  await runValidation(async () => {
    switch (operation) {
      case "opportunity_review": {
        const context = providerOpportunityReviewContextSchema.parse({ candidature, profileItems: [] });
        opportunityReviewResultSchema.parse(await provider.reviewOpportunity(connection, context));
        return;
      }
      case "job_extraction":
      case "historical_field_discovery":
        await validateExtraction(connection, provider);
        return;
      case "cv_tailoring": {
        const context = providerDocumentAiContextSchema.parse({
          candidature,
          items: [
            {
              itemRef,
              kind: "experience",
              title: "Validation experience",
              description: "Synthetic evidence used only for capability validation.",
            },
          ],
        });
        const result = providerCvTailoringResultSchema.parse(await provider.tailorCv(connection, context));
        if (result.recommendations.some((recommendation) => recommendation.itemRef !== itemRef)) {
          throw new Error("The configured provider returned an out-of-scope validation item reference.");
        }
        return;
      }
      case "cover_letter_draft": {
        const context = providerDocumentAiContextSchema.parse({
          candidature,
          items: [
            {
              itemRef,
              kind: "experience",
              title: "Validation experience",
              description: "Synthetic evidence used only for capability validation.",
            },
          ],
        });
        coverLetterDraftSchema.parse(await provider.draftCoverLetter(connection, context));
        return;
      }
    }
  });
}
