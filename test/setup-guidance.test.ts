import { describe, expect, it } from "vitest";

import { buildSetupGuidance } from "../src/renderer/setup-guidance";
import type { SetupEnvironmentSnapshot } from "../src/shared/setup-environment-contracts";

const operations = [
  { operation: "opportunity_review" as const, available: false, connectionName: null },
  { operation: "job_extraction" as const, available: false, connectionName: null },
  { operation: "historical_field_discovery" as const, available: false, connectionName: null },
  { operation: "variant_recommendation" as const, available: false, connectionName: null },
  { operation: "cv_tailoring" as const, available: false, connectionName: null },
  { operation: "cover_letter_draft" as const, available: false, connectionName: null },
];

function snapshot(overrides: Partial<SetupEnvironmentSnapshot> = {}): SetupEnvironmentSnapshot {
  return {
    workspaceReady: true,
    tex: {
      commands: [
        { command: "latexmk", available: true, version: "Sensitive Latexmk version" },
        { command: "pdflatex", available: true, version: "Sensitive pdfTeX version" },
      ],
      documentRenderingReady: true,
    },
    ai: {
      configurationReadable: true,
      connectionCount: 0,
      operations,
    },
    ...overrides,
  };
}

describe("setup free-chat guidance", () => {
  it("preserves ready TeX and complete zero-AI use without disclosing unnecessary setup details", () => {
    const [installer, configurator] = buildSetupGuidance(snapshot());

    expect(installer.name).toBe("installer.ai");
    expect(installer.text).toContain("latexmk: available");
    expect(installer.text).toContain("pdflatex: available");
    expect(installer.text).toContain("no TeX installation is needed");
    expect(installer.text).not.toContain("Sensitive Latexmk version");
    expect(installer.text).not.toContain("Sensitive pdfTeX version");

    expect(configurator.name).toBe("configurator.ai");
    expect(configurator.text).toContain("0 configured local AI connections");
    expect(configurator.text).toContain("AI is optional");
    expect(configurator.text).toContain("Fit assessment: no validated route");
  });

  it("identifies only missing TeX and validated operation status without connection-name disclosure", () => {
    const [installer, configurator] = buildSetupGuidance(
      snapshot({
        tex: {
          commands: [
            { command: "latexmk", available: false, version: null },
            { command: "pdflatex", available: true, version: "Sensitive pdfTeX version" },
          ],
          documentRenderingReady: false,
        },
        ai: {
          configurationReadable: true,
          connectionCount: 1,
          operations: operations.map((status) =>
            status.operation === "opportunity_review"
              ? { ...status, available: true, connectionName: "Private connection name" }
              : status,
          ),
        },
      }),
    );

    expect(installer.text).toContain("latexmk: missing");
    expect(installer.text).toContain("pdflatex: available");
    expect(installer.text).toContain("Guide only the missing prerequisite(s) above");
    expect(installer.text).toContain("Ask which operating system/distribution they use");

    expect(configurator.text).toContain("1 configured local AI connection");
    expect(configurator.text).toContain("Fit assessment: validated route available");
    expect(configurator.text).toContain("Job extraction: no validated route");
    expect(configurator.text).not.toContain("Private connection name");
  });
});
