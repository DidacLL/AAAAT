import {
  coverLetterDraftSchema,
  fitAssessmentResultSchema,
  providerCvTailoringResultSchema,
  providerDocumentAiContextSchema,
  providerFitProjectedContextSchema,
  providerJobExtractionRequestSchema,
  providerJobExtractionResultSchema,
  providerVariantRecommendationContextSchema,
  providerVariantRecommendationResultSchema,
  type AiConnectionStatus,
} from "../shared/ai-contracts";
import type { AiOperation } from "../shared/ai-connection-contracts";
import type { ModelProvider } from "./ai-provider";

const fieldRef = "aaaat_validation_field";
const variantRef = "aaaat_validation_variant";
const itemRef = "aaaat_validation_item";

const candidature = {
  label: "Validation opportunity",
  information: [],
  sources: [],
};

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
  });
  const result = providerJobExtractionResultSchema.parse(
    await provider.extractJob(connection, request),
  );
  if (result.proposals.some((proposal) => proposal.fieldRef !== fieldRef)) {
    throw new Error("The configured provider returned an out-of-scope validation field reference.");
  }
}

export async function validateAiOperation(
  connection: AiConnectionStatus,
  operation: AiOperation,
  provider: ModelProvider,
): Promise<void> {
  switch (operation) {
    case "fit_assessment": {
      const context = providerFitProjectedContextSchema.parse({
        candidature,
        profileItems: [],
      });
      fitAssessmentResultSchema.parse(await provider.assessFit(connection, context));
      return;
    }
    case "job_extraction":
    case "historical_field_discovery":
      await validateExtraction(connection, provider);
      return;
    case "variant_recommendation": {
      const context = providerVariantRecommendationContextSchema.parse({
        candidature,
        variants: [
          {
            variantRef,
            name: "Validation variant",
            focus: "Synthetic validation only",
            targetTags: [],
          },
        ],
      });
      const result = providerVariantRecommendationResultSchema.parse(
        await provider.recommendVariant(connection, context),
      );
      if (result.variantRef !== variantRef) {
        throw new Error("The configured provider returned an out-of-scope validation variant reference.");
      }
      return;
    }
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
      const result = providerCvTailoringResultSchema.parse(
        await provider.tailorCv(connection, context),
      );
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
}
