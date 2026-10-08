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
} from "../shared/ai-contracts";
import type { AiOperation } from "../shared/ai-connection-contracts";
import type { CandidatureRuntimeValue } from "../shared/contracts";
import type { WorkingCvRecord } from "../shared/document-domain-contracts";
import {
  getDefaultAiConnection,
  requireAiProviderConnectionForOperation,
  saveDefaultAiConnection,
} from "./ai-connection-service";
import type { ModelProvider } from "./ai-provider";
import { createWorkspaceAiProvider } from "./ai-prompt-service";
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
): { readonly context: ProviderCoverLetterContext; readonly replacements: PrivateReplacements } {
  const replacements: PrivateReplacements = new Map();
  const sources: Array<{ title: string; url: string; sourceText: string }> = [];
  const applicationInformation: Array<{ title: string; value: string }> = [];

  if (candidatureId) {
    const candidature = requireCandidature(rootPath, candidatureId);
    const fields = new Map(
      listCandidatureFields(rootPath).map((field) => [field.definition.id, field]),
    );
    for (const source of listCandidatureSources(rootPath, candidatureId)) {
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

  return {
    context: providerCoverLetterContextSchema.parse({
      sources,
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
      const allowed = item.profileItemId !== null && permissions.get(item.profileItemId) === true;
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

export async function writeCvField(
  rootPath: string,
  rawRequest: CvWritingRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
  signal?: AbortSignal,
): Promise<CvWritingResult> {
  const request = cvWritingRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "cv_tailoring");
  const workingCv = listDocumentCollections(rootPath).workingCvs.find(
    (candidate) => candidate.id === request.workingCvId,
  );
  if (!workingCv) throw new AiServiceError("The selected Working CV no longer exists.");
  const projection = cvWritingContext(
    rootPath,
    { ...workingCv, sections: request.sections },
    request.itemId,
    request.field,
  );
  const written = await provider.writeCvField(stored, projection.context, signal);
  const content = restorePrivateValues(written, projection.replacements).trim();
  if (!content) throw new AiServiceError("The configured provider returned empty CV content.");
  if (content.length > projection.maxLength) {
    throw new AiServiceError("The configured provider returned CV content that is too long for this field.");
  }
  return cvWritingResultSchema.parse({
    workingCvId: workingCv.id,
    itemId: request.itemId,
    field: request.field,
    content,
  });
}

export async function draftCoverLetter(
  rootPath: string,
  rawRequest: CoverLetterDraftRequest,
  provider: ModelProvider = createWorkspaceAiProvider(rootPath),
  signal?: AbortSignal,
): Promise<CoverLetterDraft> {
  const request = coverLetterDraftRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath, "cover_letter_draft");
  const letter = listDocumentCollections(rootPath).letters.find(
    (candidate) => candidate.id === request.coverLetterId,
  );
  if (!letter) throw new AiServiceError("The selected cover letter no longer exists.");

  const projected = coverLetterContext(rootPath, letter.candidatureId ?? null);
  const drafted = await provider.draftCoverLetter(stored, projected.context, signal);
  return restoredCoverLetterDraft(drafted, projected.replacements);
}
