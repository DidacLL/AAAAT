import { describe, expect, it } from "vitest";

import { filterCandidatures } from "../src/renderer/candidature-projections";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  ConceptRecord,
} from "../src/shared/contracts";

const hoursField: CandidatureFieldConfiguration = {
  definition: {
    id: "00000000-0000-4000-8000-000000000401",
    systemKey: null,
    label: "Minimum flight hours",
    description: "Minimum flight hours requested.",
    valueType: "number",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  preferences: {
    fieldId: "00000000-0000-4000-8000-000000000401",
    focusVisible: true,
    focusOrder: 0,
    focusProminence: "normal",
    identityOrder: null,
    aiDiscovery: true,
    aiContextMode: "expose",
  },
};

const concept: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000402",
  name: "A320",
  definition: "Airbus A320 family experience.",
  aliases: ["Type rating"],
};

function record(
  id: string,
  value: number | null,
  archived = false,
  conceptIds: string[] = [],
): CandidatureRecord {
  return {
    id,
    archived,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    label: value === null ? "Sparse candidature" : `Pilot opportunity ${value}`,
    values:
      value === null
        ? []
        : [
            {
              candidatureId: id,
              fieldId: hoursField.definition.id,
              value,
              createdAt: "2026-09-04T00:00:00.000Z",
              updatedAt: "2026-09-04T00:00:00.000Z",
            },
          ],
    documentIds: [],
    conceptIds,
  };
}

describe("candidature renderer projection", () => {
  it("searches retained dynamic values and associated concept aliases while respecting archive and field filters", () => {
    const active = record(
      "00000000-0000-4000-8000-000000000410",
      1500,
      false,
      [concept.id],
    );
    const sparse = record("00000000-0000-4000-8000-000000000411", null);
    const archived = record("00000000-0000-4000-8000-000000000412", 800, true);

    expect(
      filterCandidatures([active, sparse, archived], [hoursField], [concept], "1500", "active"),
    ).toEqual([active]);
    expect(
      filterCandidatures([active, sparse, archived], [hoursField], [concept], "Type rating", "all"),
    ).toEqual([active]);
    expect(
      filterCandidatures(
        [active, sparse, archived],
        [hoursField],
        [concept],
        "",
        "all",
        new Set([archived.id]),
      ),
    ).toEqual([archived]);
    expect(
      filterCandidatures([active, sparse, archived], [hoursField], [concept], "", "archived"),
    ).toEqual([archived]);
  });
});
