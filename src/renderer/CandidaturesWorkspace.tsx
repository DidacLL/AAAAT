import { useEffect, useMemo, useState } from "react";

import type {
  CandidatureInput,
  CandidatureRecord,
  CandidatureUpdate,
  DocumentRecord,
} from "../shared/contracts";

const emptyCandidature: CandidatureInput = {
  company: "",
  role: "",
  location: "",
  workMode: "",
  salaryText: "",
  source: "",
  sourceUrl: "",
  sourceText: "",
  status: "saved",
  applicationDate: "",
  nextAction: "",
  nextActionDate: "",
  notes: "",
};

function recordLabel(record: CandidatureRecord): string {
  const company = record.company.trim() || "Unknown company";
  const role = record.role.trim() || "Unspecified role";
  return `${company} — ${role}`;
}

export function CandidaturesWorkspace() {
  const [records, setRecords] = useState<CandidatureRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CandidatureUpdate | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.documents.list(),
    ])
      .then(([nextRecords, nextDocuments]) => {
        if (!active) return;
        setRecords(nextRecords);
        setDocuments(nextDocuments);
        const first = nextRecords[0];
        if (first) setSelectedId(first.id);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidatures.");
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId],
  );

  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setSelectedDocumentIds([]);
      return;
    }
    setDraft({
      id: selected.id,
      company: selected.company,
      role: selected.role,
      location: selected.location,
      workMode: selected.workMode,
      salaryText: selected.salaryText,
      source: selected.source,
      sourceUrl: selected.sourceUrl,
      sourceText: selected.sourceText,
      status: selected.status,
      applicationDate: selected.applicationDate,
      nextAction: selected.nextAction,
      nextActionDate: selected.nextActionDate,
      notes: selected.notes,
      archived: selected.archived,
    });
    setSelectedDocumentIds(selected.documentIds);
  }, [selected]);

  const replaceRecord = (record: CandidatureRecord) => {
    setRecords((current) => {
      const present = current.some((candidate) => candidate.id === record.id);
      return present
        ? current.map((candidate) => (candidate.id === record.id ? record : candidate))
        : [record, ...current];
    });
    setSelectedId(record.id);
  };

  const create = async () => {
    setError(null);
    try {
      replaceRecord(await window.aaaat.candidatures.create(emptyCandidature));
    } catch {
      setError("AAAAT could not create this candidature.");
    }
  };

  const save = async () => {
    if (!draft) return;
    setError(null);
    try {
      replaceRecord(await window.aaaat.candidatures.update(draft));
    } catch {
      setError("AAAAT could not save this candidature.");
    }
  };

  const setArchived = async (archived: boolean) => {
    if (!draft) return;
    setError(null);
    try {
      replaceRecord(
        await window.aaaat.candidatures.update({ ...draft, archived }),
      );
    } catch {
      setError("AAAAT could not change the archive state.");
    }
  };

  const saveDocuments = async () => {
    if (!selected) return;
    setError(null);
    try {
      replaceRecord(
        await window.aaaat.candidatures.setDocuments({
          candidatureId: selected.id,
          documentIds: selectedDocumentIds,
        }),
      );
    } catch {
      setError("AAAAT could not save the document associations.");
    }
  };

  const toggleDocument = (documentId: string, checked: boolean) => {
    setSelectedDocumentIds((current) =>
      checked
        ? [...current.filter((id) => id !== documentId), documentId]
        : current.filter((id) => id !== documentId),
    );
  };

  return (
    <section className="candidatures-workspace" aria-label="Candidatures">
      <div className="candidature-toolbar">
        <div>
          <p className="eyebrow">Manual tracking</p>
          <h2>Candidatures</h2>
        </div>
        <button type="button" onClick={() => void create()}>
          New candidature
        </button>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className="candidature-layout">
        <aside className="candidature-list" aria-label="Candidature list">
          {records.length === 0 ? (
            <p>No candidatures yet. Create one even if some details are still unknown.</p>
          ) : (
            records.map((record) => (
              <button
                type="button"
                key={record.id}
                className={record.id === selectedId ? "selected-candidature" : ""}
                onClick={() => setSelectedId(record.id)}
              >
                <strong>{recordLabel(record)}</strong>
                <span>{record.status}{record.archived ? " · archived" : ""}</span>
              </button>
            ))
          )}
        </aside>

        <div className="candidature-editor">
          {draft ? (
            <>
              <form
                className="candidature-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <div className="candidature-editor-heading">
                  <div>
                    <p className="eyebrow">Selected opportunity</p>
                    <h3>{selected ? recordLabel(selected) : "Candidature"}</h3>
                  </div>
                  <button
                    type="button"
                    className="compact-secondary"
                    onClick={() => void setArchived(!draft.archived)}
                  >
                    {draft.archived ? "Restore from archive" : "Archive candidature"}
                  </button>
                </div>

                <div className="candidature-fields">
                  <label>Company<input value={draft.company} onChange={(event) => setDraft({ ...draft, company: event.target.value })} /></label>
                  <label>Role<input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} /></label>
                  <label>Location<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
                  <label>Work mode<input value={draft.workMode} onChange={(event) => setDraft({ ...draft, workMode: event.target.value })} /></label>
                  <label>Salary text<input value={draft.salaryText} onChange={(event) => setDraft({ ...draft, salaryText: event.target.value })} /></label>
                  <label>Status
                    <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as CandidatureUpdate["status"] })}>
                      <option value="saved">Saved</option>
                      <option value="applied">Applied</option>
                      <option value="interview">Interview</option>
                      <option value="offer">Offer</option>
                      <option value="closed">Closed</option>
                    </select>
                  </label>
                  <label>Application date<input value={draft.applicationDate} onChange={(event) => setDraft({ ...draft, applicationDate: event.target.value })} placeholder="YYYY-MM-DD" /></label>
                  <label>Next action date<input value={draft.nextActionDate} onChange={(event) => setDraft({ ...draft, nextActionDate: event.target.value })} placeholder="YYYY-MM-DD" /></label>
                  <label className="wide-field">Next action<input value={draft.nextAction} onChange={(event) => setDraft({ ...draft, nextAction: event.target.value })} /></label>
                  <label>Source<input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} /></label>
                  <label>Source URL<input value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} /></label>
                  <label className="wide-field">Source material<textarea rows={7} value={draft.sourceText} onChange={(event) => setDraft({ ...draft, sourceText: event.target.value })} /></label>
                  <label className="wide-field">Notes<textarea rows={6} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
                </div>

                <button type="submit" className="primary-action">Save candidature</button>
              </form>

              <section className="candidature-documents" aria-label="Associated documents">
                <div>
                  <h3>Associated documents</h3>
                  <p>Reuse existing M1 CV and cover-letter documents without changing them.</p>
                </div>
                {documents.length === 0 ? (
                  <p>No documents are available yet.</p>
                ) : (
                  <div className="document-association-list">
                    {documents.map((document) => (
                      <label key={document.id}>
                        <input
                          type="checkbox"
                          checked={selectedDocumentIds.includes(document.id)}
                          onChange={(event) => toggleDocument(document.id, event.target.checked)}
                        />
                        {document.title} ({document.kind === "cv" ? "CV" : "cover letter"})
                      </label>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => void saveDocuments()}>
                  Save document associations
                </button>
              </section>
            </>
          ) : (
            <div className="candidature-empty-detail">
              <h3>Select or create a candidature.</h3>
              <p>Unknown details can stay empty until you learn them.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
