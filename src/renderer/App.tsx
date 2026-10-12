import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import { AiTaskStatus } from "./AiTaskStatus";
import { clearAllAiTasks, useAiTasks } from "./ai-task-store";
import logoMachine from "./assets/aaaat-logo-dark.png";
import logoPaper from "./assets/aaaat-logo-light.png";
import loadingMachine from "./assets/aaaat-loading-dark.png";
import { CandidaturesAiWorkspace } from "./CandidaturesAiWorkspace";
import { CareerContextPanel } from "./CareerContextPanel";
import {
  ContextualHandoffContext,
  type DocumentHandoff,
  type ProfessionalInformationHandoff,
  type SettingsHandoff,
} from "./contextual-handoffs";
import { clearDocumentDrafts, hasUnsavedDocumentDrafts } from "./document-drafts";
import { DocumentsStartWorkspace } from "./DocumentsStartWorkspace";
import { DocumentsWorkspace } from "./DocumentsWorkspace";
import "./intent-recovery.css";
import { LoadedHome } from "./LoadedHome";
import "./owner-feedback-recovery.css";
import { ProfileWorkspace } from "./ProfileWorkspace";
import { SettingsWorkspace } from "./SettingsWorkspace";
import "./settings-rail-recovery.css";
import { ShellActionsProvider, type ShellActions } from "./shell-actions";
import "./shell.css";
import { TagVisor, type ApplicationTagContext } from "./TagVisor";
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

function CandidaturesArea({
  initialCandidatureId,
  onInitialCandidatureCleared,
  onDirtyChange,
  onTagContextChange,
}: {
  readonly initialCandidatureId?: string;
  readonly onInitialCandidatureCleared: () => void;
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onTagContextChange: (context: ApplicationTagContext | null) => void;
}) {
  return (
    <div className="destination-area">
      <CandidaturesAiWorkspace
        initialCandidatureId={initialCandidatureId}
        onInitialCandidatureCleared={onInitialCandidatureCleared}
        onDirtyChange={onDirtyChange}
        onTagContextChange={onTagContextChange}
      />
    </div>
  );
}

function DocumentsArea({ onDirtyChange, active }: { readonly onDirtyChange: (dirty: boolean) => void; readonly active: boolean }) {
  return (
    <div className="destination-area">
      <DocumentsWorkspace onDirtyChange={onDirtyChange} active={active} />
    </div>
  );
}

