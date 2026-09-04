import { useCallback, useEffect, useState } from "react";

import type {
  CandidatureInput,
  CandidatureRecord,
  CandidatureSource,
  CandidatureUpdate,
  ConceptInput,
  ConceptRecord,
  DocumentRecord,
} from "../shared/contracts";
import { CandidatureFitPanel } from "./CandidatureFitPanel";
import { CandidatureFocusPanel, type FocusDestination } from "./CandidatureFocusPanel";
import { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";
import { CandidatureWorkingBriefPanel } from "./CandidatureWorkingBriefPanel";
import { VariantRecommendationPanel } from "./VariantRecommendationPanel";
import {
  filterCandidatures,
  type ArchiveFilter,
  type StatusFilter,
} from "./candidature-projections";

type CandidatureSection =
  | "focus"
  | "opportunity"
  | "sources"
  | "evaluation"
  | "recruiter"
  | "concepts"
  | "documents";

const sectionLabels: readonly { key: CandidatureSection; label: string }[] = [
  { key: "focus", label: "Focus" },
  { key: "opportunity", label: "Opportunity" },
  { key: "sources", label: "Sources" },
  { key: "evaluation", label: "Evaluation & strategy" },
  { key: "recruiter", label: "Recruiter preparation" },
  { key: "concepts", label: "Concepts" },
  { key: "documents", label: "Documents" },
];

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
    status: record.status,
    priority: record.priority,
    applicationDate: record.applicationDate,
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

function conceptInput(concept: ConceptRecord): ConceptInput {
  return {
    name: concept.name,
    definition: concept.definition,
    aliases: concept.aliases,
  };
}

function extractionText(sources: readonly CandidatureSource[]): string {
  return sources
    .map((source) =>
      [
        source.title ? `Source: ${source.title}` : "",
        source.url ? `URL: ${source.url}` : "",
        source.sourceText,
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 50_000);
}

export function CandidaturesWorkspace() {
  const [records, setRecords] = useState<CandidatureRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [concepts, setConcepts] = useState<ConceptRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<CandidatureSection>("focus");
  const [draft, setDraft] = useState<CandidatureUpdate | null>(null);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [conceptEditorOpen, setConceptEditorOpen] = useState(false);
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [conceptDraft, setConceptDraft] = useState<ConceptInput>(emptyConcept);
  const [aliasesText, setAliasesText] = useState("");
  const [sourceDirty, setSourceDirty] = useState(false);
  const [briefDirty, setBriefDirty] = useState(false);
  const [briefRevision, setBriefRevision] = useState(0);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetConceptEditor = () => {
    setConceptEditorOpen(false);
    setEditingConceptId(null);
    setConceptDraft(emptyConcept);
    setAliasesText("");
  };

  const hydrateRecord = (record: CandidatureRecord) => {
    setSelectedId(record.id);
    setSection("focus");
    setDraft(editableRecord(record));
    setSelectedDocumentIds(record.documentIds);
    setSelectedConceptIds(record.conceptIds);
    setSelectedConceptId(record.conceptIds[0] ?? null);
    setSourceDirty(false);
    setBriefDirty(false);
    resetConceptEditor();
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
        if (first) {
          setSelectedId(first.id);
          setSection("focus");
          setDraft(editableRecord(first));
          setSelectedDocumentIds(first.documentIds);
          setSelectedConceptIds(first.conceptIds);
          setSelectedConceptId(first.conceptIds[0] ?? null);
          setSourceDirty(false);
          setBriefDirty(false);
          setConceptEditorOpen(false);
          setEditingConceptId(null);
          setConceptDraft(emptyConcept);
          setAliasesText("");
        }
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidatures.");
      });
    void window.aaaat.ai
      .connection()
      .then((connection) => {
        if (active) setAiAvailable(connection !== null);
      })
      .catch(() => {
        if (active) setAiAvailable(false);
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
  const persistedConcept = editingConceptId
    ? concepts.find((concept) => concept.id === editingConceptId) ?? null
    : null;
  const conceptEditorDirty = conceptEditorOpen
    ? JSON.stringify({ ...conceptDraft, aliases: aliasesFromText(aliasesText) }) !==
      JSON.stringify(persistedConcept ? conceptInput(persistedConcept) : emptyConcept)
    : false;
  const hasUnsavedCandidatureState =
    Boolean(draftDirty) ||
    documentSelectionDirty ||
    conceptSelectionDirty ||
    conceptEditorDirty ||
    sourceDirty ||
    briefDirty;
  const visibleRecords = filterCandidatures(
    records,
    concepts,
    query,
    statusFilter,
    archiveFilter,
  );

  const confirmDiscard = () =>
    !hasUnsavedCandidatureState ||
    window.confirm("Discard unsaved candidature, source, brief, concept, or document changes?");

  const resetCurrentSectionDraft = () => {
    if (!selected) return;
    if (section === "opportunity") setDraft(editableRecord(selected));
    if (section === "sources") setSourceDirty(false);
    if (section === "evaluation" || section === "recruiter") setBriefDirty(false);
    if (section === "concepts") {
      setSelectedConceptIds(selected.conceptIds);
      resetConceptEditor();
    }
    if (section === "documents") setSelectedDocumentIds(selected.documentIds);
  };

  const currentSectionDirty =
    (section === "opportunity" && Boolean(draftDirty)) ||
    (section === "sources" && sourceDirty) ||
    ((section === "evaluation" || section === "recruiter") && briefDirty) ||
    (section === "concepts" && (conceptSelectionDirty || conceptEditorDirty)) ||
    (section === "documents" && documentSelectionDirty);

  const switchSection = (next: CandidatureSection) => {
    if (next === section) return;
    if (currentSectionDirty && !window.confirm("Discard unsaved changes in this section?")) return;
    if (currentSectionDirty) resetCurrentSectionDraft();
    setSection(next);
  };

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
      setDraft(editableRecord(saved));
    } catch {
      setError("AAAAT could not save this candidature.");
    }
  };

  const extractFromSources = async () => {
    if (!selected || !draft) return;
    setExtracting(true);
    setError(null);
    try {
      const sources = await window.aaaat.candidatures.listSources(selected.id);
      const sourceText = extractionText(sources);
      if (!sourceText.trim()) {
        setError("Add source material before extracting opportunity facts.");
        return;
      }
      const first = sources[0];
      const extracted = await window.aaaat.ai.extractJob({
        sourceText,
        source: first?.title ?? "",
        sourceUrl: first?.url ?? "",
      });
      setDraft((current) =>
        current
          ? {
              ...current,
              company: extracted.company || current.company,
              role: extracted.role || current.role,
              location: extracted.location || current.location,
              workMode: extracted.workMode || current.workMode,
              salaryText: extracted.salaryText || current.salaryText,
            }
          : current,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not extract opportunity facts from the saved sources.",
      );
    } finally {
      setExtracting(false);
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
      setConceptDraft(conceptInput(saved));
      setAliasesText(saved.aliases.join(", "));
      setSelectedConceptId(saved.id);
    } catch {
      setError("AAAAT could not save this concept. Concept names must be unique.");
    }
  };

  const startNewConcept = () => {
    if (conceptEditorDirty && !window.confirm("Discard unsaved concept edits?")) return;
    setConceptEditorOpen(true);
    setEditingConceptId(null);
    setConceptDraft(emptyConcept);
    setAliasesText("");
  };

  const chooseConceptForEdit = (conceptId: string) => {
    if (conceptEditorDirty && !window.confirm("Discard unsaved concept edits?")) return;
    if (!conceptId) {
      startNewConcept();
      return;
    }
    const concept = concepts.find((candidate) => candidate.id === conceptId);
    if (!concept) return;
    setConceptEditorOpen(true);
    setEditingConceptId(concept.id);
    setConceptDraft(conceptInput(concept));
    setAliasesText(concept.aliases.join(", "));
  };

  const closeConceptEditor = () => {
    if (conceptEditorDirty && !window.confirm("Discard unsaved concept edits?")) return;
    resetConceptEditor();
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

  const handleSourcesChanged = useCallback(
    (sources: CandidatureSource[]) => {
      if (!selectedId) return;
      const first = sources[0];
      setRecords((current) =>
        current.map((record) =>
          record.id === selectedId
            ? {
                ...record,
                source: first?.title ?? "",
                sourceUrl: first?.url ?? "",
                sourceText: first?.sourceText ?? "",
              }
            : record,
        ),
      );
    },
    [selectedId],
  );
  const handleSourceDirty = useCallback((dirty: boolean) => setSourceDirty(dirty), []);
  const handleBriefDirty = useCallback((dirty: boolean) => setBriefDirty(dirty), []);

  const focusNavigate = (destination: FocusDestination) => switchSection(destination);

  return (
    <section className="candidatures-workspace" aria-label="Candidatures">
      <div className="candidature-toolbar">
        <div>
          <p className="eyebrow">Opportunity understanding</p>
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
                <span>
                  {record.status}
                  {record.priority ? ` · ${record.priority} priority` : ""}
                  {record.archived ? " · archived" : ""}
                </span>
              </button>
            ))
          )}
        </aside>

        <div className="candidature-editor">
          {draft && selected ? (
            <>
              <nav className="candidature-section-nav" aria-label="Candidature sections" role="tablist">
                {sectionLabels.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={section === item.key}
                    className={section === item.key ? "selected-section" : "compact-secondary"}
                    onClick={() => switchSection(item.key)}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>

              <div className="candidature-section-panel" role="tabpanel" aria-label={sectionLabels.find((item) => item.key === section)?.label}>
                {section === "focus" ? (
                  <CandidatureFocusPanel
                    key={`focus-${selected.id}-${briefRevision}`}
                    record={selected}
                    concepts={concepts}
                    documents={documents}
                    selectedConceptId={selectedConceptId}
                    onSelectConcept={setSelectedConceptId}
                    onNavigate={focusNavigate}
                  />
                ) : null}

                {section === "opportunity" ? (
                  <form
                    className="candidature-form section-surface"
                    aria-label="Opportunity"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void save();
                    }}
                  >
                    <div className="candidature-editor-heading">
                      <div>
                        <p className="eyebrow">Opportunity</p>
                        <h3>{recordLabel(selected)}</h3>
                        <p>Edit whatever you know. Leave the rest empty, or use saved sources to fill supported facts when AI is available.</p>
                      </div>
                      <div className="button-row">
                        {aiAvailable ? (
                          <button
                            type="button"
                            className="compact-secondary"
                            disabled={extracting}
                            onClick={() => void extractFromSources()}
                          >
                            {extracting ? "Extracting…" : "Fill known facts from sources"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="compact-secondary"
                          onClick={() => void setArchived(!draft.archived)}
                        >
                          {draft.archived ? "Restore from archive" : "Archive candidature"}
                        </button>
                      </div>
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
                      <label>Priority
                        <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as CandidatureUpdate["priority"] })}>
                          <option value="">Not set</option>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </label>
                      <label>Application date<input value={draft.applicationDate} onChange={(event) => setDraft({ ...draft, applicationDate: event.target.value })} placeholder="YYYY-MM-DD" /></label>
                      <label className="wide-field">Notes<textarea rows={5} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
                    </div>

                    <button type="submit" className="primary-action" disabled={!draftDirty}>Save opportunity</button>
                  </form>
                ) : null}

                {section === "sources" ? (
                  <CandidatureSourcesPanel
                    candidatureId={selected.id}
                    onSourcesChanged={handleSourcesChanged}
                    onDirtyChange={handleSourceDirty}
                  />
                ) : null}

                {section === "evaluation" || section === "recruiter" ? (
                  <CandidatureWorkingBriefPanel
                    candidatureId={selected.id}
                    section={section}
                    onDirtyChange={handleBriefDirty}
                  />
                ) : null}

                {section === "concepts" ? (
                  <section className="candidature-concepts section-surface" aria-label="Concepts">
                    <div className="candidature-editor-heading">
                      <div>
                        <p className="eyebrow">Reusable knowledge</p>
                        <h3>Concepts</h3>
                        <p>Associate useful shared concepts; edit definitions only when needed.</p>
                      </div>
                      {!conceptEditorOpen ? (
                        <button type="button" className="compact-secondary" onClick={startNewConcept}>
                          Add concept
                        </button>
                      ) : null}
                    </div>

                    {concepts.length === 0 ? (
                      <p className="compact-empty">No shared concepts yet.</p>
                    ) : (
                      <div className="concept-association-list">
                        {concepts.map((concept) => (
                          <article key={concept.id} className="concept-association-card">
                            <label>
                              <input
                                type="checkbox"
                                checked={selectedConceptIds.includes(concept.id)}
                                onChange={(event) => toggleConcept(concept.id, event.target.checked)}
                              />
                              <span>
                                <strong>{concept.name}</strong>
                                {concept.aliases.length > 0 ? <small>{concept.aliases.join(", ")}</small> : null}
                              </span>
                            </label>
                            {concept.definition ? <p>{concept.definition}</p> : null}
                            <button type="button" className="compact-secondary" onClick={() => chooseConceptForEdit(concept.id)}>
                              Edit concept
                            </button>
                          </article>
                        ))}
                      </div>
                    )}
                    <button type="button" disabled={!conceptSelectionDirty} onClick={() => void saveConceptAssociations()}>
                      Save concept associations
                    </button>

                    {conceptEditorOpen ? (
                      <div className="concept-editor" aria-label="Concept editor">
                        <div>
                          <h3>{editingConceptId ? "Edit concept" : "New concept"}</h3>
                          <p>Definitions and aliases are shared across candidatures.</p>
                        </div>
                        <label>Name<input value={conceptDraft.name} onChange={(event) => setConceptDraft({ ...conceptDraft, name: event.target.value })} /></label>
                        <label>Aliases<input value={aliasesText} onChange={(event) => setAliasesText(event.target.value)} placeholder="TypeScript, TS" /></label>
                        <label>Definition<textarea rows={4} value={conceptDraft.definition} onChange={(event) => setConceptDraft({ ...conceptDraft, definition: event.target.value })} /></label>
                        <div className="button-row">
                          <button type="button" className="primary-action" disabled={!conceptEditorDirty} onClick={() => void saveConcept()}>
                            {editingConceptId ? "Save concept" : "Create concept"}
                          </button>
                          <button type="button" className="compact-secondary" onClick={closeConceptEditor}>Cancel</button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {section === "documents" ? (
                  <section className="candidature-documents section-surface" aria-label="Documents">
                    <div>
                      <p className="eyebrow">Application material</p>
                      <h3>Documents</h3>
                      <p>Associate existing CV and cover-letter documents without changing them here.</p>
                    </div>
                    {documents.length === 0 ? (
                      <p className="compact-empty">No documents are available yet.</p>
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
                    <button type="button" disabled={!documentSelectionDirty} onClick={() => void saveDocuments()}>
                      Save document associations
                    </button>
                  </section>
                ) : null}
              </div>

              <details className="optional-ai-assistance">
                <summary>Optional AI assistance</summary>
                <div className="optional-ai-content">
                  <CandidatureFitPanel
                    key={`fit-${selected.id}`}
                    record={selected}
                    onApplied={() => setBriefRevision((current) => current + 1)}
                  />
                  <VariantRecommendationPanel key={`variant-${selected.id}`} record={selected} />
                </div>
              </details>
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
