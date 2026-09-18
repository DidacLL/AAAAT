import {
  aiConnectionInputSchema,
  aiConnectionStatusSchema,
  aiProjectedCandidatureSchema,
  coverLetterDraftRequestSchema,
  coverLetterDraftSchema,
  cvTailoringRequestSchema,
  cvTailoringResultSchema,
  documentAiContextSchema,
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
  providerJobExtractionEnvelopeSchema,
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
  type DocumentAiContext,
  type HistoricalFieldDiscoveryRequest,
  type HistoricalFieldDiscoveryResult,
  type JobExtractionRequest,
  type JobExtractionResult,
  type OpportunityReviewPreview,
  type OpportunityReviewRequest,
  type OpportunityReviewResult,
  type ProviderDocumentAiContext,
  type ProviderOpportunityReviewCandidature,
} from "../shared/ai-contracts";
import type { AiOperation } from "../shared/ai-connection-contracts";
import type { CandidatureRuntimeValue, ProfileItem } from "../shared/contracts";
import type { WorkingCvItem } from "../shared/document-domain-contracts";
import { compactSourceText } from "../shared/source-text";
import {
  getDefaultAiConnection,
  requireAiConnectionForOperation,
  saveDefaultAiConnection,
} from "./ai-connection-service";
import type { ModelProvider } from "./ai-provider";
import { createWorkspaceAiProvider } from "./ai-prompt-service";
import {
  listCandidatureFields,
  validateCandidatureFieldValueInDatabase,
} from "./candidature-field-service";
import { getCandidature, listCandidatureSources } from "./candidature-service";
import { listDocumentCollections } from "./document-domain-service";
import { listProfileItemAiContextPreferences } from "./profile-ai-context-service";
import { getProfile } from "./profile-service";
import { extractJobWithPartialOutcomes } from "./robust-job-extraction";
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
  return new Map(listProfileItemAiContextPreferences(rootPath).map((preference) => [preference.itemId, preference.aiUseAllowed]));
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

function requireCandidature(rootPath: string, candidatureId: string) {
  try { return getCandidature(rootPath, candidatureId); }
  catch { throw new AiServiceError("The selected application no longer exists."); }
}

function projectCandidature(rootPath: string, candidatureId: string, includeSourceForDocument = false): AiProjectedCandidature {
  const candidature = requireCandidature(rootPath, candidatureId);
  const fields = new Map(listCandidatureFields(rootPath).map((field) => [field.definition.id, field]));
  const information = candidature.values.flatMap((retained) => {
    const field = fields.get(retained.fieldId);
    if (!field?.preferences.aiUseAllowed) return [];
    return [{ fieldId: field.definition.id, label: field.definition.label, value: retained.value }];
  });
  const sources = includeSourceForDocument
    ? listCandidatureSources(rootPath, candidatureId).slice(0, 1).map((source) => ({ title: source.title, url: source.url, sourceText: compactSourceText(source.sourceText).slice(0, 12000) }))
    : [];
  return aiProjectedCandidatureSchema.parse({ label: "Candidature", information, sources });
}
function emptyCandidature(label: string): AiProjectedCandidature {
  return aiProjectedCandidatureSchema.parse({ label, information: [], sources: [] });
}

function providerCandidature(rootPath: string, candidature: AiProjectedCandidature): ProviderOpportunityReviewCandidature {
  const choicesByFieldId = new Map(listCandidatureFields(rootPath).map((field) => [field.definition.id, new Map(field.definition.choices.map((choice) => [choice.id, choice.label]))]));
  const localChoiceLabels = (fieldId: string, value: CandidatureRuntimeValue): CandidatureRuntimeValue => {
    const choices = choicesByFieldId.get(fieldId);
    if (!choices || choices.size === 0) return value;
    const label = (candidate: string | number | boolean) => typeof candidate === "string" ? (choices.get(candidate) ?? candidate) : candidate;
    return Array.isArray(value) ? value.map(label) : label(value);
  };
  return providerOpportunityReviewCandidatureSchema.parse({
    label: candidature.label,
    information: candidature.information.map((information) => ({ label: information.label, value: localChoiceLabels(information.fieldId, information.value) })),
    sources: candidature.sources,
  });
}

function projectOpportunityReviewContext(rootPath: string, request: OpportunityReviewRequest) {
  const permissions = profileAiUse(rootPath);
  return opportunityReviewProjectedContextSchema.parse({
    candidature: projectCandidature(rootPath, request.candidatureId),
    profileItems: getProfile(rootPath).items.filter((item) => permissions.get(item.id) ?? true).map(projectProfileItem),
  });
}

