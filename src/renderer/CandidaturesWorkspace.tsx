import { useEffect, useState } from "react";

import type {
  CandidatureInput,
  CandidatureRecord,
  CandidatureUpdate,
  ConceptInput,
  ConceptRecord,
  DocumentRecord,
} from "../shared/contracts";
import { CandidatureFocusPanel } from "./CandidatureFocusPanel";
import {
  filterCandidatures,
  type ArchiveFilter,
  type StatusFilter,
} from "./candidature-projections";

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

const emptyConcept: ConceptInput = {
  name: "",
  definition: "",
  aliases: [],
};

function recordLabel(record: CandidatureRecord): string {
  const company = record.company.trim() || "Unknown company";
  const role = record.role.trim() || "Unspecified role";
  return `${company} — ${role}`;
}

function editableRecord(record: CandidatureRecord): CandidatureUpdate {
  return {
    id: record.id,
    company: record.company,
    role: record.role,
    location: record.location,
    workMode: record.workMode,
    salaryText: record.salaryText,
    source: record.source,
    sourceUrl: record.sourceUrl,
    sourceText: record.sourceText,
    status: record.status,
    applicationDate: record.applicationDate,
    nextAction: record.nextAction,
    nextActionDate: record.nextActionDate,
    notes: record.notes,
    archived: record.archived,
  };
}

