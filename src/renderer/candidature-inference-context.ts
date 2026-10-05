import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
} from "../shared/contracts";
import { compactSourceText } from "../shared/source-text";

function displayValue(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): string {
  const one = (item: string | number | boolean): string => {
    if (field.definition.valueType === "choice" && typeof item === "string") {
      return field.definition.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    return String(item);
  };
  return Array.isArray(value) ? value.map(one).join(", ") : one(value);
}

/** Shared by request preflight and task execution so both use the same retained-information boundary. */
export function candidatureInferenceContext(
  candidature: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  sources: readonly CandidatureSource[],
  targetFieldIds: ReadonlySet<string>,
): string {
  const retained = candidature.values.flatMap((item) => {
    if (targetFieldIds.has(item.fieldId)) return [];
    const field = fields.find((candidate) => candidate.definition.id === item.fieldId);
    if (!field?.preferences.aiUseAllowed) return [];
    return [`${field.definition.label}: ${displayValue(field, item.value)}`];
  });

  const parts = sources.map((source, index) =>
    [
      `Retained Source ${index + 1}`,
      source.title ? `Title: ${source.title}` : "",
      source.url ? `URL: ${source.url}` : "",
      compactSourceText(source.sourceText),
    ]
      .filter(Boolean)
      .join("\n"),
  );

  if (retained.length > 0) {
    parts.push(
      `Already retained information allowed for AI use:\n${retained.join("\n")}`,
    );
  }
  return parts.join("\n\n---\n\n").slice(0, 50000).trim();
}


/** Tag inference intentionally receives retained Sources without application-field values. */
export function candidatureTagInferenceContext(
  sources: readonly CandidatureSource[],
): string {
  return sources
    .map((source, index) =>
      [
        `Retained Source ${index + 1}`,
        source.title ? `Title: ${source.title}` : "",
        source.url ? `URL: ${source.url}` : "",
        compactSourceText(source.sourceText),
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n\n---\n\n")
    .slice(0, 50000)
    .trim();
}
