import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shellCss = readFileSync(resolve(process.cwd(), "src/renderer/shell.css"), "utf8");
const tagCss = readFileSync(resolve(process.cwd(), "src/renderer/tag-glossary.css"), "utf8");

describe("constrained shell support surfaces", () => {
  it("stacks the desktop rail without keeping the Tag glossary expanded over ordinary work", () => {
    expect(shellCss).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*\.work-shell\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/,
    );
    expect(tagCss).toMatch(
      /@media \(max-width:\s*900px\)[\s\S]*\.tag-visor-heading span,[\s\S]*\.tag-visor-results,[\s\S]*\.tag-visor-readout\s*\{[^}]*display:\s*none;/,
    );
    expect(tagCss).toMatch(
      /\.tag-visor:focus-within \.tag-visor-results,[\s\S]*\.tag-visor:focus-within \.tag-visor-readout\s*\{[^}]*display:\s*grid;/,
    );
  });
});
