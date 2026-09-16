import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { aiOperations } from "../src/shared/ai-connection-contracts";
import type { SetupEnvironmentSnapshot } from "../src/shared/setup-environment-contracts";
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
  vi.restoreAllMocks();
});

describe("workspace rail status", () => {
  it("derives Data, AI and PDF from loaded workspace and existing readiness state", () => {
    expect(deriveWorkspaceRailStatus(true, environment({ connections: 0, pdf: false }))).toEqual({
      data: "Demo",
      ai: "Off",
      pdf: "Unavailable",
    });
    expect(deriveWorkspaceRailStatus(false, environment({ connections: 1 }))).toMatchObject({
      data: "Local",
      ai: "Needs attention",
    });
    expect(deriveWorkspaceRailStatus(false, environment({ connections: 1, routeName: "Local model" }))).toMatchObject({
      ai: "Ready",
      pdf: "Ready",
    });
    expect(deriveWorkspaceRailStatus(false, environment({ readable: false }))).toMatchObject({
      ai: "Needs attention",
    });
  });

  it("keeps a failed validated connection in attention state unless another usable route exists", () => {
    const oneRoute = environment({ connections: 1, routeName: "Local model" });
    expect(deriveWorkspaceRailStatus(false, oneRoute, "Local model").ai).toBe("Needs attention");

    const withOtherRoute: SetupEnvironmentSnapshot = {
      ...oneRoute,
      ai: {
        ...oneRoute.ai,
        connectionCount: 2,
        operations: oneRoute.ai.operations.map((operation, index) =>
          index === 1
            ? { ...operation, available: true, connectionName: "Backup model" }
            : operation,
        ),
      },
    };
    expect(deriveWorkspaceRailStatus(false, withOtherRoute, "Local model").ai).toBe("Ready");
  });

  it("refreshes the rendered projection when Settings reports an environment change", async () => {
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
    expect(screen.getByText("Ready")).toBeInTheDocument();

    snapshot = environment({ connections: 1, routeName: "Local model", pdf: false });
    rerender(<WorkspaceRailStatus demo={false} refreshRevision={1} attentionConnectionName={null} />);

    await waitFor(() => expect(current).toHaveBeenCalledTimes(2));
    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(screen.getByText("Ready")).toBeInTheDocument();
  });
});
