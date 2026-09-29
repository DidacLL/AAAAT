// @vitest-environment node

import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const currentPrerequisiteSurfaces = [
  "src/renderer/SetupEnvironmentPanel.tsx",
  "docs/USER_GUIDE.md",
  "docs/adr/0004-async-document-rendering.md",
  "docs/adr/0019-shared-setup-environment-snapshot.md",
] as const;

describe("direct pdfLaTeX prerequisite", () => {
  for (const relativePath of currentPrerequisiteSurfaces) {
    it(`${relativePath} does not present latexmk as a current prerequisite`, () => {
      const content = readFileSync(path.resolve(relativePath), "utf8");
      expect(content).not.toMatch(/latexmk/iu);
      expect(content).toMatch(/pdflatex/iu);
    });
  }
});
