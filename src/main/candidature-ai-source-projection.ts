import type { JobExtractionRequest } from "../shared/ai-contracts";
import { listCandidatureFields } from "./candidature-field-service";
import { compactSourceText } from "../shared/source-text";
import { getCandidature, listCandidatureSources } from "./candidature-service";
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
    for (const key of ["title", "subtitle", "description", "startDate", "endDate", "url"] as const) {
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

/** Build saved tasks from current Sources, projecting copies before mixing allowed field context. */
export function projectSavedApplicationInferenceRequest(
  rootPath: string,
  request: JobExtractionRequest,
  operation: "fields" | "tags",
  targetFieldIds: readonly string[] = [],
): Omit<JobExtractionRequest, "candidatureId"> {
  if (!request.candidatureId) return {
    sourceTitle: request.sourceTitle, sourceUrl: request.sourceUrl, sourceText: request.sourceText,
  };
  const candidatureId = request.candidatureId;
  const sources = listCandidatureSources(rootPath, candidatureId).map((source) =>
    projectCandidatureSourceForAi(rootPath, candidatureId, source));
  const parts = sources.map((source, index) => [
    `Offer or notes ${index + 1}`,
    source.title ? `Title: ${source.title}` : "",
    source.url ? `URL: ${source.url}` : "",
    compactSourceText(source.sourceText),
  ].filter(Boolean).join("\n"));
  if (operation === "fields") {
    const candidature = getCandidature(rootPath, candidatureId);
    const fields = new Map(listCandidatureFields(rootPath).map((field) => [field.definition.id, field]));
    const targets = new Set(targetFieldIds);
    const retained = candidature.values.flatMap((item) => {
      const field = fields.get(item.fieldId);
      if (!field?.preferences.aiUseAllowed || targets.has(item.fieldId)) return [];
      const choices = new Map(field.definition.choices.map((choice) => [choice.id, choice.label]));
      const visible = (value: string | number | boolean): string =>
        typeof value === "string" ? choices.get(value) ?? value : String(value);
      const value = Array.isArray(item.value) ? item.value.map(visible).join(", ") : visible(item.value);
      return [`${field.definition.label}: ${value}`];
    });
    if (retained.length) parts.push(`Already retained information allowed for AI use:\n${retained.join("\n")}`);
  }
  const sourceText = parts.join("\n\n---\n\n").slice(0, 50000).trim();
  if (!sourceText) throw new Error("Add an offer, notes or information before using AI for this application.");
  return { sourceTitle: sources[0]?.title ?? "", sourceUrl: sources[0]?.url ?? "", sourceText };
}