export function previewOpportunityReview(rootPath: string, rawRequest: OpportunityReviewRequest): OpportunityReviewPreview {
  const request = opportunityReviewRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "opportunity_review");
  return opportunityReviewPreviewSchema.parse({ connection: statusFor(stored), projectedContext: projectOpportunityReviewContext(rootPath, request) });
}

export async function reviewOpportunity(
  rootPath: string,
  rawRequest: OpportunityReviewRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<OpportunityReviewResult> {
  const request = opportunityReviewRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "opportunity_review");
  const projected = projectOpportunityReviewContext(rootPath, request);
  const context = providerOpportunityReviewContextSchema.parse({ candidature: providerCandidature(rootPath, projected.candidature), profileItems: projected.profileItems });
  return opportunityReviewResultSchema.parse(await provider.reviewOpportunity(statusFor(stored), context));
}

export async function extractJob(rootPath: string, rawRequest: JobExtractionRequest): Promise<JobExtractionResult> {
  const request = jobExtractionRequestSchema.parse(rawRequest);
  const result = await extractJobWithPartialOutcomes(rootPath, request);
  return jobExtractionResultSchema.parse({ proposals: result.proposals, newFields: result.newFields });
}

function normalizeChoiceValue(field: ReturnType<typeof listCandidatureFields>[number], value: CandidatureRuntimeValue, choiceRefs: ReadonlyMap<string, string>): CandidatureRuntimeValue {
  if (field.definition.valueType !== "choice") return value;
  const resolve = (candidate: string | number | boolean): string | number | boolean => {
    if (typeof candidate !== "string") throw new AiServiceError("The model proposed a choice outside the requested field.");
    if (choiceRefs.has(candidate)) return choiceRefs.get(candidate) ?? candidate;
    const byLabel = field.definition.choices.find(
      (choice) => choice.label.trim().toLocaleLowerCase() === candidate.trim().toLocaleLowerCase(),
    );
    if (!byLabel) throw new AiServiceError("The model proposed a choice outside the requested field.");
    return byLabel.id;
  };
  return Array.isArray(value) ? value.map(resolve) : resolve(value);
}

export async function discoverCandidatureFieldFromSources(
  rootPath: string,
  rawRequest: HistoricalFieldDiscoveryRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<HistoricalFieldDiscoveryResult> {
  const request = historicalFieldDiscoveryRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "historical_field_discovery");
  const candidature = requireCandidature(rootPath, request.candidatureId);
  const field = listCandidatureFields(rootPath).find((candidate) => candidate.definition.id === request.fieldId);
  if (!field || !field.definition.enabled || !field.preferences.aiUseAllowed) throw new AiServiceError("Choose application information that AI may use.");
  const sourceMap = new Map(listCandidatureSources(rootPath, request.candidatureId).map((source) => [source.id, source]));
  const sourceText = request.sourceIds.map((sourceId) => {
    const source = sourceMap.get(sourceId);
    if (!source) throw new AiServiceError("A selected Source no longer belongs to this application.");
    return `Source: ${source.title}\nURL: ${source.url}\n${compactSourceText(source.sourceText)}`;
  }).join("\n\n---\n\n").slice(0, 50000).trim();
  if (!sourceText) throw new AiServiceError("The selected Sources contain no text to analyze.");

  const fieldRef = "aaaat_field_1";
  const choiceRefs = new Map<string, string>();
  const choices = field.definition.choices.map((choice, index) => {
    const choiceRef = `${fieldRef}_choice_${index + 1}`;
    choiceRefs.set(choiceRef, choice.id);
    return { choiceRef, label: choice.label };
  });
  const wire = providerJobExtractionRequestSchema.parse({
    sourceTitle: "Retained AAAAT Sources",
    sourceUrl: "",
    sourceText,
    fields: [{ fieldRef, label: field.definition.label, description: field.definition.description, valueType: field.definition.valueType, cardinality: field.definition.cardinality, choices }],
    tags: [],
  });
  const result = providerJobExtractionEnvelopeSchema.parse(await provider.extractJob(statusFor(stored), wire, undefined, "historical_field_discovery"));
  const proposed = result.proposals.find((candidate) =>
    Boolean(
      candidate &&
      typeof candidate === "object" &&
      "fieldRef" in candidate &&
      ((candidate as { fieldRef?: unknown }).fieldRef === fieldRef ||
        String((candidate as { fieldRef?: unknown }).fieldRef ?? "").trim().toLocaleLowerCase() === field.definition.label.trim().toLocaleLowerCase()),
    ),
  );
  let proposal: { fieldId: string; value: CandidatureRuntimeValue } | null = null;
  if (proposed && typeof proposed === "object" && "value" in proposed) {
    const runtime = candidatureRuntimeValueSchema.safeParse((proposed as { value?: unknown }).value);
    if (runtime.success) {
      try {
        const value = normalizeChoiceValue(field, runtime.data, choiceRefs);
        const normalized = withWorkspaceDatabase(rootPath, (database) => validateCandidatureFieldValueInDatabase(database, field.definition.id, value));
        if (normalized !== null) proposal = { fieldId: field.definition.id, value: normalized };
      } catch {
        proposal = null;
      }
    }
  }
  return historicalFieldDiscoveryResultSchema.parse({ proposal, existingValuePresent: candidature.values.some((value) => value.fieldId === request.fieldId) });
}

