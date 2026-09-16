import { useCallback, useEffect, useMemo, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import { AiTaskStatus } from "./AiTaskStatus";
import logo from "./assets/aaaat-logo-light.png";
import { CandidaturesAiWorkspace } from "./CandidaturesAiWorkspace";
import { CareerContextPanel } from "./CareerContextPanel";
import {
  ContextualHandoffContext,
  type DocumentHandoff,
  type ProfessionalInformationHandoff,
  type SettingsHandoff,
} from "./contextual-handoffs";
import { DocumentsStartWorkspace } from "./DocumentsStartWorkspace";
import { DocumentsWorkspace } from "./DocumentsWorkspace";
import "./intent-recovery.css";
import "./owner-feedback-recovery.css";
import { ProfileWorkspace } from "./ProfileWorkspace";
import { SettingsWorkspace } from "./SettingsWorkspace";
import "./settings-rail-recovery.css";
import "./shell.css";
import { WorkspaceRailStatus } from "./WorkspaceRailStatus";
import { WorkspaceRecoveryPanel } from "./WorkspaceRecoveryPanel";

type WorkspacePhase = "loading" | "idle" | "choosing" | "ready";
type ProductView = "documents" | "candidatures" | "professional-information";

function folderName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

function ProfileArea({
  initialItemId,
  onDirtyChange,
}: {
  readonly initialItemId?: string;
  readonly onDirtyChange: (dirty: boolean) => void;
}) {
  const [careerContextDirty, setCareerContextDirty] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(careerContextDirty || profileDirty);
    return () => onDirtyChange(false);
  }, [careerContextDirty, onDirtyChange, profileDirty]);

  return (
    <div className="professional-information-area">
      <ProfileWorkspace initialItemId={initialItemId} onDirtyChange={setProfileDirty} />
      <CareerContextPanel onDirtyChange={setCareerContextDirty} />
    </div>
  );
}

function CandidaturesArea({ onDirtyChange }: { readonly onDirtyChange: (dirty: boolean) => void }) {
  return (
    <div className="destination-area">
      <CandidaturesAiWorkspace onDirtyChange={onDirtyChange} />
    </div>
  );
}

function DocumentsArea({ onDirtyChange }: { readonly onDirtyChange: (dirty: boolean) => void }) {
  return (
    <div className="destination-area">
      <DocumentsWorkspace onDirtyChange={onDirtyChange} />
    </div>
  );
}

