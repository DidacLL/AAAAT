import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "src/renderer/candidature-recovery.css"),
  "utf8",
);

describe("Applications responsive layout", () => {
  it("keeps the corpus fluid at expanded widths without fixed card rows", () => {
    expect(css).toMatch(/\.candidature-corpus-grid\s*\{[^}]*display:\s*flex;[^}]*flex-wrap:\s*wrap;/s);
    expect(css).toMatch(/\.candidature-corpus-card\s*\{[^}]*flex:\s*1 1 245px;[^}]*max-width:\s*min\(100%, 330px\);/s);
  });

  it("collapses selected information to one column in the constrained layout", () => {
    expect(css).toMatch(/\.candidature-primary-grid,[\s\S]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(100%, 250px\), 1fr\)\);/);
    expect(css).toMatch(/@media \(max-width:\s*760px\)[\s\S]*\.candidature-primary-grid,[\s\S]*grid-template-columns:\s*1fr;/);
  });
});
