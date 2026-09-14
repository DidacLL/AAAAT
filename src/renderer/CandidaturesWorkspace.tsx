import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  DocumentRecord,
  TagInput,
  TagRecord,
} from "../shared/contracts";
import { CandidatureActivityPanel } from "./CandidatureActivityPanel";
import { CandidatureApplicationMaterialPanel } from "./CandidatureApplicationMaterialPanel";
import { CandidatureFieldDefinitionsPanel } from "./CandidatureFieldDefinitionsPanel";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";
import { CandidatureFocusPanel } from "./CandidatureFocusPanel";
import { CandidatureInferencePanel } from "./CandidatureInferencePanel";
import { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";
import { useContextualHandoffs } from "./contextual-handoffs";
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
  return value
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function tagDraft(tag: TagRecord): TagInput {
  return {
    name: tag.name,
    definition: tag.definition,
    notes: tag.notes ?? "",
    aliases: tag.aliases,
  };
}

export function CandidaturesWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { documentHandoff, openDocumentFromCandidature } = useContextualHandoffs();
  const previousDocumentHandoff = useRef(documentHandoff);
  const handoffDocumentIds = useRef<ReadonlySet<string> | null>(null);
  const [records, setRecords] = useState<CandidatureRecord[]>([]);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [mode, setMode] = useState<CandidatureMode>("corpus");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    readonly query: string;
    readonly ids: ReadonlySet<string>;
  } | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [sourceDirty, setSourceDirty] = useState(false);
  const [valueEditorDirty, setValueEditorDirty] = useState<ReadonlySet<string>>(new Set());
  const [fieldDefinitionsDirty, setFieldDefinitionsDirty] = useState(false);
  const [discoveryFieldId, setDiscoveryFieldId] = useState<string | null>(null);
  const [bulkInferenceOpen, setBulkInferenceOpen] = useState(false);
  const [addFieldId, setAddFieldId] = useState("");
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagEditorDraft, setTagEditorDraft] = useState<TagInput>(emptyTag);
  const [tagAliasesText, setTagAliasesText] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = records.find((record) => record.id === selectedId) ?? null;
  const documentSelectionDirty = selected
    ? !sameIds(selected.documentIds, selectedDocumentIds)
    : false;
  const tagSelectionDirty = selected ? !sameIds(selected.tagIds, selectedTagIds) : false;
  const persistedTag = editingTagId ? tags.find((tag) => tag.id === editingTagId) ?? null : null;
  const tagEditorDirty = tagEditorOpen
    ? JSON.stringify({ ...tagEditorDraft, aliases: aliasesFromText(tagAliasesText) }) !==
      JSON.stringify(persistedTag ? tagDraft(persistedTag) : emptyTag)
    : false;
  const hasUnsavedChanges =
    sourceDirty ||
    documentSelectionDirty ||
    tagSelectionDirty ||
    tagEditorDirty ||
    fieldDefinitionsDirty ||
    valueEditorDirty.size > 0;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
    return () => onDirtyChange?.(false);
  }, [hasUnsavedChanges, onDirtyChange]);

  const resetEditorDrafts = useCallback((record?: CandidatureRecord) => {
    setSelectedDocumentIds(record?.documentIds ?? []);
    setSelectedTagIds(record?.tagIds ?? []);
    setSelectedTagId(record?.tagIds[0] ?? null);
    setSourceDirty(false);
    setValueEditorDirty(new Set());
    setFieldDefinitionsDirty(false);
    setDiscoveryFieldId(null);
    setBulkInferenceOpen(false);
    setAddFieldId("");
    setTagEditorOpen(false);
    setEditingTagId(null);
    setTagEditorDraft(emptyTag);
    setTagAliasesText("");
    setActivityOpen(false);
  }, []);

  const hydrate = useCallback(
    (record: CandidatureRecord) => {
      setSelectedId(record.id);
      resetEditorDrafts(record);
      setError(null);
    },
    [resetEditorDrafts],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.candidatures.listFields(),
      window.aaaat.documents.list(),
      window.aaaat.candidatures.listTags(),
    ])
      .then(([nextRecords, nextFields, nextDocuments, nextTags]) => {
        if (!active) return;
        setRecords(nextRecords);
        setFields(nextFields);
        setDocuments(nextDocuments);
        setTags(nextTags);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidatures.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const previous = previousDocumentHandoff.current;
    previousDocumentHandoff.current = documentHandoff;
    if (!previous?.candidatureId || documentHandoff !== null) return;

    let active = true;
    void Promise.all([window.aaaat.candidatures.list(), window.aaaat.documents.list()])
      .then(([nextRecords, nextDocuments]) => {
        if (!active) return;
        setRecords(nextRecords);
        setDocuments(nextDocuments);
        const refreshed = nextRecords.find((record) => record.id === previous.candidatureId);
        if (refreshed) {
          const beforeHandoff = handoffDocumentIds.current;
          const availableDocumentIds = new Set(nextDocuments.map((document) => document.id));
          const newlyAssociatedDocumentIds = beforeHandoff
            ? refreshed.documentIds.filter((id) => !beforeHandoff.has(id))
            : [];
          setSelectedDocumentIds((current) => {
            const preserved = current.filter((id) => availableDocumentIds.has(id));
            return [
              ...preserved,
              ...newlyAssociatedDocumentIds.filter(
                (id) => availableDocumentIds.has(id) && !preserved.includes(id),
              ),
            ];
          });
          setSelectedId(refreshed.id);
          setMode("detail");
        }
        handoffDocumentIds.current = null;
      })
      .catch(() => {
        if (active) setError("AAAAT could not refresh this candidature after returning.");
      });
    return () => {
      active = false;
    };
  }, [documentHandoff]);

  const normalizedQuery = query.trim();
  useEffect(() => {
    if (!normalizedQuery) return;
    let active = true;
    void window.aaaat.candidatureSearch
      .search({ query: normalizedQuery })
      .then((ids) => {
        if (active) setSearchResult({ query: normalizedQuery, ids: new Set(ids) });
      })
      .catch(() => {
        if (!active) return;
        setSearchResult({ query: normalizedQuery, ids: new Set() });
        setError("AAAAT could not search retained candidature information.");
      });
    return () => {
      active = false;
    };
  }, [normalizedQuery, records, fields, tags]);

  const textMatches = useMemo<ReadonlySet<string> | null>(() => {
    if (!normalizedQuery) return null;
    return searchResult?.query === normalizedQuery ? searchResult.ids : new Set();
  }, [normalizedQuery, searchResult]);
  const visibleRecords = useMemo(
    () => filterCandidatures(records, archiveFilter, null, textMatches),
    [records, archiveFilter, textMatches],
  );

  const confirmDiscard = () =>
    !hasUnsavedChanges || window.confirm("Discard unsaved candidature edits?");

  const storeRecord = (record: CandidatureRecord) => {
    setRecords((current) =>
      current.map((candidate) => (candidate.id === record.id ? record : candidate)),
    );
  };

  const openRecord = (record: CandidatureRecord, nextMode: Exclude<CandidatureMode, "corpus">) => {
    if (!confirmDiscard()) return;
    hydrate(record);
    setMode(nextMode);
  };

  const returnToCorpus = () => {
    if (!confirmDiscard()) return;
    setMode("corpus");
    setSelectedId(null);
    handoffDocumentIds.current = null;
    resetEditorDrafts();
  };

  const setEditorDirty = (fieldId: string, dirty: boolean) => {
    setValueEditorDirty((current) => {
      const next = new Set(current);
      if (dirty) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  };

  const setValue = async (fieldId: string, value: CandidatureRuntimeValue) => {
    if (!selected) return;
    const updated = await window.aaaat.candidatures.setFieldValue({
      candidatureId: selected.id,
      fieldId,
      value,
    });
    storeRecord(updated);
    setEditorDirty(fieldId, false);
  };

  const clearValue = async (fieldId: string) => {
    if (!selected) return;
    const updated = await window.aaaat.candidatures.clearFieldValue({
      candidatureId: selected.id,
      fieldId,
    });
    storeRecord(updated);
    setEditorDirty(fieldId, false);
  };

  const setArchived = async (archived: boolean) => {
    if (!selected || !confirmDiscard()) return;
    try {
      const updated = await window.aaaat.candidatures.update({ id: selected.id, archived });
      storeRecord(updated);
      resetEditorDrafts(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not change archive state.");
    }
  };

  const replaceField = (updated: CandidatureFieldConfiguration) => {
    setFields((current) =>
      current.map((field) =>
        field.definition.id === updated.definition.id ? updated : field,
      ),
    );
  };

  const updateFieldPreference = async (
    field: CandidatureFieldConfiguration,
    patch: Partial<CandidatureFieldConfiguration["preferences"]>,
  ) => {
    const optimistic = {
      ...field,
      preferences: { ...field.preferences, ...patch },
    };
    replaceField(optimistic);
    try {
      replaceField(
        await window.aaaat.candidatures.updateFieldPreferences({
          ...optimistic.preferences,
          fieldId: field.definition.id,
        }),
      );
    } catch (reason) {
      replaceField(field);
      setError(reason instanceof Error ? reason.message : "AAAAT could not save information settings.");
    }
  };

  const refreshFields = async () => {
    try {
      setFields(await window.aaaat.candidatures.listFields());
    } catch {
      setError("AAAAT could not refresh candidature information settings.");
    }
  };

  const saveDocuments = async () => {
    if (!selected) return;
    try {
      const updated = await window.aaaat.candidatures.setDocuments({
        candidatureId: selected.id,
        documentIds: selectedDocumentIds,
      });
      storeRecord(updated);
      setSelectedDocumentIds(updated.documentIds);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save document associations.");
    }
  };

  const saveTagAssociations = async () => {
    if (!selected) return;
    try {
      const updated = await window.aaaat.candidatures.setTags({
        candidatureId: selected.id,
        tagIds: selectedTagIds,
      });
      storeRecord(updated);
      setSelectedTagIds(updated.tagIds);
      setSelectedTagId((current) =>
        current && updated.tagIds.includes(current) ? current : updated.tagIds[0] ?? null,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save Tag associations.");
    }
  };

  const startNewTag = () => {
    if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return;
    setTagEditorOpen(true);
    setEditingTagId(null);
    setTagEditorDraft(emptyTag);
    setTagAliasesText("");
  };

  const editTag = (tag: TagRecord) => {
    if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return;
    setTagEditorOpen(true);
    setEditingTagId(tag.id);
    setTagEditorDraft(tagDraft(tag));
    setTagAliasesText(tag.aliases.join(", "));
  };

  const saveTag = async () => {
    const input = { ...tagEditorDraft, aliases: aliasesFromText(tagAliasesText) };
    if (!input.name.trim()) return;
    try {
      const saved = editingTagId
        ? await window.aaaat.candidatures.updateTag({ id: editingTagId, ...input })
        : await window.aaaat.candidatures.createTag(input);
      setTags((current) => {
        const found = current.some((tag) => tag.id === saved.id);
        return (found
          ? current.map((tag) => (tag.id === saved.id ? saved : tag))
          : [...current, saved]
        ).sort((left, right) => left.name.localeCompare(right.name));
      });
      setEditingTagId(saved.id);
      setTagEditorDraft(tagDraft(saved));
      setTagAliasesText(saved.aliases.join(", "));
      setSelectedTagId(saved.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this Tag.");
    }
  };

  const handleSourcesChanged = useCallback(async () => {
    try {
      const nextRecords = await window.aaaat.candidatures.list();
      setRecords(nextRecords);
      setSourceDirty(false);
    } catch {
      setError("AAAAT could not refresh the candidature after the Source changed.");
    }
  }, []);

  const openDocument = (documentId?: string) => {
    if (!selected) return;
    handoffDocumentIds.current = new Set(selected.documentIds);
    openDocumentFromCandidature(selected.id, documentId);
  };

  const enabledMissingFields = selected
    ? fields.filter(
        (field) =>
          field.definition.enabled &&
          !selected.values.some((value) => value.fieldId === field.definition.id),
      )
    : [];
  const discoverableMissingFields = enabledMissingFields.filter(
    (field) => field.preferences.aiDiscovery,
  );
  const addField = fields.find((field) => field.definition.id === addFieldId);
  const discoveryField = fields.find((field) => field.definition.id === discoveryFieldId);

  if (mode === "corpus") {
    return (
      <section className="candidatures-workspace candidature-corpus" aria-label="Candidatures">
        <header className="candidature-toolbar">
          <div>
            <p className="eyebrow">Focus</p>
            <h2>Candidatures</h2>
            <p>Find the candidature you need in seconds.</p>
          </div>
        </header>

        <div className="candidature-corpus-tools">
          <label>
            Search
            <input
              type="search"
              value={query}
              maxLength={200}
              onChange={(event) => {
                setQuery(event.target.value);
                if (!event.target.value.trim()) setSearchResult(null);
              }}
              placeholder="Company, role, Source text, Tag…"
            />
          </label>
          <label>
            Show
            <select
              value={archiveFilter}
              onChange={(event) => setArchiveFilter(event.target.value as ArchiveFilter)}
            >
              <option value="active">Current</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </label>
        </div>

        {error ? <p className="error-message" role="alert">{error}</p> : null}

        {tags.length > 0 ? (
          <details className="corpus-tags-reference">
            <summary>Tags reference</summary>
            <p className="compact-help">Quick glossary lookup. Tag editing stays in a candidature’s complete details.</p>
            <div className="corpus-tag-list">
              {tags.map((tag) => (
                <article key={tag.id}>
                  <strong>{tag.name}</strong>
                  {tag.aliases.length > 0 ? <small>Aliases: {tag.aliases.join(", ")}</small> : null}
                  {tag.definition ? <p>{tag.definition}</p> : null}
                  {tag.notes ? <p className="compact-help">{tag.notes}</p> : null}
                </article>
              ))}
            </div>
          </details>
        ) : null}

        {records.length === 0 ? (
          <div className="candidature-empty-state">
            <h3>No candidatures yet</h3>
            <p>Enter a few details or paste whatever material you already have.</p>
          </div>
        ) : visibleRecords.length === 0 ? (
          <p className="compact-empty">No candidatures match this search.</p>
        ) : (
          <div className="candidature-corpus-grid" aria-label="Candidature corpus Focus">
            {visibleRecords.map((record) => {
              const searchMatchCue =
                normalizedQuery && textMatches?.has(record.id)
                  ? candidatureSearchMatchCue(record, fields, tags, normalizedQuery)
                  : null;
              const recognitionCues = searchMatchCue
                ? [searchMatchCue]
                : candidatureRecognitionCues(record, fields, 3);
              return (
                <article className="candidature-corpus-card" key={record.id}>
                  <button
                    type="button"
                    className="candidature-focus-entry"
                    onClick={() => openRecord(record, "focus")}
                  >
                    <strong>{record.label}</strong>
                    {recognitionCues.length > 0 ? (
                      <span className="candidature-recognition-cues">
                        {recognitionCues.map((cue, index) => (
                          <span className="candidature-recognition-cue" key={`${cue.label}-${index}`}>
                            <span>{cue.label}</span>
                            <span>{cue.value}</span>
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="compact-help">Sparse candidature</span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="compact-secondary candidature-direct-edit"
                    onClick={() => openRecord(record, "detail")}
                  >
                    All details
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  if (!selected) {
    return (
      <section className="candidatures-workspace">
        <p className="error-message">The selected candidature is no longer available.</p>
        <button type="button" onClick={returnToCorpus}>Back to candidatures</button>
      </section>
    );
  }

  if (mode === "focus") {
    return (
      <section className="candidatures-workspace candidature-selected-focus" aria-label="Candidature Focus">
        <div className="candidature-context-actions">
          <button type="button" className="compact-secondary" onClick={returnToCorpus}>
            Back
          </button>
          <button type="button" className="compact-secondary" onClick={() => openRecord(selected, "detail")}>
            All details
          </button>
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        <CandidatureFocusPanel
          record={selected}
          fields={fields}
          tags={tags}
          selectedTagId={selectedTagId}
          onSelectTag={setSelectedTagId}
          onSaveValue={setValue}
          onClearValue={clearValue}
          onDiscoverValue={setDiscoveryFieldId}
          onDirtyChange={setEditorDirty}
        />
        {discoveryField?.preferences.aiDiscovery ? (
          <CandidatureInferencePanel
            candidature={selected}
            fields={fields}
            targetFieldIds={[discoveryField.definition.id]}
            taskId={`candidature-inference:${selected.id}:${discoveryField.definition.id}`}
            title={`Suggest ${discoveryField.definition.label}`}
            onSaveValue={setValue}
            onClose={() => setDiscoveryFieldId(null)}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section className="candidatures-workspace candidature-detail" aria-label="Complete candidature">
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">Candidature</p>
          <h2>{selected.label}</h2>
          <p>Everything you have kept for this candidature.</p>
        </div>
        <div className="button-row">
          <button type="button" className="compact-secondary" onClick={returnToCorpus}>
            Back
          </button>
          <button type="button" className="compact-secondary" onClick={() => openRecord(selected, "focus")}>
            Focus
          </button>
          <button type="button" className="compact-secondary" onClick={() => void setArchived(!selected.archived)}>
            {selected.archived ? "Restore" : "Archive"}
          </button>
        </div>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <section className="section-surface" aria-label="Candidature information">
        <div className="candidature-editor-heading">
          <div>
            <p className="eyebrow">Information</p>
            <h3>Information</h3>
            <p>See what is known, edit a value, or add useful information. Missing information is normal.</p>
          </div>
          {discoverableMissingFields.length > 0 ? (
            <button type="button" className="compact-secondary" onClick={() => setBulkInferenceOpen(true)}>
              Suggest missing information with AI
            </button>
          ) : null}
        </div>

        {selected.values.length === 0 ? (
          <p className="compact-empty">No structured information is retained yet.</p>
        ) : (
          <div className="retained-information-list">
            {selected.values.map((retained) => {
              const field = fields.find((candidate) => candidate.definition.id === retained.fieldId);
              if (!field) return null;
              return (
                <article key={retained.fieldId} className="retained-information-card">
                  <div>
                    <h4>{field.definition.label}</h4>
                    {field.definition.description ? <p>{field.definition.description}</p> : null}
                  </div>
                  <CandidatureFieldValueEditor
                    field={field}
                    value={retained.value}
                    onSave={(value) => setValue(field.definition.id, value)}
                    onClear={() => clearValue(field.definition.id)}
                    onDiscover={
                      field.preferences.aiDiscovery
                        ? () => setDiscoveryFieldId(field.definition.id)
                        : undefined
                    }
                    onDirtyChange={(dirty) => setEditorDirty(field.definition.id, dirty)}
                  />
                </article>
              );
            })}
          </div>
        )}

        {discoveryField?.preferences.aiDiscovery ? (
          <CandidatureInferencePanel
            candidature={selected}
            fields={fields}
            targetFieldIds={[discoveryField.definition.id]}
            taskId={`candidature-inference:${selected.id}:${discoveryField.definition.id}`}
            title={`Suggest ${discoveryField.definition.label}`}
            onSaveValue={setValue}
            onClose={() => setDiscoveryFieldId(null)}
          />
        ) : null}

        {bulkInferenceOpen ? (
          <CandidatureInferencePanel
            candidature={selected}
            fields={fields}
            targetFieldIds={discoverableMissingFields.map((field) => field.definition.id)}
            taskId={`candidature-inference:${selected.id}:missing`}
            title="Suggest missing information"
            onSaveValue={setValue}
            onClose={() => setBulkInferenceOpen(false)}
          />
        ) : null}

        <details className="add-information-panel">
          <summary>+ Add information</summary>
          <p className="compact-help">Add a value to this candidature. This does not change the reusable kinds of information AAAAT knows about.</p>
          {enabledMissingFields.length > 0 ? (
            <label>
              Information to add
              <select value={addFieldId} onChange={(event) => setAddFieldId(event.target.value)}>
                <option value="">Choose…</option>
                {enabledMissingFields.map((field) => (
                  <option key={field.definition.id} value={field.definition.id}>
                    {field.definition.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="compact-help">All available information already has a value.</p>
          )}
          {addField ? (
            <CandidatureFieldValueEditor
              key={`add-${addField.definition.id}`}
              field={addField}
              onSave={async (value) => {
                await setValue(addField.definition.id, value);
                setAddFieldId("");
              }}
              onClear={async () => setAddFieldId("")}
              onDiscover={
                addField.preferences.aiDiscovery
                  ? () => setDiscoveryFieldId(addField.definition.id)
                  : undefined
              }
              onDirtyChange={(dirty) => setEditorDirty(addField.definition.id, dirty)}
            />
          ) : null}
        </details>

        <CandidatureFieldDefinitionsPanel
          onChanged={() => void refreshFields()}
          onDirtyChange={setFieldDefinitionsDirty}
        />

        <details className="field-management">
          <summary>Information display &amp; AI settings</summary>
          <p className="compact-help">Reusable behavior for information kinds across candidatures. These controls do not edit this candidature’s values.</p>
          <div className="field-preference-list">
            {fields.map((field) => (
              <article className="editor-card" key={field.definition.id}>
                <strong>{field.definition.label}</strong>
                <label>
                  <input
                    type="checkbox"
                    checked={field.preferences.focusVisible}
                    onChange={(event) =>
                      void updateFieldPreference(field, { focusVisible: event.target.checked })
                    }
                  />
                  Show in Focus when retained
                </label>
                <label>
                  Size in Focus
                  <select
                    value={field.preferences.focusProminence}
                    onChange={(event) =>
                      void updateFieldPreference(field, {
                        focusProminence: event.target.value as CandidatureFieldConfiguration["preferences"]["focusProminence"],
                      })
                    }
                  >
                    <option value="compact">Compact</option>
                    <option value="normal">Normal</option>
                    <option value="wide">Wide</option>
                  </select>
                </label>
                <label>
                  Order in Focus
                  <input
                    type="number"
                    min="0"
                    defaultValue={field.preferences.focusOrder ?? ""}
                    onBlur={(event) =>
                      void updateFieldPreference(field, {
                        focusOrder: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  />
                </label>
                <label>
                  AI use
                  <select
                    value={field.preferences.aiContextMode}
                    onChange={(event) =>
                      void updateFieldPreference(field, {
                        aiContextMode: event.target.value as CandidatureFieldConfiguration["preferences"]["aiContextMode"],
                      })
                    }
                  >
                    <option value="omit">Do not use</option>
                    <option value="expose">Use this value</option>
                    <option value="token">Use a local placeholder</option>
                  </select>
                </label>
              </article>
            ))}
          </div>
        </details>
      </section>

      <CandidatureSourcesPanel
        candidatureId={selected.id}
        onSourcesChanged={() => void handleSourcesChanged()}
        onDirtyChange={setSourceDirty}
      />

      <section className="section-surface" aria-label="Tags">
        <div className="candidature-editor-heading">
          <div>
            <p className="eyebrow">Shared glossary</p>
            <h3>Tags</h3>
            <p>Reusable terms, aliases, definitions and notes linked to this candidature.</p>
          </div>
          <button type="button" className="compact-secondary" onClick={startNewTag}>
            Add Tag
          </button>
        </div>

        {tags.length === 0 ? (
          <p className="compact-empty">No Tags yet.</p>
        ) : (
          <div className="tag-association-list">
            {tags.map((tag) => (
              <article className="retained-information-card" key={tag.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag.id)}
                    onChange={(event) =>
                      setSelectedTagIds((current) =>
                        event.target.checked
                          ? [...current.filter((id) => id !== tag.id), tag.id]
                          : current.filter((id) => id !== tag.id),
                      )
                    }
                  />
                  <strong>{tag.name}</strong>
                </label>
                {tag.definition ? <p>{tag.definition}</p> : null}
                {tag.aliases.length > 0 ? <small>{tag.aliases.join(", ")}</small> : null}
                <button type="button" className="compact-secondary" onClick={() => editTag(tag)}>
                  Edit Tag
                </button>
              </article>
            ))}
          </div>
        )}

        {tagSelectionDirty ? (
          <button type="button" onClick={() => void saveTagAssociations()}>
            Save Tag associations
          </button>
        ) : null}

        {tagEditorOpen ? (
          <div className="editor-card tag-editor">
            <h4>{editingTagId ? "Edit Tag" : "New Tag"}</h4>
            <label>
              Name
              <input
                value={tagEditorDraft.name}
                onChange={(event) => setTagEditorDraft({ ...tagEditorDraft, name: event.target.value })}
              />
            </label>
            <label>
              Aliases
              <input
                value={tagAliasesText}
                onChange={(event) => setTagAliasesText(event.target.value)}
                placeholder="Comma separated"
              />
            </label>
            <label>
              Definition
              <textarea
                rows={4}
                value={tagEditorDraft.definition}
                onChange={(event) => setTagEditorDraft({ ...tagEditorDraft, definition: event.target.value })}
              />
            </label>
            <label>
              Notes
              <textarea
                rows={4}
                value={tagEditorDraft.notes ?? ""}
                onChange={(event) => setTagEditorDraft({ ...tagEditorDraft, notes: event.target.value })}
              />
            </label>
            <div className="button-row">
              <button type="button" disabled={!tagEditorDraft.name.trim()} onClick={() => void saveTag()}>
                Save Tag
              </button>
              <button
                type="button"
                className="compact-secondary"
                onClick={() => {
                  if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return;
                  setTagEditorOpen(false);
                  setEditingTagId(null);
                  setTagEditorDraft(emptyTag);
                  setTagAliasesText("");
                }}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <CandidatureApplicationMaterialPanel
        candidature={selected}
        documents={documents}
        selectedDocumentIds={selectedDocumentIds}
        documentSelectionDirty={documentSelectionDirty}
        onDocumentSelectionChange={setSelectedDocumentIds}
        onSaveDocuments={() => void saveDocuments()}
        onOpenDocument={(documentId) => openDocument(documentId)}
      />

      <details
        className="secondary-candidature-detail"
        onToggle={(event) => setActivityOpen(event.currentTarget.open)}
      >
        <summary>Activity</summary>
        {activityOpen ? <CandidatureActivityPanel candidatureId={selected.id} /> : null}
      </details>
    </section>
  );
}
