import type {
  CandidatureFieldConfiguration,
  CandidaturePresentationSize,
  CandidatureRecord,
  CandidatureRuntimeValue,
  TagRecord,
} from "../shared/contracts";

export type ArchiveFilter = "active" | "archived" | "all";

export interface CandidatureRecognitionCue {
  readonly fieldId: string;
  readonly label: string;
  readonly value: string;
  readonly presentationSize: CandidaturePresentationSize;
  readonly favourite: boolean;
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
  tags: readonly TagRecord[],
  query: string,
): CandidatureRecognitionCue | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return null;

  const fieldById = new Map(fields.map((field) => [field.definition.id, field]));
  for (const retained of record.values) {
    const field = fieldById.get(retained.fieldId);
    if (!field) continue;
    const value = displayValue(field, retained.value);
    const cue = {
      fieldId: field.definition.id,
      label: field.definition.label,
      presentationSize: field.preferences.presentationSize,
      favourite: field.preferences.favourite,
    };
    if (matchingExcerpt(field.definition.label, normalizedQuery) !== null) {
      return { ...cue, value };
    }
    const excerpt = matchingExcerpt(value, normalizedQuery, 96);
    if (excerpt) return { ...cue, value: excerpt };
  }

  const sourceExcerpt = matchingExcerpt(record.sourceSearchText, normalizedQuery);
  if (sourceExcerpt) {
    return {
      fieldId: "source-match",
      label: "Source match",
      value: sourceExcerpt,
      presentationSize: "wide",
      favourite: false,
    };
  }

  for (const tag of tags) {
    if (!record.tagIds.includes(tag.id)) continue;
    const candidates = [tag.name, ...tag.aliases, tag.definition, tag.notes ?? ""];
    if (candidates.some((candidate) => matchingExcerpt(candidate, normalizedQuery) !== null)) {
      return {
        fieldId: `tag-${tag.id}`,
        label: "Tag match",
        value: tag.name,
        presentationSize: "normal",
        favourite: false,
      };
    }
  }

  return null;
}

export function candidatureRecognitionCues(
  record: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  limit = 4,
): CandidatureRecognitionCue[] {
  if (limit <= 0) return [];
  const fieldById = new Map(fields.map((field) => [field.definition.id, field]));
  const displayable = record.values.flatMap((retained) => {
    const field = fieldById.get(retained.fieldId);
    if (!field?.definition.enabled) return [];
    const value = displayValue(field, retained.value).trim();
    if (!value) return [];
    return [{
      field,
      fieldId: field.definition.id,
      label: field.definition.label,
      value,
      presentationSize: field.preferences.presentationSize,
      favourite: field.preferences.favourite,
    }];
  });
  const favourites = displayable.filter((cue) => cue.favourite);
  const chosen = favourites.length > 0 ? favourites : displayable;
  return chosen
    .sort((left, right) => {
      if (favourites.length > 0) {
        const leftOrder = left.field.preferences.favouriteOrder ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = right.field.preferences.favouriteOrder ?? Number.MAX_SAFE_INTEGER;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      }
      return left.label.localeCompare(right.label);
    })
    .slice(0, limit)
    .map(({ field: _field, ...cue }) => cue);
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
