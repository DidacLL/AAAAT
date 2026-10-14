import { useContext, useEffect, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import type { OptionalToolsChoice } from "../shared/optional-tools-contracts";
import type {
  ExternalAssistantConnection,
  ExternalAssistantGuidance,
} from "../shared/setup-environment-contracts";
import { AiSettingsWorkspace } from "./AiSettingsWorkspace";
import { PageToolbar } from "./PageToolbar";
import { SetupActionAuthorityPanel } from "./SetupActionAuthorityPanel";
import { SetupEnvironmentPanel } from "./SetupEnvironmentPanel";
import { WorkspaceRecoveryPanel } from "./WorkspaceRecoveryPanel";
import { ToolbarVisible } from "./toolbar-context";

export type SettingsView = "workspace" | "ai" | "documents" | "backup";

interface SettingsWorkspaceProps {
  readonly onOpenTools: (choice: OptionalToolsChoice) => void;
  readonly toolsRevision: number;
  readonly currentWorkspace: WorkspaceInfo;
  readonly demoWorkspace: boolean;
  readonly view: SettingsView;
  readonly onViewChange: (view: SettingsView) => void;
  readonly onChooseWorkspace: (choice: WorkspaceChoice) => void;
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onEnvironmentChange: () => void;
  readonly onAiValidationState: (connectionName: string, needsAttention: boolean) => void;
  readonly onRestored: (workspace: WorkspaceInfo) => void;
  readonly onWorkspaceReset: (workspace: WorkspaceInfo) => void;
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

function ExternalAssistantGuidancePanel() {
  const [guidance, setGuidance] = useState<ExternalAssistantGuidance | null>(null);
  const [busy, setBusy] = useState<"copy" | "export" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.setupEnvironment.externalGuidance()
      .then((next) => {
        if (active) setGuidance(next);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load its reusable external-AI instructions.");
      });
    return () => {
      active = false;
    };
  }, []);

  const copy = async () => {
    setBusy("copy");
    setMessage(null);
    setError(null);
    try {
      await window.aaaat.setupEnvironment.copyExternalGuidance();
      setMessage("Reusable AI instructions copied.");
    } catch {
      setError("AAAAT could not copy the reusable AI instructions.");
    } finally {
      setBusy(null);
    }
  };

  const exportGuidance = async () => {
    setBusy("export");
    setMessage(null);
    setError(null);
    try {
      const result = await window.aaaat.setupEnvironment.exportExternalGuidance();
      if (result === "exported") setMessage("Reusable AI instructions saved.");
    } catch {
      setError("AAAAT could not save the reusable AI instructions.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="profile-column" aria-label="Use AAAAT with another AI">
      <div className="section-heading">
        <div>
          <p className="eyebrow">External AI</p>
          <h2>Use AAAAT with another AI</h2>
        </div>
      </div>
      <details><summary>How to use these instructions</summary>
        <p>Add these to your AI's project instructions, custom instructions or skills.</p>
      </details>
      {guidance ? (
        <details>
          <summary>Preview reusable instructions</summary>
          <pre className="external-ai-guidance-preview">{guidance.content}</pre>
        </details>
      ) : null}
      <div className="button-row">
        <button type="button" disabled={busy !== null || !guidance} onClick={() => void copy()}>
          {busy === "copy" ? "Copying…" : "Copy"}
        </button>
        <button
          type="button"
          className="compact-secondary"
          disabled={busy !== null || !guidance}
          onClick={() => void exportGuidance()}
        >
          {busy === "export" ? "Saving…" : "Export"}
        </button>
      </div>
      {message ? <p>{message}</p> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </section>
  );
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
  const [scope, setScope] = useState<"applications" | "personal" | "all">("applications");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const labels = { applications: "Applications", personal: "My information", all: "Applications and My information" };
  return <section className="profile-column destructive-settings" aria-label="Reset workspace">
    <div className="row-actions reset-controls">
    <label>Clear<select aria-label="Reset scope" value={scope} disabled={busy} onChange={event => setScope(event.target.value as typeof scope)}>
      {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></label>
    <button type="button" className="compact-secondary" disabled={busy} onClick={() => {
      if (!window.confirm(`Remove ${labels[scope].toLowerCase()}? Generated PDFs and source projects will be kept. Settings and shared Tags will be kept.`)) return;
      setBusy(true); setError(null);
      void window.aaaat.workspace.reset(scope).then(onReset).catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "AAAAT could not reset the selected data.");
      }).finally(() => setBusy(false));
    }}>{busy ? "Resetting…" : "Reset"}</button>
    </div>
    {error ? <p className="error-message" role="alert">{error}</p> : null}
  </section>;
}

export function SettingsWorkspace({
  onOpenTools,
  toolsRevision,
  currentWorkspace,
  demoWorkspace,
  view,
  onViewChange,
  onChooseWorkspace,
  onDirtyChange,
  onEnvironmentChange,
  onAiValidationState,
  onRestored,
  onWorkspaceReset,
  protectedWorkDirty = false,
}: SettingsWorkspaceProps) {
  const [detailDirty, setDetailDirty] = useState(false);
  const visible = useContext(ToolbarVisible);

  useEffect(() => {
    onDirtyChange(detailDirty);
    return () => onDirtyChange(false);
  }, [detailDirty, onDirtyChange]);

  const selectView = (next: SettingsView) => {
    if (next === view) return;
    onViewChange(next);
  };

  return (
    <section className="settings-workspace" aria-label="Settings">
      <PageToolbar>
        <select aria-label="Settings section" value={view} onChange={event => selectView(event.target.value as SettingsView)}>
          {tabs.map(tab => <option key={tab} value={tab}>{settingsLabels[tab]}</option>)}
        </select>
        {view === "workspace" ? <>
          <button type="button" onClick={() => onChooseWorkspace("create")}>New workspace</button>
          <button type="button" onClick={() => onChooseWorkspace("open")}>Open workspace</button>
        </> : null}
        {view === "ai" ? <button type="button" onClick={() => onOpenTools({ localAi: true, pdf: false })}>Local AI</button> : null}
        {view === "documents" ? <button type="button" onClick={() => onOpenTools({ localAi: false, pdf: true })}>PDF setup</button> : null}
      </PageToolbar>

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
            </div>
            <details className="settings-destructive-stack">
              <summary>Reset</summary>
              <ResetWorkspacePanel onReset={onWorkspaceReset} />
            </details>
          </div>
        ) : null}

        <ToolbarVisible.Provider value={visible && view === "ai"}>
          <div hidden={view !== "ai"}>
            <AiSettingsWorkspace
              refreshRevision={toolsRevision}
              view="all"
              onDirtyChange={setDetailDirty}
              onEnvironmentChange={onEnvironmentChange}
              onValidationState={onAiValidationState}
            />
            <details className="profile-column" aria-label="Connect another AI to AAAAT">
              <summary>Connect another AI</summary>
              <details>
                <summary>Connection setup</summary>
                <ExternalAssistantConnectionPanel />
              </details>
              <SetupActionAuthorityPanel />
              <ExternalAssistantGuidancePanel />
            </details>
          </div>
        </ToolbarVisible.Provider>

        <ToolbarVisible.Provider value={visible && view === "documents"}>
          <div hidden={view !== "documents"}>
          <SetupEnvironmentPanel view="rendering" refreshRevision={toolsRevision} onEnvironmentChange={onEnvironmentChange} />
          </div>
        </ToolbarVisible.Provider>

        <ToolbarVisible.Provider value={visible && view === "backup"}>
          <div hidden={view !== "backup"}>
          <WorkspaceRecoveryPanel
            currentWorkspace={currentWorkspace}
            editorDirty={detailDirty || protectedWorkDirty}
            onRestored={onRestored}
          />
          </div>
        </ToolbarVisible.Provider>
      </section>
    </section>
  );
}
