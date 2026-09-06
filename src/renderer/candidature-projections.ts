import type { CandidatureRecord } from "../shared/contracts";

export type ArchiveFilter = "active" | "archived" | "all";

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
