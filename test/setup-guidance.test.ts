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

describe("shared setup harness projection", () => {
  it("models installation readiness without turning installer.ai into a prompt or exposing versions", () => {
    const [installer, configurator] = buildSetupGuidance(snapshot());

    expect(installer).toMatchObject({
      name: "installer.ai",
      state: "ready",
      title: "Installation & local prerequisites",
    });
    expect(installer.checks.map((check) => [check.label, check.ready])).toEqual([
      ["Workspace", true],
      ["latexmk", true],
      ["pdflatex", true],
    ]);
    expect(JSON.stringify(installer)).not.toContain("Sensitive Latexmk version");
    expect(JSON.stringify(installer)).not.toContain("Sensitive pdfTeX version");
    expect(installer.externalCapability).toMatch(/no shell/i);

    expect(configurator).toMatchObject({
      name: "configurator.ai",
      state: "optional",
      title: "Optional AI configuration",
    });
    expect(configurator.summary).toContain("AI is optional");
  });

  it("reports missing prerequisites and validated AI coverage without private connection names", () => {
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

    expect(installer.state).toBe("attention");
    expect(installer.checks.find((check) => check.label === "latexmk")?.ready).toBe(false);
    expect(configurator.state).toBe("ready");
    expect(configurator.checks.find((check) => check.label === "Opportunity review")?.ready).toBe(true);
    expect(JSON.stringify(configurator)).not.toContain("Private connection name");
  });
});
