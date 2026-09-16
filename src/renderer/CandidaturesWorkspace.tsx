import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureFieldUpdate,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
  DocumentRecord,
  TagInput,
  TagRecord,
} from "../shared/contracts";
import { CandidatureActivityPanel } from "./CandidatureActivityPanel";
import { CandidatureApplicationMaterialPanel } from "./CandidatureApplicationMaterialPanel";
import { CandidatureBulkAiReview } from "./CandidatureBulkAiReview";
import { CandidatureFieldAiState } from "./CandidatureFieldAiState";
import { CandidatureFieldDefinitionsPanel } from "./CandidatureFieldDefinitionsPanel";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";
import { CandidatureFocusPanel } from "./CandidatureFocusPanel";
import { CandidatureInferencePanel } from "./CandidatureInferencePanel";
import { CandidatureOfferPanel } from "./CandidatureOfferPanel";
import { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";
import { useContextualHandoffs } from "./contextual-handoffs";
import { createApplicationDocuments } from "./create-application-documents";
import {
  candidatureRecognitionCues,
  candidatureSearchMatchCue,
  filterCandidatures,
  type ArchiveFilter,
} from "./candidature-projections";
import "./candidatures.css";
import "./candidature-recovery.css";
import "./owner-feedback-recovery.css";

type CandidatureMode = "corpus" | "focus" | "detail";
const emptyTag: TagInput = { name: "", definition: "", notes: "", aliases: [] };

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}
function aliasesFromText(value: string): string[] {
  return value.split(",").map((alias) => alias.trim()).filter(Boolean);
}
function tagDraft(tag: TagRecord): TagInput {
  return { name: tag.name, definition: tag.definition, notes: tag.notes ?? "", aliases: tag.aliases };
}
function normalizedTagText(value: string): string { return value.trim().toLocaleLowerCase(); }

