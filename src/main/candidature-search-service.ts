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
  TagRecord,
} from "../shared/contracts";
import { listCandidatureFields } from "./candidature-field-service";
import { listCandidatures } from "./candidature-service";
import { listTags } from "./tag-service";

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
  tags: readonly TagRecord[],
): string {
  const fieldMap = new Map(fields.map((field) => [field.definition.id, field]));
  const associatedTagText = tags
    .filter((tag) => record.tagIds.includes(tag.id))
    .flatMap((tag) => [tag.name, ...tag.aliases])
    .join(" ");
  return [
    record.label,
    record.sourceSearchText,
    ...record.values.flatMap((retained) => {
      const field = fieldMap.get(retained.fieldId);
      return [field?.definition.label ?? "", displayValue(field, retained.value)];
    }),
    associatedTagText,
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
  const tags = listTags(rootPath);
  return candidatureSearchResultSchema.parse(
    listCandidatures(rootPath)
      .filter((record) => searchableText(record, fields, tags).includes(normalizedQuery))
      .map((record) => record.id),
  );
}
