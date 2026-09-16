import { z } from "zod";

import {
  aiConnectionInputSchema,
  aiConnectionStatusSchema,
  aiProjectedCandidatureSchema,
  coverLetterDraftSchema,
  cvTailoringResultSchema,
  documentAiContextSchema,
  documentAiRequestSchema,
  historicalFieldDiscoveryRequestSchema,
  historicalFieldDiscoveryResultSchema,
  jobExtractionRequestSchema,
  jobExtractionResultSchema,
  opportunityReviewPreviewSchema,
  opportunityReviewProjectedContextSchema,
  opportunityReviewRequestSchema,
  opportunityReviewResultSchema,
  providerCvTailoringResultSchema,
  providerDocumentAiContextSchema,
  providerJobExtractionRequestSchema,
  providerJobExtractionResultSchema,
  providerOpportunityReviewCandidatureSchema,
  providerOpportunityReviewContextSchema,
  providerVariantRecommendationContextSchema,
  providerVariantRecommendationResultSchema,
  variantRecommendationContextSchema,
  variantRecommendationRequestSchema,
  variantRecommendationResultSchema,
  type AiConnectionInput,
  type AiConnectionStatus,
  type AiProjectedCandidature,
  type AiProjectedProfileItem,
  type CoverLetterDraft,
  type CvTailoringResult,
  type DocumentAiRequest,
  type HistoricalFieldDiscoveryRequest,
  type HistoricalFieldDiscoveryResult,
  type JobExtractionRequest,
  type JobExtractionResult,
  type OpportunityReviewPreview,
  type OpportunityReviewRequest,
  type OpportunityReviewResult,
  type ProviderDocumentAiContext,
  type ProviderJobExtractionRequest,
  type ProviderOpportunityReviewCandidature,
  type VariantRecommendationRequest,
  type VariantRecommendationResult,
} from "../shared/ai-contracts";
import type { AiOperation } from "../shared/ai-connection-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
  DocumentRecord,
  ProfileItem,
} from "../shared/contracts";
import { compactSourceText } from "../shared/source-text";
import {
  getDefaultAiConnection,
  requireAiConnectionForOperation,
  saveDefaultAiConnection,
} from "./ai-connection-service";
import { type ModelProvider } from "./ai-provider";
import { createWorkspaceAiProvider } from "./ai-prompt-service";
import {
  listCandidatureFields,
  validateCandidatureFieldValueInDatabase,
} from "./candidature-field-service";
import { getCandidature, listCandidatureSources } from "./candidature-service";
import { listDocuments, resolveDocument } from "./document-service";
import { listProfileItemAiContextPreferences } from "./profile-ai-context-service";
import { getProfile, resolveProfileVariant } from "./profile-service";
import { withWorkspaceDatabase } from "./workspace";

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}

function statusFor(connection: AiConnectionStatus): AiConnectionStatus {
  return aiConnectionStatusSchema.parse(connection);
}

function requireStoredConnection(rootPath: string, operation: AiOperation): AiConnectionStatus {
  return requireAiConnectionForOperation(rootPath, operation);
}

export function getAiConnection(rootPath: string): AiConnectionStatus | null {
  return getDefaultAiConnection(rootPath);
}

export function saveAiConnection(
  rootPath: string,
  rawInput: AiConnectionInput,
): AiConnectionStatus {
  return saveDefaultAiConnection(rootPath, aiConnectionInputSchema.parse(rawInput));
}

function profileAiUse(rootPath: string): ReadonlyMap<string, boolean> {
  return new Map(
    listProfileItemAiContextPreferences(rootPath).map((preference) => [
      preference.itemId,
      preference.aiUseAllowed,
    ]),
  );
}

function projectProfileItem(item: ProfileItem): AiProjectedProfileItem {
  return {
    kind: item.kind,
    title: item.title,
    ...(item.subtitle !== undefined ? { subtitle: item.subtitle } : {}),
    ...(item.description !== undefined ? { description: item.description } : {}),
    ...(item.startDate !== undefined ? { startDate: item.startDate } : {}),
    ...(item.endDate !== undefined ? { endDate: item.endDate } : {}),
  };
}

