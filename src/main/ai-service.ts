import { z } from "zod";

import {
  aiConnectionInputSchema,
  aiConnectionStatusSchema,
  aiProjectedCandidatureSchema,
  coverLetterDraftRequestSchema,
  coverLetterDraftSchema,
  cvTailoringRequestSchema,
  cvTailoringResultSchema,
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
  type AiConnectionInput,
  type AiConnectionStatus,
  type AiProjectedCandidature,
  type AiProjectedProfileItem,
  type CoverLetterDraft,
  type CoverLetterDraftRequest,
  type CvTailoringRequest,
  type CvTailoringResult,
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
} from "../shared/ai-contracts";
import type { AiOperation } from "../shared/ai-connection-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
  ProfileItem,
} from "../shared/contracts";
import type { WorkingCvItem } from "../shared/document-domain-contracts";
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
import { listDocumentCollections } from "./document-domain-service";
import { listProfileItemAiContextPreferences } from "./profile-ai-context-service";
import { getProfile } from "./profile-service";
import { listTags } from "./tag-service";
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
export function saveAiConnection(rootPath: string, rawInput: AiConnectionInput): AiConnectionStatus {
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
  const fields = new Map(listCandidatureFields(rootPath).map((field) => [field.definition.id, field]));
  const retainedSources = listCandidatureSources(rootPath, candidatureId).slice(0, 20);
  const information = candidature.values.flatMap((retained) => {
    const field = fields.get(retained.fieldId);
    if (!field?.preferences.aiUseAllowed) return [];
    return [{ fieldId: field.definition.id, label: field.definition.label, value: retained.value }];
  });
  return aiProjectedCandidatureSchema.parse({
    label: candidature.label,
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

function emptyCandidature(label: string): AiProjectedCandidature {
  return aiProjectedCandidatureSchema.parse({ label, information: [], sources: [] });
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
  const permissions = profileAiUse(rootPath);
  const profileItems = getProfile(rootPath).items
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
  return opportunityReviewPreviewSchema.parse({
    connection: statusFor(stored),
    projectedContext: projectOpportunityReviewContext(rootPath, request),
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
  readonly tagRefs: ReadonlySet<string>;
}

function discoveryWireRequest(
  rootPath: string,
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
  const tags = listTags(rootPath).slice(0, 300).map((tag, index) => ({
    tagRef: `${scope}_tag_${index + 1}`,
    name: tag.name,
    aliases: tag.aliases.slice(0, 8),
    definition: tag.definition.slice(0, 500),
  }));
  return {
    request: providerJobExtractionRequestSchema.parse({ ...request, fields: providerFields, tags }),
    fieldIds,
    choiceIds,
    tagRefs: new Set(tags.map((tag) => tag.tagRef)),
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
  if (providerResult.existingTags.some((tag) => !wire.tagRefs.has(tag.tagRef))) {
    throw new AiServiceError("The model proposed a Tag that was not in the supplied glossary.");
  }
  const proposals = providerResult.proposals.flatMap((proposal) => {
    const fieldId = wire.fieldIds.get(proposal.fieldRef);
    if (!fieldId) throw new AiServiceError("The model proposed a candidature field that was not requested.");
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
  return jobExtractionResultSchema.parse({ proposals, newFields: providerResult.newFields });
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
    throw new AiServiceError("Allow AI use for at least one candidature information item first.");
  }
  const wire = discoveryWireRequest(rootPath, request, fields);
  return validateDiscoveryResult(rootPath, wire, await provider.extractJob(statusFor(stored), wire.request));
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
    if (!source) throw new AiServiceError("A selected Source no longer belongs to this candidature.");
    return source;
  });
  const sourceText = selected
    .map((source) => `Source: ${source.title}\nURL: ${source.url}\n${compactSourceText(source.sourceText)}`)
    .join("\n\n---\n\n")
    .slice(0, 50000)
    .trim();
  if (!sourceText) throw new AiServiceError("The selected Sources contain no text to analyze.");
  const wire = discoveryWireRequest(
    rootPath,
    { sourceText, sourceTitle: "Retained AAAAT Sources", sourceUrl: "" },
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

function isDocumentEvidence(kind: string): boolean {
  return kind !== "identity" && kind !== "contact" && kind !== "link";
}

interface AiCvItem {
  readonly id: string;
  readonly profileItemId: string | null;
  readonly content: WorkingCvItem["content"];
}

function projectDocumentContext(
  rootPath: string,
  candidature: AiProjectedCandidature,
  items: readonly AiCvItem[],
): z.infer<typeof documentAiContextSchema> {
  const permissions = profileAiUse(rootPath);
  const evidence = items.flatMap((item) => {
    if (
      item.profileItemId === null ||
      !(permissions.get(item.profileItemId) ?? true) ||
      !isDocumentEvidence(item.content.kind)
    ) {
      return [];
    }
    return [{
      id: item.id,
      kind: item.content.kind,
      title: item.content.title,
      ...(item.content.subtitle ? { subtitle: item.content.subtitle } : {}),
      ...(item.content.description ? { description: item.content.description } : {}),
    }];
  });
  if (evidence.length === 0) {
    throw new AiServiceError("Allow AI use for at least one professional-information item used by this CV first.");
  }
  return documentAiContextSchema.parse({ candidature, items: evidence });
}

function providerDocumentContext(
  rootPath: string,
  context: z.infer<typeof documentAiContextSchema>,
  kind: string,
): { readonly context: ProviderDocumentAiContext; readonly itemIds: ReadonlyMap<string, string> } {
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

export async function tailorCv(
  rootPath: string,
  rawRequest: CvTailoringRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<CvTailoringResult> {
  const request = cvTailoringRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "cv_tailoring");
  requireCandidature(rootPath, request.candidatureId);
  const workingCv = listDocumentCollections(rootPath).workingCvs.find(
    (candidate) => candidate.id === request.workingCvId,
  );
  if (!workingCv) throw new AiServiceError("The selected Working CV no longer exists.");
  if (workingCv.candidatureId && workingCv.candidatureId !== request.candidatureId) {
    throw new AiServiceError("This Working CV belongs to a different application.");
  }
  const items = workingCv.sections.flatMap((section) => section.items);
  const context = projectDocumentContext(
    rootPath,
    projectCandidature(rootPath, request.candidatureId, true),
    items,
  );
  const providerContext = providerDocumentContext(rootPath, context, "cv");
  const result = providerCvTailoringResultSchema.parse(
    await provider.tailorCv(statusFor(stored), providerContext.context),
  );
  const allowed = new Set(context.items.map((item) => item.id));
  const recommendations = result.recommendations.map((item) => ({
    itemId: providerContext.itemIds.get(item.itemRef) ?? "",
    rationale: item.rationale,
  }));
  if (recommendations.some((item) => !allowed.has(item.itemId))) {
    throw new AiServiceError("The model recommended CV content that is not available to AI.");
  }
  return cvTailoringResultSchema.parse({ recommendations });
}

export async function draftCoverLetter(
  rootPath: string,
  rawRequest: CoverLetterDraftRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<CoverLetterDraft> {
  const request = coverLetterDraftRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "cover_letter_draft");
  const letter = listDocumentCollections(rootPath).letters.find(
    (candidate) => candidate.id === request.coverLetterId,
  );
  if (!letter) throw new AiServiceError("The selected cover letter no longer exists.");
  const candidature = letter.candidatureId
    ? projectCandidature(rootPath, letter.candidatureId, true)
    : emptyCandidature("Standalone cover letter");
  const permissions = profileAiUse(rootPath);
  const items: AiCvItem[] = getProfile(rootPath).items
    .filter((item) => isDocumentEvidence(item.kind) && (permissions.get(item.id) ?? true))
    .map((item) => ({
      id: item.id,
      profileItemId: item.id,
      content: {
        kind: item.kind,
        title: item.title,
        ...(item.subtitle ? { subtitle: item.subtitle } : {}),
        ...(item.description ? { description: item.description } : {}),
        ...(item.startDate ? { startDate: item.startDate } : {}),
        ...(item.endDate ? { endDate: item.endDate } : {}),
        ...(item.url ? { url: item.url } : {}),
      },
    }));
  const context = projectDocumentContext(rootPath, candidature, items);
  const providerContext = providerDocumentContext(rootPath, context, "coverletter");
  return coverLetterDraftSchema.parse(
    await provider.draftCoverLetter(statusFor(stored), providerContext.context),
  );
}
