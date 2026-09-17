import { useEffect, useState } from "react";

import type { CandidatureFieldConfiguration } from "../shared/contracts";
import { CandidatureFocusConfiguration } from "./CandidatureFocusConfiguration";
import { CandidatureManualEntryPanel } from "./CandidatureManualEntryPanel";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import { useContextualHandoffs } from "./contextual-handoffs";
import "./candidature-capture.css";

export function CandidaturesAiWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [view, setView] = useState<"focus" | "all" | "new">("focus");
  const [revision, setRevision] = useState(0);
  const [focusRevision, setFocusRevision] = useState(0);
  const [focusFields, setFocusFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{ candidatureId: string; documents: readonly { id: string; kind: "cv" | "cover_letter" }[] } | null>(null);
  const { openDocumentFromCandidature } = useContextualHandoffs();

  useEffect(() => {
    if (view !== "focus") return;
    let active = true;
    void window.aaaat.candidatures.listFields()
      .then((fields) => {
        if (active) setFocusFields(fields);
      })
      .catch(() => {
        if (active) setFocusFields([]);
      });
    return () => {
      active = false;
    };
  }, [focusRevision, revision, view]);

  const acceptFocusField = (field: CandidatureFieldConfiguration) => {
    setFocusFields((current) =>
      current.map((candidate) =>
        candidate.definition.id === field.definition.id ? field : candidate,
      ),
    );
  };

  return (
    <div className="candidature-capture-owner">
      <nav className="application-view-switcher" aria-label="Application view">
        <span className="console-section-code" aria-hidden="true">APPLICATIONS / LOCAL INDEX</span>
        <div>
          <button type="button" className={view === "focus" ? "active" : ""} aria-pressed={view === "focus"} onClick={() => setView("focus")}>Focus</button>
          <button type="button" className={view === "all" ? "active" : ""} aria-pressed={view === "all"} onClick={() => setView("all")}>All data</button>
          <button type="button" aria-label="New application" className={view === "new" ? "active new-application-switch" : "new-application-switch"} aria-pressed={view === "new"} onClick={() => { setPrepared(null); setNotice(null); setView("new"); }}>＋ New</button>
        </div>
      </nav>
      {view === "new" ? (
        <CandidatureManualEntryPanel
          title="New application"
          onDone={() => {
            setView("focus");
            onDirtyChange?.(false);
          }}
          onChanged={() => setRevision((current) => current + 1)}
          onPrepared={(candidatureId, documents) => setPrepared({ candidatureId, documents })}
          onOptionalStatus={setNotice}
          onDirtyChange={onDirtyChange}
        />
      ) : (
        <>
          {notice ? <p className="application-save-notice" role="status">{notice}</p> : null}
          {prepared ? (
            <div className="application-documents-ready" role="status">
              <span>Application saved · documents ready</span>
              {prepared.documents.map((document) => (
                <button key={document.id} type="button" className="compact-secondary" onClick={() => openDocumentFromCandidature(prepared.candidatureId, document.id)}>
                  Open {document.kind === "cv" ? "CV" : "cover letter"}
                </button>
              ))}
              <button type="button" className="compact-secondary" aria-label="Dismiss document links" onClick={() => setPrepared(null)}>×</button>
            </div>
          ) : null}
          {view === "focus" ? (
            <CandidatureFocusConfiguration
              fields={focusFields}
              onChanged={acceptFocusField}
              onPersisted={() => setFocusRevision((current) => current + 1)}
            />
          ) : null}
          <CandidaturesWorkspace key={`${view}-${String(revision)}-${String(focusRevision)}`} overview={view} onDirtyChange={onDirtyChange} />
        </>
      )}
    </div>
  );
}
