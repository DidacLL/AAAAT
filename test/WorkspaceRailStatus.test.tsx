import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { aiOperations } from "../src/shared/ai-connection-contracts";
import type { SetupEnvironmentSnapshot } from "../src/shared/setup-environment-contracts";
import {
  clearAiReachabilityEvidence,
  recordAiReachabilityEvidence,
} from "../src/renderer/ai-reachability-store";
import {
  deriveWorkspaceRailStatus,
  WorkspaceRailStatus,
} from "../src/renderer/WorkspaceRailStatus";

function environment({
  connections = 0,
  routeName = null,
  pdf = true,
  readable = true,
}: {
  readonly connections?: number;
  readonly routeName?: string | null;
  readonly pdf?: boolean;
  readonly readable?: boolean;
} = {}): SetupEnvironmentSnapshot {
  return {
    workspaceReady: true,
    tex: {
      commands: [
        { command: "latexmk", available: pdf, version: pdf ? "Latexmk" : null },
        { command: "pdflatex", available: pdf, version: pdf ? "pdfTeX" : null },
      ],
      documentRenderingReady: pdf,
    },
    ai: {
      configurationReadable: readable,
      connectionCount: readable ? connections : 0,
      operations: aiOperations.map((operation, index) => ({
        operation,
        available: routeName !== null && index === 0,
        connectionName: routeName !== null && index === 0 ? routeName : null,
      })),
    },
  };
}

afterEach(() => {
  cleanup();
  clearAiReachabilityEvidence();
  vi.restoreAllMocks();
});

describe("workspace rail status", () => {
  it("keeps no-connection AI Off and configured but unproven AI out of Ready", () => {
    expect(deriveWorkspaceRailStatus(true, environment({ connections: 0, pdf: false }))).toEqual({
      data: "Demo",
      ai: "Off",
      pdf: "Unavailable",
    });
    expect(
      deriveWorkspaceRailStatus(
        false,
        environment({ connections: 1, routeName: "Local model" }),
      ),
    ).toMatchObject({
      data: "Local",
      ai: "Needs attention",
      pdf: "Ready",
    });
    expect(deriveWorkspaceRailStatus(false, environment({ readable: false }))).toMatchObject({
      ai: "Needs attention",
    });
  });

  it("requires current positive evidence for a usable route and loses Ready when that evidence is invalidated", () => {
    const routed = environment({ connections: 1, routeName: "Local model" });
    expect(deriveWorkspaceRailStatus(false, routed, null, new Set(["Local model"])).ai).toBe(
      "Ready",
    );
    expect(deriveWorkspaceRailStatus(false, routed, null, new Set()).ai).toBe("Needs attention");
  });

  it("lets newer current evidence replace stale validation attention state", () => {
    const routed = environment({ connections: 1, routeName: "Local model" });
    expect(
      deriveWorkspaceRailStatus(false, routed, "Local model", new Set(["Local model"])).ai,
    ).toBe("Ready");
  });

  it("refreshes configuration without promoting a route until current evidence arrives", async () => {
    let snapshot = environment({ connections: 0, pdf: true });
    const current = vi.fn(async () => snapshot);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { setupEnvironment: { current } },
    });

    const { rerender } = render(
      <WorkspaceRailStatus demo={false} refreshRevision={0} attentionConnectionName={null} />,
    );
    expect(await screen.findByText("Off")).toBeInTheDocument();

    snapshot = environment({ connections: 1, routeName: "Local model", pdf: false });
    rerender(<WorkspaceRailStatus demo={false} refreshRevision={1} attentionConnectionName={null} />);

    await waitFor(() => expect(current).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();

    recordAiReachabilityEvidence("Local model", true);
    expect(await screen.findByText("Ready")).toBeInTheDocument();
  });
});
