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
  it("packs collapsed card favourites into dense columns with distinct bounded heights", () => {
    expect(css).toMatch(/\.candidature-corpus-grid\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
    expect(css).toMatch(/\.candidature-corpus-card\s*\{[^}]*flex:\s*1 1 280px;[^}]*max-width:\s*420px;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-recognition-cues\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(12, minmax\(0, 1fr\)\);[^}]*grid-auto-flow:\s*dense;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-cue-size-compact\s*\{[^}]*grid-column:\s*span 4;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-cue-size-normal\s*\{[^}]*grid-column:\s*span 6;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-cue-size-wide\s*\{[^}]*grid-column:\s*span 8;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-cue-size-compact \.candidature-cue-value\s*\{[^}]*-webkit-line-clamp:\s*2;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-cue-size-normal \.candidature-cue-value\s*\{[^}]*-webkit-line-clamp:\s*3;/s);
    expect(css).toMatch(/\.candidature-corpus-card \.candidature-cue-size-wide \.candidature-cue-value\s*\{[^}]*-webkit-line-clamp:\s*4;/s);
  });

  it("expands naturally, reveals more reading height, and still densely composes values", () => {
    expect(css).toMatch(/\.candidature-corpus-card-preselected\s*\{[^}]*flex:\s*2 1 580px;[^}]*max-width:\s*min\(100%, 760px\);/s);
    expect(css).toMatch(/\.candidature-corpus-card-preselected \.candidature-cue-size-compact\s*\{[^}]*grid-column:\s*span 4;/s);
    expect(css).toMatch(/\.candidature-corpus-card-preselected \.candidature-cue-size-normal\s*\{[^}]*grid-column:\s*span 5;/s);
    expect(css).toMatch(/\.candidature-corpus-card-preselected \.candidature-cue-size-wide\s*\{[^}]*grid-column:\s*span 8;/s);
    expect(css).toMatch(/\.candidature-corpus-card-preselected \.candidature-cue-size-compact \.candidature-cue-value\s*\{[^}]*-webkit-line-clamp:\s*3;/s);
    expect(css).toMatch(/\.candidature-corpus-card-preselected \.candidature-cue-size-normal \.candidature-cue-value\s*\{[^}]*-webkit-line-clamp:\s*5;/s);
    expect(css).toMatch(/\.candidature-corpus-card-preselected \.candidature-cue-size-wide \.candidature-cue-value\s*\{[^}]*-webkit-line-clamp:\s*7;/s);
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