export function App() {
  const [workspacePhase, setWorkspacePhase] = useState<WorkspacePhase>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [recentWorkspacePath, setRecentWorkspacePath] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [demoWorkspace, setDemoWorkspace] = useState(false);
  const [productView, setProductView] = useState<ProductView>("candidatures");
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [candidatureDirty, setCandidatureDirty] = useState(false);
  const [documentDirty, setDocumentDirty] = useState(false);
  const [professionalInformationDirty, setProfessionalInformationDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [candidatureWorkspaceRevision, setCandidatureWorkspaceRevision] = useState(0);
  const [documentWorkspaceRevision, setDocumentWorkspaceRevision] = useState(0);
  const [workspaceContentRevision, setWorkspaceContentRevision] = useState(0);
  const [railStatusRevision, setRailStatusRevision] = useState(0);
  const [aiAttentionConnectionName, setAiAttentionConnectionName] = useState<string | null>(null);
  const [documentHandoff, setDocumentHandoff] = useState<DocumentHandoff | null>(null);
  const [professionalInformationHandoff, setProfessionalInformationHandoff] =
    useState<ProfessionalInformationHandoff | null>(null);
  const [settingsHandoff, setSettingsHandoff] = useState<SettingsHandoff | null>(null);

  const refreshRailStatus = useCallback(() => {
    setRailStatusRevision((current) => current + 1);
  }, []);

  const reportAiValidationState = useCallback((connectionName: string, needsAttention: boolean) => {
    setAiAttentionConnectionName((current) => {
      if (needsAttention) return connectionName;
      return current === connectionName ? null : current;
    });
    refreshRailStatus();
  }, [refreshRailStatus]);

  const resetEnvironmentProjection = useCallback(() => {
    setAiAttentionConnectionName(null);
    refreshRailStatus();
  }, [refreshRailStatus]);

  useEffect(() => {
    let active = true;
    void Promise.all([window.aaaat.workspace.current(), window.aaaat.workspace.recent()])
      .then(([currentWorkspace, recentPath]) => {
        if (!active) return;
        setWorkspace(currentWorkspace);
        setRecentWorkspacePath(recentPath);
        setWorkspacePhase(currentWorkspace ? "ready" : "idle");
        if (currentWorkspace) {
          void window.aaaat.workspace.status()
            .then((next) => {
              if (active) setDemoWorkspace(next.demo);
            })
            .catch(() => {
              if (active) setDemoWorkspace(false);
            });
        }
      })
      .catch(() => {
        if (active) {
          setWorkspacePhase("idle");
          setWorkspaceError("The previous workspace is no longer available. Choose another workspace.");
        }
      });
    return () => { active = false; };
  }, []);

  const protectedWorkDirty = candidatureDirty || documentDirty || professionalInformationDirty;
  const anyDirty = protectedWorkDirty || settingsDirty;

  const resetHandoffs = () => {
    setDocumentHandoff(null);
    setProfessionalInformationHandoff(null);
    setSettingsHandoff(null);
  };

  const resetDirty = () => {
    setCandidatureDirty(false);
    setDocumentDirty(false);
    setProfessionalInformationDirty(false);
    setSettingsDirty(false);
  };

  const chooseWorkspace = async (choice: WorkspaceChoice) => {
    if (workspace && anyDirty && !window.confirm("Discard unsaved edits and switch workspaces?")) return;
    setWorkspacePhase("choosing");
    setWorkspaceError(null);
    try {
      const selectedWorkspace = await window.aaaat.workspace.choose(choice);
      if (!selectedWorkspace) {
        setWorkspacePhase(workspace ? "ready" : "idle");
        return;
      }
      resetDirty();
      resetHandoffs();
      resetEnvironmentProjection();
      setWorkspace(selectedWorkspace);
      setRecentWorkspacePath(selectedWorkspace.rootPath);
      setDemoWorkspace(await window.aaaat.workspace.status().then((next) => next.demo).catch(() => false));
      setWorkspacePhase("ready");
      setSettingsOpen(false);
      setProductView("candidatures");
      setWelcomeOpen(false);
    } catch {
      setWorkspacePhase(workspace ? "ready" : "idle");
      setWorkspaceError(
        choice === "create"
          ? "That folder cannot be used as an AAAAT workspace. Choose an empty folder or an existing AAAAT workspace."
          : "That folder is not a compatible AAAAT workspace. Choose another folder.",
      );
    }
  };

  const continueRecentWorkspace = async () => {
    setWorkspacePhase("choosing");
    setWorkspaceError(null);
    try {
      const selected = await window.aaaat.workspace.continueRecent();
      if (!selected) throw new Error("No previous workspace is available.");
      resetEnvironmentProjection();
      setWorkspace(selected);
      setDemoWorkspace((await window.aaaat.workspace.status()).demo);
      setWorkspacePhase("ready");
      setWelcomeOpen(false);
      setSettingsOpen(false);
    } catch (reason) {
      setWorkspacePhase("idle");
      setWorkspaceError(reason instanceof Error ? reason.message : "AAAAT could not open that workspace. Choose another folder.");
    }
  };

  const openHome = () => {
    if (anyDirty && !window.confirm("Discard unsaved edits and return home?")) return;
    setSettingsOpen(false);
    setSettingsHandoff(null);
    setWelcomeOpen(true);
  };

  const afterWorkspaceDeleted = () => {
    resetDirty();
    resetHandoffs();
    setAiAttentionConnectionName(null);
    setWorkspace(null);
    setRecentWorkspacePath(null);
    setSettingsOpen(false);
    setWorkspacePhase("idle");
    setWelcomeOpen(true);
  };

  const afterWorkspaceReset = (resetWorkspace: WorkspaceInfo) => {
    resetDirty();
    resetHandoffs();
    setWorkspaceError(null);
    setWorkspace(resetWorkspace);
    setRecentWorkspacePath(resetWorkspace.rootPath);
    setDemoWorkspace(false);
    setWorkspaceContentRevision((current) => current + 1);
    setAiAttentionConnectionName(null);
    refreshRailStatus();
    setWorkspacePhase("ready");
    setSettingsOpen(true);
    setWelcomeOpen(false);
  };

  const createDemoWorkspace = async () => {
    if (workspace && anyDirty && !window.confirm("Discard unsaved edits and switch to a demo workspace?")) return;
    setWorkspacePhase("choosing");
    setWorkspaceError(null);
    try {
      const selected = await window.aaaat.workspace.createDemo();
      if (!selected) {
        setWorkspacePhase(workspace ? "ready" : "idle");
        return;
      }
      resetDirty();
      resetHandoffs();
      resetEnvironmentProjection();
      setWorkspace(selected);
      setRecentWorkspacePath(selected.rootPath);
      setDemoWorkspace(true);
      setWorkspacePhase("ready");
      setSettingsOpen(false);
      setProductView("candidatures");
      setWelcomeOpen(false);
    } catch (reason) {
      setWorkspacePhase(workspace ? "ready" : "idle");
      setWorkspaceError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not create the demo workspace. Choose an empty folder.",
      );
    }
  };

  const openRestoredWorkspace = (restoredWorkspace: WorkspaceInfo) => {
    resetDirty();
    resetHandoffs();
    setWorkspaceError(null);
    setWorkspace(restoredWorkspace);
    setRecentWorkspacePath(restoredWorkspace.rootPath);
    setDemoWorkspace(false);
    setWorkspaceContentRevision((current) => current + 1);
    resetEnvironmentProjection();
    setWorkspacePhase("ready");
    setSettingsOpen(false);
    setProductView("candidatures");
    setWelcomeOpen(false);
  };

  const leaveSettings = () => {
    if (!settingsOpen) return true;
    if (settingsDirty && !window.confirm("Discard unsaved Settings edits and leave Settings?")) return false;
    setSettingsDirty(false);
    setSettingsOpen(false);
    setSettingsHandoff(null);
    return true;
  };

  const selectProductView = (next: ProductView) => {
    if (welcomeOpen) {
      setWelcomeOpen(false);
      setSettingsOpen(false);
      setSettingsHandoff(null);
    }
    if (next === productView && !settingsOpen) {
      if (next === "documents" && documentHandoff) {
        if (protectedWorkDirty && !window.confirm("Discard unsaved edits and leave this work?")) return;
        setDocumentDirty(false);
        setDocumentHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentWorkspaceRevision((current) => current + 1);
      }
      return;
    }
    if (!leaveSettings()) return;
    if (next !== productView && protectedWorkDirty && !window.confirm("Discard unsaved edits and leave this work?")) return;
    if (next === "candidatures" && documentHandoff?.candidatureId) {
      setCandidatureWorkspaceRevision((current) => current + 1);
    }
    resetHandoffs();
    setProductView(next);
  };

  const openStandaloneDocument = (documentId: string) => {
    setSettingsOpen(false);
    setSettingsHandoff(null);
    setProfessionalInformationHandoff(null);
    setDocumentDirty(false);
    setDocumentHandoff({ documentId });
    setDocumentWorkspaceRevision((current) => current + 1);
    setProductView("documents");
  };

  const openSettings = () => {
    if (settingsOpen) return;
    setWelcomeOpen(false);
    setSettingsHandoff(null);
    setSettingsOpen(true);
  };

  const handoffApi = useMemo(
    () => ({
      documentHandoff,
      professionalInformationHandoff,
      settingsHandoff,
      openDocumentFromCandidature: (candidatureId: string, documentId?: string) => {
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentHandoff({ candidatureId, ...(documentId ? { documentId } : {}) });
        setProductView("documents");
      },
      returnToCandidature: () => {
        if (documentDirty && !window.confirm("Discard unsaved document edits and return to this application?")) return;
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentHandoff(null);
        setProductView("candidatures");
      },
      openProfessionalInformationItem: (documentId: string, itemId: string) => {
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff({ documentId, itemId });
        setProductView("professional-information");
      },
      returnToDocument: () => {
        if (professionalInformationDirty && !window.confirm("Discard unsaved My information edits and return to document?")) return;
        const returningDocumentId = professionalInformationHandoff?.documentId;
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        if (!documentDirty && returningDocumentId) {
          setDocumentHandoff((current) => ({
            ...(current?.candidatureId ? { candidatureId: current.candidatureId } : {}),
            documentId: returningDocumentId,
          }));
          setDocumentWorkspaceRevision((current) => current + 1);
        }
        setProductView("documents");
      },
      openSettingsFor: (view: SettingsHandoff["view"], origin: SettingsHandoff["origin"]) => {
        setSettingsDirty(false);
        setSettingsHandoff({ view, origin });
        setProductView(origin);
        setSettingsOpen(true);
      },
      returnFromSettings: () => {
        if (settingsDirty && !window.confirm("Discard unsaved Settings edits and return to your work?")) return;
        const origin = settingsHandoff?.origin ?? productView;
        setSettingsDirty(false);
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProductView(origin);
      },
    }),
    [
      documentDirty,
      documentHandoff,
      productView,
      professionalInformationDirty,
      professionalInformationHandoff,
      settingsDirty,
      settingsHandoff,
    ],
  );

  const ready = (workspacePhase === "ready" || workspacePhase === "choosing") && workspace !== null;
  const choosing = workspacePhase === "choosing";
  const loading = workspacePhase === "loading";
  const keepCandidaturesMounted = productView === "candidatures" || Boolean(documentHandoff?.candidatureId);
  const keepDocumentsMounted =
    productView === "documents" ||
    professionalInformationHandoff !== null ||
    settingsHandoff?.origin === "documents";
  const keepProfessionalInformationMounted = productView === "professional-information";
  const documentDetailActive =
    documentHandoff !== null || professionalInformationHandoff !== null || settingsHandoff?.origin === "documents";
  const applicationContextActive =
    !welcomeOpen && !settingsOpen &&
    (productView === "candidatures" ||
      (productView === "documents" && Boolean(documentHandoff?.candidatureId)));
  const cvContextActive =
    !welcomeOpen && !settingsOpen && productView === "documents" && !documentHandoff?.candidatureId;

  const welcomeContent = (
    <>
      <img className="hero-logo" src={logo} alt="AAAAT explorer robot holding a magnifying glass" />
      <p className="tagline">Your application work, on your computer.</p>
      <h1>{loading ? "Checking your workspace…" : "Welcome to AAAAT"}</h1>
      <p>Open your saved work or start a local workspace.</p>
      {loading ? null : (
        <>
          <div className="workspace-actions">
            {recentWorkspacePath ? (
              <button className="primary-action" type="button" disabled={choosing} onClick={() => void continueRecentWorkspace()}>
                {choosing ? "Opening…" : "Continue previous workspace"}
                <small title={recentWorkspacePath}>{folderName(recentWorkspacePath)}</small>
              </button>
            ) : null}
            <button className="primary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("create")}>{choosing ? "Choosing folder..." : "New workspace"}</button>
            <button className="secondary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("open")}>Open folder</button>
            <button className="secondary-action" type="button" disabled={choosing} onClick={() => void createDemoWorkspace()}>Open demo</button>
          </div>
          <WorkspaceRecoveryPanel currentWorkspace={null} editorDirty={false} onRestored={openRestoredWorkspace} />
        </>
      )}
      {workspaceError ? <p className="error-message" role="alert">{workspaceError}</p> : null}
    </>
  );

  const loadedHomeContent = workspace ? (
    <section className="loaded-workspace-home" aria-label="Home">
      <p className="eyebrow">{demoWorkspace ? "Demo workspace" : "Local workspace"}</p>
      <h1>Home</h1>
      <p title={workspace.rootPath}>{folderName(workspace.rootPath)}</p>
    </section>
  ) : null;

  return (
    <ContextualHandoffContext.Provider value={handoffApi}>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-lockup">
            <img className="brand-mark" src={logo} alt="" />
            <span className="brand-name">AAAAT</span>
          </div>
        </header>

        {ready ? (
          <main className="workspace-screen">
            {workspaceError ? <p className="error-message shell-error" role="alert">{workspaceError}</p> : null}
            <div className="work-shell">
              <aside className="work-rail" aria-label="Workspace controls">
                <div className="rail-workspace" title={workspace.rootPath}>
                  <span>WORKSPACE</span>
                  <strong>{folderName(workspace.rootPath)}</strong>
                </div>
                <nav className="primary-work-nav" aria-label="Primary work areas">
                  <button type="button" className={welcomeOpen ? "active-work-destination" : ""} aria-current={welcomeOpen ? "page" : undefined} onClick={openHome}>Home</button>
                  <button type="button" className={applicationContextActive ? "active-work-destination" : ""} aria-current={applicationContextActive ? "page" : undefined} onClick={() => selectProductView("candidatures")}>Applications</button>
                  <button type="button" className={cvContextActive ? "active-work-destination" : ""} aria-current={cvContextActive ? "page" : undefined} onClick={() => selectProductView("documents")}>CVs</button>
                  <button type="button" className={!welcomeOpen && !settingsOpen && productView === "professional-information" ? "active-work-destination" : ""} aria-current={!welcomeOpen && !settingsOpen && productView === "professional-information" ? "page" : undefined} onClick={() => selectProductView("professional-information")}>My information</button>
                  <button type="button" className={settingsOpen ? "active-work-destination" : ""} aria-current={settingsOpen ? "page" : undefined} onClick={openSettings}>Settings</button>
                </nav>
                <WorkspaceRailStatus
                  key={workspace.rootPath}
                  demo={demoWorkspace}
                  refreshRevision={railStatusRevision}
                  attentionConnectionName={aiAttentionConnectionName}
                />
                <AiTaskStatus />
              </aside>

              <section className="work-surface">
                {welcomeOpen ? loadedHomeContent : null}

                {!welcomeOpen && settingsOpen ? (
                  <div className="settings-area" key={`settings-${workspace.rootPath}-${String(workspaceContentRevision)}-${settingsHandoff?.view ?? "workspace"}`}>
                    {settingsHandoff ? <div className="shell-section-heading">
                      <h1 className="visually-hidden">Settings</h1>
                      <button className="compact-secondary" type="button" onClick={handoffApi.returnFromSettings}>
                        {settingsHandoff.origin === "documents" ? "Return to document" : "Return to application"}
                      </button>
                    </div> : null}
                    <SettingsWorkspace
                      currentWorkspace={workspace}
                      demoWorkspace={demoWorkspace}
                      initialView={settingsHandoff?.view ?? "workspace"}
                      onChooseWorkspace={(choice) => void chooseWorkspace(choice)}
                      onDirtyChange={setSettingsDirty}
                      onEnvironmentChange={refreshRailStatus}
                      onAiValidationState={reportAiValidationState}
                      onRestored={openRestoredWorkspace}
                      onWorkspaceReset={afterWorkspaceReset}
                      onWorkspaceDeleted={afterWorkspaceDeleted}
                      protectedWorkDirty={protectedWorkDirty}
                    />
                  </div>
                ) : null}

                {keepCandidaturesMounted ? (
                  <div hidden={welcomeOpen || settingsOpen || productView !== "candidatures"}>
                    <CandidaturesArea
                      key={`candidatures-${workspace.rootPath}-${String(workspaceContentRevision)}-${String(candidatureWorkspaceRevision)}`}
                      onDirtyChange={setCandidatureDirty}
                    />
                  </div>
                ) : null}

                {keepDocumentsMounted ? (
                  <div hidden={welcomeOpen || settingsOpen || productView !== "documents"}>
                    {documentDetailActive ? (
                      <DocumentsArea
                        key={`documents-${workspace.rootPath}-${String(workspaceContentRevision)}-${String(documentWorkspaceRevision)}`}
                        onDirtyChange={setDocumentDirty}
                      />
                    ) : (
                      <DocumentsStartWorkspace key={`document-start-${workspace.rootPath}-${String(workspaceContentRevision)}`} onOpenDocument={openStandaloneDocument} />
                    )}
                  </div>
                ) : null}

                {keepProfessionalInformationMounted ? (
                  <div hidden={welcomeOpen || settingsOpen || productView !== "professional-information"}>
                    {professionalInformationHandoff ? (
                      <div className="contextual-return-bar" role="status">
                        <span>Editing My information used by this document.</span>
                        <button className="compact-secondary" type="button" onClick={handoffApi.returnToDocument}>
                          Return to document
                        </button>
                      </div>
                    ) : null}
                    <ProfileArea
                      key={`professional-information-${workspace.rootPath}-${String(workspaceContentRevision)}`}
                      initialItemId={professionalInformationHandoff?.itemId}
                      onDirtyChange={setProfessionalInformationDirty}
                    />
                  </div>
                ) : null}
              </section>
            </div>
          </main>
        ) : (
          <main className="empty-state">{welcomeContent}</main>
        )}
      </div>
    </ContextualHandoffContext.Provider>
  );
}
