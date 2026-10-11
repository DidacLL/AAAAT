import { randomUUID } from "node:crypto";
import {
  aiConnectionInputSchema,
  coverLetterDraftRequestSchema,
  coverLetterDraftSchema,
  cvWritingRequestSchema,
  cvWritingResultSchema,
  jobExtractionRequestSchema,
  jobExtractionResultSchema,
  providerCoverLetterContextSchema,
  providerCvWritingContextSchema,
  type AiConnectionInput,
  type AiConnectionStatus,
  type CoverLetterDraft,
  type CoverLetterDraftRequest,
  type CvWritingField,
  type CvWritingRequest,
  type CvWritingResult,
  type JobExtractionRequest,
  type JobExtractionResult,
  type ProviderCoverLetterContext,
  type PreparedDocumentAi,
} from "../shared/ai-contracts";
import type { AiOperation } from "../shared/ai-connection-contracts";
import type { CandidatureRuntimeValue } from "../shared/contracts";
import type { CoverLetterRecord, WorkingCvRecord } from "../shared/document-domain-contracts";
import {
  getDefaultAiConnection,
  requireAiProviderConnectionForOperation,
  saveDefaultAiConnection,
} from "./ai-connection-service";
import { AI_DEFAULT_INSTRUCTIONS, type ModelProvider } from "./ai-provider";
import { aiPromptInstructions, createWorkspaceAiProvider } from "./ai-prompt-service";
import { getApplicationDocumentExternalAccess } from "./application-document-external-access-service";
import { listCandidatureFields } from "./candidature-field-service";
import { getCandidature, listCandidatureSources } from "./candidature-service";
import { getCareerContextAiDisclosure } from "./career-context-ai-disclosure-service";
import { getCareerContext } from "./career-context-service";
import { listDocumentCollections } from "./document-domain-service";
import { listProfileItemAiContextPreferences } from "./profile-ai-context-service";
import { getProfile } from "./profile-service";
import { extractJobWithPartialOutcomes } from "./robust-job-extraction";

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}

function requireStoredConnection(rootPath: string, operation: AiOperation) {
  return requireAiProviderConnectionForOperation(rootPath, operation);
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

function requireCandidature(rootPath: string, candidatureId: string) {
  try {
    return getCandidature(rootPath, candidatureId);
  } catch {
    throw new AiServiceError("The selected application no longer exists.");
  }
}

export async function extractJob(rootPath: string, rawRequest: JobExtractionRequest): Promise<JobExtractionResult> {
  const request = jobExtractionRequestSchema.parse(rawRequest);
  const result = await extractJobWithPartialOutcomes(rootPath, request);
  return jobExtractionResultSchema.parse({ proposals: result.proposals });
}

const cvWritingFieldDetails: Readonly<Record<CvWritingField, { readonly label: string; readonly maxLength: number }>> = Object.freeze({
  title: { label: "Title", maxLength: 200 },
  subtitle: { label: "Subtitle", maxLength: 300 },
  description: { label: "Description", maxLength: 5000 },
});

const cvInformationFields = Object.freeze([
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "description", label: "Description" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "url", label: "Link" },
] as const);

const careerInformationFields = Object.freeze([
  { key: "careerDirection", label: "Career direction" },
  { key: "objectives", label: "Objectives" },
  { key: "constraints", label: "Constraints" },
  { key: "targetRoles", label: "Target roles" },
  { key: "targetMarketsLocations", label: "Target markets / locations" },
  { key: "workPreferences", label: "Work preferences" },
  { key: "applicationWritingPreferences", label: "Application / writing preferences" },
] as const);

const profileInformationFields = Object.freeze([
  { key: "kind", label: "Type" },
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "description", label: "Description" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "url", label: "Link" },
] as const);

type PrivateReplacements = Map<string, string | null>;

