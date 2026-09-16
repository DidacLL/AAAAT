import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SettingsWorkspace, type SettingsView } from "../src/renderer/SettingsWorkspace";
import { aiOperations } from "../src/shared/ai-connection-contracts";

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
    operations: aiOperations.map((operation) => ({ operation, available: false, connectionName: null })),
  },
};

const choose = vi.fn();
const dirty = vi.fn();
const environmentChanged = vi.fn();
const validationState = vi.fn();
const restored = vi.fn();
const resetWorkspace = vi.fn();
const deleteWorkspace = vi.fn();
const backup = vi.fn();
const restore = vi.fn();
const list = vi.fn();
const save = vi.fn();
const externalConnection = vi.fn();

function renderSettings(initialView: SettingsView = "workspace") {
  return render(
    <SettingsWorkspace
      currentWorkspace={workspace}
      demoWorkspace={false}
      initialView={initialView}
      onChooseWorkspace={choose}
      onDirtyChange={dirty}
      onEnvironmentChange={environmentChanged}
      onAiValidationState={validationState}
      onRestored={restored}
      onWorkspaceReset={vi.fn()}
      onWorkspaceDeleted={vi.fn()}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  list.mockResolvedValue([]);
  save.mockResolvedValue([]);
  backup.mockResolvedValue({ status: "backed_up" });
  restore.mockResolvedValue({ status: "cancelled" });
  resetWorkspace.mockResolvedValue(workspace);
  deleteWorkspace.mockResolvedValue(undefined);
  externalConnection.mockResolvedValue({ packaged: true, executablePath: "C:\\Apps\\AAAAT.exe", workspacePath: workspace.rootPath });
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      workspace: { reset: resetWorkspace, delete: deleteWorkspace },
      setupEnvironment: { current: async () => readyEnvironment, externalConnection },
      setupAssistant: {
        access: async () => ({ installerActionsAllowed: false, configuratorActionsAllowed: false }),
        updateAccess: async (update: { installerActionsAllowed: boolean; configuratorActionsAllowed: boolean }) => update,
        runRenderingSelfTest: async () => ({ passed: true }),
      },
      workspaceRecovery: { backup, restore },
      aiPromptTransparency: { current: async () => ({ operations: [] }) },
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
  it("uses exactly Workspace, AI, Documents and Backup tabs with one active panel", async () => {
    const user = userEvent.setup();
    renderSettings();

    const tabs = within(screen.getByRole("navigation", { name: "Settings sections" })).getAllByRole("button");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Workspace", "AI", "Documents", "Backup"]);
    expect(screen.getByRole("region", { name: "Workspace settings" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "AI settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Settings overview" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "AI" }));
    expect(screen.getByRole("region", { name: "AI settings" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Workspace settings" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export AI setup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import AI setup" })).toBeInTheDocument();
    expect(screen.getByText("Advanced: connect an external assistant")).toBeInTheDocument();
  });

  it("keeps invalid endpoint syntax as an inline address error", async () => {
    const user = userEvent.setup();
    renderSettings("ai");

    await user.click(await screen.findByRole("button", { name: "Add connection" }));
    await user.type(screen.getByLabelText("Model server address"), "localhost:11434/v1");
    await user.click(screen.getByRole("button", { name: "Add connection" }));

    expect(screen.getByText("Start the address with http:// or https://.")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });

  it("puts PDF readiness and TeX details only in Documents", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: "Documents" }));
    expect(await screen.findByRole("region", { name: "Documents settings" })).toBeInTheDocument();
    expect(await screen.findByText("Local PDF rendering is ready on this computer.")).toBeInTheDocument();
    expect(screen.getByText("Technical details")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export AI setup" })).not.toBeInTheDocument();
  });

  it("keeps workspace switching/reset in Workspace and recovery in Backup", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <SettingsWorkspace
        currentWorkspace={workspace}
        demoWorkspace={false}
        onChooseWorkspace={choose}
        onDirtyChange={dirty}
        onEnvironmentChange={environmentChanged}
        onAiValidationState={validationState}
        onRestored={restored}
        onWorkspaceReset={onReset}
        onWorkspaceDeleted={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Open another workspace" }));
    expect(choose).toHaveBeenCalledWith("open");
    await user.click(screen.getByRole("button", { name: "Reset workspace data" }));
    expect(resetWorkspace).toHaveBeenCalledOnce();
    await waitFor(() => expect(onReset).toHaveBeenCalledWith(workspace));

    await user.click(screen.getByRole("button", { name: "Backup" }));
    expect(screen.getByRole("button", { name: "Back up workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore workspace backup" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export AI setup" })).not.toBeInTheDocument();
  });

  it("returns to Welcome after deleting the selected workspace data", async () => {
    const user = userEvent.setup();
    const onDeleted = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(
      <SettingsWorkspace
        currentWorkspace={workspace}
        demoWorkspace={false}
        onChooseWorkspace={choose}
        onDirtyChange={dirty}
        onEnvironmentChange={environmentChanged}
        onAiValidationState={validationState}
        onRestored={restored}
        onWorkspaceReset={vi.fn()}
        onWorkspaceDeleted={onDeleted}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Delete workspace data" }));
    expect(deleteWorkspace).toHaveBeenCalledOnce();
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
  });
});
