import { useEffect, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import type { SetupEnvironmentSnapshot } from "../shared/setup-environment-contracts";
import { AiSettingsWorkspace } from "./AiSettingsWorkspace";
import { SetupEnvironmentPanel } from "./SetupEnvironmentPanel";
import { VscodeExternalToolSetup } from "./VscodeExternalToolSetup";
import { WorkspaceRecoveryPanel } from "./WorkspaceRecoveryPanel";

export type SettingsView =
  | "overview"
  | "workspace"
  | "recovery"
  | "rendering"
  | "ai"
  | "portability";

interface SettingsWorkspaceProps {
  readonly currentWorkspace: WorkspaceInfo;
  readonly initialView?: SettingsView;
  readonly onChooseWorkspace: (choice: WorkspaceChoice) => void;
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onRestored: (workspace: WorkspaceInfo) => void;
  readonly protectedWorkDirty?: boolean;
}

const settingsLabels: Record<Exclude<SettingsView, "overview">, string> = {
  workspace: "Workspace",
  recovery: "Backup & recovery",
  rendering: "Document rendering",
  ai: "AI connections",
  portability: "External assistants & portability",
};

function ResetWorkspacePanel() {
  const [busy, setBusy] = useState(false);
  return (
    <section className="profile-column destructive-settings" aria-label="Reset workspace">
      <div className="section-heading"><div><p className="eyebrow">Current workspace only</p><h2>Reset workspace</h2></div></div>
      <p>Remove the current workspace data and return this folder to a clean usable AAAAT state. Other workspaces are not affected.</p>
      <button type="button" className="compact-secondary" disabled={busy} onClick={() => {
        if (!window.confirm("Reset this workspace? This permanently removes its candidatures, Sources, Tags, professional information, documents, artifacts and workspace AI settings.")) return;
        setBusy(true);
        void window.aaaat.workspace.reset().then(() => window.location.reload()).catch(() => setBusy(false));
      }}>{busy ? "Resetting…" : "Reset workspace"}</button>
    </section>
  );
}

export function SettingsWorkspace({
  currentWorkspace,
  initialView = "overview",
  onChooseWorkspace,
  onDirtyChange,
  onRestored,
  protectedWorkDirty = false,
}: SettingsWorkspaceProps) {
  const [view, setView] = useState<SettingsView>(initialView);
  const [detailDirty, setDetailDirty] = useState(false);
  const [environment, setEnvironment] = useState<SetupEnvironmentSnapshot | null>(null);
  const [environmentFailed, setEnvironmentFailed] = useState(false);

  useEffect(() => {
    onDirtyChange(detailDirty);
    return () => onDirtyChange(false);
  }, [detailDirty, onDirtyChange]);

  useEffect(() => {
    let active = true;
    void window.aaaat.setupEnvironment
      .current()
      .then((snapshot) => {
        if (active) setEnvironment(snapshot);
      })
      .catch(() => {
        if (active) setEnvironmentFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const selectView = (next: SettingsView) => {
    if (next === view) return;
    if (detailDirty && !window.confirm("Discard unsaved Settings edits and leave this section?")) return;
    setDetailDirty(false);
    setView(next);
  };

  const renderingSummary = environmentFailed
    ? "Status check failed; document editing remains available."
    : environment
      ? environment.tex.documentRenderingReady
        ? "Available on this computer."
        : "Unavailable; document editing still works."
      : "Checking local rendering status…";

  const aiSummary = environmentFailed
    ? "Status check failed; AI remains optional."
    : environment
      ? environment.ai.configurationReadable
        ? environment.ai.connectionCount === 0
          ? "Optional; no connections configured."
          : `${String(environment.ai.connectionCount)} connection${environment.ai.connectionCount === 1 ? "" : "s"} configured.`
        : "Connection status unavailable; AI remains optional."
      : "Checking optional connection status…";

  if (view === "overview") {
    return (
      <section className="settings-workspace" aria-label="Settings overview">
        <p className="settings-intro">
          Keep workspace ownership, rendering, optional AI and external-assistant setup here. Ordinary application and document work does not depend on these settings.
        </p>
        <div className="settings-intention-list">
          <button className="settings-intention" type="button" onClick={() => selectView("workspace")}>
            <strong>Workspace</strong>
            <span title={currentWorkspace.rootPath}>{currentWorkspace.rootPath}</span>
          </button>
          <button className="settings-intention" type="button" onClick={() => selectView("recovery")}>
            <strong>Backup &amp; recovery</strong>
            <span>Create or restore a user-owned workspace backup.</span>
          </button>
          <button className="settings-intention" type="button" onClick={() => selectView("rendering")}>
            <strong>Document rendering</strong>
            <span>{renderingSummary}</span>
          </button>
          <button className="settings-intention" type="button" onClick={() => selectView("ai")}>
            <strong>AI connections</strong>
            <span>{aiSummary}</span>
          </button>
          <button className="settings-intention" type="button" onClick={() => selectView("portability")}>
            <strong>External assistants &amp; portability</strong>
            <span>Use bounded AAAAT capabilities from compatible assistants and move portable AI setup.</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="settings-workspace settings-detail" aria-label={`${settingsLabels[view]} settings`}>
      <div className="settings-detail-heading">
        <button className="compact-secondary" type="button" onClick={() => selectView("overview")}>
          Back to Settings
        </button>
        <h2>{settingsLabels[view]}</h2>
      </div>

      {view === "workspace" ? (
        <div className="profile-workspace">
          <div className="profile-column">
            <div className="section-heading">
              <div><p className="eyebrow">Local ownership</p><h3>Current workspace</h3></div>
            </div>
            <p>AAAAT keeps this workspace on your computer under your control.</p>
            <code className="settings-path">{currentWorkspace.rootPath}</code>
            <div className="button-row">
              <button className="compact-secondary" type="button" onClick={() => onChooseWorkspace("create")}>Create another workspace</button>
              <button className="compact-secondary" type="button" onClick={() => onChooseWorkspace("open")}>Open another workspace</button>
            </div>
          </div>
          <ResetWorkspacePanel />
        </div>
      ) : null}

      {view === "recovery" ? (
        <WorkspaceRecoveryPanel
          currentWorkspace={currentWorkspace}
          editorDirty={detailDirty || protectedWorkDirty}
          onRestored={onRestored}
        />
      ) : null}

      {view === "rendering" ? <SetupEnvironmentPanel view="rendering" /> : null}

      {view === "ai" ? <AiSettingsWorkspace view="connections" onDirtyChange={setDetailDirty} /> : null}

      {view === "portability" ? (
        <div className="settings-portability-stack">
          <section className="settings-portability-intro" aria-label="Bounded external assistants">
            <p className="eyebrow">Host agnostic</p>
            <h3>Use AAAAT from a compatible assistant</h3>
            <p>
              AAAAT exposes a small local capability surface for tasks such as retaining an opportunity, reading deliberately shared career/CV context, requesting a CV render, and inspecting setup status. It does not grant generic database, filesystem, shell, process or browsing authority.
            </p>
            <p>
              The host is your choice: ChatGPT, Claude, local agents, editors and other compatible tools can use the same bounded contract when their environment supports it. Host-specific adapters are conveniences, not product dependencies.
            </p>
          </section>
          <SetupEnvironmentPanel view="guidance" />
          <AiSettingsWorkspace view="portability" />
          <details className="optional-host-adapter">
            <summary>Optional VS Code adapter</summary>
            <VscodeExternalToolSetup />
          </details>
        </div>
      ) : null}
    </section>
  );
}
