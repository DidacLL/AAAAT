import type {
  CandidatureFieldConfiguration,
  CandidaturePresentationSize,
  CandidatureRecord,
  CandidatureRuntimeValue,
  TagRecord,
} from "../shared/contracts";

export type ArchiveFilter = "active" | "archived" | "all";
export type RecencyFilter = "all" | "24h" | "48h" | "72h" | "week" | "month";

const recencyWindowMs: Readonly<Record<Exclude<RecencyFilter, "all">, number>> = {
  "24h": 24 * 60 * 60 * 1000,
  "48h": 48 * 60 * 60 * 1000,
  "72h": 72 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
};

export interface CandidatureRecognitionCue {
  readonly fieldId: string;
  readonly label: string;
  readonly value: string;
  readonly presentationSize: CandidaturePresentationSize;
  readonly favourite: boolean;
}

export interface CandidatureRecognitionProjection {
  readonly primaryCues: readonly CandidatureRecognitionCue[];
  readonly retainedSourceCue: CandidatureRecognitionCue | null;
}

export interface CandidatureCueFootprint {
  readonly columns: number;
  readonly lines: number;
  readonly rows: number;
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
  limit = 96,
): string {
  const displayed = Array.isArray(value)
    ? value.map((item) => scalarValue(field, item)).join(", ")
    : scalarValue(field, value);
  const bounded = Math.max(2, limit);
  return displayed.length > bounded ? `${displayed.slice(0, bounded - 1).trimEnd()}…` : displayed;
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
  valueLimit = 96,
): CandidatureRecognitionCue[] {
  if (limit <= 0) return [];
  const fieldById = new Map(fields.map((field) => [field.definition.id, field]));
  const fieldOrder = new Map(fields.map((field, index) => [field.definition.id, index]));
  const displayable = record.values.flatMap((retained) => {
    const field = fieldById.get(retained.fieldId);
    if (!field?.definition.enabled) return [];
    const value = displayValue(field, retained.value, valueLimit).trim();
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
  const chosen = displayable.filter((cue) => cue.favourite);
  return chosen
    .sort((left, right) => {
      const leftOrder = left.field.preferences.favouriteOrder;
      const rightOrder = right.field.preferences.favouriteOrder;
      if (leftOrder !== null && rightOrder !== null && leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }
      if (leftOrder !== null && rightOrder === null) return -1;
      if (leftOrder === null && rightOrder !== null) return 1;
      return (fieldOrder.get(left.fieldId) ?? Number.MAX_SAFE_INTEGER) -
        (fieldOrder.get(right.fieldId) ?? Number.MAX_SAFE_INTEGER);
    })
    .slice(0, limit)
    .map((cue) => ({
      fieldId: cue.fieldId,
      label: cue.label,
      value: cue.value,
      presentationSize: cue.presentationSize,
      favourite: cue.favourite,
    }));
}

export function candidatureRetainedSourceCue(
  record: CandidatureRecord,
  limit = 120,
): CandidatureRecognitionCue | null {
  const normalized = record.sourceSearchText.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  const boundedLimit = Math.max(2, limit);
  const value = normalized.length > boundedLimit
    ? `${normalized.slice(0, boundedLimit - 1).trimEnd()}…`
    : normalized;
  return {
    fieldId: "retained-source",
    label: "Retained source",
    value,
    presentationSize: "wide",
    favourite: false,
  };
}


const cardCueColumns: Readonly<Record<CandidaturePresentationSize, number>> = {
  compact: 4,
  normal: 6,
  wide: 8,
};
const collapsedCardColumnBudget = 24;

const cardValueLimit: Readonly<Record<CandidaturePresentationSize, { readonly collapsed: number; readonly expanded: number }>> = {
  compact: { collapsed: 52, expanded: 220 },
  normal: { collapsed: 90, expanded: 520 },
  wide: { collapsed: 140, expanded: 1000 },
};

function boundCardCueValue(
  cue: CandidatureRecognitionCue,
  expanded: boolean,
): CandidatureRecognitionCue {
  const limit = cardValueLimit[cue.presentationSize][expanded ? "expanded" : "collapsed"];
  if (cue.value.length <= limit) return cue;
  return {
    ...cue,
    value: `${cue.value.slice(0, limit - 1).trimEnd()}…`,
  };
}

export function candidatureCueFootprint(
  cue: CandidatureRecognitionCue,
  expanded: boolean,
): CandidatureCueFootprint {
  const columns = cardCueColumns[cue.presentationSize];
  const maxLines = expanded
    ? cue.presentationSize === "wide" ? 7 : cue.presentationSize === "normal" ? 5 : 3
    : cue.presentationSize === "wide" ? 4 : cue.presentationSize === "normal" ? 3 : 2;
  const charactersPerColumn = expanded ? 4.2 : 3.2;
  const estimatedLineCapacity = Math.max(8, Math.floor(columns * charactersPerColumn));
  const estimatedLines = Math.max(1, Math.ceil(cue.value.length / estimatedLineCapacity));
  const lines = Math.min(maxLines, estimatedLines);
  return { columns, lines, rows: lines };
}

export function candidatureCardRecognitionProjection(
  record: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  expanded: boolean,
): CandidatureRecognitionProjection {
  const allFavouriteCues = candidatureRecognitionCues(
    record,
    fields,
    Number.MAX_SAFE_INTEGER,
    2000,
  ).map((cue) => boundCardCueValue(cue, expanded));
  let primaryCues: readonly CandidatureRecognitionCue[] = allFavouriteCues;
  if (!expanded) {
    let usedColumns = 0;
    const visible: CandidatureRecognitionCue[] = [];
    for (const cue of allFavouriteCues) {
      const footprint = candidatureCueFootprint(cue, false);
      if (usedColumns + footprint.columns > collapsedCardColumnBudget) break;
      visible.push(cue);
      usedColumns += footprint.columns;
    }
    primaryCues = visible;
  }
  return {
    primaryCues,
    retainedSourceCue: primaryCues.length === 0
      ? candidatureRetainedSourceCue(record, expanded ? 1000 : 140)
      : null,
  };
}

export function candidatureRecognitionProjection(
  record: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  limit = 4,
): CandidatureRecognitionProjection {
  const primaryCues = candidatureRecognitionCues(record, fields, limit);
  return {
    primaryCues,
    retainedSourceCue:
      primaryCues.length === 0 ? candidatureRetainedSourceCue(record) : null,
  };
}

export function filterCandidatures(
  records: readonly CandidatureRecord[],
  archive: ArchiveFilter,
  fieldMatches: ReadonlySet<string> | null = null,
  textMatches: ReadonlySet<string> | null = null,
  recency: RecencyFilter = "all",
  nowMs = Date.now(),
): CandidatureRecord[] {
  const windowMs = recency === "all" ? null : recencyWindowMs[recency];
  return records.filter((record) => {
    if (archive === "active" && record.archived) return false;
    if (archive === "archived" && !record.archived) return false;
    if (fieldMatches && !fieldMatches.has(record.id)) return false;
    if (textMatches && !textMatches.has(record.id)) return false;
    if (windowMs !== null) {
      const createdAt = Date.parse(record.createdAt);
      if (!Number.isFinite(createdAt) || createdAt > nowMs || nowMs - createdAt > windowMs) return false;
    }
    return true;
  });
}