function projectCandidature(
  rootPath: string,
  candidatureId: string,
  includeSourceForDocument = false,
): AiProjectedCandidature {
  const candidature = getCandidature(rootPath, candidatureId);
  const fields = new Map(
    listCandidatureFields(rootPath).map((field) => [field.definition.id, field]),
  );
  const retainedSources = listCandidatureSources(rootPath, candidatureId).slice(0, 20);
  const information = candidature.values.flatMap((retained) => {
    const field = fields.get(retained.fieldId);
    if (!field?.preferences.aiUseAllowed) return [];
    return [
      {
        fieldId: field.definition.id,
        label: field.definition.label,
        value: retained.value,
      },
    ];
  });

  return aiProjectedCandidatureSchema.parse({
    label: "Candidature",
    information,
    sources: includeSourceForDocument
      ? retainedSources.slice(0, 1).map((source) => ({
          title: source.title,
          url: source.url,
          sourceText: compactSourceText(source.sourceText).slice(0, 12000),
        }))
      : [],
  });
}

function operationScope(kind: string): string {
  return `aaaat_${kind.replace(/[^a-z]/g, "")}`;
}

function providerCandidature(
  rootPath: string,
  candidature: AiProjectedCandidature,
): ProviderOpportunityReviewCandidature {
  const choicesByFieldId = new Map(
    listCandidatureFields(rootPath).map((field) => [
      field.definition.id,
      new Map(field.definition.choices.map((choice) => [choice.id, choice.label])),
    ]),
  );

  const localChoiceLabels = (
    fieldId: string,
    value: CandidatureRuntimeValue,
  ): CandidatureRuntimeValue => {
    const choices = choicesByFieldId.get(fieldId);
    if (!choices || choices.size === 0) return value;

    const label = (candidate: string | number | boolean) =>
      typeof candidate === "string" ? (choices.get(candidate) ?? candidate) : candidate;

    return Array.isArray(value) ? value.map(label) : label(value);
  };

  return providerOpportunityReviewCandidatureSchema.parse({
    label: candidature.label,
    information: candidature.information.map((information) => ({
      label: information.label,
      value: localChoiceLabels(information.fieldId, information.value),
    })),
    sources: candidature.sources,
  });
}

function requireCandidature(rootPath: string, candidatureId: string) {
  try {
    return getCandidature(rootPath, candidatureId);
  } catch {
    throw new AiServiceError("The selected candidature no longer exists.");
  }
}

function projectOpportunityReviewContext(
  rootPath: string,
  request: OpportunityReviewRequest,
): z.infer<typeof opportunityReviewProjectedContextSchema> {
  const profile = getProfile(rootPath).items;
  const permissions = profileAiUse(rootPath);
  const profileItems = profile
    .filter((item) => permissions.get(item.id) ?? true)
    .map(projectProfileItem);

  return opportunityReviewProjectedContextSchema.parse({
    candidature: projectCandidature(rootPath, request.candidatureId),
    profileItems,
  });
}

export function previewOpportunityReview(
  rootPath: string,
  rawRequest: OpportunityReviewRequest,
): OpportunityReviewPreview {
  const request = opportunityReviewRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "opportunity_review");
  const projectedContext = projectOpportunityReviewContext(rootPath, request);

  return opportunityReviewPreviewSchema.parse({
    connection: statusFor(stored),
    projectedContext,
  });
}

export async function reviewOpportunity(
  rootPath: string,
  rawRequest: OpportunityReviewRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<OpportunityReviewResult> {
  const request = opportunityReviewRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "opportunity_review");
  const projectedContext = projectOpportunityReviewContext(rootPath, request);
  const providerContext = providerOpportunityReviewContextSchema.parse({
    candidature: providerCandidature(rootPath, projectedContext.candidature),
    profileItems: projectedContext.profileItems,
  });

  return opportunityReviewResultSchema.parse(
    await provider.reviewOpportunity(statusFor(stored), providerContext),
  );
}

function discoveryFields(rootPath: string): CandidatureFieldConfiguration[] {
  return listCandidatureFields(rootPath).filter(
    (field) => field.definition.enabled && field.preferences.aiUseAllowed,
  );
}

