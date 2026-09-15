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
      { operation: "opportunity_review" as const, available: true, connectionName: "Local model" },
      { operation: "job_extraction" as const, available: false, connectionName: null },
      { operation: "historical_field_discovery" as const, available: false, connectionName: null },
      { operation: "variant_recommendation" as const, available: false, connectionName: null },
      { operation: "cv_tailoring" as const, available: false, connectionName: null },
      { operation: "cover_letter_draft" as const, available: false, connectionName: null },
    ],
  },
};

const current = vi.fn();

beforeEach(() => {
  current.mockReset();
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { setupEnvironment: { current } },
  });
});

afterEach(() => cleanup());

describe("setup environment panel", () => {
  it("shows live local status and the shared installer/configurator harness without copy-paste prompts", async () => {
    current.mockResolvedValue(readySnapshot);
    render(<SetupEnvironmentPanel />);

    expect(await screen.findByRole("heading", { name: "Local setup status" })).toBeInTheDocument();
    expect(screen.getByText("Ready with the detected local TeX tools.")).toBeInTheDocument();
    expect(screen.getByText("Available via Local model.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "AAAAT setup harness" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "installer.ai" })).toHaveTextContent("Installation & local prerequisites");
    expect(screen.getByRole("article", { name: "configurator.ai" })).toHaveTextContent("Optional AI configuration");
    expect(screen.queryByRole("textbox", { name: /installer\.ai guidance/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy installer\.ai/i })).not.toBeInTheDocument();
  });

  it("shows missing TeX as live setup attention and can refresh", async () => {
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

    expect(await screen.findByText("Needs a compatible TeX installation providing latexmk and pdflatex.")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "installer.ai" })).toHaveTextContent("attention");
    expect(screen.getByRole("article", { name: "configurator.ai" })).toHaveTextContent("AI is optional");
    expect(screen.queryByRole("button", { name: /^install/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh environment" }));
    expect(current).toHaveBeenCalledTimes(2);
  });

  it("renders the compact harness-only view used by external-assistant settings", async () => {
    current.mockResolvedValue(readySnapshot);
    render(<SetupEnvironmentPanel view="guidance" />);

    expect(await screen.findByRole("heading", { name: "AAAAT setup harness" })).toBeInTheDocument();
    expect(screen.getByText(/live AAAAT setup state, not a prompt template/i)).toBeInTheDocument();
    expect(screen.getAllByText("External assistant access", { selector: "summary" })).toHaveLength(2);
  });
});