function aliasesFromText(value: string): string[] {
  return value
    .split(",")
    .map((alias) => alias.trim())
    .filter((alias) => alias.length > 0);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

export function CandidaturesWorkspace() {
  const [records, setRecords] = useState<CandidatureRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [concepts, setConcepts] = useState<ConceptRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CandidatureUpdate | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [conceptDraft, setConceptDraft] = useState<ConceptInput>(emptyConcept);
  const [aliasesText, setAliasesText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const hydrateRecord = (record: CandidatureRecord) => {
    setSelectedId(record.id);
    setDraft(editableRecord(record));
    setSelectedDocumentIds(record.documentIds);
    setSelectedConceptIds(record.conceptIds);
    setSelectedConceptId(record.conceptIds[0] ?? null);
  };

  const storeRecord = (record: CandidatureRecord) => {
    setRecords((current) => {
      const present = current.some((candidate) => candidate.id === record.id);
      return present
        ? current.map((candidate) => (candidate.id === record.id ? record : candidate))
        : [record, ...current];
    });
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.documents.list(),
      window.aaaat.candidatures.listConcepts(),
    ])
      .then(([nextRecords, nextDocuments, nextConcepts]) => {
        if (!active) return;
        setRecords(nextRecords);
        setDocuments(nextDocuments);
        setConcepts(nextConcepts);
        const first = nextRecords.find((record) => !record.archived) ?? nextRecords[0];
        if (first) hydrateRecord(first);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidatures.");
      });
    return () => {
      active = false;
    };
  }, []);

  const selected = records.find((record) => record.id === selectedId) ?? null;
  const draftDirty =
    selected && draft
      ? JSON.stringify(editableRecord(selected)) !== JSON.stringify(draft)
      : false;
  const documentSelectionDirty = selected
    ? !sameIds(selected.documentIds, selectedDocumentIds)
    : false;
  const conceptSelectionDirty = selected
    ? !sameIds(selected.conceptIds, selectedConceptIds)
    : false;
  const hasUnsavedCandidatureState =
    draftDirty || documentSelectionDirty || conceptSelectionDirty;
  const visibleRecords = filterCandidatures(
    records,
    concepts,
    query,
    statusFilter,
    archiveFilter,
  );

  const confirmDiscard = () =>
    !hasUnsavedCandidatureState ||
    window.confirm("Discard unsaved candidature edits and association changes?");

  const selectRecord = (record: CandidatureRecord) => {
    if (record.id === selectedId) return;
    if (!confirmDiscard()) return;
    hydrateRecord(record);
  };

  const create = async () => {
    if (!confirmDiscard()) return;
    setError(null);
    try {
      const created = await window.aaaat.candidatures.create(emptyCandidature);
      storeRecord(created);
      hydrateRecord(created);
    } catch {
      setError("AAAAT could not create this candidature.");
    }
  };

  const save = async () => {
    if (!draft) return;
    setError(null);
    try {
      const saved = await window.aaaat.candidatures.update(draft);
      storeRecord(saved);
      hydrateRecord(saved);
    } catch {
      setError("AAAAT could not save this candidature.");
    }
  };

  const setArchived = async (archived: boolean) => {
    if (!selected || !draft) return;
    setError(null);
    try {
      const saved = await window.aaaat.candidatures.update({
        ...editableRecord(selected),
        archived,
      });
      storeRecord(saved);
      setDraft((current) =>
        current?.id === saved.id ? { ...current, archived: saved.archived } : current,
      );
    } catch {
      setError("AAAAT could not change the archive state.");
    }
  };

  const saveDocuments = async () => {
    if (!selected) return;
    setError(null);
    try {
      const saved = await window.aaaat.candidatures.setDocuments({
        candidatureId: selected.id,
        documentIds: selectedDocumentIds,
      });
      storeRecord(saved);
      setSelectedDocumentIds(saved.documentIds);
    } catch {
      setError("AAAAT could not save the document associations.");
    }
  };

  const saveConceptAssociations = async () => {
    if (!selected) return;
    setError(null);
    try {
      const saved = await window.aaaat.candidatures.setConcepts({
        candidatureId: selected.id,
        conceptIds: selectedConceptIds,
      });
      storeRecord(saved);
      setSelectedConceptIds(saved.conceptIds);
      if (selectedConceptId && !saved.conceptIds.includes(selectedConceptId)) {
        setSelectedConceptId(saved.conceptIds[0] ?? null);
      }
    } catch {
      setError("AAAAT could not save the concept associations.");
    }
  };

  const saveConcept = async () => {
    setError(null);
    const input = { ...conceptDraft, aliases: aliasesFromText(aliasesText) };
    try {
      const saved = editingConceptId
        ? await window.aaaat.candidatures.updateConcept({ id: editingConceptId, ...input })
        : await window.aaaat.candidatures.createConcept(input);
      setConcepts((current) => {
        const present = current.some((concept) => concept.id === saved.id);
        return present
          ? current.map((concept) => (concept.id === saved.id ? saved : concept))
          : [...current, saved].sort((left, right) => left.name.localeCompare(right.name));
      });
      setEditingConceptId(saved.id);
      setConceptDraft({
        name: saved.name,
        definition: saved.definition,
        aliases: saved.aliases,
      });
      setAliasesText(saved.aliases.join(", "));
      setSelectedConceptId(saved.id);
    } catch {
      setError("AAAAT could not save this concept. Concept names must be unique.");
    }
  };

  const chooseConceptForEdit = (conceptId: string) => {
    if (!conceptId) {
      setEditingConceptId(null);
      setConceptDraft(emptyConcept);
      setAliasesText("");
      return;
    }
    const concept = concepts.find((candidate) => candidate.id === conceptId);
    if (!concept) return;
    setEditingConceptId(concept.id);
    setConceptDraft({
      name: concept.name,
      definition: concept.definition,
      aliases: concept.aliases,
    });
    setAliasesText(concept.aliases.join(", "));
  };

  const toggleDocument = (documentId: string, checked: boolean) => {
    setSelectedDocumentIds((current) =>
      checked
        ? [...current.filter((id) => id !== documentId), documentId]
        : current.filter((id) => id !== documentId),
    );
  };

  const toggleConcept = (conceptId: string, checked: boolean) => {
    setSelectedConceptIds((current) =>
      checked
        ? [...current.filter((id) => id !== conceptId), conceptId]
        : current.filter((id) => id !== conceptId),
    );
    if (checked) setSelectedConceptId(conceptId);
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

      <div className="candidature-filters" aria-label="Candidature filters">
        <label>
          Search
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Company, role, source, notes, concept…"
          />
        </label>
        <label>
          Status
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
            <option value="all">All statuses</option>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          Archive
          <select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value as ArchiveFilter)}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className="candidature-layout">
        <aside className="candidature-list" aria-label="Candidature list">
          {records.length === 0 ? (
            <p>No candidatures yet. Create one even if some details are still unknown.</p>
          ) : visibleRecords.length === 0 ? (
            <p>No candidatures match these filters.</p>
          ) : (
            visibleRecords.map((record) => (
              <button
                type="button"
                key={record.id}
                className={record.id === selectedId ? "selected-candidature" : ""}
                onClick={() => selectRecord(record)}
              >
                <strong>{recordLabel(record)}</strong>
                <span>{record.status}{record.archived ? " · archived" : ""}</span>
              </button>
            ))
          )}
        </aside>

        <div className="candidature-editor">
          {draft && selected ? (
            <>
              <CandidatureFocusPanel
                record={selected}
                concepts={concepts}
                documents={documents}
                selectedConceptId={selectedConceptId}
                onSelectConcept={setSelectedConceptId}
              />

              <form
                className="candidature-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void save();
                }}
              >
                <div className="candidature-editor-heading">
                  <div>
                    <p className="eyebrow">Edit selected opportunity</p>
                    <h3>{recordLabel(selected)}</h3>
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

              <section className="candidature-concepts" aria-label="Associated concepts">
                <div>
                  <h3>Shared concepts</h3>
                  <p>Associate reusable technologies, domain concepts, or role keywords with this candidature.</p>
                </div>
                {concepts.length === 0 ? (
                  <p>No shared concepts yet.</p>
                ) : (
                  <div className="document-association-list">
                    {concepts.map((concept) => (
                      <label key={concept.id}>
                        <input
                          type="checkbox"
                          checked={selectedConceptIds.includes(concept.id)}
                          onChange={(event) => toggleConcept(concept.id, event.target.checked)}
                        />
                        {concept.name}
                      </label>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => void saveConceptAssociations()}>
                  Save concept associations
                </button>
              </section>

              <section className="concept-editor" aria-label="Concept editor">
                <div>
                  <h3>Concept definitions</h3>
                  <p>Definitions and aliases are shared across candidatures.</p>
                </div>
                <label>
                  Concept to edit
                  <select
                    value={editingConceptId ?? ""}
                    onChange={(event) => chooseConceptForEdit(event.target.value)}
                  >
                    <option value="">New concept</option>
                    {concepts.map((concept) => (
                      <option key={concept.id} value={concept.id}>{concept.name}</option>
                    ))}
                  </select>
                </label>
                <label>Name<input value={conceptDraft.name} onChange={(event) => setConceptDraft({ ...conceptDraft, name: event.target.value })} /></label>
                <label>Aliases<input value={aliasesText} onChange={(event) => setAliasesText(event.target.value)} placeholder="TypeScript, TS" /></label>
                <label>Definition<textarea rows={4} value={conceptDraft.definition} onChange={(event) => setConceptDraft({ ...conceptDraft, definition: event.target.value })} /></label>
                <button type="button" onClick={() => void saveConcept()}>
                  {editingConceptId ? "Save concept" : "Create concept"}
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
