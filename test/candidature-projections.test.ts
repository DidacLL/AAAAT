import { describe, expect, it } from "vitest";

import {
  candidatureRecognitionCues,
  candidatureRecognitionProjection,
  candidatureRetainedSourceCue,
  candidatureSearchMatchCue,
  filterCandidatures,
} from "../src/renderer/candidature-projections";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  TagRecord,
} from "../src/shared/contracts";

function record(
  id: string,
  archived = false,
  createdAt = "2026-09-04T00:00:00.000Z",
): CandidatureRecord {
  return {
    id,
    archived,
    createdAt,
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
    favourite: false,
    favouriteOrder: null,
    presentationSize: "normal",
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
    favourite: true,
    favouriteOrder: 0,
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

  it("uses createdAt rolling windows and intersects recency with archive and search matches", () => {
    const now = Date.parse("2026-10-02T10:00:00.000Z");
    const at = (hoursAgo: number) => new Date(now - hoursAgo * 60 * 60 * 1000).toISOString();
    const recent = record("00000000-0000-4000-8000-000000000430", false, at(23));
    const within48 = record("00000000-0000-4000-8000-000000000431", false, at(47));
    const within72 = record("00000000-0000-4000-8000-000000000432", false, at(71));
    const withinWeek = record("00000000-0000-4000-8000-000000000433", false, at(6 * 24));
    const withinMonth = record("00000000-0000-4000-8000-000000000434", false, at(29 * 24));
    const older = record("00000000-0000-4000-8000-000000000435", false, at(31 * 24));
    const archived = record("00000000-0000-4000-8000-000000000436", true, at(12));
    const records = [recent, within48, within72, withinWeek, withinMonth, older, archived];

    expect(filterCandidatures(records, "all", null, null, "24h", now)).toEqual([recent, archived]);
    expect(filterCandidatures(records, "active", null, null, "48h", now)).toEqual([recent, within48]);
    expect(filterCandidatures(records, "active", null, null, "72h", now)).toEqual([recent, within48, within72]);
    expect(filterCandidatures(records, "active", null, null, "week", now)).toEqual([recent, within48, within72, withinWeek]);
    expect(filterCandidatures(records, "active", null, null, "month", now)).toEqual([recent, within48, within72, withinWeek, withinMonth]);
    expect(filterCandidatures(records, "active", null, null, "all", now)).toEqual([
      recent, within48, within72, withinWeek, withinMonth, older,
    ]);
    expect(
      filterCandidatures(records, "archived", null, new Set([archived.id]), "24h", now),
    ).toEqual([archived]);
    expect(
      filterCandidatures(records, "active", null, new Set([within48.id, older.id]), "48h", now),
    ).toEqual([within48]);
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
      sourceSearchText: "Recruiter note that should remain searchable but not become ordinary corpus content.",
    };

    expect(candidatureRecognitionCues(candidate, [locationField, roleField], 3)).toEqual([
      expect.objectContaining({
        fieldId: roleField.definition.id,
        label: "Role",
        value: "Pilot",
        presentationSize: "normal",
        favourite: true,
      }),
    ]);
    expect(candidatureRecognitionProjection(candidate, [locationField, roleField], 3).retainedSourceCue)
      .toBeNull();
  });

  it("does not promote non-favourite values ahead of retained Source fallback", () => {
    const candidateId = "00000000-0000-4000-8000-000000000419";
    const candidate = {
      ...record(candidateId),
      sourceSearchText: "Recruiter note for a retained opportunity.",
      values: [{
        candidatureId: candidateId,
        fieldId: locationField.definition.id,
        value: "Madrid",
        createdAt: "2026-09-04T00:00:00.000Z",
        updatedAt: "2026-09-04T00:00:00.000Z",
      }],
    };

    expect(candidatureRecognitionCues(candidate, [locationField], 3)).toEqual([]);
    expect(candidatureRecognitionProjection(candidate, [locationField], 3)).toMatchObject({
      primaryCues: [],
      retainedSourceCue: {
        label: "Retained source",
        value: "Recruiter note for a retained opportunity.",
        favourite: false,
      },
    });
  });

  it("normalizes and bounds retained Source as an explicit recognition fallback", () => {
    const sourceOnly = {
      ...record("00000000-0000-4000-8000-000000000413"),
      sourceSearchText: `  Nimbus Labs   is hiring a platform engineer in Barcelona.\n${"Long detail ".repeat(20)}`,
    };

    expect(candidatureRecognitionCues(sourceOnly, [])).toEqual([]);
    const cue = candidatureRetainedSourceCue(sourceOnly, 80);
    expect(cue).toMatchObject({
      fieldId: "retained-source",
      label: "Retained source",
      presentationSize: "wide",
      favourite: false,
    });
    expect(cue?.value).toMatch(/^Nimbus Labs is hiring/);
    expect(cue?.value).not.toMatch(/\s{2,}/);
    expect(cue?.value.length).toBeLessThanOrEqual(80);
    expect(cue?.value.endsWith("…")).toBe(true);
  });

  it("keeps a neutral projection only when neither primary information nor Source is useful", () => {
    expect(candidatureRecognitionProjection(record("00000000-0000-4000-8000-000000000423"), []))
      .toEqual({ primaryCues: [], retainedSourceCue: null });
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
      preferences: { ...locationField.preferences, favourite: true, favouriteOrder: 0 },
    };
    const reorderedRole = {
      ...roleField,
      preferences: { ...roleField.preferences, favouriteOrder: 1 },
    };

    expect(candidatureRecognitionCues(candidate, [visibleLocation, reorderedRole], 3).map((cue) => cue.label)).toEqual([
      "Location",
      "Role",
    ]);
    expect(
      candidatureRecognitionCues(candidate, [
        { ...visibleLocation, preferences: { ...visibleLocation.preferences, favouriteOrder: 2 } },
        { ...reorderedRole, preferences: { ...reorderedRole.preferences, favouriteOrder: 0 } },
      ], 3),
    ).toEqual([
      expect.objectContaining({ label: "Role", value: "Pilot" }),
      expect.objectContaining({ label: "Location", value: "Madrid" }),
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

    expect(candidatureSearchMatchCue(candidate, [locationField], [], "Location")).toMatchObject({
      label: "Location",
      value: "Barcelona hybrid",
    });
    expect(candidatureSearchMatchCue(candidate, [locationField], [], "hybrid")).toMatchObject({
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

    expect(candidatureSearchMatchCue(candidate, [], [reliabilityTag], "incident")).toMatchObject({
      label: "Tag match",
      value: "Reliability engineering",
    });
    expect(candidatureSearchMatchCue(candidate, [], [reliabilityTag], "unavailable phrase")).toBeNull();
    expect(candidatureRecognitionCues(candidate, [])).toEqual([]);
  });
});
