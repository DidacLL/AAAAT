import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsWorkspace } from "../src/renderer/SettingsWorkspace";

const workspace = { rootPath: "/tmp/aaaat-settings-workspace" };
const readyEnvironment = {
  workspaceReady: true,
  tex: {
    commands: [
      { command: "latexmk" as const, available: true, version: "Latexmk" },
      { command: "pdflatex" as const, available: true, version: "pdfTeX" },
    ],
    documentRenderingReady: true,
  },
  ai: {
    configurationReadable: true,
    connectionCount: 0,
    operations: [
      { operation: "opportunity_review" as const, available: false, connectionName: null },
      { operation: "job_extraction" as const, available: false, connectionName: null },
      { operation: "historical_field_discovery" as const, available: false, connectionName: null },
      { operation: "variant_recommendation" as const, available: false, connectionName: null },
      { operation: "cv_tailoring" as const, available: false, connectionName: null },
      { operation: "cover_letter_draft" as const, available: false, connectionName: null },
    ],
  },
};

const choose = vi.fn();
const dirty = vi.fn();
const restored = vi.fn();
const backup = vi.fn();
const restore = vi.fn();
const list = vi.fn();
const save = vi.fn();
const connectVscode = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue([]);
  save.mockResolvedValue([]);
  backup.mockResolvedValue({ status: "backed_up" });
  restore.mockResolvedValue({ status: "cancelled" });
  connectVscode.mockResolvedValue({
    status: "configured",
    message: "Connected. VS Code still controls whether to trust and enable the AAAAT tool.",
  });
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      setupEnvironment: { current: async () => readyEnvironment, connectVscode },
      workspaceRecovery: { backup, restore },
      aiConnections: {
        list,
        save,
        setDefault: async () => [],
        remove: async () => [],
        validateOperation: async () => [],
        setOperationDefault: async () => [],
        exportPortable: async () => "cancelled",
        importPortable: async () => ({ status: "cancelled", connections: [] }),
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Settings workspace", () => {
  it("opens on status-first administration intentions and enters one task at a time", async () => {
    const user = userEvent.setup();
    render(
      <SettingsWorkspace
        currentWorkspace={workspace}
        onChooseWorkspace={choose}
        onDirtyChange={dirty}
        onRestored={restored}
      />,
    );

    expect(await screen.findByRole("region", { name: "Settings overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Workspace/ })).toHaveTextContent(workspace.rootPath);
    expect(screen.getByRole("button", { name: /Backup & recovery/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Document rendering/ })).toHaveTextContent("Available on this computer.");
    expect(screen.getByRole("button", { name: /AI connections/ })).toHaveTextContent("Optional; no connections configured.");
    expect(screen.getByRole("button", { name: /Portability & external tools/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Connection name")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Document rendering/ }));
    expect(await screen.findByRole("region", { name: "Document rendering settings" })).toBeInTheDocument();
    expect(screen.getByText("Local TeX rendering is available on this computer.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back to Settings" })).toBeInTheDocument();
  });

  it("connects only the demonstrated VS Code host through the narrow no-input desktop operation", async () => {
    const user = userEvent.setup();
    render(
      <SettingsWorkspace
        currentWorkspace={workspace}
        onChooseWorkspace={choose}
        onDirtyChange={dirty}
        onRestored={restored}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /Portability & external tools/ }));
    expect(screen.getByRole("region", { name: "VS Code external tool setup" })).toBeInTheDocument();
    expect(screen.getByText(/one candidature you locally select for opportunity research/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot browse your local corpus/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Connect VS Code project" }));
    expect(connectVscode).toHaveBeenCalledTimes(1);
    expect(connectVscode).toHaveBeenCalledWith();
    expect(await screen.findByRole("status")).toHaveTextContent(/VS Code still controls whether to trust and enable/i);
  });

  it("keeps AI optional and protects a dirty connection draft before leaving its Settings detail", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <SettingsWorkspace
        currentWorkspace={workspace}
        onChooseWorkspace={choose}
        onDirtyChange={dirty}
        onRestored={restored}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /AI connections/ }));
    expect(screen.getByText(/AAAAT works without AI/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("Connection name")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    await user.type(screen.getByLabelText("Connection name"), "Unsaved local route");
    expect(dirty).toHaveBeenLastCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Back to Settings" }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved Settings edits and leave this section?");
    expect(screen.getByLabelText("Connection name")).toHaveValue("Unsaved local route");
    expect(screen.queryByRole("region", { name: "Settings overview" })).not.toBeInTheDocument();
  });

  it("keeps backup/recovery and workspace switching behind their matching intentions", async () => {
    const user = userEvent.setup();
    render(
      <SettingsWorkspace
        currentWorkspace={workspace}
        onChooseWorkspace={choose}
        onDirtyChange={dirty}
        onRestored={restored}
      />,
    );

    await user.click(await screen.findByRole("button", { name: /Workspace/ }));
    await user.click(screen.getByRole("button", { name: "Open another workspace" }));
    expect(choose).toHaveBeenCalledWith("open");
    await user.click(screen.getByRole("button", { name: "Back to Settings" }));

    await user.click(screen.getByRole("button", { name: /Backup & recovery/ }));
    expect(screen.getByRole("button", { name: "Back up workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore workspace backup" })).toBeInTheDocument();
  });
});
