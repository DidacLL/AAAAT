import { describe, expect, it } from "vitest";

import { filterCandidatures } from "../src/renderer/candidature-projections";
import type { CandidatureRecord, ConceptRecord } from "../src/shared/contracts";

const concept: ConceptRecord = {
  id: "00000000-0000-4000-8000-000000000301",
  name: "TypeScript",
  definition: "Typed JavaScript",
  aliases: ["TS"],
};

function record(overrides: Partial<CandidatureRecord> = {}): CandidatureRecord {
  return {
    id: "00000000-0000-4000-8000-000000000302",
    company: "Acme",
    role: "Platform engineer",
    location: "Madrid",
    workMode: "Hybrid",
    salaryText: "",
    source: "Referral",
    sourceUrl: "",
    sourceText: "Platform role",
    status: "saved",
    applicationDate: "",
    nextAction: "Reply",
    nextActionDate: "",
    notes: "Discuss runtime ownership",
    archived: false,
    documentIds: [],
    conceptIds: [concept.id],
    ...overrides,
  };
}

describe("candidature projections", () => {
  it("filters loaded candidatures by useful text, associated concept aliases, status, and archive state", () => {
    const active = record();
    const archived = record({
      id: "00000000-0000-4000-8000-000000000303",
      company: "Archive Co",
      role: "Analyst",
      status: "closed",
      archived: true,
      conceptIds: [],
    });

    expect(filterCandidatures([active, archived], [concept], "TS", "all", "active")).toEqual([active]);
    expect(filterCandidatures([active, archived], [concept], "runtime", "saved", "active")).toEqual([active]);
    expect(filterCandidatures([active, archived], [concept], "", "closed", "archived")).toEqual([archived]);
    expect(filterCandidatures([active, archived], [concept], "missing", "all", "all")).toEqual([]);
  });
});
