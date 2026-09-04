import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  ConceptRecord,
} from "../shared/contracts";

export type ArchiveFilter = "active" | "archived" | "all";

function displayValue(
  field: CandidatureFieldConfiguration | undefined,
  value: CandidatureRuntimeValue,
): string {
  const displayOne = (item: string | number | boolean): string => {
    if (field?.definition.valueType === "choice" && typeof item === "string") {
      return field.definition.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    return String(item);
  };
  return Array.isArray(value) ? value.map(displayOne).join(" ") : displayOne(value);
}

function searchableText(
  record: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  concepts: readonly ConceptRecord[],
): string {
  const fieldMap = new Map(fields.map((field) => [field.definition.id, field]));
  const associatedConceptText = concepts
    .filter((concept) => record.conceptIds.includes(concept.id))
    .flatMap((concept) => [concept.name, ...concept.aliases])
    .join(" ");
  return [
    record.label,
    ...record.values.map((value) => displayValue(fieldMap.get(value.fieldId), value.value)),
    associatedConceptText,
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function filterCandidatures(
  records: readonly CandidatureRecord[],
  fields: readonly CandidatureFieldConfiguration[],
  concepts: readonly ConceptRecord[],
  query: string,
  archive: ArchiveFilter,
  fieldMatches: ReadonlySet<string> | null = null,
): CandidatureRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    if (archive === "active" && record.archived) return false;
    if (archive === "archived" && !record.archived) return false;
    if (fieldMatches && !fieldMatches.has(record.id)) return false;
    return normalizedQuery.length === 0 || searchableText(record, fields, concepts).includes(normalizedQuery);
  });
}
