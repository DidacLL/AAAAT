import type { JobExtractionRequest } from "../shared/ai-contracts";
import { compactSourceText } from "../shared/source-text";
import { listCandidatureFields } from "./candidature-field-service";
import { getCandidature, listCandidatureSources } from "./candidature-service";

/** Build saved tasks from user-owned Sources and currently allowed retained information. */
export function savedApplicationInferenceRequest(
  rootPath: string,
  request: JobExtractionRequest,
  operation: "fields" | "tags",
  targetFieldIds: readonly string[] = [],
): Omit<JobExtractionRequest, "candidatureId"> {
  if (!request.candidatureId) return {
    sourceTitle: request.sourceTitle, sourceUrl: request.sourceUrl, sourceText: request.sourceText,
  };
  const candidatureId = request.candidatureId;
  const sources = listCandidatureSources(rootPath, candidatureId);
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
