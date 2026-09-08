import { useEffect, useMemo, useState } from "react";

import type { WorkspaceChoice, WorkspaceInfo } from "../shared/contracts";
import { AiDocumentsWorkspace } from "./AiDocumentsWorkspace";
import logo from "./assets/aaaat-logo-light.png";
import { CandidaturesAiWorkspace } from "./CandidaturesAiWorkspace";
import { CareerContextPanel } from "./CareerContextPanel";
import {
  ContextualHandoffContext,
  type DocumentHandoff,
  type ProfessionalInformationHandoff,
  type SettingsHandoff,
} from "./contextual-handoffs";
import { DocumentsWorkspace } from "./DocumentsWorkspace";
import { ProfileWorkspace } from "./ProfileWorkspace";
import { SettingsWorkspace } from "./SettingsWorkspace";
import "./shell.css";
import { TodosWorkspace } from "./TodosWorkspace";
import { WorkspaceRecoveryPanel } from "./WorkspaceRecoveryPanel";

type WorkspacePhase = "loading" | "idle" | "choosing" | "ready";
type ProductView = "candidatures" | "documents" | "professional-information";

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
  const [candidatureDirty, setCandidatureDirty] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const [remindersDirty, setRemindersDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(candidatureDirty || (remindersOpen && remindersDirty));
    return () => onDirtyChange(false);
  }, [candidatureDirty, onDirtyChange, remindersDirty, remindersOpen]);

  const toggleReminders = () => {
    if (remindersOpen && remindersDirty) {
      const discard = window.confirm("Discard unsaved reminder edits and close reminders?");
      if (!discard) return;
      setRemindersDirty(false);
    }
    setRemindersOpen((current) => !current);
  };

  return (
    <div className="destination-area">
      <CandidaturesAiWorkspace onDirtyChange={setCandidatureDirty} />
      <section className="contextual-support" aria-label="Candidature supporting tools">
        <button className="contextual-toggle" type="button" aria-expanded={remindersOpen} onClick={toggleReminders}>
          Reminders
        </button>
        <span>Lightweight checkable notes stay secondary to candidature work.</span>
      </section>
      {remindersOpen ? (
        <div className="contextual-surface"><TodosWorkspace onDirtyChange={setRemindersDirty} /></div>
      ) : null}
    </div>
  );
}

function DocumentsArea({ onDirtyChange }: { readonly onDirtyChange: (dirty: boolean) => void }) {
  const [documentDirty, setDocumentDirty] = useState(false);
  const [assistanceOpen, setAssistanceOpen] = useState(false);
  const [assistanceDirty, setAssistanceDirty] = useState(false);

  useEffect(() => {
    onDirtyChange(documentDirty || (assistanceOpen && assistanceDirty));
    return () => onDirtyChange(false);
  }, [assistanceDirty, assistanceOpen, documentDirty, onDirtyChange]);

  const toggleAssistance = () => {
    if (assistanceOpen && assistanceDirty) {
      const discard = window.confirm("Discard unsaved AI document assistance edits and close assistance?");
      if (!discard) return;
      setAssistanceDirty(false);
    }
    setAssistanceOpen((current) => !current);
  };

  return (
    <div className="destination-area">
      <DocumentsWorkspace onDirtyChange={setDocumentDirty} />
      <section className="contextual-support" aria-label="CV and letter supporting tools">
        <button className="contextual-toggle" type="button" aria-expanded={assistanceOpen} onClick={toggleAssistance}>
          Optional AI assistance
        </button>
        <span>Assistance uses the current document context; it is not a separate workspace.</span>
      </section>
      {assistanceOpen ? (
        <div className="contextual-surface"><AiDocumentsWorkspace onDirtyChange={setAssistanceDirty} /></div>
      ) : null}
    </div>
  );
}

