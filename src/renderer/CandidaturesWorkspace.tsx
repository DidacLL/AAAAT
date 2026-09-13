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
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";
import { CandidatureFocusPanel } from "./CandidatureFocusPanel";
import { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";
import { HistoricalFieldDiscoveryPanel } from "./HistoricalFieldDiscoveryPanel";
import { useContextualHandoffs } from "./contextual-handoffs";
import {
  candidatureRecognitionCues,
  candidatureSearchMatchCue,
  filterCandidatures,
  type ArchiveFilter,
} from "./candidature-projections";
import "./candidatures.css";
import "./candidature-recovery.css";

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
  const [discoveryFieldId, setDiscoveryFieldId] = useState<string | null>(null);
  const [addFieldId, setAddFieldId] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagEditorDraft, setTagEditorDraft] = useState<TagInput>(emptyTag);
  const [tagAliasesText, setTagAliasesText] = useState("");
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
    valueEditorDirty.size > 0 ||
    newFieldLabel.trim().length > 0;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
    return () => onDirtyChange?.(false);
  }, [hasUnsavedChanges, onDirtyChange]);

  const hydrate = useCallback((record: CandidatureRecord) => {
    setSelectedId(record.id);
    setSelectedDocumentIds(record.documentIds);
    setSelectedTagIds(record.tagIds);
    setSelectedTagId(record.tagIds[0] ?? null);
    setSourceDirty(false);
    setValueEditorDirty(new Set());
    setDiscoveryFieldId(null);
    setAddFieldId("");
    setNewFieldLabel("");
    setTagEditorOpen(false);
    setEditingTagId(null);
    setTagEditorDraft(emptyTag);
    setTagAliasesText("");
  }, []);

  const loadAll = useCallback(async () => {
    const [nextRecords, nextFields, nextDocuments, nextTags] = await Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.candidatures.listFields(),
      window.aaaat.documents.list(),
      window.aaaat.candidatures.listTags(),
    ]);
    setRecords(nextRecords);
    setFields(nextFields);
    setDocuments(nextDocuments);
    setTags(nextTags);
    return nextRecords;
  }, []);

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
        setMode("corpus");
        setSelectedId(null);
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
          hydrate(refreshed);
          setMode("detail");
        }
      })
      .catch(() => {
        if (active) setError("AAAAT could not refresh this candidature after returning.");
      });
    return () => {
      active = false;
    };
  }, [documentHandoff, hydrate]);

  const normalizedQuery = query.trim();
  useEffect(() => {
    if (!normalizedQuery) {
      setSearchResult(null);
      return;
    }
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
    if (record.id === selectedId) hydrate(record);
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
    setSourceDirty(false);
    setValueEditorDirty(new Set());
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
      storeRecord(await window.aaaat.candidatures.update({ id: selected.id, archived }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not change archive state.");
    }
  };

  const createCustomField = async () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    try {
      const created = await window.aaaat.candidatures.createField({
        label,
        description: "",
        valueType: "text",
        cardinality: "one",
        choices: [],
        enabled: true,
      });
      setFields((current) => [...current, created]);
      setAddFieldId(created.definition.id);
      setNewFieldLabel("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not add this kind of information.");
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
    try {
      replaceField(
        await window.aaaat.candidatures.updateFieldPreferences({
          ...field.preferences,
          ...patch,
          fieldId: field.definition.id,
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save information settings.");
    }
  };

  const saveDocuments = async () => {
    if (!selected) return;
    try {
      storeRecord(
        await window.aaaat.candidatures.setDocuments({
          candidatureId: selected.id,
          documentIds: selectedDocumentIds,
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save document associations.");
    }
  };

  const saveTagAssociations = async () => {
    if (!selected) return;
    try {
      storeRecord(
        await window.aaaat.candidatures.setTags({
          candidatureId: selected.id,
          tagIds: selectedTagIds,
        }),
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
      const current = selectedId ? nextRecords.find((record) => record.id === selectedId) : null;
      if (current) hydrate(current);
    } catch {
      setError("AAAAT could not refresh the candidature after the Source changed.");
    }
  }, [hydrate, selectedId]);

  const enabledMissingFields = selected
    ? fields.filter(
        (field) =>
          field.definition.enabled &&
          !selected.values.some((value) => value.fieldId === field.definition.id),
      )
    : [];
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
            Search candidatures
            <input
              type="search"
              value={query}
              maxLength={200}
              onChange={(event) => setQuery(event.target.value)}
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

        {records.length === 0 ? (
          <p className="compact-empty">No candidatures yet. Raw material alone is enough to create one.</p>
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
                    Edit candidature
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
            Back to candidatures
          </button>
          <button type="button" className="compact-secondary" onClick={() => setMode("detail")}>
            Edit full candidature
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
        {discoveryField ? (
          <HistoricalFieldDiscoveryPanel
            candidatureId={selected.id}
            field={discoveryField}
            onAccept={(value) => setValue(discoveryField.definition.id, value)}
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
          <p>Everything AAAAT retains about this candidature.</p>
        </div>
        <div className="button-row">
          <button type="button" className="compact-secondary" onClick={returnToCorpus}>
            Back to candidatures
          </button>
          <button type="button" className="compact-secondary" onClick={() => setMode("focus")}>
            Open Focus
          </button>
          <button type="button" className="compact-secondary" onClick={() => void setArchived(!selected.archived)}>
            {selected.archived ? "Restore candidature" : "Archive candidature"}
          </button>
        </div>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <section className="section-surface" aria-label="Candidature information">
        <div>
          <p className="eyebrow">Information</p>
          <h3>Information</h3>
          <p>Keep only information that is useful. Missing information is normal.</p>
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
                    onDiscover={() => setDiscoveryFieldId(field.definition.id)}
                    onDirtyChange={(dirty) => setEditorDirty(field.definition.id, dirty)}
                  />
                </article>
              );
            })}
          </div>
        )}

        {discoveryField ? (
          <HistoricalFieldDiscoveryPanel
            candidatureId={selected.id}
            field={discoveryField}
            onAccept={(value) => setValue(discoveryField.definition.id, value)}
            onClose={() => setDiscoveryFieldId(null)}
          />
        ) : null}

        <details className="add-information-panel">
          <summary>+ Add information</summary>
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
              onDiscover={() => setDiscoveryFieldId(addField.definition.id)}
              onDirtyChange={(dirty) => setEditorDirty(addField.definition.id, dirty)}
            />
          ) : null}

          <details>
            <summary>Add something not listed</summary>
            <label>
              Name
              <input
                value={newFieldLabel}
                onChange={(event) => setNewFieldLabel(event.target.value)}
                placeholder="Minimum flight hours"
              />
            </label>
            <button type="button" disabled={!newFieldLabel.trim()} onClick={() => void createCustomField()}>
              Add information kind
            </button>
          </details>
        </details>

        <details className="field-management">
          <summary>Focus and AI visibility</summary>
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
                  Focus prominence
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
                  Focus order
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
                  When AI uses candidature context
                  <select
                    value={field.preferences.aiContextMode}
                    onChange={(event) =>
                      void updateFieldPreference(field, {
                        aiContextMode: event.target.value as CandidatureFieldConfiguration["preferences"]["aiContextMode"],
                      })
                    }
                  >
                    <option value="omit">Do not share</option>
                    <option value="expose">Share value</option>
                    <option value="token">Use local placeholder</option>
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
        onOpenDocument={(documentId) => openDocumentFromCandidature(selected.id, documentId)}
      />

      <details className="secondary-candidature-detail">
        <summary>Activity</summary>
        <CandidatureActivityPanel candidatureId={selected.id} />
      </details>
    </section>
  );
}
