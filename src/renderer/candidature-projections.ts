import type {
  CandidatureRecord,
  CandidatureStatus,
  ConceptRecord,
} from "../shared/contracts";

export type ArchiveFilter = "active" | "archived" | "all";
export type StatusFilter = "all" | CandidatureStatus;

function searchableText(
  record: CandidatureRecord,
  concepts: readonly ConceptRecord[],
): string {
  const associatedConceptText = concepts
    .filter((concept) => record.conceptIds.includes(concept.id))
    .flatMap((concept) => [concept.name, ...concept.aliases])
    .join(" ");

  return [
    record.company,
    record.role,
    record.location,
    record.workMode,
    record.salaryText,
    record.source,
    record.sourceUrl,
    record.sourceText,
    record.nextAction,
    record.notes,
    associatedConceptText,
  ]
    .join(" ")
    .toLocaleLowerCase();
}

export function filterCandidatures(
  records: readonly CandidatureRecord[],
  concepts: readonly ConceptRecord[],
  query: string,
  status: StatusFilter,
  archive: ArchiveFilter,
): CandidatureRecord[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return records.filter((record) => {
    if (status !== "all" && record.status !== status) return false;
    if (archive === "active" && record.archived) return false;
    if (archive === "archived" && !record.archived) return false;
    return normalizedQuery.length === 0 || searchableText(record, concepts).includes(normalizedQuery);
  });
}