export function App() {
  const [workspacePhase, setWorkspacePhase] = useState<WorkspacePhase>("loading");
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [productView, setProductView] = useState<ProductView>("candidatures");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [candidatureDirty, setCandidatureDirty] = useState(false);
  const [documentDirty, setDocumentDirty] = useState(false);
  const [professionalInformationDirty, setProfessionalInformationDirty] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [documentHandoff, setDocumentHandoff] = useState<DocumentHandoff | null>(null);
  const [professionalInformationHandoff, setProfessionalInformationHandoff] =
    useState<ProfessionalInformationHandoff | null>(null);
  const [settingsHandoff, setSettingsHandoff] = useState<SettingsHandoff | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.workspace
      .current()
      .then((currentWorkspace) => {
        if (!active) return;
        setWorkspace(currentWorkspace);
        setWorkspacePhase(currentWorkspace ? "ready" : "idle");
      })
      .catch(() => {
        if (active) {
          setWorkspacePhase("idle");
          setWorkspaceError("The previous workspace is no longer available. Choose another workspace.");
        }
      });
    return () => { active = false; };
  }, []);

  const anyDirty = candidatureDirty || documentDirty || professionalInformationDirty || settingsDirty;

  const resetHandoffs = () => {
    setDocumentHandoff(null);
    setProfessionalInformationHandoff(null);
    setSettingsHandoff(null);
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
      setCandidatureDirty(false);
      setDocumentDirty(false);
      setProfessionalInformationDirty(false);
      setSettingsDirty(false);
      resetHandoffs();
      setWorkspace(selectedWorkspace);
      setWorkspacePhase("ready");
      setSettingsOpen(false);
      setProductView("candidatures");
    } catch {
      setWorkspacePhase(workspace ? "ready" : "idle");
      setWorkspaceError(
        choice === "create"
          ? "That folder cannot be used as an AAAAT workspace. Choose an empty folder or an existing AAAAT workspace."
          : "That folder is not a compatible AAAAT workspace. Choose another folder.",
      );
    }
  };

  const openRestoredWorkspace = (restoredWorkspace: WorkspaceInfo) => {
    setCandidatureDirty(false);
    setDocumentDirty(false);
    setProfessionalInformationDirty(false);
    setSettingsDirty(false);
    resetHandoffs();
    setWorkspaceError(null);
    setWorkspace(restoredWorkspace);
    setWorkspacePhase("ready");
    setSettingsOpen(false);
    setProductView("candidatures");
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
    resetHandoffs();
    setProductView(next);
  };

  const openSettings = () => {
    if (settingsOpen) return;
    setSettingsHandoff(null);
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    if (!leaveSettings()) return;
  };

  const handoffApi = useMemo(
    () => ({
      documentHandoff,
      professionalInformationHandoff,
      settingsHandoff,
      openDocumentFromCandidature: (candidatureId: string, documentId?: string) => {
        if (
          documentId &&
          documentDirty &&
          !window.confirm("Discard unsaved document edits and open this candidature document?")
        ) {
          return;
        }
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentHandoff({ candidatureId, ...(documentId ? { documentId } : {}) });
        setProductView("documents");
      },
      returnToCandidature: () => {
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
        setDocumentHandoff(null);
        setProductView("candidatures");
      },
      openProfessionalInformationItem: (documentId: string, itemId: string) => {
        if (
          professionalInformationDirty &&
          !window.confirm("Discard unsaved professional-information edits and open this reusable source?")
        ) {
          return;
        }
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff({ documentId, itemId });
        setProductView("professional-information");
      },
      returnToDocument: () => {
        setSettingsOpen(false);
        setSettingsHandoff(null);
        setProfessionalInformationHandoff(null);
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

  return (
    <ContextualHandoffContext.Provider value={handoffApi}>
      <div className="app-shell">
        <header className="app-header">
          <div className="brand-lockup">
            <img className="brand-mark" src={logo} alt="" />
            <span className="brand-name">AAAAT</span>
          </div>
          {ready ? (
            <div className="shell-utilities">
              <span className="workspace-chip" title={workspace.rootPath}>
                <span>Workspace</span><code>{workspace.rootPath}</code>
              </span>
              <button className="compact-secondary" type="button" disabled={choosing} onClick={() => void chooseWorkspace("create")}>
                {choosing ? "Choosing…" : "Switch workspace"}
              </button>
              <button className={settingsOpen ? "shell-settings active-shell-utility" : "shell-settings"} type="button" aria-current={settingsOpen ? "page" : undefined} onClick={openSettings}>
                Settings
              </button>
            </div>
          ) : null}
        </header>

        {ready ? (
          <main className="workspace-screen">
            {workspaceError ? <p className="error-message shell-error" role="alert">{workspaceError}</p> : null}
            <div className="work-shell">
              <nav className="primary-work-nav" aria-label="Primary work areas">
                <button type="button" className={!settingsOpen && productView === "candidatures" ? "active-work-destination" : ""} aria-current={!settingsOpen && productView === "candidatures" ? "page" : undefined} onClick={() => selectProductView("candidatures")}>Candidatures</button>
                <button type="button" className={!settingsOpen && productView === "documents" ? "active-work-destination" : ""} aria-current={!settingsOpen && productView === "documents" ? "page" : undefined} onClick={() => selectProductView("documents")}>CVs &amp; letters</button>
                <button type="button" className={!settingsOpen && productView === "professional-information" ? "active-work-destination" : ""} aria-current={!settingsOpen && productView === "professional-information" ? "page" : undefined} onClick={() => selectProductView("professional-information")}>Professional information</button>
              </nav>

              <section className="work-surface">
                {settingsOpen ? (
                  <div className="settings-area" key={`settings-${workspace.rootPath}-${settingsHandoff?.view ?? "overview"}`}>
                    <div className="shell-section-heading">
                      <div><p className="eyebrow">Secondary administration</p><h1>Settings</h1></div>
                      <button
                        className="compact-secondary"
                        type="button"
                        onClick={settingsHandoff ? handoffApi.returnFromSettings : closeSettings}
                      >
                        {settingsHandoff?.origin === "documents"
                          ? "Return to document"
                          : settingsHandoff?.origin === "candidatures"
                            ? "Return to candidature"
                            : "Return to work"}
                      </button>
                    </div>
                    <SettingsWorkspace
                      currentWorkspace={workspace}
                      initialView={settingsHandoff?.view ?? "overview"}
                      onChooseWorkspace={(choice) => void chooseWorkspace(choice)}
                      onDirtyChange={setSettingsDirty}
                      onRestored={openRestoredWorkspace}
                    />
                  </div>
                ) : null}

                <div hidden={settingsOpen || productView !== "candidatures"}>
                  <CandidaturesArea key={`candidatures-${workspace.rootPath}`} onDirtyChange={setCandidatureDirty} />
                </div>

                <div hidden={settingsOpen || productView !== "documents"}>
                  <DocumentsArea key={`documents-${workspace.rootPath}`} onDirtyChange={setDocumentDirty} />
                </div>

                <div hidden={settingsOpen || productView !== "professional-information"}>
                  {professionalInformationHandoff ? (
                    <div className="contextual-return-bar" role="status">
                      <span>Editing reusable professional information for the current document.</span>
                      <button className="compact-secondary" type="button" onClick={handoffApi.returnToDocument}>
                        Return to document
                      </button>
                    </div>
                  ) : null}
                  <ProfileArea
                    key={`professional-information-${workspace.rootPath}`}
                    initialItemId={professionalInformationHandoff?.itemId}
                    onDirtyChange={setProfessionalInformationDirty}
                  />
                </div>
              </section>
            </div>
          </main>
        ) : (
          <main className="empty-state">
            <img className="hero-logo" src={logo} alt="AAAAT explorer robot holding a magnifying glass" />
            <p className="tagline">Your career workspace, on your computer.</p>
            <p>Your workspace data stays local and under your control. AAAAT works without AI; AI is optional.</p>
            <span className="accent-line" aria-hidden="true" />
            <h1>{loading ? "Opening your workspace..." : "Choose where AAAAT should keep your career workspace."}</h1>
            {loading ? null : (
              <>
                <div className="workspace-actions">
                  <button className="primary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("create")}>{choosing ? "Choosing workspace..." : "Create workspace"}</button>
                  <button className="secondary-action" type="button" disabled={choosing} onClick={() => void chooseWorkspace("open")}>Open existing workspace</button>
                </div>
                <WorkspaceRecoveryPanel currentWorkspace={null} editorDirty={false} onRestored={openRestoredWorkspace} />
              </>
            )}
            {workspaceError ? <p className="error-message" role="alert">{workspaceError}</p> : null}
          </main>
        )}
      </div>
    </ContextualHandoffContext.Provider>
  );
}
