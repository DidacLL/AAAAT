import {
  candidatureSearchInputSchema,
  candidatureSearchResultSchema,
  type CandidatureSearchInput,
  type CandidatureSearchResult,
} from "../shared/candidature-search-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  ConceptRecord,
} from "../shared/contracts";
import { listCandidatureFields } from "./candidature-field-service";
import { listCandidatures } from "./candidature-service";
import { listConcepts } from "./concept-service";

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
  const retainedInformationText = record.values.flatMap((value) => {
    const field = fieldMap.get(value.fieldId);
    return [field?.definition.label ?? "", displayValue(field, value.value)];
  });
  const associatedConceptText = concepts
    .filter((concept) => record.conceptIds.includes(concept.id))
    .flatMap((concept) => [concept.name, ...concept.aliases])
    .join(" ");
  return [
    record.label,
    record.sourceSearchText,
    ...retainedInformationText,
    associatedConceptText,
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function searchCandidatures(
  rootPath: string,
  rawInput: CandidatureSearchInput,
): CandidatureSearchResult {
  const { query } = candidatureSearchInputSchema.parse(rawInput);
  const normalizedQuery = query.toLocaleLowerCase();
  const fields = listCandidatureFields(rootPath);
  const concepts = listConcepts(rootPath);
  return candidatureSearchResultSchema.parse(
    listCandidatures(rootPath)
      .filter((record) => searchableText(record, fields, concepts).includes(normalizedQuery))
      .map((record) => record.id),
  );
}