function isDocumentEvidence(kind: string): boolean {
  return kind !== "identity" && kind !== "contact" && kind !== "link";
}
interface AiCvItem {
  readonly id: string;
  readonly profileItemId: string | null;
  readonly content: WorkingCvItem["content"];
}
function projectDocumentContext(rootPath: string, candidature: AiProjectedCandidature, items: readonly AiCvItem[]): DocumentAiContext {
  const permissions = profileAiUse(rootPath);
  const evidence = items.flatMap((item) => {
    if (item.profileItemId === null || !(permissions.get(item.profileItemId) ?? true) || !isDocumentEvidence(item.content.kind)) return [];
    return [{ id: item.id, kind: item.content.kind, title: item.content.title, ...(item.content.subtitle ? { subtitle: item.content.subtitle } : {}), ...(item.content.description ? { description: item.content.description } : {}) }];
  });
  if (evidence.length === 0) throw new AiServiceError("Allow AI use for at least one professional-information item used by this CV first.");
  return documentAiContextSchema.parse({ candidature, items: evidence });
}
function providerDocumentContext(rootPath: string, context: DocumentAiContext, kind: string): { readonly context: ProviderDocumentAiContext; readonly itemIds: ReadonlyMap<string, string> } {
  const itemIds = new Map<string, string>();
  return {
    context: providerDocumentAiContextSchema.parse({
      candidature: providerCandidature(rootPath, context.candidature),
      items: context.items.map((item, index) => {
        const itemRef = `aaaat_${kind}_${index + 1}`;
        itemIds.set(itemRef, item.id);
        return { itemRef, kind: item.kind, title: item.title, ...(item.subtitle ? { subtitle: item.subtitle } : {}), ...(item.description ? { description: item.description } : {}) };
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
  const workingCv = listDocumentCollections(rootPath).workingCvs.find((candidate) => candidate.id === request.workingCvId);
  if (!workingCv) throw new AiServiceError("The selected Working CV no longer exists.");
  if (workingCv.candidatureId && workingCv.candidatureId !== request.candidatureId) throw new AiServiceError("This Working CV belongs to a different application.");
  const context = projectDocumentContext(rootPath, projectCandidature(rootPath, request.candidatureId, true), workingCv.sections.flatMap((section) => section.items));
  const providerContext = providerDocumentContext(rootPath, context, "cv");
  const result = providerCvTailoringResultSchema.parse(await provider.tailorCv(statusFor(stored), providerContext.context));
  const allowed = new Set(context.items.map((item) => item.id));
  const recommendations = result.recommendations.map((item) => ({ itemId: providerContext.itemIds.get(item.itemRef) ?? "", rationale: item.rationale }));
  if (recommendations.some((item) => !allowed.has(item.itemId))) throw new AiServiceError("The model recommended CV content that is not available to AI.");
  return cvTailoringResultSchema.parse({ recommendations });
}

export async function draftCoverLetter(
  rootPath: string,
  rawRequest: CoverLetterDraftRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
): Promise<CoverLetterDraft> {
  const request = coverLetterDraftRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "cover_letter_draft");
  const letter = listDocumentCollections(rootPath).letters.find((candidate) => candidate.id === request.coverLetterId);
  if (!letter) throw new AiServiceError("The selected cover letter no longer exists.");
  const candidature = letter.candidatureId ? projectCandidature(rootPath, letter.candidatureId, true) : emptyCandidature("Standalone cover letter");
  const permissions = profileAiUse(rootPath);
  const items: AiCvItem[] = getProfile(rootPath).items
    .filter((item) => isDocumentEvidence(item.kind) && (permissions.get(item.id) ?? true))
    .map((item) => ({ id: item.id, profileItemId: item.id, content: { kind: item.kind, title: item.title, ...(item.subtitle ? { subtitle: item.subtitle } : {}), ...(item.description ? { description: item.description } : {}), ...(item.startDate ? { startDate: item.startDate } : {}), ...(item.endDate ? { endDate: item.endDate } : {}), ...(item.url ? { url: item.url } : {}) } }));
  const context = projectDocumentContext(rootPath, candidature, items);
  return coverLetterDraftSchema.parse(await provider.draftCoverLetter(statusFor(stored), providerDocumentContext(rootPath, context, "coverletter").context));
}
