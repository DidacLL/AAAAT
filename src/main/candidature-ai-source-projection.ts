import type { JobExtractionRequest } from "../shared/ai-contracts";
import { listCandidatureFields } from "./candidature-field-service";
import { getCandidature } from "./candidature-service";
import { getCareerContextAiDisclosure } from "./career-context-ai-disclosure-service";
import { getCareerContext } from "./career-context-service";
import { listProfileItemAiContextPreferences } from "./profile-ai-context-service";
import { getProfile } from "./profile-service";

interface SourceAiText {
  readonly title: string;
  readonly url: string;
  readonly sourceText: string;
}

/** Project exact copies of currently denied saved values; never change retained Sources. */
export function projectCandidatureSourceForAi(
  rootPath: string,
  candidatureId: string,
  source: SourceAiText,
): SourceAiText {
  const candidature = getCandidature(rootPath, candidatureId);
  const fields = new Map(listCandidatureFields(rootPath).map((field) => [field.definition.id, field]));
  const denied = new Set<string>();
  const exclude = (value: string | undefined) => { if (value) denied.add(value); };
  for (const retained of candidature.values) {
    const field = fields.get(retained.fieldId);
    if (!field || field.preferences.aiUseAllowed) continue;
    const choices = new Map(field.definition.choices.map((choice) => [choice.id, choice.label]));
    const visible = (value: string | number | boolean): string =>
      typeof value === "string" ? choices.get(value) ?? value : String(value);
    if (Array.isArray(retained.value)) {
      const values = retained.value.map(visible);
      values.forEach(exclude);
      exclude(values.join(", "));
      exclude(values.join("; "));
    } else exclude(visible(retained.value));
  }

  const career = getCareerContext(rootPath);
  const disclosure = getCareerContextAiDisclosure(rootPath);
  for (const key of Object.keys(disclosure) as Array<keyof typeof disclosure>) {
    if (!disclosure[key]) exclude(career[key]);
  }
  const profilePermissions = new Map(listProfileItemAiContextPreferences(rootPath)
    .map((preference) => [preference.itemId, preference.aiUseAllowed]));
  for (const item of getProfile(rootPath).items) {
    if (profilePermissions.get(item.id) === true) continue;
    for (const key of ["kind", "title", "subtitle", "description", "startDate", "endDate", "url"] as const) {
      exclude(item[key]);
    }
  }

  const literals = [...denied].sort((left, right) => right.length - left.length);
  if (literals.length === 0) return { ...source };
  const escaped = literals.map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const copies = new RegExp(escaped.join("|"), "g");
  const project = (value: string) => value.replace(copies, "[Excluded]");
  return { title: project(source.title), url: project(source.url), sourceText: project(source.sourceText) };
}

/** The application identity stays local; unsaved pasted tasks have no saved disclosure scope. */
export function projectSavedApplicationInferenceRequest(
  rootPath: string,
  request: JobExtractionRequest,
): Omit<JobExtractionRequest, "candidatureId"> {
  const source = request.candidatureId
    ? projectCandidatureSourceForAi(rootPath, request.candidatureId, {
      title: request.sourceTitle, url: request.sourceUrl, sourceText: request.sourceText,
    })
    : { title: request.sourceTitle, url: request.sourceUrl, sourceText: request.sourceText };
  return { sourceTitle: source.title, sourceUrl: source.url, sourceText: source.sourceText };
}