interface DiscoveryWireRequest {
  readonly request: ProviderJobExtractionRequest;
  readonly fieldIds: ReadonlyMap<string, string>;
  readonly choiceIds: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

function discoveryWireRequest(
  request: JobExtractionRequest,
  fields: readonly CandidatureFieldConfiguration[],
): DiscoveryWireRequest {
  const scope = operationScope("discovery");
  const fieldIds = new Map<string, string>();
  const choiceIds = new Map<string, ReadonlyMap<string, string>>();
  const providerFields = fields.map((field, index) => {
    const fieldRef = `${scope}_${index + 1}`;
    fieldIds.set(fieldRef, field.definition.id);

    const choices = new Map<string, string>();
    const providerChoices = field.definition.choices.map((choice, choiceIndex) => {
      const choiceRef = `${fieldRef}_${choiceIndex + 1}`;
      choices.set(choiceRef, choice.id);
      return { choiceRef, label: choice.label };
    });
    choiceIds.set(fieldRef, choices);

    return {
      fieldRef,
      label: field.definition.label,
      description: field.definition.description,
      valueType: field.definition.valueType,
      cardinality: field.definition.cardinality,
      choices: providerChoices,
    };
  });

  return {
    request: providerJobExtractionRequestSchema.parse({
      ...request,
      fields: providerFields,
      tags: [],
    }),
    fieldIds,
    choiceIds,
  };
}

function localChoiceValue(
  fieldRef: string,
  value: CandidatureRuntimeValue,
  choiceIds: ReadonlyMap<string, ReadonlyMap<string, string>>,
): CandidatureRuntimeValue {
  const choices = choiceIds.get(fieldRef);
  if (!choices || choices.size === 0) return value;

  const resolve = (candidate: string | number | boolean): string | number | boolean => {
    if (typeof candidate !== "string" || !choices.has(candidate)) {
      throw new AiServiceError("The model proposed a choice outside the requested field.");
    }
    return choices.get(candidate) ?? candidate;
  };

  return Array.isArray(value) ? value.map(resolve) : resolve(value);
}

function validateDiscoveryResult(
  rootPath: string,
  wire: DiscoveryWireRequest,
  result: unknown,
): JobExtractionResult {
  const providerResult = providerJobExtractionResultSchema.parse(result);
  const proposals = providerResult.proposals.flatMap((proposal) => {
    const fieldId = wire.fieldIds.get(proposal.fieldRef);
    if (!fieldId) {
      throw new AiServiceError("The model proposed a candidature field that was not requested.");
    }

    const field = listCandidatureFields(rootPath).find(
      (candidate) => candidate.definition.id === fieldId,
    );
    if (!field?.preferences.aiUseAllowed) {
      throw new AiServiceError("The proposed information is no longer available to AI.");
    }

    const normalized = withWorkspaceDatabase(rootPath, (database) =>
      validateCandidatureFieldValueInDatabase(
        database,
        fieldId,
        localChoiceValue(proposal.fieldRef, proposal.value, wire.choiceIds),
      ),
    );
    return normalized === null ? [] : [{ fieldId, value: normalized }];
  });

  return jobExtractionResultSchema.parse({
    proposals,
    newFields: providerResult.newFields,
  });
}

export async function extractJob(
  rootPath: string,
  rawRequest: JobExtractionRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<JobExtractionResult> {
  const request = jobExtractionRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "job_extraction");
  const fields = discoveryFields(rootPath);
  if (fields.length === 0) {
    throw new AiServiceError(
      "Allow AI use for at least one candidature information item first.",
    );
  }

  const wire = discoveryWireRequest(request, fields);
  const result = await provider.extractJob(statusFor(stored), wire.request);
  return validateDiscoveryResult(rootPath, wire, result);
}

export async function discoverCandidatureFieldFromSources(
  rootPath: string,
  rawRequest: HistoricalFieldDiscoveryRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<HistoricalFieldDiscoveryResult> {
  const request = historicalFieldDiscoveryRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "historical_field_discovery");
  const candidature = requireCandidature(rootPath, request.candidatureId);
  const field = listCandidatureFields(rootPath).find(
    (candidate) => candidate.definition.id === request.fieldId,
  );
  if (!field || !field.definition.enabled || !field.preferences.aiUseAllowed) {
    throw new AiServiceError("Choose candidature information that AI may use.");
  }

  const sourceMap = new Map(
    listCandidatureSources(rootPath, request.candidatureId).map((source) => [source.id, source]),
  );
  const selected = request.sourceIds.map((sourceId) => {
    const source = sourceMap.get(sourceId);
    if (!source) {
      throw new AiServiceError("A selected Source no longer belongs to this candidature.");
    }
    return source;
  });
  const sourceText = selected
    .map(
      (source) =>
        `Source: ${source.title}\nURL: ${source.url}\n${compactSourceText(source.sourceText)}`,
    )
    .join("\n\n---\n\n")
    .slice(0, 50000)
    .trim();
  if (!sourceText) {
    throw new AiServiceError("The selected Sources contain no text to analyze.");
  }

  const wire = discoveryWireRequest(
    {
      sourceText,
      sourceTitle: "Retained AAAAT Sources",
      sourceUrl: "",
    },
    [field],
  );
  const rawResult = await provider.extractJob(
    statusFor(stored),
    wire.request,
    undefined,
    "historical_field_discovery",
  );
  const result = validateDiscoveryResult(rootPath, wire, rawResult);

  return historicalFieldDiscoveryResultSchema.parse({
    proposal: result.proposals[0] ?? null,
    existingValuePresent: candidature.values.some((value) => value.fieldId === request.fieldId),
  });
}

export async function recommendVariant(
  rootPath: string,
  rawRequest: VariantRecommendationRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<VariantRecommendationResult> {
  const request = variantRecommendationRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "variant_recommendation");
  requireCandidature(rootPath, request.candidatureId);

  const variants = getProfile(rootPath).variants;
  if (variants.length === 0) {
    throw new AiServiceError("Create a profile variant before requesting a recommendation.");
  }

  const candidature = projectCandidature(rootPath, request.candidatureId);
  const context = variantRecommendationContextSchema.parse({
    candidature,
    variants: variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      focus: variant.focus,
      targetTags: variant.targetTags,
      ...(variant.preferredLanguage ? { preferredLanguage: variant.preferredLanguage } : {}),
    })),
  });
  const scope = operationScope("variant");
  const variantIds = new Map<string, string>();
  const providerContext = providerVariantRecommendationContextSchema.parse({
    candidature: providerCandidature(rootPath, context.candidature),
    variants: context.variants.map((variant, index) => {
      const variantRef = `${scope}_${index + 1}`;
      variantIds.set(variantRef, variant.id);
      return {
        variantRef,
        name: variant.name,
        focus: variant.focus,
        targetTags: variant.targetTags,
        ...(variant.preferredLanguage
          ? { preferredLanguage: variant.preferredLanguage }
          : {}),
      };
    }),
  });
  const providerResult = providerVariantRecommendationResultSchema.parse(
    await provider.recommendVariant(statusFor(stored), providerContext),
  );
  const variantId = variantIds.get(providerResult.variantRef);
  if (!variantId || !getProfile(rootPath).variants.some((variant) => variant.id === variantId)) {
    throw new AiServiceError("The model recommended a profile variant that no longer exists.");
  }

  return variantRecommendationResultSchema.parse({
    variantId,
    rationale: providerResult.rationale,
  });
}

