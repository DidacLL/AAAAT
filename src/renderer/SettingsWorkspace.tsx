import { useEffect, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import type { ExternalAssistantConnection } from "../shared/setup-environment-contracts";
import { AiSettingsWorkspace } from "./AiSettingsWorkspace";
import { SetupEnvironmentPanel } from "./SetupEnvironmentPanel";
import { WorkspaceRecoveryPanel } from "./WorkspaceRecoveryPanel";

export type SettingsView = "workspace" | "ai" | "documents" | "backup";

interface SettingsWorkspaceProps {
  readonly currentWorkspace: WorkspaceInfo;
  readonly demoWorkspace: boolean;
  readonly initialView?: SettingsView;
  readonly onChooseWorkspace: (choice: WorkspaceChoice) => void;
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onEnvironmentChange: () => void;
  readonly onAiValidationState: (connectionName: string, needsAttention: boolean) => void;
  readonly onRestored: (workspace: WorkspaceInfo) => void;
  readonly onWorkspaceReset: (workspace: WorkspaceInfo) => void;
  readonly onWorkspaceDeleted: () => void;
  readonly protectedWorkDirty?: boolean;
}

const tabs: readonly SettingsView[] = ["workspace", "ai", "documents", "backup"];
const settingsLabels: Readonly<Record<SettingsView, string>> = {
  workspace: "Workspace",
  ai: "AI",
  documents: "Documents",
  backup: "Backup",
};

function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function ExternalAssistantConnectionPanel() {
  const [connection, setConnection] = useState<ExternalAssistantConnection | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void window.aaaat.setupEnvironment.externalConnection()
      .then((next) => {
        if (active) setConnection(next);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="settings-portability-intro" aria-label="Connect a local assistant">
      {failed ? <p className="error-message">AAAAT could not read this workspace's connection details.</p> : null}
      {!connection && !failed ? <p>Reading connection details…</p> : null}
      {connection?.packaged ? (
        <>
          <p>For a compatible assistant that can start a local tool, use:</p>
          <dl className="external-connection-details">
            <dt>Command</dt><dd><code>{connection.executablePath}</code></dd>
            <dt>Arguments</dt><dd><code>--mcp --workspace "{connection.workspacePath}"</code></dd>
          </dl>
        </>
      ) : connection ? <p>Connection details are available from the packaged desktop app.</p> : null}
    </section>
  );
}

function ResetWorkspacePanel({ onReset }: { readonly onReset: (workspace: WorkspaceInfo) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="profile-column destructive-settings" aria-label="Reset workspace">
      <div className="section-heading"><div><p className="eyebrow">Destructive</p><h2>Reset workspace data</h2></div></div>
      <p>Erase this workspace's saved AAAAT data and keep the workspace folder ready for fresh use.</p>
      <button type="button" className="compact-secondary" disabled={busy} onClick={() => {
        if (!window.confirm("Reset this workspace? This permanently removes saved applications, Sources, Tags, professional information, documents, PDFs and AI connections in this folder.")) return;
        setBusy(true);
        setError(null);
        void window.aaaat.workspace.reset().then(onReset).catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "AAAAT could not reset this workspace.");
          setBusy(false);
        });
      }}>{busy ? "Resetting…" : "Reset workspace data"}</button>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </section>
  );
}

function DeleteWorkspacePanel({ onDeleted }: { readonly onDeleted: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="profile-column destructive-settings" aria-label="Delete workspace">
      <div className="section-heading"><div><p className="eyebrow">Destructive</p><h2>Delete workspace data</h2></div></div>
      <p>Remove AAAAT's data from this folder and return to Welcome. The empty folder remains on your computer.</p>
      <button type="button" className="compact-secondary" disabled={busy} onClick={() => {
        if (!window.confirm("Delete this workspace's AAAAT data? This permanently removes saved applications, Sources, Tags, professional information, documents, PDFs and AI connections in this folder.")) return;
        setBusy(true);
        setError(null);
        void window.aaaat.workspace.delete().then(onDeleted).catch((reason: unknown) => {
          setError(reason instanceof Error ? reason.message : "AAAAT could not delete this workspace.");
          setBusy(false);
        });
      }}>{busy ? "Deleting…" : "Delete workspace data"}</button>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </section>
  );
}

export function SettingsWorkspace({
  currentWorkspace,
  demoWorkspace,
  initialView = "workspace",
  onChooseWorkspace,
  onDirtyChange,
  onEnvironmentChange,
  onAiValidationState,
  onRestored,
  onWorkspaceReset,
  onWorkspaceDeleted,
  protectedWorkDirty = false,
}: SettingsWorkspaceProps) {
  const [view, setView] = useState<SettingsView>(initialView);
  const [detailDirty, setDetailDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(detailDirty);
    return () => onDirtyChange(false);
  }, [detailDirty, onDirtyChange]);

  const selectView = (next: SettingsView) => {
    if (next === view) return;
    if (detailDirty && !window.confirm("Discard unsaved Settings edits and leave this section?")) return;
    setDetailDirty(false);
    setView(next);
  };

  return (
    <section className="settings-workspace" aria-label="Settings">
      <nav className="settings-tab-strip" aria-label="Settings sections">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={view === tab ? "active-settings-tab" : ""}
            aria-current={view === tab ? "page" : undefined}
            onClick={() => selectView(tab)}
          >
            {settingsLabels[tab]}
          </button>
        ))}
      </nav>

      <section className="settings-active-panel" aria-label={`${settingsLabels[view]} settings`}>
        {view === "workspace" ? (
          <div className="profile-workspace">
            <div className="profile-column">
              <div className="section-heading"><div><p className="eyebrow">{demoWorkspace ? "Demo data" : "Local data"}</p><h2>Current workspace</h2></div></div>
              <div className="settings-workspace-identity" title={currentWorkspace.rootPath}>
                <strong>{folderName(currentWorkspace.rootPath)}</strong>
                <span>Data: {demoWorkspace ? "Demo" : "Local"}</span>
                <code>{currentWorkspace.rootPath}</code>
              </div>
              <div className="button-row">
                <button className="compact-secondary" type="button" onClick={() => onChooseWorkspace("create")}>Create another workspace</button>
                <button className="compact-secondary" type="button" onClick={() => onChooseWorkspace("open")}>Open another workspace</button>
              </div>
            </div>
            <div className="settings-destructive-stack">
              <ResetWorkspacePanel onReset={onWorkspaceReset} />
              <DeleteWorkspacePanel onDeleted={onWorkspaceDeleted} />
            </div>
          </div>
        ) : null}

        {view === "ai" ? (
          <>
            <AiSettingsWorkspace
              view="all"
              onDirtyChange={setDetailDirty}
              onEnvironmentChange={onEnvironmentChange}
              onValidationState={onAiValidationState}
            />
            <details className="settings-advanced-disclosure">
              <summary>Advanced: connect an external assistant</summary>
              <ExternalAssistantConnectionPanel />
            </details>
          </>
        ) : null}

        {view === "documents" ? (
          <SetupEnvironmentPanel view="rendering" onEnvironmentChange={onEnvironmentChange} />
        ) : null}

        {view === "backup" ? (
          <WorkspaceRecoveryPanel
            currentWorkspace={currentWorkspace}
            editorDirty={detailDirty || protectedWorkDirty}
            onRestored={onRestored}
          />
        ) : null}
      </section>
    </section>
  );
}
