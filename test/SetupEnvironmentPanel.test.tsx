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
const access = vi.fn();
const updateAccess = vi.fn();
const runRenderingSelfTest = vi.fn();

beforeEach(() => {
  current.mockReset().mockResolvedValue(readySnapshot);
  access.mockReset().mockResolvedValue({
    installerActionsAllowed: false,
    configuratorActionsAllowed: false,
  });
  updateAccess.mockReset().mockImplementation(async (next) => next);
  runRenderingSelfTest.mockReset().mockResolvedValue({ passed: true });
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      setupEnvironment: { current },
      setupAssistant: { access, updateAccess, runRenderingSelfTest },
    },
  });
});

afterEach(() => cleanup());

describe("setup environment panel", () => {
  it("shows live local status and bounded installer/configurator capabilities instead of prompt templates", async () => {
    render(<SetupEnvironmentPanel />);

    expect(await screen.findByRole("heading", { name: "Local setup status" })).toBeInTheDocument();
    expect(screen.getByText("Ready with the detected local TeX tools.")).toBeInTheDocument();
    expect(screen.getByText("Available via Local model.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "AAAAT setup harness" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "installer.ai" })).toHaveTextContent("Installation & local prerequisites");
    expect(screen.getByRole("article", { name: "configurator.ai" })).toHaveTextContent("Optional AI configuration");
    expect(screen.getByRole("region", { name: "External setup action authority" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /installer\.ai guidance/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copy installer\.ai/i })).not.toBeInTheDocument();
  });

  it("keeps external setup mutations locally opt-in", async () => {
    const user = userEvent.setup();
    render(<SetupEnvironmentPanel view="guidance" />);

    const installer = await screen.findByRole("checkbox", { name: /installer\.ai actions/i });
    const configurator = screen.getByRole("checkbox", { name: /configurator\.ai actions/i });
    expect(installer).not.toBeChecked();
    expect(configurator).not.toBeChecked();

    await user.click(installer);
    expect(updateAccess).toHaveBeenCalledWith({
      installerActionsAllowed: true,
      configuratorActionsAllowed: false,
    });
  });

  it("runs AAAAT's fixed local rendering self-test from rendering settings", async () => {
    const user = userEvent.setup();
    render(<SetupEnvironmentPanel view="rendering" />);

    await user.click(await screen.findByRole("button", { name: "Run rendering self-test" }));
    expect(runRenderingSelfTest).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/rendering self-test passed/i)).toBeInTheDocument();
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

});
