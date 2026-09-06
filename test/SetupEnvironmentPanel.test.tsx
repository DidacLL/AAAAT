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
const writeText = vi.fn();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { setupEnvironment: { current } },
  });
}

function installClipboard() {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

beforeEach(() => {
  current.mockReset();
  writeText.mockReset();
  writeText.mockResolvedValue(undefined);
  installApi();
});

afterEach(() => cleanup());

describe("setup environment panel", () => {
  it("shows detected local tools, validated AI routes, and copyable privacy-minimal guidance", async () => {
    current.mockResolvedValue(readySnapshot);
    const user = userEvent.setup();
    installClipboard();
    render(<SetupEnvironmentPanel />);

    expect(await screen.findByRole("heading", { name: "Local setup status" })).toBeInTheDocument();
    expect(await screen.findByText("Ready with the detected local TeX tools.")).toBeInTheDocument();
    expect(screen.getByText("latexmk").closest("p")).toHaveTextContent("latexmk: available · Latexmk 4.86");
    expect(screen.getByText("pdflatex").closest("p")).toHaveTextContent("pdflatex: available · pdfTeX");
    expect(screen.getByText("Available via Local model.")).toBeInTheDocument();
    expect(screen.getAllByText("No validated route is configured.").length).toBeGreaterThan(0);

    const installer = await screen.findByRole("textbox", { name: "installer.ai guidance" });
    const configurator = screen.getByRole("textbox", { name: "configurator.ai guidance" });
    const installerText = (installer as HTMLTextAreaElement).value;
    const configuratorText = (configurator as HTMLTextAreaElement).value;

    expect(installerText).toContain("Document rendering: ready");
    expect(installerText).not.toContain("Latexmk 4.86");
    expect(configuratorText).toContain("Fit assessment: validated route available");
    expect(configuratorText).not.toContain("Local model");

    await user.click(screen.getByRole("button", { name: "Copy configurator.ai" }));
    expect(writeText).toHaveBeenCalledWith(configuratorText);
    expect(await screen.findByRole("status")).toHaveTextContent("configurator.ai copied.");
  });

  it("explains missing TeX and zero AI without offering a hidden install action and can refresh", async () => {
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
    expect(screen.queryByRole("button", { name: /^install/i })).not.toBeInTheDocument();
    expect((screen.getByRole("textbox", { name: "installer.ai guidance" }) as HTMLTextAreaElement).value)
      .toContain("latexmk: missing");
    expect((screen.getByRole("textbox", { name: "configurator.ai guidance" }) as HTMLTextAreaElement).value)
      .toContain("0 configured local AI connections");
    await user.click(screen.getByRole("button", { name: "Refresh environment" }));
    expect(current).toHaveBeenCalledTimes(2);
  });

  it("keeps guidance selectable when clipboard copying fails", async () => {
    current.mockResolvedValue(readySnapshot);
    const user = userEvent.setup();
    installClipboard();
    writeText.mockRejectedValueOnce(new Error("clipboard denied"));
    render(<SetupEnvironmentPanel />);

    const installer = await screen.findByRole("textbox", { name: "installer.ai guidance" });
    const installerText = (installer as HTMLTextAreaElement).value;
    await user.click(screen.getByRole("button", { name: "Copy installer.ai" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Clipboard copy failed. Select the guidance text and copy it manually.",
    );
    expect((screen.getByRole("textbox", { name: "installer.ai guidance" }) as HTMLTextAreaElement).value)
      .toBe(installerText);
  });
});
