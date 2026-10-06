import {
  coverLetterDraftSchema,
  opportunityReviewResultSchema,
  providerCvWritingContextSchema,
  providerDocumentAiContextSchema,
  providerJobExtractionRequestSchema,
  providerJobExtractionEnvelopeSchema,
  providerOpportunityReviewContextSchema,
  providerTagInferenceEnvelopeSchema,
  providerTagInferenceRequestSchema,
} from "../shared/ai-contracts";
import type { AiOperation } from "../shared/ai-connection-contracts";
import { aiExchangeDiagnosticSchema } from "../shared/ai-diagnostics";
import {
  AiProviderError,
  type AiProviderConnection,
  type ModelProvider,
} from "./ai-provider";

const fieldRef = "aaaat_validation_field";
const itemRef = "aaaat_validation_item";
const candidature = { label: "Validation opportunity", information: [], sources: [] };

async function validateExtraction(
  connection: AiProviderConnection,
  provider: ModelProvider,
  signal?: AbortSignal,
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
  });
  const result = providerJobExtractionEnvelopeSchema.parse(
    await provider.extractJob(connection, request, signal),
  );
  for (const proposal of result.proposals) {
    if (!proposal || typeof proposal !== "object") continue;
    const candidate = proposal as { fieldRef?: unknown };
    if (typeof candidate.fieldRef === "string" && candidate.fieldRef !== fieldRef) {
      throw new Error("The configured provider returned an out-of-scope validation field reference.");
    }
  }
}

async function validateTagInference(
  connection: AiProviderConnection,
  provider: ModelProvider,
  signal?: AbortSignal,
): Promise<void> {
  const tagRef = "aaaat_validation_tag";
  const request = providerTagInferenceRequestSchema.parse({
    sourceText: "Validation source: this role concerns platform engineering.",
    sourceTitle: "AAAAT capability validation",
    sourceUrl: "",
    fieldTitles: ["Location", "Compensation"],
    tags: [{
      tagRef,
      name: "Platform engineering",
      aliases: ["Platform"],
      definition: "Reusable work concerned with software platforms.",
    }],
  });
  const result = providerTagInferenceEnvelopeSchema.parse(
    await provider.inferTags(connection, request, signal),
  );
  for (const proposal of result.existingTags) {
    if (!proposal || typeof proposal !== "object") continue;
    const candidate = proposal as { tagRef?: unknown };
    if (typeof candidate.tagRef === "string" && candidate.tagRef !== tagRef) {
      throw new Error("The configured provider returned an out-of-scope validation Tag reference.");
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
  connection: AiProviderConnection,
  operation: AiOperation,
  provider: ModelProvider,
  signal?: AbortSignal,
): Promise<void> {
  await runValidation(async () => {
    switch (operation) {
      case "opportunity_review": {
        const context = providerOpportunityReviewContextSchema.parse({ candidature, profileItems: [] });
        opportunityReviewResultSchema.parse(
          await provider.reviewOpportunity(connection, context, signal),
        );
        return;
      }
      case "job_extraction":
      case "historical_field_discovery":
        await validateExtraction(connection, provider, signal);
        return;
      case "tag_inference":
        await validateTagInference(connection, provider, signal);
        return;
      case "cv_tailoring": {
        const context = providerCvWritingContextSchema.parse({
          targetFieldTitle: "Summary",
          currentContent: "Existing validation text.",
          availableInformation: ["Experience: Synthetic evidence used only for capability validation."],
        });
        await provider.writeCvBlock(connection, context, signal);
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
        coverLetterDraftSchema.parse(
          await provider.draftCoverLetter(connection, context, signal),
        );
        return;
      }
    }
  });
}