function privateValue(
  title: string,
  value: string,
  replacements: PrivateReplacements,
): string {
  const placeholder = `[USERPRIVATE:${title}]`;
  if (!replacements.has(placeholder)) {
    replacements.set(placeholder, value);
  } else if (replacements.get(placeholder) !== value) {
    replacements.set(placeholder, null);
  }
  return placeholder;
}

function candidatureValueText(
  field: ReturnType<typeof listCandidatureFields>[number],
  value: CandidatureRuntimeValue,
): string {
  const choices = new Map(field.definition.choices.map((choice) => [choice.id, choice.label]));
  const visible = (candidate: string | number | boolean): string =>
    typeof candidate === "string" ? (choices.get(candidate) ?? candidate) : String(candidate);
  return Array.isArray(value) ? value.map(visible).join("; ") : visible(value);
}

export function restorePrivateValues(text: string, replacements: PrivateReplacements): string {
  const exact = Array.from(replacements.entries()).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string",
  );
  if (exact.length === 0) return text;
  const escaped = exact
    .map(([placeholder]) => placeholder)
    .sort((left, right) => right.length - left.length)
    .map((placeholder) => placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(escaped.join("|"), "g");
  const replacementMap = new Map(exact);
  return text.replace(pattern, (placeholder) => replacementMap.get(placeholder) ?? placeholder);
}


const privatePlaceholderPattern = /\[USERPRIVATE:[^\]\r\n]+\]/u;

function coverLetterContext(
  rootPath: string,
  candidatureId: string | null,
  sourceIds: readonly string[] = [],
  letter?: CoverLetterRecord,
): { readonly context: ProviderCoverLetterContext; readonly replacements: PrivateReplacements } {
  const replacements: PrivateReplacements = new Map();
  const sources: Array<{ title: string; url: string; sourceText: string }> = [];
  const applicationInformation: Array<{ title: string; value: string }> = [];

  if (candidatureId) {
    const candidature = requireCandidature(rootPath, candidatureId);
    const fields = new Map(
      listCandidatureFields(rootPath).map((field) => [field.definition.id, field]),
    );
    for (const source of listCandidatureSources(rootPath, candidatureId).filter((source) => sourceIds.includes(source.id))) {
      sources.push({
        title: source.title,
        url: source.url,
        sourceText: source.sourceText,
      });
    }
    for (const retained of candidature.values) {
      const field = fields.get(retained.fieldId);
      if (!field) continue;
      const value = candidatureValueText(field, retained.value);
      if (!field.preferences.aiUseAllowed && Array.isArray(retained.value)) {
        retained.value.forEach((part, index) => privateValue(`${field.definition.label} ${index + 1}`, candidatureValueText(field, part), replacements));
      }
      applicationInformation.push({
        title: field.definition.label,
        value: field.preferences.aiUseAllowed === true
          ? value
          : privateValue(field.definition.label, value, replacements),
      });
    }
  }

  const careerContext: Array<{ title: string; value: string }> = [];
  const career = getCareerContext(rootPath);
  const careerDisclosure = getCareerContextAiDisclosure(rootPath);
  for (const definition of careerInformationFields) {
    const value = career[definition.key];
    if (!value.trim()) continue;
    careerContext.push({
      title: definition.label,
      value: careerDisclosure[definition.key] === true
        ? value
        : privateValue(definition.label, value, replacements),
    });
  }

  const permissions = profileAiUse(rootPath);
  const myInformation: Array<{ title: string; value: string }> = [];
  getProfile(rootPath).items.forEach((item, itemIndex) => {
    const allowed = permissions.get(item.id) === true;
    for (const definition of profileInformationFields) {
      const value = item[definition.key];
      if (value === undefined || value === "") continue;
      const title = `My information ${itemIndex + 1} — ${definition.label}`;
      myInformation.push({
        title,
        value: allowed ? value : privateValue(title, value, replacements),
      });
    }
  });

  // Apply the same known-denial replacement to explicitly included Source copies.
  // Originals remain untouched. This is literal projection, not model-policy filtering.
  const knownPrivate = [...replacements.entries()].filter((entry): entry is [string, string] => typeof entry[1] === "string")
    .sort((left, right) => right[1].length - left[1].length);
  if (sources.length > 0 && [...replacements.values()].some((value) => value === null)) {
    throw new AiServiceError("These Sources cannot be included because private values have ambiguous labels. Continue without Sources.");
  }
  const byValue = new Map(knownPrivate.filter(([, value]) => value.length > 0).map(([placeholder, value]) => [value, placeholder]));
  const escapedValues = [...byValue.keys()].map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const privateCopies = escapedValues.length ? new RegExp(escapedValues.join("|"), "g") : null;
  const projectText = (text: string): string => privateCopies ? text.replace(privateCopies, (value) => byValue.get(value) ?? value) : text;
  return {
    context: providerCoverLetterContextSchema.parse({
      currentLetter: { recipient: projectText(letter?.recipient ?? ""), subject: projectText(letter?.subject ?? ""), bodyParagraphs: (letter?.bodyParagraphs ?? []).map(projectText), closing: projectText(letter?.closing ?? ""), language: letter?.language ?? "" },
      sources: sources.map((source) => ({ title: projectText(source.title), url: projectText(source.url), sourceText: projectText(source.sourceText) })),
      applicationInformation,
      careerContext,
      myInformation,
    }),
    replacements,
  };
}

