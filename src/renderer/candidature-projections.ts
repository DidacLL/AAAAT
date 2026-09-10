import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../shared/contracts";

export type ArchiveFilter = "active" | "archived" | "all";

export interface CandidatureRecognitionCue {
  readonly label: string;
  readonly value: string;
}

function scalarValue(
  field: CandidatureFieldConfiguration,
  value: string | number | boolean,
): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (field.definition.valueType === "choice" && typeof value === "string") {
    return field.definition.choices.find((choice) => choice.id === value)?.label ?? value;
  }
  return String(value);
}

function displayValue(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): string {
  const displayed = Array.isArray(value)
    ? value.map((item) => scalarValue(field, item)).join(", ")
    : scalarValue(field, value);
  return displayed.length > 96 ? `${displayed.slice(0, 93).trimEnd()}…` : displayed;
}

function sourceCue(record: CandidatureRecord): CandidatureRecognitionCue | null {
  const normalized = record.sourceSearchText.replace(/\s+/g, " ").trim();
  if (!normalized || record.label.toLocaleLowerCase().includes(normalized.toLocaleLowerCase())) {
    return null;
  }
  const value = normalized.length > 112 ? `${normalized.slice(0, 109).trimEnd()}…` : normalized;
  return { label: "Source", value };
}

export function candidatureRecognitionCues(
  record: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  limit = 2,
): CandidatureRecognitionCue[] {
  if (limit <= 0) return [];
  const title = record.label.toLocaleLowerCase();
  const fieldById = new Map(fields.map((field) => [field.definition.id, field]));
  const cues = record.values
    .flatMap((retained) => {
      const field = fieldById.get(retained.fieldId);
      if (!field) return [];
      const value = displayValue(field, retained.value).trim();
      if (!value || title.includes(value.toLocaleLowerCase())) return [];
      return [{ field, label: field.definition.label, value }];
    })
    .sort((left, right) => {
      if (left.field.preferences.focusVisible !== right.field.preferences.focusVisible) {
        return left.field.preferences.focusVisible ? -1 : 1;
      }
      const leftOrder = left.field.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.field.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.label.localeCompare(right.label);
    })
    .slice(0, limit)
    .map(({ label, value }) => ({ label, value }));

  if (cues.length < limit) {
    const fallback = sourceCue(record);
    if (fallback && !cues.some((cue) => cue.value === fallback.value)) cues.push(fallback);
  }
  return cues.slice(0, limit);
}

export function filterCandidatures(
  records: readonly CandidatureRecord[],
  archive: ArchiveFilter,
  fieldMatches: ReadonlySet<string> | null = null,
  textMatches: ReadonlySet<string> | null = null,
): CandidatureRecord[] {
  return records.filter((record) => {
    if (archive === "active" && record.archived) return false;
    if (archive === "archived" && !record.archived) return false;
    if (fieldMatches && !fieldMatches.has(record.id)) return false;
    if (textMatches && !textMatches.has(record.id)) return false;
    return true;
  });
}