function isDocumentEvidence(kind: string): boolean {
  return kind !== "identity" && kind !== "contact" && kind !== "link";
}

function requireDocument(rootPath: string, documentId: string) {
  const document = listDocuments(rootPath).find((candidate) => candidate.id === documentId);
  if (!document) {
    throw new AiServiceError("The selected document no longer exists.");
  }
  return document;
}

function documentBaseItems(rootPath: string, document: DocumentRecord): ProfileItem[] {
  return document.variantId === null
    ? getProfile(rootPath).items
    : resolveProfileVariant(rootPath, document.variantId).items;
}

function projectDocumentContext(
  rootPath: string,
  candidature: AiProjectedCandidature,
  items: readonly ProfileItem[],
): z.infer<typeof documentAiContextSchema> {
  const permissions = profileAiUse(rootPath);
  const evidence = items.flatMap((item) => {
    if (!isDocumentEvidence(item.kind) || !(permissions.get(item.id) ?? true)) {
      return [];
    }

    return [
      {
        id: item.id,
        kind: item.kind,
        title: item.title,
        ...(item.subtitle ? { subtitle: item.subtitle } : {}),
        ...(item.description ? { description: item.description } : {}),
      },
    ];
  });

  if (evidence.length === 0) {
    throw new AiServiceError(
      "Allow AI use for at least one career item before requesting document assistance.",
    );
  }

  return documentAiContextSchema.parse({ candidature, items: evidence });
}

