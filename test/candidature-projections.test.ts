import { describe, expect, it } from "vitest";

import {
  candidatureRecognitionCues,
  candidatureSearchMatchCue,
  filterCandidatures,
} from "../src/renderer/candidature-projections";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  ConceptRecord,
} from "../src/shared/contracts";

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

const locationField: CandidatureFieldConfiguration = {
  definition: {
    id: "00000000-0000-4000-8000-000000000420",
    systemKey: null,
    label: "Location",
    description: "",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  preferences: {
    fieldId: "00000000-0000-4000-8000-000000000420",
    focusVisible: false,
    focusOrder: null,
    focusProminence: "normal",
    identityOrder: null,
    aiDiscovery: false,
    aiContextMode: "omit",
  },
};

const reliabilityConcept: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000421",
  name: "Reliability engineering",
  definition: "Operating dependable production systems",
  aliases: ["SRE"],
  notes: "Ask about incident ownership",
};

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

  it("uses the source continuation when the candidature label came from the source prefix", () => {
    const sourceText =
      "Nimbus Labs is hiring a platform engineer in Barcelona with hybrid work and a small infrastructure team.";
    const derivedLabel = sourceText.slice(0, 80);
    const rawFirst = {
      ...record("00000000-0000-4000-8000-000000000413"),
      label: derivedLabel,
      sourceSearchText: sourceText,
    };

    expect(candidatureRecognitionCues(rawFirst, [])).toEqual([
      { label: "Source", value: sourceText.slice(80).trim() },
    ]);
  });

  it("explains retained-information matches without duplicating a visible label match", () => {
    const candidate = {
      ...record("00000000-0000-4000-8000-000000000414"),
      label: "Nimbus Labs",
      values: [
        {
          candidatureId: "00000000-0000-4000-8000-000000000414",
          fieldId: locationField.definition.id,
          value: "Barcelona hybrid",
          createdAt: "2026-09-04T00:00:00.000Z",
          updatedAt: "2026-09-04T00:00:00.000Z",
        },
      ],
    };

    expect(candidatureSearchMatchCue(candidate, [locationField], [], "hybrid")).toEqual({
      label: "Location",
      value: "Barcelona hybrid",
    });
    expect(candidatureSearchMatchCue(candidate, [locationField], [], "Nimbus")).toBeNull();
  });

  it("shows a bounded Source excerpt around the actual matching phrase", () => {
    const candidate = {
      ...record("00000000-0000-4000-8000-000000000415"),
      sourceSearchText:
        `${"Introductory material ".repeat(10)}security clearance required for this role ${"closing material ".repeat(10)}`,
    };

    const cue = candidatureSearchMatchCue(candidate, [], [], "security clearance");
    expect(cue?.label).toBe("Source match");
    expect(cue?.value).toContain("security clearance");
    expect(cue?.value.length).toBeLessThanOrEqual(114);
    expect(cue?.value.startsWith("…")).toBe(true);
    expect(cue?.value.endsWith("…")).toBe(true);
  });

  it("identifies an associated Concept match and otherwise leaves generic recognition as fallback", () => {
    const candidate = {
      ...record("00000000-0000-4000-8000-000000000416"),
      conceptIds: [reliabilityConcept.id],
      sourceSearchText: "Platform role",
    };

    expect(candidatureSearchMatchCue(candidate, [], [reliabilityConcept], "incident")).toEqual({
      label: "Concept match",
      value: "Reliability engineering",
    });
    expect(candidatureSearchMatchCue(candidate, [], [reliabilityConcept], "unavailable phrase")).toBeNull();
    expect(candidatureRecognitionCues(candidate, [])).toEqual([
      { label: "Source", value: "Platform role" },
    ]);
  });
});
