import { useState } from "react";

import {
  CandidatureManualEntryPanel,
  CandidatureRawCapturePanel,
} from "./CandidatureManualEntryPanel";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import type { ApplicationTagContext } from "./TagVisor";
import "./candidature-capture.css";

type NewApplicationIntent = "direct" | "raw";
type ContinuationTask = "manual" | "ai";

interface InitialSelection {
  readonly candidatureId: string;
  readonly rawRetained: boolean;
  readonly task?: ContinuationTask;
}

export function CandidaturesAiWorkspace({
  initialCandidatureId,
  onInitialCandidatureCleared,
  onDirtyChange,
  onTagGlossaryChange,
  onTagContextChange,
}: {
  readonly initialCandidatureId?: string;
  readonly onInitialCandidatureCleared?: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onTagGlossaryChange?: () => void;
  readonly onTagContextChange?: (context: ApplicationTagContext | null) => void;
}) {
  const [view, setView] = useState<"applications" | "new">("applications");
  const [newIntent, setNewIntent] = useState<NewApplicationIntent | null>(null);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [selection, setSelection] = useState<InitialSelection | null>(() =>
    initialCandidatureId ? { candidatureId: initialCandidatureId, rawRetained: false } : null,
  );
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const reportDirty = (next: boolean) => {
    setDirty(next);
    onDirtyChange?.(next);
  };

  const switchView = (next: "applications" | "new") => {
    if (next === view) return;
    if (dirty && !window.confirm("Discard unsaved application edits?")) return;
    reportDirty(false);
    setError(null);
    if (next === "new") {
      setSelection(null);
      setNotice(null);
      setNewIntent(null);
    } else {
      setNewIntent(null);
    }
    setView(next);
  };

  const createdDirectly = (candidatureId: string) => {
    reportDirty(false);
    setRevision((current) => current + 1);
    setSelection({ candidatureId, rawRetained: false });
    setNotice("Application saved. Add or change information whenever you need.");
    setNewIntent(null);
    setView("applications");
  };

  const retainedRaw = (candidatureId: string) => {
    reportDirty(false);
    setRevision((current) => current + 1);
    setSelection({ candidatureId, rawRetained: true });
    setNotice("Raw material retained as a Source.");
    setNewIntent(null);
    setView("applications");
  };

  const chooseContinuation = (task: ContinuationTask) => {
    if (!selection?.rawRetained) return;
    if (dirty && !window.confirm("Discard unsaved application edits?")) return;
    reportDirty(false);
    setSelection({ ...selection, task });
  };

  const importExternalHandoff = async () => {
    if (handoffBusy) return;
    setHandoffBusy(true);
    setError(null);
    try {
      const imported = await window.aaaat.applicationHandoff.importFile();
      if (imported.status === "cancelled") return;
      setRevision((current) => current + 1);
      setSelection(null);
      setNotice("External AI handoff imported. The application and requested documents are saved locally.");
      setView("applications");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not import this handoff.");
    } finally {
      setHandoffBusy(false);
    }
  };

  const clearInitialSelection = () => {
    setSelection(null);
    onInitialCandidatureCleared?.();
  };
  const workspaceKey = `${revision}:${selection?.candidatureId ?? "corpus"}:${selection?.task ?? "review"}`;

  return (
    <div className="candidature-capture-owner">
      <nav className="application-view-switcher" aria-label="Application view">
        <span className="console-section-code" aria-hidden="true">APPLICATIONS / LOCAL INDEX</span>
        <div>
          <button
            type="button"
            className={view === "applications" ? "active" : ""}
            aria-pressed={view === "applications"}
            onClick={() => switchView("applications")}
          >
            Applications
          </button>
          <button
            type="button"
            aria-label="New application"
            className={view === "new" ? "active new-application-switch" : "new-application-switch"}
            aria-pressed={view === "new"}
            onClick={() => switchView("new")}
          >
            ＋ New
          </button>
        </div>
      </nav>

      {view === "new" ? (
        newIntent === "direct" ? (
          <CandidatureManualEntryPanel
            title="Enter information directly"
            onCancel={() => setNewIntent(null)}
            onCreated={createdDirectly}
            onDirtyChange={reportDirty}
          />
        ) : newIntent === "raw" ? (
          <CandidatureRawCapturePanel
            title="Retain raw material"
            onCancel={() => setNewIntent(null)}
            onCreated={retainedRaw}
            onDirtyChange={reportDirty}
          />
        ) : (
          <section className="new-application-start" aria-label="New application">
            <div>
              <p className="eyebrow">New application</p>
              <h2>How do you want to start?</h2>
              <p className="compact-help">Both paths create the same application. Start with what you already have.</p>
            </div>
            {error ? <p className="error-message" role="alert">{error}</p> : null}
            <div className="new-application-intention-grid">
              <button type="button" onClick={() => setNewIntent("direct")}>
                <strong>Enter information directly</strong>
                <span>Use your current application information fields. No Source or AI is required.</span>
              </button>
              <button type="button" onClick={() => setNewIntent("raw")}>
                <strong>Retain raw material</strong>
                <span>Keep an offer, message, form copy, conversation, or notes first.</span>
              </button>
            </div>
            <div className="new-application-secondary-entry">
              <button
                type="button"
                className="compact-secondary"
                disabled={handoffBusy}
                onClick={() => void importExternalHandoff()}
              >
                {handoffBusy ? "Importing…" : "Import external AI handoff…"}
              </button>
            </div>
          </section>
        )
      ) : (
        <>
          {notice ? <p className="application-save-notice" role="status">{notice}</p> : null}
          {selection?.rawRetained ? (
            <section className="new-application-continuation" aria-label="Raw material continuation">
              <div>
                <p className="eyebrow">Source retained</p>
                <strong>Continue with the same application</strong>
              </div>
              <div className="new-application-continuation-actions">
                <button
                  type="button"
                  className={selection.task === "ai" ? "active" : ""}
                  onClick={() => chooseContinuation("ai")}
                >
                  Use AI to suggest information
                </button>
                <button
                  type="button"
                  className={selection.task === "manual" ? "active" : ""}
                  onClick={() => chooseContinuation("manual")}
                >
                  Fill information manually
                </button>
              </div>
            </section>
          ) : null}
          <CandidaturesWorkspace
            key={workspaceKey}
            initialSelection={selection ? {
              candidatureId: selection.candidatureId,
              task: selection.task,
            } : undefined}
            onInitialSelectionCleared={clearInitialSelection}
            onDirtyChange={reportDirty}
            onTagGlossaryChange={onTagGlossaryChange}
            onTagContextChange={onTagContextChange}
          />
        </>
      )}
    </div>
  );
}
