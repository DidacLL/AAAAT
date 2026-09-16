import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureFieldUpdate,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
  TagInput,
  TagRecord,
} from "../shared/contracts";
import type { DocumentCollections } from "../shared/document-domain-contracts";
import { CandidatureActivityPanel } from "./CandidatureActivityPanel";
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
const emptyCollections: DocumentCollections = {
  templates: [], workingCvs: [], renderedCvs: [], letters: [], applicationPackets: [],
};

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
  const [records, setRecords] = useState<CandidatureRecord[]>([]);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [collections, setCollections] = useState<DocumentCollections>(emptyCollections);
  const [focusSources, setFocusSources] = useState<CandidatureSource[]>([]);
  const [focusDocumentBusy, setFocusDocumentBusy] = useState<"cv" | "cover_letter" | null>(null);
  const [applicationCvSource, setApplicationCvSource] = useState("profile");
  const [packetRenderedCvId, setPacketRenderedCvId] = useState("");
  const [packetLetterId, setPacketLetterId] = useState("");
  const [packetBusy, setPacketBusy] = useState(false);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [mode, setMode] = useState<CandidatureMode>("corpus");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ readonly query: string; readonly ids: ReadonlySet<string> } | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
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
  const persistedTag = editingTagId ? tags.find((tag) => tag.id === editingTagId) ?? null : null;
  const tagEditorDirty = tagEditorOpen
    ? JSON.stringify({ ...tagEditorDraft, aliases: aliasesFromText(tagAliasesText) }) !== JSON.stringify(persistedTag ? tagDraft(persistedTag) : emptyTag)
    : false;
  const hasUnsavedChanges = sourceDirty || tagEditorDirty || fieldDefinitionsDirty || valueEditorDirty.size > 0;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
    return () => onDirtyChange?.(false);
  }, [hasUnsavedChanges, onDirtyChange]);

  const resetEditorDrafts = useCallback((record?: CandidatureRecord) => {
    setSelectedTagIds(record?.tagIds ?? []);
    setSelectedTagId(record?.tagIds[0] ?? null);
    setTagQuery(""); setSourceDirty(false); setValueEditorDirty(new Set());
    setFieldDefinitionsDirty(false); setDiscoveryFieldId(null); setBulkInferenceOpen(false);
    setTagEditorOpen(false); setEditingTagId(null); setTagEditorDraft(emptyTag);
    setTagAliasesText(""); setActivityOpen(false);
    setApplicationCvSource("profile"); setPacketRenderedCvId(""); setPacketLetterId("");
  }, []);

  const hydrate = useCallback((record: CandidatureRecord) => {
    setSelectedId(record.id); resetEditorDrafts(record); setError(null);
  }, [resetEditorDrafts]);

  const refreshCollections = useCallback(async () => {
    try { setCollections(await window.aaaat.documentDomain.collections()); }
    catch { setError("AAAAT could not refresh application documents."); }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.candidatures.listFields(),
      window.aaaat.candidatures.listTags(),
      window.aaaat.documentDomain.collections(),
    ]).then(([nextRecords, nextFields, nextTags, nextCollections]) => {
      if (!active) return;
      setRecords(nextRecords); setFields(nextFields); setTags(nextTags); setCollections(nextCollections);
    }).catch(() => { if (active) setError("AAAAT could not load applications."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (documentHandoff !== null) return;
    // The refresh is asynchronous; state changes occur only after the IPC response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCollections();
  }, [documentHandoff, refreshCollections]);

  const normalizedQuery = query.trim();
  useEffect(() => {
    if (!normalizedQuery) return;
    let active = true;
    void window.aaaat.candidatureSearch.search({ query: normalizedQuery })
      .then((ids) => { if (active) setSearchResult({ query: normalizedQuery, ids: new Set(ids) }); })
      .catch(() => {
        if (!active) return;
        setSearchResult({ query: normalizedQuery, ids: new Set() });
        setError("AAAAT could not search retained application information.");
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

  const confirmDiscard = () => !hasUnsavedChanges || window.confirm("Discard unsaved application edits?");
  const storeRecord = (record: CandidatureRecord) => setRecords((current) => current.map((candidate) => candidate.id === record.id ? record : candidate));
  const openRecord = (record: CandidatureRecord, nextMode: Exclude<CandidatureMode, "corpus">) => {
    if (!confirmDiscard()) return;
    if (nextMode === "focus") setFocusSources([]);
    hydrate(record); setMode(nextMode);
  };
  const returnToCorpus = () => {
    if (!confirmDiscard()) return;
    setMode("corpus"); setSelectedId(null); resetEditorDrafts();
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
    try { setFields(await window.aaaat.candidatures.listFields()); } catch { setError("AAAAT could not refresh application information."); }
  };
  const refreshInformation = async () => {
    try {
      const [nextFields, nextRecords, nextTags] = await Promise.all([
        window.aaaat.candidatures.listFields(), window.aaaat.candidatures.list(), window.aaaat.candidatures.listTags(),
      ]);
      setFields(nextFields); setRecords(nextRecords); setTags(nextTags);
      const refreshed = nextRecords.find((record) => record.id === selectedId);
      if (refreshed) setSelectedTagIds(refreshed.tagIds);
    } catch { setError("AAAAT could not refresh AI-filled application information."); }
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
    catch { setError("AAAAT could not refresh the application after the Source changed."); }
  }, []);
  const openDocument = (documentId: string) => {
    if (!selected) return;
    openDocumentFromCandidature(selected.id, documentId);
  };
  const createFocusDocument = async (kind: "cv" | "cover_letter") => {
    if (!selected || focusDocumentBusy) return;
    setFocusDocumentBusy(kind); setError(null);
    try {
      const documents = await createApplicationDocuments({
        candidatureId: selected.id,
        sourceText: focusSources.map((source) => source.sourceText).filter(Boolean).join("\n\n") || selected.sourceSearchText,
        cv: kind === "cv", coverLetter: kind === "cover_letter",
      });
      const created = documents.find((candidate) => candidate.kind === kind);
      if (!created) throw new Error("The document was not created.");
      await refreshCollections(); openDocument(created.id);
    } catch { setError(kind === "cv" ? "AAAAT could not create the application CV." : "AAAAT could not create the cover letter."); }
    finally { setFocusDocumentBusy(null); }
  };
  const createApplicationCvFromSource = async () => {
    if (!selected || focusDocumentBusy) return;
    setFocusDocumentBusy("cv"); setError(null);
    try {
      const templateId = applicationCvSource.startsWith("template:") ? applicationCvSource.slice("template:".length) : null;
      const source = templateId
        ? { kind: "template" as const, templateId }
        : applicationCvSource === "blank"
          ? { kind: "blank" as const }
          : { kind: "profile" as const };
      const created = await window.aaaat.documentDomain.createWorkingCv({
        title: "Application CV",
        candidatureId: selected.id,
        source,
      });
      await refreshCollections(); openDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create the application CV.");
    } finally { setFocusDocumentBusy(null); }
  };

  const enabledFields = fields.filter((field) => field.definition.enabled);
  const enabledMissingFields = selected ? enabledFields.filter((field) => field.preferences.aiUseAllowed && !selected.values.some((value) => value.fieldId === field.definition.id)) : [];
  const discoveryField = fields.find((field) => field.definition.id === discoveryFieldId);

  if (mode === "corpus") {
    return (
      <section className="candidatures-workspace candidature-corpus" aria-label="Applications">
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
              {visibleRecords.map((record) => {
                const cues = candidatureRecognitionCues(record, fields, 4);
                const materialCount = collections.workingCvs.filter((item) => item.candidatureId === record.id).length + collections.letters.filter((item) => item.candidatureId === record.id).length + collections.renderedCvs.filter((item) => item.candidatureId === record.id).length + collections.applicationPackets.filter((item) => item.candidatureId === record.id).length;
                return <button key={record.id} type="button" className="application-data-row" role="row" onClick={() => openRecord(record, "detail")}><strong role="cell">{record.label}</strong><span role="cell" className="application-data-cues">{cues.map((cue) => `${cue.label}: ${cue.value}`).join(" · ") || "Sparse record"}</span><span role="cell">{materialCount} item{materialCount === 1 ? "" : "s"}{record.sourceSearchText.trim() ? " · source" : ""}</span><time role="cell" dateTime={record.updatedAt}>{new Date(record.updatedAt).toLocaleDateString()}</time></button>;
              })}
            </div>
          ) : (
            <div className="candidature-corpus-grid" aria-label="Application corpus Focus">
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

  if (!selected) return <section className="candidatures-workspace"><p className="error-message">The selected application is no longer available.</p><button type="button" onClick={returnToCorpus}>Back to applications</button></section>;

  if (mode === "focus") {
    return (
      <section className="candidatures-workspace candidature-selected-focus" aria-label="Application Focus">
        <div className="candidature-context-actions"><button type="button" className="compact-secondary" onClick={returnToCorpus}>← Applications</button><button type="button" className="compact-secondary" onClick={() => openRecord(selected, "detail")}>Full record</button></div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <CandidatureFocusPanel record={selected} fields={fields} tags={tags} sources={focusSources} workingCvs={collections.workingCvs} letters={collections.letters} documentBusy={focusDocumentBusy} selectedTagId={selectedTagId} onSelectTag={setSelectedTagId} onOpenDocument={openDocument} onCreateDocument={(kind) => void createFocusDocument(kind)} onSaveValue={setValue} onClearValue={clearValue} onDiscoverValue={setDiscoveryFieldId} onUpdatePreferences={updateFieldPreference} onDirtyChange={setEditorDirty} />
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
  const applicationWorkingCvs = collections.workingCvs.filter((item) => item.candidatureId === selected.id);
  const applicationLetters = collections.letters.filter((item) => item.candidatureId === selected.id);
  const applicationRendered = collections.renderedCvs.filter((item) => item.candidatureId === selected.id);
  const applicationPackets = collections.applicationPackets.filter((item) => item.candidatureId === selected.id);
  const selectedPacketCvId = applicationRendered.some((item) => item.id === packetRenderedCvId) ? packetRenderedCvId : applicationRendered[0]?.id ?? "";
  const selectedPacketLetterId = applicationLetters.some((item) => item.id === packetLetterId) ? packetLetterId : applicationLetters[0]?.id ?? "";

  const createPacket = async () => {
    if (!selectedPacketCvId || !selectedPacketLetterId || packetBusy) return;
    setPacketBusy(true); setError(null);
    try {
      await window.aaaat.documentDomain.createPacket({
        candidatureId: selected.id,
        renderedCvId: selectedPacketCvId,
        coverLetterId: selectedPacketLetterId,
      });
      await refreshCollections();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not create the application packet."); }
    finally { setPacketBusy(false); }
  };

  return (
    <section className="candidatures-workspace candidature-detail" aria-label="Complete application">
      <div className="candidature-editor-heading"><div><p className="eyebrow">Application record</p><h2>{selected.label}</h2></div><div className="button-row"><button type="button" className="compact-secondary" onClick={returnToCorpus}>Back</button><button type="button" className="compact-secondary" onClick={() => openRecord(selected, "focus")}>Focus</button><button type="button" className="compact-secondary" onClick={() => void setArchived(!selected.archived)}>{selected.archived ? "Restore" : "Archive"}</button></div></div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <CandidatureOfferPanel candidatureId={selected.id} />

      <section className="section-surface candidature-information-surface" aria-label="Application information">
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
        <div className="tag-attach-control">
          <label>Attach Tag<input type="search" value={tagQuery} onChange={(event) => setTagQuery(event.target.value)} placeholder="Search name or alias…" /></label>
          {tagMatches.length > 0 ? <div className="tag-search-results">{tagMatches.map((tag) => <button type="button" key={tag.id} onClick={() => { void persistTagIds([...selectedTagIds, tag.id]); setTagQuery(""); }}>{tag.name}</button>)}</div> : null}
          {normalizedTagQuery && !exactTagMatch ? <button type="button" className="compact-secondary" onClick={() => startNewTag(tagQuery.trim())}>Create “{tagQuery.trim()}”</button> : null}
        </div>
        {selectedTag ? <article className="selected-tag-definition"><strong>{selectedTag.name}</strong><p>{selectedTag.definition}</p>{selectedTag.aliases.length > 0 ? <p><strong>Aliases:</strong> {selectedTag.aliases.join(", ")}</p> : null}{selectedTag.notes ? <p><strong>Notes:</strong> {selectedTag.notes}</p> : null}<button type="button" className="compact-secondary" onClick={() => editTag(selectedTag)}>Edit shared Tag</button></article> : null}
        {tagEditorOpen ? <form className="tag-editor" onSubmit={(event) => { event.preventDefault(); void saveTag(); }}>
          <label>Name<input value={tagEditorDraft.name} maxLength={120} onChange={(event) => setTagEditorDraft((current) => ({ ...current, name: event.target.value }))} /></label>
          <label>Aliases<input value={tagAliasesText} onChange={(event) => setTagAliasesText(event.target.value)} placeholder="Comma separated" /></label>
          <label>Definition<textarea value={tagEditorDraft.definition} maxLength={3000} onChange={(event) => setTagEditorDraft((current) => ({ ...current, definition: event.target.value }))} /></label>
          <label>Notes<textarea value={tagEditorDraft.notes ?? ""} maxLength={5000} onChange={(event) => setTagEditorDraft((current) => ({ ...current, notes: event.target.value }))} /></label>
          <div className="button-row"><button type="submit" disabled={!tagEditorDraft.name.trim() || !tagEditorDraft.definition.trim()}>Save Tag</button><button type="button" className="compact-secondary" onClick={() => { setTagEditorOpen(false); setEditingTagId(null); }}>Close</button></div>
        </form> : null}
      </section>

      <section className="section-surface" aria-label="Application documents">
        <div className="candidature-editor-heading">
          <div><p className="eyebrow">Application material</p><h3>CV, letter and retained output</h3></div>
          <div className="button-row">
            <label>New CV from<select value={applicationCvSource} onChange={(event) => setApplicationCvSource(event.target.value)}><option value="profile">My information</option><option value="blank">Blank</option>{collections.templates.map((template) => <option key={template.id} value={`template:${template.id}`}>Template · {template.name}</option>)}</select></label>
            <button type="button" className="compact-secondary" disabled={focusDocumentBusy !== null} onClick={() => void createApplicationCvFromSource()}>{focusDocumentBusy === "cv" ? "Creating…" : "New CV"}</button>
            <button type="button" className="compact-secondary" disabled={focusDocumentBusy !== null} onClick={() => void createFocusDocument("cover_letter")}>{focusDocumentBusy === "cover_letter" ? "Creating…" : "New cover letter"}</button>
          </div>
        </div>
        {applicationWorkingCvs.length + applicationLetters.length + applicationRendered.length + applicationPackets.length === 0 ? <p className="compact-empty">No application documents yet.</p> : <div className="document-intent-list">
          {applicationWorkingCvs.map((document) => <button type="button" key={document.id} onClick={() => openDocument(document.id)}><span className="item-kind">Working CV</span><strong>{document.title}</strong><small>Edit</small></button>)}
          {applicationLetters.map((document) => <button type="button" key={document.id} onClick={() => openDocument(document.id)}><span className="item-kind">Letter</span><strong>{document.title}</strong><small>Edit</small></button>)}
          {applicationRendered.map((document) => <button type="button" key={document.id} onClick={() => void window.aaaat.documentDomain.openRenderedCv(document.id)}><span className="item-kind">Rendered CV</span><strong>{document.title}</strong><small>Open PDF</small></button>)}
          {applicationPackets.map((packet) => <button type="button" key={packet.id} onClick={() => void window.aaaat.documentDomain.openPacket(packet.id)}><span className="item-kind">Packet</span><strong>{packet.title}</strong><small>Open PDF</small></button>)}
        </div>}
        {selectedPacketCvId && selectedPacketLetterId ? (
          <div className="document-start-options-grid" aria-label="Application packet composition">
            <label>Rendered CV<select value={selectedPacketCvId} onChange={(event) => setPacketRenderedCvId(event.target.value)}>{applicationRendered.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
            <label>Cover letter<select value={selectedPacketLetterId} onChange={(event) => setPacketLetterId(event.target.value)}>{applicationLetters.map((document) => <option key={document.id} value={document.id}>{document.title}</option>)}</select></label>
            <button type="button" className="compact-secondary" disabled={packetBusy} onClick={() => void createPacket()}>{packetBusy ? "Creating packet…" : "Create application packet"}</button>
          </div>
        ) : <p className="compact-help">Render an application CV and keep a cover letter here to create an application packet.</p>}
      </section>

      <section className="section-surface candidature-secondary-controls" aria-label="Application history">
        <button type="button" className="compact-secondary" onClick={() => setActivityOpen((open) => !open)}>{activityOpen ? "Hide history" : "Show history"}</button>
        {activityOpen ? <CandidatureActivityPanel candidatureId={selected.id} /> : null}
      </section>
    </section>
  );
}
