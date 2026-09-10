import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  ConceptRecord,
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
  if (!normalized) return null;

  const title = record.label.replace(/\s+/g, " ").trim();
  const sourceLower = normalized.toLocaleLowerCase();
  const titleLower = title.toLocaleLowerCase();
  const distinct =
    title && sourceLower.startsWith(titleLower)
      ? normalized.slice(title.length).replace(/^[\s·|:;,.\-–—]+/, "").trim()
      : normalized;
  if (!distinct || titleLower.includes(distinct.toLocaleLowerCase())) return null;

  const value = distinct.length > 112 ? `${distinct.slice(0, 109).trimEnd()}…` : distinct;
  return { label: "Source", value };
}

function matchingExcerpt(text: string, query: string, limit = 112): string | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  const needle = query.trim().toLocaleLowerCase();
  if (!normalized || !needle) return null;
  const index = normalized.toLocaleLowerCase().indexOf(needle);
  if (index < 0) return null;
  if (normalized.length <= limit) return normalized;

  const context = Math.max(16, Math.floor((limit - needle.length) / 2));
  let start = Math.max(0, index - context);
  let end = Math.min(normalized.length, index + needle.length + context);
  if (end - start < limit) {
    if (start === 0) end = Math.min(normalized.length, limit);
    else if (end === normalized.length) start = Math.max(0, normalized.length - limit);
  }
  const excerpt = normalized.slice(start, end).trim();
  return `${start > 0 ? "…" : ""}${excerpt}${end < normalized.length ? "…" : ""}`;
}

export function candidatureSearchMatchCue(
  record: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  concepts: readonly ConceptRecord[],
  query: string,
): CandidatureRecognitionCue | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  if (record.label.toLocaleLowerCase().includes(normalizedQuery.toLocaleLowerCase())) return null;

  const fieldById = new Map(fields.map((field) => [field.definition.id, field]));
  for (const retained of record.values) {
    const field = fieldById.get(retained.fieldId);
    if (!field) continue;
    const value = displayValue(field, retained.value);
    const excerpt = matchingExcerpt(value, normalizedQuery, 96);
    if (excerpt) return { label: field.definition.label, value: excerpt };
  }

  const sourceExcerpt = matchingExcerpt(record.sourceSearchText, normalizedQuery);
  if (sourceExcerpt) return { label: "Source match", value: sourceExcerpt };

  for (const concept of concepts) {
    if (!record.conceptIds.includes(concept.id)) continue;
    const candidates = [concept.name, ...concept.aliases, concept.definition, concept.notes ?? ""];
    if (candidates.some((candidate) => matchingExcerpt(candidate, normalizedQuery) !== null)) {
      return { label: "Concept match", value: concept.name };
    }
  }

  return null;
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
