import { describe, expect, it } from "vitest";

import {
  candidatureRecognitionCues,
  candidatureSearchMatchCue,
  filterCandidatures,
} from "../src/renderer/candidature-projections";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  TagRecord,
} from "../src/shared/contracts";

function record(id: string, archived = false): CandidatureRecord {
  return {
    id,
    archived,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
    sourceSearchText: "",
    values: [],
    tagIds: [],
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
    aiUseAllowed: false,
  },
};

const roleField: CandidatureFieldConfiguration = {
  definition: {
    ...locationField.definition,
    id: "00000000-0000-4000-8000-000000000422",
    label: "Role",
  },
  preferences: {
    ...locationField.preferences,
    fieldId: "00000000-0000-4000-8000-000000000422",
    focusVisible: true,
    focusOrder: 0,
  },
};

const reliabilityTag: TagRecord = {
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

  it("ordinary corpus cues contain only starred fields", () => {
    const candidateId = "00000000-0000-4000-8000-000000000417";
    const candidate = {
      ...record(candidateId),
      values: [
        {
          candidatureId: candidateId,
          fieldId: locationField.definition.id,
          value: "Madrid",
          createdAt: "2026-09-04T00:00:00.000Z",
          updatedAt: "2026-09-04T00:00:00.000Z",
        },
        {
          candidatureId: candidateId,
          fieldId: roleField.definition.id,
          value: "Pilot",
          createdAt: "2026-09-04T00:00:00.000Z",
          updatedAt: "2026-09-04T00:00:00.000Z",
        },
      ],
      sourceSearchText: "Recruiter note that should remain searchable but not fill Focus.",
    };

    expect(candidatureRecognitionCues(candidate, [locationField, roleField], 3)).toEqual([
      { label: "Role", value: "Pilot" },
    ]);
  });

  it("does not use raw Source as an automatic ordinary corpus cue", () => {
    const sourceOnly = {
      ...record("00000000-0000-4000-8000-000000000413"),
      sourceSearchText: "Nimbus Labs is hiring a platform engineer in Barcelona.",
    };

    expect(candidatureRecognitionCues(sourceOnly, [])).toEqual([]);
  });

  it("changes corpus cue visibility and ordering when favourite preferences change", () => {
    const candidateId = "00000000-0000-4000-8000-000000000418";
    const candidate = {
      ...record(candidateId),
      values: [
        {
          candidatureId: candidateId,
          fieldId: locationField.definition.id,
          value: "Madrid",
          createdAt: "2026-09-04T00:00:00.000Z",
          updatedAt: "2026-09-04T00:00:00.000Z",
        },
        {
          candidatureId: candidateId,
          fieldId: roleField.definition.id,
          value: "Pilot",
          createdAt: "2026-09-04T00:00:00.000Z",
          updatedAt: "2026-09-04T00:00:00.000Z",
        },
      ],
    };
    const visibleLocation = {
      ...locationField,
      preferences: { ...locationField.preferences, focusVisible: true, focusOrder: 0 },
    };
    const reorderedRole = {
      ...roleField,
      preferences: { ...roleField.preferences, focusOrder: 1 },
    };

    expect(candidatureRecognitionCues(candidate, [visibleLocation, reorderedRole], 3)).toEqual([
      { label: "Location", value: "Madrid" },
      { label: "Role", value: "Pilot" },
    ]);
    expect(
      candidatureRecognitionCues(candidate, [
        { ...visibleLocation, preferences: { ...visibleLocation.preferences, focusOrder: 2 } },
        { ...reorderedRole, preferences: { ...reorderedRole.preferences, focusOrder: 0 } },
      ], 3),
    ).toEqual([
      { label: "Role", value: "Pilot" },
      { label: "Location", value: "Madrid" },
    ]);
  });

  it("explains retained-information matches from either the field label or retained value without depending on a hidden candidature identity", () => {
    const candidate = {
      ...record("00000000-0000-4000-8000-000000000414"),
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

    expect(candidatureSearchMatchCue(candidate, [locationField], [], "Location")).toEqual({
      label: "Location",
      value: "Barcelona hybrid",
    });
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

  it("identifies an associated Tag match without adding generic Source fallback", () => {
    const candidate = {
      ...record("00000000-0000-4000-8000-000000000416"),
      tagIds: [reliabilityTag.id],
      sourceSearchText: "Platform role",
    };

    expect(candidatureSearchMatchCue(candidate, [], [reliabilityTag], "incident")).toEqual({
      label: "Tag match",
      value: "Reliability engineering",
    });
    expect(candidatureSearchMatchCue(candidate, [], [reliabilityTag], "unavailable phrase")).toBeNull();
    expect(candidatureRecognitionCues(candidate, [])).toEqual([]);
  });
});
