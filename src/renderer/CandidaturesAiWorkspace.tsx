import { useState } from "react";

import { CandidatureManualEntryPanel } from "./CandidatureManualEntryPanel";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import { useContextualHandoffs } from "./contextual-handoffs";
import "./candidature-capture.css";

export function CandidaturesAiWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [view, setView] = useState<"applications" | "new">("applications");
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<{
    candidatureId: string;
    documents: readonly { id: string; kind: "cv" | "cover_letter" }[];
  } | null>(null);
  const { openDocumentFromCandidature } = useContextualHandoffs();

  return (
    <div className="candidature-capture-owner">
      <nav className="application-view-switcher" aria-label="Application view">
        <span className="console-section-code" aria-hidden="true">APPLICATIONS / LOCAL INDEX</span>
        <div>
          <button
            type="button"
            className={view === "applications" ? "active" : ""}
            aria-pressed={view === "applications"}
            onClick={() => setView("applications")}
          >
            Applications
          </button>
          <button
            type="button"
            aria-label="New application"
            className={view === "new" ? "active new-application-switch" : "new-application-switch"}
            aria-pressed={view === "new"}
            onClick={() => {
              setPrepared(null);
              setNotice(null);
              setView("new");
            }}
          >
            ＋ New
          </button>
        </div>
      </nav>
      {view === "new" ? (
        <CandidatureManualEntryPanel
          title="New application"
          onDone={() => {
            setView("applications");
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
                <button
                  key={document.id}
                  type="button"
                  className="compact-secondary"
                  onClick={() => openDocumentFromCandidature(prepared.candidatureId, document.id)}
                >
                  Open {document.kind === "cv" ? "CV" : "cover letter"}
                </button>
              ))}
              <button
                type="button"
                className="compact-secondary"
                aria-label="Dismiss document links"
                onClick={() => setPrepared(null)}
              >
                ×
              </button>
            </div>
          ) : null}
          <CandidaturesWorkspace key={revision} onDirtyChange={onDirtyChange} />
        </>
      )}
    </div>
  );
}
