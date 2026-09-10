import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkspaceRecoveryPanel } from "../src/renderer/WorkspaceRecoveryPanel";

const currentWorkspace = { rootPath: "/tmp/current-aaaat" };
const restoredWorkspace = { rootPath: "/tmp/restored-aaaat" };
const backup = vi.fn();
const restore = vi.fn();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      workspaceRecovery: { backup, restore },
    },
  });
}

describe("WorkspaceRecoveryPanel", () => {
  beforeEach(() => {
    backup.mockReset();
    restore.mockReset();
    backup.mockResolvedValue({ status: "backed_up" });
    restore.mockResolvedValue({ status: "restored", workspace: restoredWorkspace });
    installApi();
  });

  afterEach(() => cleanup());

  it("creates a backup through the bounded recovery operation", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceRecoveryPanel
        currentWorkspace={currentWorkspace}
        editorDirty={false}
        onRestored={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Back up workspace" }));
    expect(backup).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent("Workspace backup created.");
  });

  it("does not invoke restore when unsaved-editor switching is declined", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(
      <WorkspaceRecoveryPanel
        currentWorkspace={currentWorkspace}
        editorDirty
        onRestored={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Restore workspace backup" }));
    expect(confirm).toHaveBeenCalledWith(
      "Restoring a workspace will discard unsaved edits and switch workspaces. Continue?",
    );
    expect(restore).not.toHaveBeenCalled();
  });

  it("keeps first-run state unchanged when restore selection is cancelled", async () => {
    restore.mockResolvedValueOnce({ status: "cancelled" });
    const onRestored = vi.fn();
    const user = userEvent.setup();
    render(
      <WorkspaceRecoveryPanel
        currentWorkspace={null}
        editorDirty={false}
        onRestored={onRestored}
      />,
    );

    expect(screen.queryByRole("button", { name: "Back up workspace" })).not.toBeInTheDocument();
    const restoreDisclosure = screen.getByText("Restore a backup", { selector: "summary" });
    expect(restoreDisclosure.closest("details")).not.toHaveAttribute("open");
    await user.click(restoreDisclosure);
    await user.click(screen.getByRole("button", { name: "Choose backup to restore" }));
    expect(restore).toHaveBeenCalledTimes(1);
    expect(onRestored).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
