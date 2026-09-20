// @vitest-environment node

import { describe, expect, it } from "vitest";

import { aiOperations } from "../src/shared/ai-connection-contracts";
import type { SetupEnvironmentSnapshot } from "../src/shared/setup-environment-contracts";
import { deriveWorkspaceRailStatus } from "../src/renderer/WorkspaceRailStatus";

function environment({
  connections,
  routeName = null,
}: {
  readonly connections: number;
  readonly routeName?: string | null;
}): SetupEnvironmentSnapshot {
  return {
    workspaceReady: true,
    tex: {
      commands: [
        { command: "latexmk", available: true, version: "Latexmk" },
        { command: "pdflatex", available: true, version: "pdfTeX" },
      ],
      documentRenderingReady: true,
    },
    ai: {
      configurationReadable: true,
      connectionCount: connections,
      operations: aiOperations.map((operation, index) => ({
        operation,
        available: routeName !== null && index === 0,
        connectionName: routeName !== null && index === 0 ? routeName : null,
      })),
    },
  };
}

describe("workspace rail AI projection", () => {
  it("projects Ready only from current positive reachability evidence for a routed connection", () => {
    expect(deriveWorkspaceRailStatus(false, environment({ connections: 0 })).ai).toBe("Off");

    const routed = environment({ connections: 1, routeName: "Local model" });
    expect(deriveWorkspaceRailStatus(false, routed).ai).not.toBe("Ready");

    const currentEvidence = new Set(["Local model"]);
    expect(deriveWorkspaceRailStatus(false, routed, null, currentEvidence).ai).toBe("Ready");

    currentEvidence.delete("Local model");
    expect(deriveWorkspaceRailStatus(false, routed, null, currentEvidence).ai).not.toBe("Ready");
  });
});