export function App() {
  const aiTasks = useAiTasks();
  const activeTaskCount = aiTasks.filter((task) => task.status === "queued" || task.status === "working").length;
  const failedTaskCount = aiTasks.filter((task) => task.status === "failed").length;
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
  const [applicationTagContext, setApplicationTagContext] = useState<ApplicationTagContext | null>(null);
  const [documentHandoff, setDocumentHandoff] = useState<DocumentHandoff | null>(null);
  const [professionalInformationHandoff, setProfessionalInformationHandoff] =
    useState<ProfessionalInformationHandoff | null>(null);
  const [settingsHandoff, setSettingsHandoff] = useState<SettingsHandoff | null>(null);
  const [homeCandidatureId, setHomeCandidatureId] = useState<string | null>(null);
  const [profileInitialItemId, setProfileInitialItemId] = useState<string | undefined>(undefined);
  const [visitedViews, setVisitedViews] = useState<ReadonlySet<ProductView>>(new Set());
  const [applicationActions, setApplicationActions] = useState<ShellActions | null>(null);
  const [documentActions, setDocumentActions] = useState<ShellActions | null>(null);
  const [informationActions, setInformationActions] = useState<ShellActions | null>(null);
  const [settingsActions, setSettingsActions] = useState<ShellActions | null>(null);
  const [supportPanel, setSupportPanel] = useState<"activity" | "tags" | null>(null);

  const applicationAreaVisible = useRef(false);
  const documentsAreaVisible = useRef(false);
  const homeAreaVisible = useRef(false);
  useLayoutEffect(() => {
    applicationAreaVisible.current = !welcomeOpen && !settingsOpen && productView === "candidatures";
    documentsAreaVisible.current = !welcomeOpen && !settingsOpen && productView === "documents";
    homeAreaVisible.current = welcomeOpen && !settingsOpen;
  }, [productView, settingsOpen, welcomeOpen]);

  const showProductView = useCallback((next: ProductView) => {
    setVisitedViews((current) => current.has(next) ? current : new Set([...current, next]));
    setProductView(next);
    setWelcomeOpen(false);
  }, []);

  useEffect(() => {
    if (!supportPanel) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSupportPanel(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [supportPanel]);

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

  const protectedWorkDirty = candidatureDirty || documentDirty || hasUnsavedDocumentDrafts() || professionalInformationDirty;
  const anyDirty = protectedWorkDirty || settingsDirty;

  const resetHandoffs = () => {
    setDocumentHandoff(null);
    setProfessionalInformationHandoff(null);
    setSettingsHandoff(null);
    setHomeCandidatureId(null);
    setApplicationTagContext(null);
  };

  const resetWorkspaceContent = () => {
    setWorkspaceContentRevision((current) => current + 1);
    clearAllAiTasks();
    clearDocumentDrafts();
    setVisitedViews(new Set());
    setProfileInitialItemId(undefined);
    setApplicationActions(null);
    setDocumentActions(null);
    setInformationActions(null);
    setSettingsActions(null);
    setSupportPanel(null);
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
      resetWorkspaceContent();
      resetEnvironmentProjection();
      setWorkspace(selectedWorkspace);
      setRecentWorkspacePath(selectedWorkspace.rootPath);
      setDemoWorkspace(await window.aaaat.workspace.status().then((next) => next.demo).catch(() => false));
      setWorkspacePhase("ready");
      setSettingsOpen(false);
      showProductView("candidatures");
      setWelcomeOpen(false);
    } catch (reason) {
      setWorkspacePhase(workspace ? "ready" : "idle");
      setWorkspaceError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not open that workspace. Choose another folder.",
      );
    }
  };

  const continueRecentWorkspace = async () => {
    if (workspace && anyDirty && !window.confirm("Discard unsaved edits and reopen the previous workspace?")) return;
    setWorkspacePhase("choosing");
    setWorkspaceError(null);
    try {
      const selected = await window.aaaat.workspace.continueRecent();
      if (!selected) throw new Error("No previous workspace is available.");
      resetWorkspaceContent();
      resetDirty();
      resetHandoffs();
      resetEnvironmentProjection();
      setWorkspace(selected);
      setDemoWorkspace((await window.aaaat.workspace.status()).demo);
      setWorkspacePhase("ready");
      showProductView(productView);
      setSettingsOpen(false);
    } catch (reason) {
      setWorkspacePhase("idle");
      setWorkspaceError(reason instanceof Error ? reason.message : "AAAAT could not open that workspace. Choose another folder.");
    }
  };

  const openHome = () => {
    if (!leaveSettings()) return;
    setWelcomeOpen(true);
    setSupportPanel(null);
  };

  const afterWorkspaceDeleted = () => {
    resetWorkspaceContent();
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
    resetWorkspaceContent();
    resetDirty();
    resetHandoffs();
    setWorkspaceError(null);
    setWorkspace(resetWorkspace);
    setRecentWorkspacePath(resetWorkspace.rootPath);
    setDemoWorkspace(false);
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
      resetWorkspaceContent();
      resetEnvironmentProjection();
      setWorkspace(selected);
      setRecentWorkspacePath(selected.rootPath);
      setDemoWorkspace(true);
      setWorkspacePhase("ready");
      setSettingsOpen(false);
      showProductView("candidatures");
      setWelcomeOpen(false);
    } catch {
      setWorkspacePhase(workspace ? "ready" : "idle");
      setWorkspaceError("AAAAT could not create the demo workspace. Choose an empty folder.");
    }
  };

  const openRestoredWorkspace = (restoredWorkspace: WorkspaceInfo) => {
    resetWorkspaceContent();
    resetDirty();
    resetHandoffs();
    setWorkspaceError(null);
    setWorkspace(restoredWorkspace);
    setRecentWorkspacePath(restoredWorkspace.rootPath);
    setDemoWorkspace(false);
    resetEnvironmentProjection();
    setWorkspacePhase("ready");
    setSettingsOpen(false);
    showProductView("candidatures");
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
    if (!leaveSettings()) return;
    setWelcomeOpen(false);
    setSupportPanel(null);
    showProductView(next);
  };

  const openCandidatureFromHome = (candidatureId: string) => {
    if (candidatureDirty && !window.confirm("Discard the current application's unsaved edits and open another application?")) return;
    setCandidatureDirty(false);
    setApplicationTagContext(null);
    setHomeCandidatureId(candidatureId);
    setCandidatureWorkspaceRevision((current) => current + 1);
    setSettingsOpen(false);
    setWelcomeOpen(false);
    showProductView("candidatures");
  };

  const openStandaloneDocument = (documentId: string, origin: "documents" | "home" = "documents"): boolean => {
    if (!(origin === "home" ? homeAreaVisible.current : documentsAreaVisible.current)) return false;
    setWelcomeOpen(false);
    setSettingsOpen(false);
    setSettingsHandoff(null);
    setProfessionalInformationHandoff(null);
    setHomeCandidatureId(null);
    setDocumentDirty(false);
    setDocumentHandoff({ documentId });
    setDocumentWorkspaceRevision((current) => current + 1);
    showProductView("documents");
    return true;
  };

  const openSettings = () => {
    if (settingsOpen) return;
    setSupportPanel(null);
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
        if (!applicationAreaVisible.current) return;
        setDocumentDirty(false);
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setHomeCandidatureId(null);
        setDocumentHandoff({ candidatureId, ...(documentId ? { documentId } : {}) });
        setWelcomeOpen(false);
        showProductView("documents");
      },
      returnToCandidature: () => {
        setDocumentDirty(false);
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentHandoff(null);
        setDocumentWorkspaceRevision((current) => current + 1);
        showProductView("candidatures");
      },
      returnToDocuments: () => {
        setDocumentDirty(false);
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentHandoff(null);
        setDocumentWorkspaceRevision((current) => current + 1);
        showProductView("documents");
      },
      openProfessionalInformationItem: (documentId: string, itemId: string) => {
        if (professionalInformationDirty && profileInitialItemId !== itemId
          && !window.confirm("Discard unsaved My information edits and open another item?")) return;
        setProfileInitialItemId(itemId);
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff({ documentId, itemId });
        showProductView("professional-information");
      },
      returnToDocument: () => {
        const returningDocumentId = professionalInformationHandoff?.documentId;
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        if (!documentDirty && returningDocumentId) {
          setDocumentHandoff((current) => ({
            ...(current?.candidatureId ? { candidatureId: current.candidatureId } : {}),
            documentId: returningDocumentId,
          }));
        }
        showProductView("documents");
      },
      openSettingsFor: (view: SettingsHandoff["view"], origin: SettingsHandoff["origin"]) => {
        setSettingsDirty(false);
        setSettingsHandoff({ view, origin });
        showProductView(origin);
        setSettingsOpen(true);
      },
      returnFromSettings: () => {
        if (settingsDirty && !window.confirm("Discard unsaved Settings edits and return to your work?")) return;
        const origin = settingsHandoff?.origin ?? productView;
        setSettingsDirty(false);
        setSettingsOpen(false);
        setSettingsHandoff(null);
        showProductView(origin);
      },
    }),
    [
      documentDirty,
      documentHandoff,
      productView,
      profileInitialItemId,
      professionalInformationDirty,
      professionalInformationHandoff,
      settingsDirty,
      settingsHandoff,
      showProductView,
    ],
  );

  const ready = (workspacePhase === "ready" || workspacePhase === "choosing") && workspace !== null;
  const choosing = workspacePhase === "choosing";
  const loading = workspacePhase === "loading";
  const keepCandidaturesMounted = visitedViews.has("candidatures")
    || (!welcomeOpen && !settingsOpen && productView === "candidatures");
  const keepDocumentsMounted = visitedViews.has("documents")
    || (!welcomeOpen && !settingsOpen && productView === "documents");
  const keepProfessionalInformationMounted = visitedViews.has("professional-information")
    || (!welcomeOpen && !settingsOpen && productView === "professional-information");
  const documentDetailActive =
    documentHandoff !== null || professionalInformationHandoff !== null;
  const applicationContextActive =
    !welcomeOpen && !settingsOpen &&
    (productView === "candidatures" ||
      (productView === "documents" && Boolean(documentHandoff?.candidatureId)));
  const cvContextActive =
    !welcomeOpen && !settingsOpen && productView === "documents" && !documentHandoff?.candidatureId;

  const currentActions = !welcomeOpen
    ? settingsOpen ? settingsActions : productView === "candidatures" ? applicationActions
      : productView === "documents" ? documentActions : informationActions
    : null;
  const headerTitle = !ready ? "Welcome" : welcomeOpen ? "Home" : settingsOpen ? currentActions?.title ?? "Settings"
    : currentActions?.title ?? (productView === "candidatures" ? "Applications"
      : productView === "documents" ? "Documents" : "My information");

  const welcomeContent = (
    <div className="welcome-console">
      <img
        className={loading ? "startup-art" : "hero-logo"}
        src={loading ? loadingMachine : logoPaper}
        alt={loading ? "AAAAT starting up" : "AAAAT explorer robot holding a magnifying glass"}
      />
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
            <button className="primary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("open")}>Open folder</button>
            <button className="secondary-action" type="button" disabled={choosing} onClick={() => void createDemoWorkspace()}>Open demo</button>
          </div>
          <WorkspaceRecoveryPanel currentWorkspace={null} editorDirty={false} onRestored={openRestoredWorkspace} />
        </>
      )}
      {workspaceError ? <p className="error-message" role="alert">{workspaceError}</p> : null}
    </div>
  );

  const loadedHomeContent = workspace ? (
    <LoadedHome
      workspaceName={folderName(workspace.rootPath)}
      demoWorkspace={demoWorkspace}
      onOpenApplication={openCandidatureFromHome}
      onOpenDocument={(documentId) => openStandaloneDocument(documentId, "home")}
      onOpenApplications={() => selectProductView("candidatures")}
      onOpenDocuments={() => selectProductView("documents")}
    />
  ) : null;

  return (
    <ContextualHandoffContext.Provider value={handoffApi}>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-lockup">
            <img className="brand-mark" src={logoMachine} alt="" />
            <span className="brand-name">AAAAT</span>
          </div>
          <h1 className="shell-task-title" title={headerTitle}>{headerTitle}</h1>
          {ready ? (
            <div className="shell-task-actions" aria-label="Current work actions">
              {settingsOpen && settingsHandoff ? (
                <button type="button" className="compact-secondary" onClick={handoffApi.returnFromSettings}>Return</button>
              ) : null}
              {!welcomeOpen && !settingsOpen && productView === "professional-information" && professionalInformationHandoff ? (
                <button type="button" className="compact-secondary" onClick={handoffApi.returnToDocument}>Return to document</button>
              ) : null}
              {currentActions?.actions.map((action) => (
                <button key={action.id} type="button"
                  className={action.primary ? "compact-primary" : "compact-secondary"}
                  disabled={action.disabled} onClick={action.onClick}>{action.label}</button>
              ))}
              {currentActions?.moreActions?.length ? (
                <details className="shell-more-actions">
                  <summary>More</summary>
                  <div>{currentActions.moreActions.map((action) => (
                    <button key={action.id} type="button" disabled={action.disabled}
                      onClick={(event) => {
                        event.currentTarget.closest("details")?.removeAttribute("open");
                        action.onClick();
                      }}>{action.label}</button>
                  ))}</div>
                </details>
              ) : null}
              <button type="button" className="shell-activity-toggle" aria-expanded={supportPanel === "activity"}
                onClick={() => setSupportPanel((current) => current === "activity" ? null : "activity")}>
                Activity{activeTaskCount > 0 ? ` · ${activeTaskCount} working` : failedTaskCount > 0 ? ` · ${failedTaskCount} needs attention` : ""}
              </button>
            </div>
          ) : null}
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
                  <button type="button" className={cvContextActive ? "active-work-destination" : ""} aria-current={cvContextActive ? "page" : undefined} onClick={() => selectProductView("documents")}>Documents</button>
                  <button type="button" className={!welcomeOpen && !settingsOpen && productView === "professional-information" ? "active-work-destination" : ""} aria-current={!welcomeOpen && !settingsOpen && productView === "professional-information" ? "page" : undefined} onClick={() => selectProductView("professional-information")}>My information</button>
                  <button type="button" className={settingsOpen ? "active-work-destination" : ""} aria-current={settingsOpen ? "page" : undefined} onClick={openSettings}>Settings</button>
                </nav>
                <div className="rail-support">
                  <button type="button" className="rail-reference-button" aria-expanded={supportPanel === "tags"}
                    onClick={() => setSupportPanel((current) => current === "tags" ? null : "tags")}>Tags</button>
                  <details className="rail-environment">
                    <summary>{demoWorkspace ? "Demo workspace" : "Local workspace"}</summary>
                    <WorkspaceRailStatus
                      key={workspace.rootPath}
                      demo={demoWorkspace}
                      refreshRevision={railStatusRevision}
                      attentionConnectionName={aiAttentionConnectionName}
                    />
                  </details>
                </div>
              </aside>

              <section className="work-surface">
                {welcomeOpen ? loadedHomeContent : null}

                {!welcomeOpen && settingsOpen ? (
                  <div className="settings-area" key={`settings-${workspace.rootPath}-${String(workspaceContentRevision)}-${settingsHandoff?.view ?? "workspace"}`}>
                    <ShellActionsProvider onChange={setSettingsActions}>
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
                    </ShellActionsProvider>
                  </div>
                ) : null}

                {keepCandidaturesMounted ? (
                  <div hidden={welcomeOpen || settingsOpen || productView !== "candidatures"}>
                    <ShellActionsProvider onChange={setApplicationActions}>
                    <CandidaturesArea
                      key={`candidatures-${workspace.rootPath}-${String(workspaceContentRevision)}-${String(candidatureWorkspaceRevision)}`}
                      initialCandidatureId={homeCandidatureId ?? undefined}
                      onInitialCandidatureCleared={() => setHomeCandidatureId(null)}
                      onDirtyChange={setCandidatureDirty}
                      onTagContextChange={setApplicationTagContext}
                    />
                    </ShellActionsProvider>
                  </div>
                ) : null}

                {keepDocumentsMounted ? (
                  <div hidden={welcomeOpen || settingsOpen || productView !== "documents"}>
                    <ShellActionsProvider onChange={setDocumentActions}>
                    {documentDetailActive ? (
                      <DocumentsArea
                        key={`documents-${workspace.rootPath}-${String(workspaceContentRevision)}-${String(documentWorkspaceRevision)}`}
                        active={!welcomeOpen && !settingsOpen && productView === "documents"}
                        onDirtyChange={setDocumentDirty}
                      />
                    ) : (
                      <DocumentsStartWorkspace
                        key={`document-start-${workspace.rootPath}-${String(workspaceContentRevision)}`}
                        active={!welcomeOpen && !settingsOpen && productView === "documents"}
                        onOpenDocument={openStandaloneDocument}
                        onDirtyChange={setDocumentDirty}
                      />
                    )}
                    </ShellActionsProvider>
                  </div>
                ) : null}

                {keepProfessionalInformationMounted ? (
                  <div hidden={welcomeOpen || settingsOpen || productView !== "professional-information"}>
                    <ShellActionsProvider onChange={setInformationActions}>
                    {professionalInformationHandoff ? (
                      <div className="contextual-return-bar" role="status">
                        <span>Editing My information used by this document.</span>
                      </div>
                    ) : null}
                    <ProfileArea
                      key={`professional-information-${workspace.rootPath}-${String(workspaceContentRevision)}`}
                      initialItemId={profileInitialItemId}
                      onDirtyChange={setProfessionalInformationDirty}
                    />
                    </ShellActionsProvider>
                  </div>
                ) : null}
              </section>
            </div>
          </main>
        ) : (
          <main className={loading ? "empty-state startup-state" : "empty-state first-run-state"}>{welcomeContent}</main>
        )}
        {ready && supportPanel ? (
          <section className="shell-support-panel" aria-label={supportPanel === "activity" ? "Activity" : "Tag glossary"}>
            <header><h2>{supportPanel === "activity" ? "Activity" : "Tags"}</h2>
              <button type="button" className="compact-secondary" onClick={() => setSupportPanel(null)}>Close</button>
            </header>
            {supportPanel === "activity" ? <AiTaskStatus /> : <TagVisor applicationContext={applicationTagContext} />}
          </section>
        ) : null}
      </div>
    </ContextualHandoffContext.Provider>
  );
}
