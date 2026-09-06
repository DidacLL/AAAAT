import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SetupEnvironmentPanel } from "../src/renderer/SetupEnvironmentPanel";

const readySnapshot = {
  workspaceReady: true,
  tex: {
    commands: [
      { command: "latexmk" as const, available: true, version: "Latexmk 4.86" },
      { command: "pdflatex" as const, available: true, version: "pdfTeX" },
    ],
    documentRenderingReady: true,
  },
  ai: {
    configurationReadable: true,
    connectionCount: 1,
    operations: [
      { operation: "fit_assessment" as const, available: true, connectionName: "Local model" },
      { operation: "job_extraction" as const, available: false, connectionName: null },
      { operation: "historical_field_discovery" as const, available: false, connectionName: null },
      { operation: "variant_recommendation" as const, available: false, connectionName: null },
      { operation: "cv_tailoring" as const, available: false, connectionName: null },
      { operation: "cover_letter_draft" as const, available: false, connectionName: null },
    ],
  },
};

const current = vi.fn();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { setupEnvironment: { current } },
  });
}

beforeEach(() => {
  current.mockReset();
  installApi();
});

afterEach(() => cleanup());

describe("setup environment panel", () => {
  it("shows detected local tools and validated AI operation routes", async () => {
    current.mockResolvedValue(readySnapshot);
    render(<SetupEnvironmentPanel />);

    expect(await screen.findByRole("heading", { name: "Local setup status" })).toBeInTheDocument();
    expect(await screen.findByText("Ready with the detected local TeX tools.")).toBeInTheDocument();
    expect(screen.getByText(/latexmk.*available/)).toBeInTheDocument();
    expect(screen.getByText(/pdflatex.*available/)).toBeInTheDocument();
    expect(screen.getByText("Available via Local model.")).toBeInTheDocument();
    expect(screen.getAllByText("No validated route is configured.").length).toBeGreaterThan(0);
  });

  it("explains missing TeX without offering a hidden install action and can refresh", async () => {
    const missing = {
      ...readySnapshot,
      tex: {
        commands: [
          { command: "latexmk" as const, available: false, version: null },
          { command: "pdflatex" as const, available: false, version: null },
        ],
        documentRenderingReady: false,
      },
      ai: {
        configurationReadable: true,
        connectionCount: 0,
        operations: readySnapshot.ai.operations.map((operation) => ({
          ...operation,
          available: false,
          connectionName: null,
        })),
      },
    };
    current.mockResolvedValue(missing);
    const user = userEvent.setup();
    render(<SetupEnvironmentPanel />);

    expect(
      await screen.findByText("Needs a compatible TeX installation providing latexmk and pdflatex."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /install/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh environment" }));
    expect(current).toHaveBeenCalledTimes(2);
  });
});