function restoredCoverLetterDraft(
  rawDraft: CoverLetterDraft,
  replacements: PrivateReplacements,
): CoverLetterDraft {
  const restore = (value: string): string => restorePrivateValues(value, replacements);
  const draft = coverLetterDraftSchema.parse({
    recipient: restore(rawDraft.recipient),
    subject: restore(rawDraft.subject),
    bodyParagraphs: rawDraft.bodyParagraphs.map(restore),
    closing: restore(rawDraft.closing),
  });
  const values = [draft.recipient, draft.subject, ...draft.bodyParagraphs, draft.closing];
  if (values.some((value) => privatePlaceholderPattern.test(value))) {
    throw new AiServiceError(
      "The configured provider returned a private placeholder AAAAT did not supply unambiguously for this cover-letter draft.",
    );
  }
  return draft;
}

export function cvWritingContext(
  rootPath: string,
  workingCv: WorkingCvRecord,
  itemId: string,
  field: CvWritingField,
) {
  const targetDetail = cvWritingFieldDetails[field];
  const targetLocation = workingCv.sections.flatMap((section) =>
    section.items.map((item, itemIndex) => ({ section, item, itemIndex })),
  ).find((candidate) => candidate.item.id === itemId);
  if (!targetLocation) throw new AiServiceError("The selected CV content no longer exists.");

  const replacements: PrivateReplacements = new Map();
  const availableInformation: Array<{ title: string; value: string }> = [];
  const career = getCareerContext(rootPath);
  const careerDisclosure = getCareerContextAiDisclosure(rootPath);
  for (const definition of careerInformationFields) {
    const value = career[definition.key];
    if (!value.trim()) continue;
    availableInformation.push({
      title: definition.label,
      value: careerDisclosure[definition.key]
        ? value
        : privateValue(definition.label, value, replacements),
    });
  }

  if (workingCv.candidatureId) {
    const candidature = requireCandidature(rootPath, workingCv.candidatureId);
    const fields = new Map(
      listCandidatureFields(rootPath).map((candidate) => [candidate.definition.id, candidate]),
    );
    for (const retained of candidature.values) {
      const candidatureField = fields.get(retained.fieldId);
      if (!candidatureField) continue;
      const value = candidatureValueText(candidatureField, retained.value);
      availableInformation.push({
        title: `Application — ${candidatureField.definition.label}`,
        value: candidatureField.preferences.aiUseAllowed
          ? value
          : privateValue(candidatureField.definition.label, value, replacements),
      });
    }
  }

  const permissions = profileAiUse(rootPath);
  for (const section of workingCv.sections) {
    section.items.forEach((item, itemIndex) => {
      const allowed = item.profileItemId === null || permissions.get(item.profileItemId) === true;
      for (const definition of cvInformationFields) {
        const value = item.content[definition.key];
        if (value === undefined || value === "") continue;
        const title = `${section.name} ${itemIndex + 1} — ${definition.label}`;
        availableInformation.push({
          title,
          value: allowed ? value : privateValue(title, value, replacements),
        });
      }
    });
  }

  const targetTitle = `${targetLocation.section.name} ${targetLocation.itemIndex + 1} — ${targetDetail.label}`;
  return {
    context: providerCvWritingContextSchema.parse({
      target: { field, title: targetTitle, maxLength: targetDetail.maxLength },
      availableInformation,
    }),
    replacements,
    maxLength: targetDetail.maxLength,
  };
}

