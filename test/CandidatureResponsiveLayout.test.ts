import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "src/renderer/candidature-recovery.css"),
  "utf8",
);
const workspace = readFileSync(
  resolve(process.cwd(), "src/renderer/CandidaturesWorkspace.tsx"),
  "utf8",
);

describe("Applications responsive layout", () => {
  it("uses dense two-dimensional cue footprints instead of shared fixed-height rows", () => {
    expect(css).toMatch(/\.candidature-corpus-grid\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
    expect(css).toMatch(/\.candidature-corpus-card\s*\{[^}]*flex:\s*1 1 280px;[^}]*max-width:\s*420px;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-recognition-cues\s*\{[^}]*grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\);[^}]*grid-auto-rows:\s*1\.08rem;[^}]*grid-auto-flow:\s*dense;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-recognition-cue\s*\{[^}]*grid-column:\s*span var\(--cue-columns\);[^}]*grid-row:\s*span var\(--cue-rows\);/s);
    expect(css).toMatch(/-webkit-line-clamp:\s*var\(--cue-lines\);/);
    expect(workspace).toContain('"--cue-columns": footprint.columns');
    expect(workspace).toContain('"--cue-rows": footprint.rows');
    expect(workspace).toContain('"--cue-lines": footprint.lines');
  });

  it("gives expanded cards more physical room and a larger content-derived reading budget", () => {
    expect(css).toMatch(/\.candidature-corpus-card-preselected\s*\{[^}]*flex:\s*2 1 600px;[^}]*max-width:\s*min\(100%, 780px\);/s);
    expect(css).toMatch(/\.candidature-corpus-card-preselected \.candidature-recognition-cues\s*\{[^}]*grid-auto-rows:\s*1\.12rem;/s);
    expect(workspace).toContain("candidatureCueFootprint(cue, preselected)");
  });

  it("keeps selected application geometry independent from corpus prominence", () => {
    expect(workspace).toContain('className="retained-information-card candidature-information-unit"');
    expect(workspace).not.toContain("candidature-unit-size-${field.preferences.presentationSize}");
    expect(workspace).toContain("Corpus card prominence");
    expect(workspace).toContain("corpus card prominence");
  });

  it("collapses selected information to one column in the constrained layout", () => {
    expect(css).toMatch(/\.candidature-primary-grid,[\s\S]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 250px\), 1fr\)\);/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.candidature-primary-grid,[\s\S]*grid-template-columns:\s*1fr;/);
  });
});
