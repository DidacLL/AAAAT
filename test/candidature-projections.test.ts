import { describe, expect, it } from "vitest";

import { filterCandidatures } from "../src/renderer/candidature-projections";
import type { CandidatureRecord } from "../src/shared/contracts";

function record(id: string, archived = false): CandidatureRecord {
  return {
    id,
    archived,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    label: `Candidature ${id}`,
    sourceSearchText: "",
    values: [],
    documentIds: [],
    conceptIds: [],
  };
}

describe("candidature renderer projection", () => {
  it("intersects local text matches with structured field and archive filters", () => {
    const active = record("00000000-0000-4000-8000-000000000410");
    const other = record("00000000-0000-4000-8000-000000000411");
    const archived = record("00000000-0000-4000-8000-000000000412", true);

    expect(
      filterCandidatures(
        [active, other, archived],
        "all",
        new Set([active.id, archived.id]),
        new Set([archived.id]),
      ),
    ).toEqual([archived]);
    expect(filterCandidatures([active, other, archived], "active")).toEqual([active, other]);
    expect(
      filterCandidatures([active, other, archived], "archived", null, new Set([archived.id])),
    ).toEqual([archived]);
  });
});