function assertDocumentAiAllowed(rootPath: string, candidatureId: string | null): void {
  if (candidatureId && !getApplicationDocumentExternalAccess(rootPath, candidatureId).allowed) {
    throw new AiServiceError("Allow AI for this application's documents before sending document information.");
  }
}

function workingForRequest(rootPath: string, request: CvWritingRequest): WorkingCvRecord {
  const saved = listDocumentCollections(rootPath).workingCvs.find((candidate) => candidate.id === request.workingCvId);
  const document = request.document ?? saved;
  if (!document || document.id !== request.workingCvId || (saved && saved.candidatureId !== document.candidatureId)) {
    throw new AiServiceError("The selected CV is unavailable.");
  }
  assertDocumentAiAllowed(rootPath, document.candidatureId);
  return { ...document, sections: request.sections };
}
function letterForRequest(rootPath: string, request: CoverLetterDraftRequest): CoverLetterRecord {
  const saved = listDocumentCollections(rootPath).letters.find((candidate) => candidate.id === request.coverLetterId);
  const document = request.document ?? saved;
  if (!document || document.id !== request.coverLetterId || (saved && saved.candidatureId !== document.candidatureId)) {
    throw new AiServiceError("The selected cover letter is unavailable.");
  }
  assertDocumentAiAllowed(rootPath, document.candidatureId);
  return document;
}
type PreparedRequest = {
  rootPath: string; operation: "cv_tailoring" | "cover_letter_draft";
  request: CvWritingRequest | CoverLetterDraftRequest; signature: string; preparedAt: number;
};
const preparedRequests = new Map<string, PreparedRequest>();
export function discardDocumentPreparation(rootPath: string, requestId: string): void {
  if (preparedRequests.get(requestId)?.rootPath === rootPath) preparedRequests.delete(requestId);
}
function prepareSignature(rootPath: string, operation: PreparedRequest["operation"], context: unknown): string {
  return JSON.stringify({
    connection: requireStoredConnection(rootPath, operation),
    instruction: aiPromptInstructions(rootPath)[operation] ?? AI_DEFAULT_INSTRUCTIONS[operation],
    context,
  });
}
function rememberPreparation(rootPath: string, operation: PreparedRequest["operation"], request: PreparedRequest["request"], context: unknown, sources: PreparedDocumentAi["sources"]): PreparedDocumentAi {
  // Retain only the current preview for each operation in this workspace.
  for (const [key, value] of preparedRequests) if (Date.now() - value.preparedAt > 15 * 60 * 1000 || value.operation === operation) preparedRequests.delete(key);
  const requestId = randomUUID();
  preparedRequests.set(requestId, { rootPath, operation, request, signature: prepareSignature(rootPath, operation, context), preparedAt: Date.now() });
  const connection = requireStoredConnection(rootPath, operation);
  return {
    requestId, connection: { name: connection.name, endpoint: connection.endpoint, model: connection.model },
    instruction: aiPromptInstructions(rootPath)[operation] ?? AI_DEFAULT_INSTRUCTIONS[operation],
    contextText: JSON.stringify(context, null, 2), sources,
  };
}
function preparedInput<T extends CvWritingRequest | CoverLetterDraftRequest>(rootPath: string, operation: PreparedRequest["operation"], request: T): T {
  if (!request.preparedId) throw new AiServiceError("Review this document's AI context before sending.");
  const prepared = preparedRequests.get(request.preparedId);
  if (!prepared || prepared.rootPath !== rootPath || prepared.operation !== operation || Date.now() - prepared.preparedAt > 15 * 60 * 1000) throw new AiServiceError("Prepare this AI task again.");
  preparedRequests.delete(request.preparedId);
  return { ...prepared.request, preparedId: request.preparedId } as T;
}
function assertPreparationCurrent(rootPath: string, operation: PreparedRequest["operation"], context: unknown, signature: string): void {
  if (prepareSignature(rootPath, operation, context) !== signature) throw new AiServiceError("AI settings or permitted information changed. Review the updated context before sending.");
}
export function prepareCvWriting(rootPath: string, rawRequest: CvWritingRequest): PreparedDocumentAi {
  const request = cvWritingRequestSchema.parse(rawRequest);
  const document = workingForRequest(rootPath, request);
  const projected = cvWritingContext(rootPath, document, request.itemId, request.field);
  return rememberPreparation(rootPath, "cv_tailoring", request, projected.context, []);
}
export function prepareCoverLetterDraft(rootPath: string, rawRequest: CoverLetterDraftRequest): PreparedDocumentAi {
  const request = coverLetterDraftRequestSchema.parse(rawRequest);
  const document = letterForRequest(rootPath, request);
  const projected = coverLetterContext(rootPath, document.candidatureId, request.sourceIds, document);
  const sources = document.candidatureId ? listCandidatureSources(rootPath, document.candidatureId).map((source) => ({ id: source.id, title: source.title || "Offer or notes" })) : [];
  return rememberPreparation(rootPath, "cover_letter_draft", request, projected.context, sources);
}
export async function writeCvField(rootPath: string, rawRequest: CvWritingRequest, provider: ModelProvider = createWorkspaceAiProvider(rootPath), signal?: AbortSignal): Promise<CvWritingResult> {
  const parsed = cvWritingRequestSchema.parse(rawRequest);
  const signature = parsed.preparedId ? preparedRequests.get(parsed.preparedId)?.signature : undefined;
  const request = preparedInput(rootPath, "cv_tailoring", parsed);
  const document = workingForRequest(rootPath, request);
  const projected = cvWritingContext(rootPath, document, request.itemId, request.field);
  assertPreparationCurrent(rootPath, "cv_tailoring", projected.context, signature ?? "");
  const written = await provider.writeCvField(requireStoredConnection(rootPath, "cv_tailoring"), projected.context, signal);
  const content = restorePrivateValues(written, projected.replacements).trim();
  if (!content || content.length > projected.maxLength) throw new AiServiceError("The AI result does not fit this CV field.");
  return cvWritingResultSchema.parse({ workingCvId: document.id, itemId: request.itemId, field: request.field, content });
}
export async function draftCoverLetter(rootPath: string, rawRequest: CoverLetterDraftRequest, provider: ModelProvider = createWorkspaceAiProvider(rootPath), signal?: AbortSignal): Promise<CoverLetterDraft> {
  const parsed = coverLetterDraftRequestSchema.parse(rawRequest);
  const signature = parsed.preparedId ? preparedRequests.get(parsed.preparedId)?.signature : undefined;
  const request = preparedInput(rootPath, "cover_letter_draft", parsed);
  const document = letterForRequest(rootPath, request);
  const projected = coverLetterContext(rootPath, document.candidatureId, request.sourceIds, document);
  assertPreparationCurrent(rootPath, "cover_letter_draft", projected.context, signature ?? "");
  const drafted = await provider.draftCoverLetter(requireStoredConnection(rootPath, "cover_letter_draft"), projected.context, signal);
  return restoredCoverLetterDraft(drafted, projected.replacements);
}