function providerDocumentContext(
  rootPath: string,
  context: z.infer<typeof documentAiContextSchema>,
  kind: string,
): {
  readonly context: ProviderDocumentAiContext;
  readonly itemIds: ReadonlyMap<string, string>;
} {
  const scope = operationScope(kind);
  const itemIds = new Map<string, string>();

  return {
    context: providerDocumentAiContextSchema.parse({
      candidature: providerCandidature(rootPath, context.candidature),
      items: context.items.map((item, index) => {
        const itemRef = `${scope}_${index + 1}`;
        itemIds.set(itemRef, item.id);
        return {
          itemRef,
          kind: item.kind,
          title: item.title,
          ...(item.subtitle ? { subtitle: item.subtitle } : {}),
          ...(item.description ? { description: item.description } : {}),
        };
      }),
    }),
    itemIds,
  };
}

function currentDocumentEvidenceIds(rootPath: string, documentId: string): ReadonlySet<string> {
  const document = requireDocument(rootPath, documentId);
  if (document.kind !== "cv") {
    throw new AiServiceError("Choose a CV document for CV tailoring.");
  }

  const permissions = profileAiUse(rootPath);
  return new Set(
    documentBaseItems(rootPath, document)
      .filter(
        (item) => isDocumentEvidence(item.kind) && (permissions.get(item.id) ?? true),
      )
      .map((item) => item.id),
  );
}

export async function tailorCv(
  rootPath: string,
  rawRequest: DocumentAiRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<CvTailoringResult> {
  const request = documentAiRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "cv_tailoring");
  requireCandidature(rootPath, request.candidatureId);

  const document = requireDocument(rootPath, request.documentId);
  if (document.kind !== "cv") {
    throw new AiServiceError("Choose a CV document for CV tailoring.");
  }

  const items = documentBaseItems(rootPath, document);
  const candidature = projectCandidature(rootPath, request.candidatureId, true);
  const context = projectDocumentContext(rootPath, candidature, items);
  const providerContext = providerDocumentContext(rootPath, context, "cv");
  const result = providerCvTailoringResultSchema.parse(
    await provider.tailorCv(statusFor(stored), providerContext.context),
  );
  const allowed = currentDocumentEvidenceIds(rootPath, request.documentId);
  if (
    result.recommendations.some(
      (item) => !allowed.has(providerContext.itemIds.get(item.itemRef) ?? ""),
    )
  ) {
    throw new AiServiceError(
      "The model recommended a profile item that no longer exists or is not available to AI.",
    );
  }

  return cvTailoringResultSchema.parse({
    recommendations: result.recommendations.map((item) => ({
      itemId: providerContext.itemIds.get(item.itemRef) ?? "",
      rationale: item.rationale,
    })),
  });
}

export async function draftCoverLetter(
  rootPath: string,
  rawRequest: DocumentAiRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<CoverLetterDraft> {
  const request = documentAiRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "cover_letter_draft");
  requireCandidature(rootPath, request.candidatureId);

  const document = requireDocument(rootPath, request.documentId);
  if (document.kind !== "cover_letter") {
    throw new AiServiceError(
      "Choose a cover-letter document for cover-letter drafting.",
    );
  }

  const items = resolveDocument(rootPath, document.id).items;
  const candidature = projectCandidature(rootPath, request.candidatureId, true);
  const context = projectDocumentContext(rootPath, candidature, items);
  const providerContext = providerDocumentContext(rootPath, context, "cover-letter");

  return coverLetterDraftSchema.parse(
    await provider.draftCoverLetter(statusFor(stored), providerContext.context),
  );
}
