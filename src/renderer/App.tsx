import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import type { OptionalToolsChoice } from "../shared/optional-tools-contracts";
import { OptionalToolsDialog } from "./OptionalToolsDialog";
import { AiTaskStatus } from "./AiTaskStatus";
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
import { DocumentsStartWorkspace } from "./DocumentsStartWorkspace";
import { DocumentsWorkspace } from "./DocumentsWorkspace";
import "./intent-recovery.css";
import { LoadedHome } from "./LoadedHome";
import { ToolbarHost, ToolbarVisible } from "./toolbar-context";
import "./owner-feedback-recovery.css";
import { ProfileWorkspace } from "./ProfileWorkspace";
import { SettingsWorkspace, type SettingsView } from "./SettingsWorkspace";
import "./settings-rail-recovery.css";
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

function DocumentsArea({ onDirtyChange }: { readonly onDirtyChange: (dirty: boolean) => void }) {
  return (
    <div className="destination-area">
      <DocumentsWorkspace onDirtyChange={onDirtyChange} />
    </div>
  );
}

export function App() {
  const [optionalToolsChoice, setOptionalToolsChoice] = useState<OptionalToolsChoice | null>(null);
  const [toolsRevision, setToolsRevision] = useState(0);
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null);
  const [utility, setUtility] = useState<"activity" | "status" | null>(null);
  const utilityDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (utility) utilityDialog.current?.showModal();
    else utilityDialog.current?.close();
  }, [utility]);
  const [workspacePhase, setWorkspacePhase] = useState<WorkspacePhase>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [recentWorkspacePath, setRecentWorkspacePath] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [demoWorkspace, setDemoWorkspace] = useState(false);
  const [productView, setProductView] = useState<ProductView>("candidatures");
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<SettingsView>("workspace");
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
  const activeDocument = useRef(documentHandoff);
  useLayoutEffect(() => { activeDocument.current = documentHandoff; }, [documentHandoff]);
  const [professionalInformationHandoff, setProfessionalInformationHandoff] =
    useState<ProfessionalInformationHandoff | null>(null);
  const [settingsHandoff, setSettingsHandoff] = useState<SettingsHandoff | null>(null);
  const [homeCandidatureId, setHomeCandidatureId] = useState<string | null>(null);
  const workSurface = useRef<HTMLElement>(null);
  const scrollPositions = useRef(new Map<string, number>());
  const scrollKey = welcomeOpen ? "home" : settingsOpen ? "settings" : productView === "documents"
    ? `documents:${documentHandoff?.draft?.document.id ?? documentHandoff?.documentId ?? "library"}` : productView;
  const previousScrollKey = useRef(scrollKey);
  useLayoutEffect(() => {
    const surface = workSurface.current;
    if (!surface || previousScrollKey.current === scrollKey) return;
    scrollPositions.current.set(previousScrollKey.current, surface.scrollTop);
    surface.scrollTop = scrollPositions.current.get(scrollKey) ?? 0;
    previousScrollKey.current = scrollKey;
  }, [scrollKey]);

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
    if (workspacePhase !== "idle" || recentWorkspacePath) return;
    let active = true;
    void window.aaaat.optionalTools.current().then(status => {
      if (active && status.packaged && !status.offered) setOptionalToolsChoice({ localAi: false, pdf: false });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [workspacePhase, recentWorkspacePath]);

  const optionalToolsChanged = useCallback(() => {
    setToolsRevision(current => current + 1);
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
    setHomeCandidatureId(null);
    setApplicationTagContext(null);
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
    if (!leaveSettings()) return;
    setSettingsOpen(false);
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
    } catch {
      setWorkspacePhase(workspace ? "ready" : "idle");
      setWorkspaceError("AAAAT could not create the demo workspace. Choose an empty folder.");
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
    setSettingsOpen(false);
    setSettingsHandoff(null);
    return true;
  };

  const selectProductView = (next: ProductView) => {
    if (welcomeOpen) {
      setWelcomeOpen(false);
      setSettingsOpen(false);
      setProductView(next);
      return;
    }
    if (next === productView && !settingsOpen) {
      return;
    }
    if (!leaveSettings()) return;
    setProductView(next);
  };

  const openCandidatureFromHome = (candidatureId: string) => {
    resetHandoffs();
    setHomeCandidatureId(candidatureId);
    setCandidatureWorkspaceRevision((current) => current + 1);
    setSettingsOpen(false);
    setWelcomeOpen(false);
    setProductView("candidatures");
  };

  const openStandaloneDocument = (documentId: string) => {
    setWelcomeOpen(false);
    setSettingsOpen(false);
    setSettingsHandoff(null);
    setProfessionalInformationHandoff(null);
    setHomeCandidatureId(null);
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
      openDocumentDraft: (draft: NonNullable<DocumentHandoff["draft"]>) => {
        if (documentDirty && !window.confirm("Discard the current document edits and start another document?")) return;
        setDocumentHandoff({ draft, ...(draft.document.candidatureId ? { candidatureId: draft.document.candidatureId } : {}) });
        setDocumentDirty(false);
        setSettingsOpen(false);
        setWelcomeOpen(false);
        setProductView("documents");
      },
      completeDocumentDraft: (documentId: string) => {
        scrollPositions.current.set(`documents:${documentId}`, workSurface.current?.scrollTop ?? 0);
        setDocumentHandoff(current => ({ ...(current?.candidatureId ? { candidatureId: current.candidatureId } : {}), documentId }));
      },
      openDocumentFromCandidature: (candidatureId: string, documentId?: string) => {
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setHomeCandidatureId(null);
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
      documentRemoved: (documentId: string) => {
        const current = activeDocument.current;
        if (current?.documentId !== documentId) return;
        setDocumentDirty(false);
        setDocumentHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentWorkspaceRevision(revision => revision + 1);
        setProductView(current.candidatureId ? "candidatures" : "documents");
      },
      returnToDocuments: () => {
        if (documentDirty && !window.confirm("Discard unsaved document edits and return to Documents?")) return;
        setDocumentDirty(false);
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentHandoff(null);
        setDocumentWorkspaceRevision((current) => current + 1);
        setProductView("documents");
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
        setSettingsView(view);
        setSettingsHandoff({ view, origin });
        setProductView(origin);
        setSettingsOpen(true);
      },
      returnFromSettings: () => {
        const origin = settingsHandoff?.origin ?? productView;
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
      settingsHandoff,
    ],
  );

  const ready = (workspacePhase === "ready" || workspacePhase === "choosing") && workspace !== null;
  const choosing = workspacePhase === "choosing";
  const loading = workspacePhase === "loading";
  const keepDocumentsMounted =
    productView === "documents" || documentDirty || documentHandoff !== null ||
    professionalInformationHandoff !== null ||
    settingsHandoff?.origin === "documents";
  const keepProfessionalInformationMounted = productView === "professional-information" || professionalInformationDirty;
  const documentDetailActive =
    documentHandoff !== null || professionalInformationHandoff !== null || settingsHandoff?.origin === "documents";
  const applicationContextActive =
    !welcomeOpen && !settingsOpen &&
    (productView === "candidatures" ||
      (productView === "documents" && Boolean(documentHandoff?.candidatureId)));
  const cvContextActive =
    !welcomeOpen && !settingsOpen && productView === "documents" && !documentHandoff?.candidatureId;

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
            <button className="secondary-action" type="button" disabled={choosing} onClick={() => setOptionalToolsChoice({ localAi: false, pdf: false })}>Optional tools</button>
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
      onOpenDocument={openStandaloneDocument}
      onOpenApplications={() => selectProductView("candidatures")}
      onOpenDocuments={() => selectProductView("documents")}
    />
  ) : null;

  return (
    <ToolbarHost.Provider value={toolbarHost}>
    <ContextualHandoffContext.Provider value={handoffApi}>
      <div className="app-shell">
        {optionalToolsChoice ? <OptionalToolsDialog initialChoice={optionalToolsChoice} onClose={() => setOptionalToolsChoice(null)} onChanged={optionalToolsChanged} /> : null}
        <header className="app-header">
          <div className="brand-lockup">
            <img className="brand-mark" src={logoMachine} alt="" />
            <span className="brand-name">AAAAT</span>
          </div>
          <div className="page-toolbar" ref={setToolbarHost} />
          {ready ? <div className="workspace-utilities">
            <button type="button" onClick={() => setUtility("activity")}>Activity</button>
            <button type="button" onClick={() => setUtility("status")}>Status</button>
          </div> : null}
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
                <TagVisor applicationContext={applicationContextActive ? applicationTagContext : null} />
              </aside>

              <section className="work-surface" ref={workSurface}>
                {welcomeOpen ? loadedHomeContent : null}

                <ToolbarVisible.Provider value={!welcomeOpen && settingsOpen}>
                  <div hidden={welcomeOpen || !settingsOpen} className="settings-area" key={`settings-${workspace.rootPath}-${String(workspaceContentRevision)}`}>
                    {settingsHandoff ? <div className="shell-section-heading">
                      <h1 className="visually-hidden">Settings</h1>
                      <button className="compact-secondary" type="button" onClick={handoffApi.returnFromSettings}>
                        {settingsHandoff.origin === "documents" ? "Return to document" : "Return to application"}
                      </button>
                    </div> : null}
                    <SettingsWorkspace
                      onOpenTools={setOptionalToolsChoice}
                      toolsRevision={toolsRevision}
                      currentWorkspace={workspace}
                      demoWorkspace={demoWorkspace}
                      view={settingsView}
                      onViewChange={setSettingsView}
                      onChooseWorkspace={(choice) => void chooseWorkspace(choice)}
                      onDirtyChange={setSettingsDirty}
                      onEnvironmentChange={refreshRailStatus}
                      onAiValidationState={reportAiValidationState}
                      onRestored={openRestoredWorkspace}
                      onWorkspaceReset={afterWorkspaceReset}
                      protectedWorkDirty={protectedWorkDirty}
                    />
                  </div>
                </ToolbarVisible.Provider>

                  <ToolbarVisible.Provider value={!welcomeOpen && !settingsOpen && productView === "candidatures"}>
                  <div hidden={welcomeOpen || settingsOpen || productView !== "candidatures"}>
                    <CandidaturesArea
                      key={`candidatures-${workspace.rootPath}-${String(workspaceContentRevision)}-${String(candidatureWorkspaceRevision)}`}
                      initialCandidatureId={homeCandidatureId ?? undefined}
                      onInitialCandidatureCleared={() => setHomeCandidatureId(null)}
                      onDirtyChange={setCandidatureDirty}
                      onTagContextChange={setApplicationTagContext}
                    />
                  </div>
                  </ToolbarVisible.Provider>
                {keepDocumentsMounted ? (
                  <ToolbarVisible.Provider value={!welcomeOpen && !settingsOpen && productView === "documents"}>
                  <div hidden={welcomeOpen || settingsOpen || productView !== "documents"}>
                    {documentDetailActive ? (
                      <DocumentsArea
                        key={`documents-${workspace.rootPath}-${String(workspaceContentRevision)}-${String(documentWorkspaceRevision)}`}
                        onDirtyChange={setDocumentDirty}
                      />
                    ) : (
                      <DocumentsStartWorkspace
                        key={`document-start-${workspace.rootPath}-${String(workspaceContentRevision)}`}
                        onOpenDocument={openStandaloneDocument}
                      />
                    )}
                  </div>
                  </ToolbarVisible.Provider>
                ) : null}

                {keepProfessionalInformationMounted ? (
                  <ToolbarVisible.Provider value={!welcomeOpen && !settingsOpen && productView === "professional-information"}>
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
                  </ToolbarVisible.Provider>
                ) : null}
              </section>
            </div>
          </main>
        ) : (
          <main className={loading ? "empty-state startup-state" : "empty-state first-run-state"}>{welcomeContent}</main>
        )}
        <dialog className="workspace-tool-dialog" ref={utilityDialog} onCancel={() => setUtility(null)}>
          <header><strong>{utility === "activity" ? "Activity" : "Status"}</strong><button type="button" aria-label="Close" onClick={() => setUtility(null)}>×</button></header>
          {ready && utility === "activity" ? <AiTaskStatus /> : null}
          {ready && utility === "status" ? <WorkspaceRailStatus key={workspace.rootPath} demo={demoWorkspace} refreshRevision={railStatusRevision} attentionConnectionName={aiAttentionConnectionName} /> : null}
        </dialog>
      </div>
    </ContextualHandoffContext.Provider>
    </ToolbarHost.Provider>
  );
}
