import { useState } from "react";

import type { WorkspaceInfo } from "../shared/contracts";

interface WorkspaceRecoveryPanelProps {
  readonly currentWorkspace: WorkspaceInfo | null;
  readonly editorDirty: boolean;
  readonly onRestored: (workspace: WorkspaceInfo) => void;
}

export function WorkspaceRecoveryPanel({
  currentWorkspace,
  editorDirty,
  onRestored,
}: WorkspaceRecoveryPanelProps) {
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const backUp = async () => {
    setBusy("backup");
    setNotice(null);
    setError(null);
    try {
      const result = await window.aaaat.workspaceRecovery.backup();
      if (result.status === "backed_up") {
        setNotice("Workspace backup created.");
      }
    } catch {
      setError("AAAAT could not create the workspace backup. Choose a separate empty folder and try again.");
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    if (currentWorkspace) {
      const prompt = editorDirty
        ? "Restoring a workspace will discard unsaved edits and switch workspaces. Continue?"
        : "Restore a workspace backup and switch to the restored workspace?";
      if (!window.confirm(prompt)) return;
    }

    setBusy("restore");
    setNotice(null);
    setError(null);
    try {
      const result = await window.aaaat.workspaceRecovery.restore();
      if (result.status === "restored") {
        setNotice("Workspace restored and opened.");
        onRestored(result.workspace);
      }
    } catch {
      setError("AAAAT could not restore that backup. The current workspace was not changed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="profile-workspace" aria-label="Workspace recovery">
      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recovery</p>
            <h2>Workspace backup and restore</h2>
          </div>
        </div>
        <p>
          Backups are user-owned directories. Restore validates the backup into a separate empty folder before AAAAT switches workspaces.
        </p>
        <div className="workspace-actions">
          {currentWorkspace ? (
            <button
              type="button"
              className="secondary-action"
              disabled={busy !== null}
              onClick={() => void backUp()}
            >
              {busy === "backup" ? "Backing up…" : "Back up workspace"}
            </button>
          ) : null}
          <button
            type="button"
            className="secondary-action"
            disabled={busy !== null}
            onClick={() => void restore()}
          >
            {busy === "restore" ? "Restoring…" : "Restore workspace backup"}
          </button>
        </div>
        {notice ? <p role="status">{notice}</p> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