export function CandidaturesWorkspace({
  overview = "focus",
  onDirtyChange,
}: {
  readonly overview?: "focus" | "all";
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { documentHandoff, openDocumentFromCandidature } = useContextualHandoffs();
  const previousDocumentHandoff = useRef(documentHandoff);
  const handoffDocumentIds = useRef<ReadonlySet<string> | null>(null);
  const [records, setRecords] = useState<CandidatureRecord[]>([]);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [focusSources, setFocusSources] = useState<CandidatureSource[]>([]);
  const [focusDocumentBusy, setFocusDocumentBusy] = useState<"cv" | "cover_letter" | null>(null);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [mode, setMode] = useState<CandidatureMode>("corpus");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ readonly query: string; readonly ids: ReadonlySet<string> } | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagQuery, setTagQuery] = useState("");
  const [sourceDirty, setSourceDirty] = useState(false);
  const [valueEditorDirty, setValueEditorDirty] = useState<ReadonlySet<string>>(new Set());
  const [fieldDefinitionsDirty, setFieldDefinitionsDirty] = useState(false);
  const [discoveryFieldId, setDiscoveryFieldId] = useState<string | null>(null);
  const [bulkInferenceOpen, setBulkInferenceOpen] = useState(false);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagEditorDraft, setTagEditorDraft] = useState<TagInput>(emptyTag);
  const [tagAliasesText, setTagAliasesText] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = records.find((record) => record.id === selectedId) ?? null;
  const documentSelectionDirty = selected ? !sameIds(selected.documentIds, selectedDocumentIds) : false;
  const persistedTag = editingTagId ? tags.find((tag) => tag.id === editingTagId) ?? null : null;
  const tagEditorDirty = tagEditorOpen
    ? JSON.stringify({ ...tagEditorDraft, aliases: aliasesFromText(tagAliasesText) }) !== JSON.stringify(persistedTag ? tagDraft(persistedTag) : emptyTag)
    : false;
  const hasUnsavedChanges = sourceDirty || documentSelectionDirty || tagEditorDirty || fieldDefinitionsDirty || valueEditorDirty.size > 0;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
    return () => onDirtyChange?.(false);
  }, [hasUnsavedChanges, onDirtyChange]);

  const resetEditorDrafts = useCallback((record?: CandidatureRecord) => {
    setSelectedDocumentIds(record?.documentIds ?? []);
    setSelectedTagIds(record?.tagIds ?? []);
    setSelectedTagId(record?.tagIds[0] ?? null);
    setTagQuery("");
    setSourceDirty(false);
    setValueEditorDirty(new Set());
    setFieldDefinitionsDirty(false);
    setDiscoveryFieldId(null);
    setBulkInferenceOpen(false);
    setTagEditorOpen(false);
    setEditingTagId(null);
    setTagEditorDraft(emptyTag);
    setTagAliasesText("");
    setActivityOpen(false);
  }, []);

  const hydrate = useCallback((record: CandidatureRecord) => {
    setSelectedId(record.id);
    resetEditorDrafts(record);
    setError(null);
  }, [resetEditorDrafts]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.candidatures.listFields(),
      window.aaaat.documents.list(),
      window.aaaat.candidatures.listTags(),
    ]).then(([nextRecords, nextFields, nextDocuments, nextTags]) => {
      if (!active) return;
      setRecords(nextRecords); setFields(nextFields); setDocuments(nextDocuments); setTags(nextTags);
    }).catch(() => { if (active) setError("AAAAT could not load candidatures."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const previous = previousDocumentHandoff.current;
    previousDocumentHandoff.current = documentHandoff;
    if (!previous?.candidatureId || documentHandoff !== null) return;
    let active = true;
    void Promise.all([window.aaaat.candidatures.list(), window.aaaat.documents.list()])
      .then(([nextRecords, nextDocuments]) => {
        if (!active) return;
        setRecords(nextRecords); setDocuments(nextDocuments);
        const refreshed = nextRecords.find((record) => record.id === previous.candidatureId);
        if (refreshed) {
          const beforeHandoff = handoffDocumentIds.current;
          const availableDocumentIds = new Set(nextDocuments.map((document) => document.id));
          const newlyAssociatedDocumentIds = beforeHandoff ? refreshed.documentIds.filter((id) => !beforeHandoff.has(id)) : [];
          setSelectedDocumentIds((current) => {
            const preserved = current.filter((id) => availableDocumentIds.has(id));
            return [...preserved, ...newlyAssociatedDocumentIds.filter((id) => availableDocumentIds.has(id) && !preserved.includes(id))];
          });
          setSelectedId(refreshed.id); setMode("detail");
        }
        handoffDocumentIds.current = null;
      }).catch(() => { if (active) setError("AAAAT could not refresh this candidature after returning."); });
    return () => { active = false; };
  }, [documentHandoff]);

  const normalizedQuery = query.trim();
  useEffect(() => {
    if (!normalizedQuery) return;
    let active = true;
    void window.aaaat.candidatureSearch.search({ query: normalizedQuery })
      .then((ids) => { if (active) setSearchResult({ query: normalizedQuery, ids: new Set(ids) }); })
      .catch(() => {
        if (!active) return;
        setSearchResult({ query: normalizedQuery, ids: new Set() });
        setError("AAAAT could not search retained candidature information.");
      });
    return () => { active = false; };
  }, [normalizedQuery, records, fields, tags]);

  const textMatches = useMemo<ReadonlySet<string> | null>(() => {
    if (!normalizedQuery) return null;
    return searchResult?.query === normalizedQuery ? searchResult.ids : new Set();
  }, [normalizedQuery, searchResult]);
  const visibleRecords = useMemo(() => filterCandidatures(records, archiveFilter, null, textMatches), [records, archiveFilter, textMatches]);

  const focusedRecordId = mode === "focus" ? selectedId : null;
  useEffect(() => {
    if (!focusedRecordId) return;
    let active = true;
    void window.aaaat.candidatures.listSources(focusedRecordId).then((next) => { if (active) setFocusSources(next); }).catch(() => { if (active) setFocusSources([]); });
    return () => { active = false; };
  }, [focusedRecordId]);

  const confirmDiscard = () => !hasUnsavedChanges || window.confirm("Discard unsaved candidature edits?");
  const storeRecord = (record: CandidatureRecord) => setRecords((current) => current.map((candidate) => candidate.id === record.id ? record : candidate));
  const openRecord = (record: CandidatureRecord, nextMode: Exclude<CandidatureMode, "corpus">) => {
    if (!confirmDiscard()) return;
    if (nextMode === "focus") setFocusSources([]);
    hydrate(record); setMode(nextMode);
  };
  const returnToCorpus = () => {
    if (!confirmDiscard()) return;
    setMode("corpus"); setSelectedId(null); handoffDocumentIds.current = null; resetEditorDrafts();
  };

  const setEditorDirty = (fieldId: string, dirty: boolean) => setValueEditorDirty((current) => {
    const next = new Set(current); if (dirty) next.add(fieldId); else next.delete(fieldId); return next;
  });
  const setValue = async (fieldId: string, value: CandidatureRuntimeValue) => {
    if (!selected) return;
    const updated = await window.aaaat.candidatures.setFieldValue({ candidatureId: selected.id, fieldId, value });
    storeRecord(updated); setEditorDirty(fieldId, false);
  };
  const clearValue = async (fieldId: string) => {
    if (!selected) return;
    const updated = await window.aaaat.candidatures.clearFieldValue({ candidatureId: selected.id, fieldId });
    storeRecord(updated); setEditorDirty(fieldId, false);
  };
  const setArchived = async (archived: boolean) => {
    if (!selected || !confirmDiscard()) return;
    try { const updated = await window.aaaat.candidatures.update({ id: selected.id, archived }); storeRecord(updated); resetEditorDrafts(updated); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not change archive state."); }
  };
  const replaceField = (updated: CandidatureFieldConfiguration) => setFields((current) => current.map((field) => field.definition.id === updated.definition.id ? updated : field));
  const updateFieldDefinition = async (update: CandidatureFieldUpdate) => {
    try { replaceField(await window.aaaat.candidatures.updateField(update)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not update this information."); throw reason; }
  };
  const updateFieldPreference = async (field: CandidatureFieldConfiguration, patch: Partial<CandidatureFieldConfiguration["preferences"]>) => {
    const optimistic = { ...field, preferences: { ...field.preferences, ...patch } };
    replaceField(optimistic);
    try { replaceField(await window.aaaat.candidatures.updateFieldPreferences({ ...optimistic.preferences, fieldId: field.definition.id })); }
    catch (reason) { replaceField(field); setError(reason instanceof Error ? reason.message : "AAAAT could not save this information setting."); throw reason; }
  };
  const refreshFields = async () => {
    try { setFields(await window.aaaat.candidatures.listFields()); } catch { setError("AAAAT could not refresh candidature information."); }
  };
  const refreshInformation = async () => {
    try {
      const [nextFields, nextRecords, nextTags] = await Promise.all([
        window.aaaat.candidatures.listFields(), window.aaaat.candidatures.list(), window.aaaat.candidatures.listTags(),
      ]);
      setFields(nextFields); setRecords(nextRecords); setTags(nextTags);
      const refreshed = nextRecords.find((record) => record.id === selectedId);
      if (refreshed) setSelectedTagIds(refreshed.tagIds);
    } catch { setError("AAAAT could not refresh AI-filled candidature information."); }
  };

  const saveDocuments = async () => {
    if (!selected) return;
    try {
      const updated = await window.aaaat.candidatures.setDocuments({ candidatureId: selected.id, documentIds: selectedDocumentIds });
      storeRecord(updated); setSelectedDocumentIds(updated.documentIds);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not save document associations."); }
  };
  const persistTagIds = async (nextIds: string[]) => {
    if (!selected) return;
    try {
      const updated = await window.aaaat.candidatures.setTags({ candidatureId: selected.id, tagIds: nextIds });
      storeRecord(updated); setSelectedTagIds(updated.tagIds);
      setSelectedTagId((current) => current && updated.tagIds.includes(current) ? current : updated.tagIds[0] ?? null);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not save Tag associations."); }
  };
  const startNewTag = (initialName = "") => {
    if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return;
    setTagEditorOpen(true); setEditingTagId(null); setTagEditorDraft({ ...emptyTag, name: initialName }); setTagAliasesText("");
  };
  const editTag = (tag: TagRecord) => {
    if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return;
    setTagEditorOpen(true); setEditingTagId(tag.id); setTagEditorDraft(tagDraft(tag)); setTagAliasesText(tag.aliases.join(", "));
  };
  const saveTag = async () => {
    const input = { ...tagEditorDraft, name: tagEditorDraft.name.trim(), definition: tagEditorDraft.definition.trim(), aliases: aliasesFromText(tagAliasesText) };
    if (!input.name || !input.definition) return;
    try {
      const isNew = editingTagId === null;
      const saved = editingTagId ? await window.aaaat.candidatures.updateTag({ id: editingTagId, ...input }) : await window.aaaat.candidatures.createTag(input);
      setTags((current) => {
        const found = current.some((tag) => tag.id === saved.id);
        return (found ? current.map((tag) => tag.id === saved.id ? saved : tag) : [...current, saved]).sort((left, right) => left.name.localeCompare(right.name));
      });
      if (isNew && selected) await persistTagIds([...new Set([...selectedTagIds, saved.id])]);
      setEditingTagId(saved.id); setTagEditorDraft(tagDraft(saved)); setTagAliasesText(saved.aliases.join(", ")); setSelectedTagId(saved.id); setTagQuery("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not save this Tag."); }
  };

  const handleSourcesChanged = useCallback(async () => {
    try { setRecords(await window.aaaat.candidatures.list()); setSourceDirty(false); }
    catch { setError("AAAAT could not refresh the candidature after the Source changed."); }
  }, []);
  const openDocument = (documentId?: string) => {
    if (!selected) return;
    handoffDocumentIds.current = new Set(selected.documentIds); openDocumentFromCandidature(selected.id, documentId);
  };
  const createFocusDocument = async (kind: "cv" | "cover_letter") => {
    if (!selected || focusDocumentBusy) return;
    setFocusDocumentBusy(kind); setError(null);
    try {
      const created = await createApplicationDocuments({ candidatureId: selected.id, sourceText: focusSources.map((source) => source.sourceText).filter(Boolean).join("\n\n") || selected.sourceSearchText, cv: kind === "cv", coverLetter: kind === "cover_letter", existingDocumentIds: selected.documentIds });
      const document = created.find((candidate) => candidate.kind === kind);
      if (!document) throw new Error("The document was not created.");
      setDocuments((current) => [...current.filter((candidate) => candidate.id !== document.id), document]); openDocument(document.id);
    } catch { setError(kind === "cv" ? "AAAAT could not create the application CV." : "AAAAT could not create the cover letter."); }
    finally { setFocusDocumentBusy(null); }
  };

  const enabledFields = fields.filter((field) => field.definition.enabled);
  const enabledMissingFields = selected ? enabledFields.filter((field) => field.preferences.aiUseAllowed && !selected.values.some((value) => value.fieldId === field.definition.id)) : [];
  const discoveryField = fields.find((field) => field.definition.id === discoveryFieldId);

  if (mode === "corpus") {
    return (
      <section className="candidatures-workspace candidature-corpus" aria-label="Candidatures">
        <header className="candidature-toolbar"><div><h2>{overview === "focus" ? "Focus" : "All applications"}</h2><span className="corpus-count">{visibleRecords.length} / {records.length}</span></div></header>
        <div className="candidature-corpus-tools">
          <label>Search<input type="search" value={query} maxLength={200} onChange={(event) => { setQuery(event.target.value); if (!event.target.value.trim()) setSearchResult(null); }} placeholder="Search anything you saved…" /></label>
          <label>Show<select value={archiveFilter} onChange={(event) => setArchiveFilter(event.target.value as ArchiveFilter)}><option value="active">Current</option><option value="archived">Archived</option><option value="all">All</option></select></label>
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        {records.length === 0 ? <div className="candidature-empty-state"><h3>No saved applications yet</h3><p>Enter a few details or paste whatever material you already have.</p></div>
          : visibleRecords.length === 0 ? <p className="compact-empty">No saved applications match this search.</p>
          : overview === "all" ? (
            <div className="application-data-table" role="table" aria-label="All application data">
              <div className="application-data-row application-data-head" role="row"><span role="columnheader">Application</span><span role="columnheader">Key information</span><span role="columnheader">Material</span><span role="columnheader">Updated</span></div>
              {visibleRecords.map((record) => { const cues = candidatureRecognitionCues(record, fields, 4); return <button key={record.id} type="button" className="application-data-row" role="row" onClick={() => openRecord(record, "detail")}><strong role="cell">{record.label}</strong><span role="cell" className="application-data-cues">{cues.map((cue) => `${cue.label}: ${cue.value}`).join(" · ") || "Sparse record"}</span><span role="cell">{record.documentIds.length} doc{record.documentIds.length === 1 ? "" : "s"}{record.sourceSearchText.trim() ? " · source" : ""}</span><time role="cell" dateTime={record.updatedAt}>{new Date(record.updatedAt).toLocaleDateString()}</time></button>; })}
            </div>
          ) : (
            <div className="candidature-corpus-grid" aria-label="Candidature corpus Focus">
              {visibleRecords.map((record) => {
                const searchMatchCue = normalizedQuery && textMatches?.has(record.id) ? candidatureSearchMatchCue(record, fields, tags, normalizedQuery) : null;
                const recognitionCues = searchMatchCue ? [searchMatchCue] : candidatureRecognitionCues(record, fields, 3);
                return <article className="candidature-corpus-card" key={record.id}><button type="button" className="candidature-focus-entry" onClick={() => openRecord(record, "focus")}><strong>{record.label}</strong>{recognitionCues.length > 0 ? <span className="candidature-recognition-cues">{recognitionCues.map((cue, index) => <span className="candidature-recognition-cue" key={`${cue.label}-${index}`}><span>{cue.label}</span><span>{cue.value}</span></span>)}</span> : <span className="compact-help">Saved with only a little information</span>}</button></article>;
              })}
            </div>
          )}
      </section>
    );
  }

  if (!selected) return <section className="candidatures-workspace"><p className="error-message">The selected candidature is no longer available.</p><button type="button" onClick={returnToCorpus}>Back to applications</button></section>;

  if (mode === "focus") {
    return (
      <section className="candidatures-workspace candidature-selected-focus" aria-label="Candidature Focus">
        <div className="candidature-context-actions"><button type="button" className="compact-secondary" onClick={returnToCorpus}>← Applications</button><button type="button" className="compact-secondary" onClick={() => openRecord(selected, "detail")}>Full record</button></div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <CandidatureFocusPanel record={selected} fields={fields} tags={tags} sources={focusSources} documents={documents.filter((document) => selected.documentIds.includes(document.id))} documentBusy={focusDocumentBusy} selectedTagId={selectedTagId} onSelectTag={setSelectedTagId} onOpenDocument={openDocument} onCreateDocument={(kind) => void createFocusDocument(kind)} onSaveValue={setValue} onClearValue={clearValue} onDiscoverValue={setDiscoveryFieldId} onUpdatePreferences={updateFieldPreference} onDirtyChange={setEditorDirty} />
        {discoveryField?.definition.enabled && discoveryField.preferences.aiUseAllowed ? <CandidatureInferencePanel candidature={selected} fields={fields} targetFieldIds={[discoveryField.definition.id]} taskId={`candidature-inference:${selected.id}:${discoveryField.definition.id}`} title={`Fill ${discoveryField.definition.label}`} /> : null}
      </section>
    );
  }

  const attachedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const normalizedTagQuery = normalizedTagText(tagQuery);
  const tagMatches = normalizedTagQuery
    ? tags.filter((tag) => !selectedTagIds.includes(tag.id) && [tag.name, ...tag.aliases].some((term) => normalizedTagText(term).includes(normalizedTagQuery))).slice(0, 8)
    : [];
  const exactTagMatch = normalizedTagQuery
    ? tags.some((tag) => [tag.name, ...tag.aliases].some((term) => normalizedTagText(term) === normalizedTagQuery))
    : false;
  const selectedTag = attachedTags.find((tag) => tag.id === selectedTagId) ?? null;

  return (
    <section className="candidatures-workspace candidature-detail" aria-label="Complete candidature">
      <div className="candidature-editor-heading"><div><p className="eyebrow">Application record</p><h2>{selected.label}</h2></div><div className="button-row"><button type="button" className="compact-secondary" onClick={returnToCorpus}>Back</button><button type="button" className="compact-secondary" onClick={() => openRecord(selected, "focus")}>Focus</button><button type="button" className="compact-secondary" onClick={() => void setArchived(!selected.archived)}>{selected.archived ? "Restore" : "Archive"}</button></div></div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <CandidatureOfferPanel candidatureId={selected.id} />

      <section className="section-surface candidature-information-surface" aria-label="Candidature information">
        <div className="candidature-editor-heading candidature-information-heading"><div><p className="eyebrow">Information</p><h3>Information</h3></div>{enabledMissingFields.length > 0 ? <button type="button" className="compact-secondary" onClick={() => setBulkInferenceOpen(true)}>Ask AI to fill missing information</button> : null}</div>
        <CandidatureBulkAiReview candidature={selected} fields={fields} onSaveValue={setValue} onRetry={() => setBulkInferenceOpen(true)} />
        {enabledFields.length === 0 ? <p className="compact-empty">No information fields are available yet. Add the first one below.</p> : (
          <div className="retained-information-list candidature-information-grid">
            {enabledFields.map((field) => {
              const retained = selected.values.find((value) => value.fieldId === field.definition.id);
              return <article key={field.definition.id} className="retained-information-card candidature-information-unit"><div className="candidature-information-unit-heading"><h4>{field.definition.label}</h4>{field.definition.description ? <p>{field.definition.description}</p> : null}</div><CandidatureFieldValueEditor field={field} value={retained?.value} onSave={(value) => setValue(field.definition.id, value)} onClear={() => clearValue(field.definition.id)} onDiscover={() => setDiscoveryFieldId(field.definition.id)} onUpdateField={updateFieldDefinition} onUpdatePreferences={(patch) => updateFieldPreference(field, patch)} onDirtyChange={(dirty) => setEditorDirty(field.definition.id, dirty)} /><CandidatureFieldAiState candidatureId={selected.id} field={field} currentValue={retained?.value} onSaveValue={(value) => setValue(field.definition.id, value)} onRetry={() => setDiscoveryFieldId(field.definition.id)} /></article>;
            })}
          </div>
        )}
        <CandidatureFieldDefinitionsPanel onChanged={() => void refreshFields()} onDirtyChange={setFieldDefinitionsDirty} />
        {discoveryField?.definition.enabled && discoveryField.preferences.aiUseAllowed ? <CandidatureInferencePanel candidature={selected} fields={fields} targetFieldIds={[discoveryField.definition.id]} taskId={`candidature-inference:${selected.id}:${discoveryField.definition.id}`} title={`Fill ${discoveryField.definition.label}`} /> : null}
        {bulkInferenceOpen && enabledMissingFields.length > 0 ? <CandidatureInferencePanel candidature={selected} fields={fields} targetFieldIds={enabledMissingFields.map((field) => field.definition.id)} taskId={`candidature-inference:${selected.id}:missing`} title="Fill missing information" allowNewFields onChanged={() => void refreshInformation()} /> : null}
      </section>

      <CandidatureSourcesPanel candidatureId={selected.id} onSourcesChanged={() => void handleSourcesChanged()} onDirtyChange={setSourceDirty} />

      <section className="section-surface" aria-label="Tags">
        <div className="candidature-editor-heading"><div><p className="eyebrow">Shared glossary</p><h3>Tags</h3></div></div>
        <div className="tag-chip-list" aria-label="Attached Tags">
          {attachedTags.length === 0 ? <span className="compact-help">No Tags attached.</span> : attachedTags.map((tag) => (
            <span className="tag-chip" key={tag.id}>
              <button type="button" className="tag-chip-label" onClick={() => setSelectedTagId(tag.id)}>{tag.name}</button>
              <button type="button" className="tag-chip-remove" aria-label={`Remove ${tag.name}`} onClick={() => void persistTagIds(selectedTagIds.filter((id) => id !== tag.id))}>×</button>
            </span>
          ))}
        </div>
        <div className="tag-search-create">
          <label>Find or create Tag<input type="search" value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} placeholder="Search Tags…" /></label>
          {normalizedTagQuery ? (
            <div className="tag-search-results" aria-label="Tag search results">
              {tagMatches.map((tag) => <button type="button" className="compact-secondary" key={tag.id} onClick={() => { void persistTagIds([...new Set([...selectedTagIds, tag.id])]); setSelectedTagId(tag.id); setTagQuery(""); }}>Attach {tag.name}</button>)}
              {!exactTagMatch ? <button type="button" className="compact-secondary" onClick={() => startNewTag(tagQuery.trim())}>Create “{tagQuery.trim()}”</button> : null}
              {tagMatches.length === 0 && exactTagMatch ? <span className="compact-help">That Tag is already attached.</span> : null}
            </div>
          ) : null}
        </div>

        {selectedTag ? (
          <article className="retained-information-card attached-tag-detail">
            <strong>{selectedTag.name}</strong>
            {selectedTag.definition ? <p>{selectedTag.definition}</p> : null}
            {selectedTag.aliases.length ? <p className="compact-help">Aliases: {selectedTag.aliases.join(", ")}</p> : null}
            {selectedTag.notes ? <p className="compact-help">{selectedTag.notes}</p> : null}
            <button type="button" className="compact-secondary" onClick={() => editTag(selectedTag)}>Edit shared Tag</button>
          </article>
        ) : null}

        {tagEditorOpen ? (
          <div className="editor-card tag-editor">
            <h4>{editingTagId ? "Edit Tag" : "New Tag"}</h4>
            <label>Name<input value={tagEditorDraft.name} onChange={(event) => setTagEditorDraft({ ...tagEditorDraft, name: event.target.value })} /></label>
            <label>Aliases<input value={tagAliasesText} onChange={(event) => setTagAliasesText(event.target.value)} placeholder="Comma separated" /></label>
            <label>Definition<textarea rows={4} required value={tagEditorDraft.definition} onChange={(event) => setTagEditorDraft({ ...tagEditorDraft, definition: event.target.value })} /></label>
            <label>Notes <span className="compact-help">optional</span><textarea rows={4} value={tagEditorDraft.notes ?? ""} onChange={(event) => setTagEditorDraft({ ...tagEditorDraft, notes: event.target.value })} /></label>
            <div className="button-row"><button type="button" disabled={!tagEditorDraft.name.trim() || !tagEditorDraft.definition.trim()} onClick={() => void saveTag()}>Save Tag</button><button type="button" className="compact-secondary" onClick={() => { if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return; setTagEditorOpen(false); setEditingTagId(null); setTagEditorDraft(emptyTag); setTagAliasesText(""); }}>Close</button></div>
          </div>
        ) : null}
      </section>

      <CandidatureApplicationMaterialPanel candidature={selected} documents={documents} selectedDocumentIds={selectedDocumentIds} documentSelectionDirty={documentSelectionDirty} onDocumentSelectionChange={setSelectedDocumentIds} onSaveDocuments={() => void saveDocuments()} onOpenDocument={(documentId) => openDocument(documentId)} />
      <details className="secondary-candidature-detail" onToggle={(event) => setActivityOpen(event.currentTarget.open)}><summary>Activity</summary>{activityOpen ? <CandidatureActivityPanel candidatureId={selected.id} /> : null}</details>
    </section>
  );
}
