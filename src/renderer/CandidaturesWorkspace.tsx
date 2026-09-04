import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureFieldPreferencesUpdate,
  CandidatureFieldUpdate,
  CandidatureFilterOperator,
  CandidatureRecord,
  CandidatureRuntimeValue,
  ConceptInput,
  ConceptRecord,
  DocumentRecord,
} from "../shared/contracts";
import { CandidatureFitPanel } from "./CandidatureFitPanel";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";
import { CandidatureFocusPanel, type FocusDestination } from "./CandidatureFocusPanel";
import { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";
import { VariantRecommendationPanel } from "./VariantRecommendationPanel";
import { filterCandidatures, type ArchiveFilter } from "./candidature-projections";

type CandidatureSection = "focus" | "information" | "sources" | "concepts" | "documents";

const sectionLabels: readonly { key: CandidatureSection; label: string }[] = [
  { key: "focus", label: "Focus" },
  { key: "information", label: "Information" },
  { key: "sources", label: "Sources" },
  { key: "concepts", label: "Concepts" },
  { key: "documents", label: "Documents" },
];

const emptyConcept: ConceptInput = { name: "", definition: "", aliases: [] };

function aliasesFromText(value: string): string[] {
  return value
    .split(",")
    .map((alias) => alias.trim())
    .filter(Boolean);
}

function sameIds(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id) => right.includes(id));
}

function conceptInput(concept: ConceptRecord): ConceptInput {
  return { name: concept.name, definition: concept.definition, aliases: concept.aliases };
}

function fieldUpdate(field: CandidatureFieldConfiguration): CandidatureFieldUpdate {
  return {
    id: field.definition.id,
    label: field.definition.label,
    description: field.definition.description,
    valueType: field.definition.valueType,
    cardinality: field.definition.cardinality,
    choices: field.definition.choices,
    enabled: field.definition.enabled,
  };
}

function preferenceUpdate(
  field: CandidatureFieldConfiguration,
): CandidatureFieldPreferencesUpdate {
  return { ...field.preferences };
}

function operatorsFor(field: CandidatureFieldConfiguration | undefined): CandidatureFilterOperator[] {
  if (!field) return [];
  switch (field.definition.valueType) {
    case "text":
    case "long_text":
    case "url":
      return ["contains", "equals", "is_set", "is_not_set"];
    case "number":
      return [
        "equals",
        "less_than",
        "less_than_or_equal",
        "greater_than",
        "greater_than_or_equal",
        "is_set",
        "is_not_set",
      ];
    case "date":
      return ["equals", "before", "after", "is_set", "is_not_set"];
    case "boolean":
      return ["equals", "is_set", "is_not_set"];
    case "choice":
      return [
        "equals",
        ...(field.definition.cardinality === "many"
          ? (["contains_any", "contains_all"] as const)
          : []),
        "is_set",
        "is_not_set",
      ];
  }
}

function operatorLabel(operator: CandidatureFilterOperator): string {
  return operator.replaceAll("_", " ");
}

export function CandidaturesWorkspace() {
  const [records, setRecords] = useState<CandidatureRecord[]>([]);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [concepts, setConcepts] = useState<ConceptRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<CandidatureSection>("focus");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [sourceDirty, setSourceDirty] = useState(false);
  const [conceptEditorOpen, setConceptEditorOpen] = useState(false);
  const [editingConceptId, setEditingConceptId] = useState<string | null>(null);
  const [conceptDraft, setConceptDraft] = useState<ConceptInput>(emptyConcept);
  const [aliasesText, setAliasesText] = useState("");
  const [addFieldId, setAddFieldId] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldDescription, setNewFieldDescription] = useState("");
  const [newFieldType, setNewFieldType] = useState<CandidatureFieldUpdate["valueType"]>("text");
  const [newFieldCardinality, setNewFieldCardinality] =
    useState<CandidatureFieldUpdate["cardinality"]>("one");
  const [newChoiceLabels, setNewChoiceLabels] = useState("");
  const [fieldEditorId, setFieldEditorId] = useState("");
  const [fieldDraft, setFieldDraft] = useState<CandidatureFieldUpdate | null>(null);
  const [preferencesDraft, setPreferencesDraft] =
    useState<CandidatureFieldPreferencesUpdate | null>(null);
  const [filterFieldId, setFilterFieldId] = useState("");
  const [filterOperator, setFilterOperator] = useState<CandidatureFilterOperator>("is_set");
  const [filterValue, setFilterValue] = useState("");
  const [filterChoiceValues, setFilterChoiceValues] = useState<string[]>([]);
  const [fieldMatches, setFieldMatches] = useState<ReadonlySet<string> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = records.find((record) => record.id === selectedId) ?? null;
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

  const loadRecords = useCallback(async () => {
    const nextRecords = await window.aaaat.candidatures.list();
    setRecords(nextRecords);
    return nextRecords;
  }, []);

  const hydrate = useCallback((record: CandidatureRecord) => {
    setSelectedId(record.id);
    setSelectedDocumentIds(record.documentIds);
    setSelectedConceptIds(record.conceptIds);
    setSelectedConceptId(record.conceptIds[0] ?? null);
    setSourceDirty(false);
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.candidatures.listFields(),
      window.aaaat.documents.list(),
      window.aaaat.candidatures.listConcepts(),
    ])
      .then(([nextRecords, nextFields, nextDocuments, nextConcepts]) => {
        if (!active) return;
        setRecords(nextRecords);
        setFields(nextFields);
        setDocuments(nextDocuments);
        setConcepts(nextConcepts);
        const first = nextRecords.find((record) => !record.archived) ?? nextRecords[0];
        if (first) hydrate(first);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidatures.");
      });
    return () => {
      active = false;
    };
  }, [hydrate]);

  const currentFilterField = fields.find((field) => field.definition.id === filterFieldId);
  const availableOperators = operatorsFor(currentFilterField);
  const visibleRecords = useMemo(
    () => filterCandidatures(records, fields, concepts, query, archiveFilter, fieldMatches),
    [records, fields, concepts, query, archiveFilter, fieldMatches],
  );

  const storeRecord = (record: CandidatureRecord) => {
    setRecords((current) => {
      const present = current.some((candidate) => candidate.id === record.id);
      return present
        ? current.map((candidate) => (candidate.id === record.id ? record : candidate))
        : [record, ...current];
    });
    if (record.id === selectedId) hydrate(record);
  };

  const resetConceptEditor = () => {
    setConceptEditorOpen(false);
    setEditingConceptId(null);
    setConceptDraft(emptyConcept);
    setAliasesText("");
  };

  const confirmDiscard = () =>
    (!sourceDirty && !conceptSelectionDirty && !conceptEditorDirty && !documentSelectionDirty) ||
    window.confirm("Discard unsaved Source, concept, or document changes?");

  const switchSection = (next: CandidatureSection) => {
    if (next === section) return;
    if (!confirmDiscard()) return;
    if (section === "concepts" && selected) {
      setSelectedConceptIds(selected.conceptIds);
      resetConceptEditor();
    }
    if (section === "documents" && selected) setSelectedDocumentIds(selected.documentIds);
    if (section === "sources") setSourceDirty(false);
    setSection(next);
  };

  const focusNavigate = (destination: FocusDestination) => switchSection(destination);

  const create = async () => {
    if (!confirmDiscard()) return;
    setError(null);
    try {
      const created = await window.aaaat.candidatures.create({ values: [] });
      storeRecord(created);
      hydrate(created);
      setSection("information");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create this candidature.");
    }
  };

  const setArchived = async (archived: boolean) => {
    if (!selected) return;
    setError(null);
    try {
      storeRecord(await window.aaaat.candidatures.update({ id: selected.id, archived }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not change archive state.");
    }
  };

  const setValue = async (fieldId: string, value: CandidatureRuntimeValue) => {
    if (!selected) return;
    storeRecord(
      await window.aaaat.candidatures.setFieldValue({
        candidatureId: selected.id,
        fieldId,
        value,
      }),
    );
  };

  const clearValue = async (fieldId: string) => {
    if (!selected) return;
    storeRecord(
      await window.aaaat.candidatures.clearFieldValue({
        candidatureId: selected.id,
        fieldId,
      }),
    );
  };

  const discoverValue = async (fieldId: string) => {
    if (!selected) return;
    const sources = await window.aaaat.candidatures.listSources(selected.id);
    if (sources.length === 0) throw new Error("Retain a Source before asking AI to rediscover information.");
    const result = await window.aaaat.ai.discoverField({
      candidatureId: selected.id,
      fieldId,
      sourceIds: sources.map((source) => source.id),
    });
    if (!result.proposal) {
      window.alert("The configured AI did not find a supported value in these Sources.");
      return;
    }
    const field = fields.find((candidate) => candidate.definition.id === fieldId);
    const label = field?.definition.label ?? "this field";
    const replacement = result.existingValuePresent
      ? `Replace the existing ${label} value with the reviewed AI proposal?`
      : `Accept the reviewed AI proposal for ${label}?`;
    if (!window.confirm(`${replacement}\n\n${JSON.stringify(result.proposal.value)}`)) return;
    await setValue(fieldId, result.proposal.value);
  };

  const createField = async () => {
    if (!newFieldLabel.trim()) return;
    setError(null);
    try {
      const choices =
        newFieldType === "choice"
          ? newChoiceLabels
              .split("\n")
              .map((label) => label.trim())
              .filter(Boolean)
              .map((label) => ({ id: crypto.randomUUID(), label }))
          : [];
      const created = await window.aaaat.candidatures.createField({
        label: newFieldLabel,
        description: newFieldDescription,
        valueType: newFieldType,
        cardinality: newFieldCardinality,
        choices,
        enabled: true,
      });
      setFields((current) => [...current, created]);
      setAddFieldId(created.definition.id);
      setFieldEditorId(created.definition.id);
      setFieldDraft(fieldUpdate(created));
      setPreferencesDraft(preferenceUpdate(created));
      setNewFieldLabel("");
      setNewFieldDescription("");
      setNewFieldType("text");
      setNewFieldCardinality("one");
      setNewChoiceLabels("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create this field.");
    }
  };

  const chooseFieldEditor = (fieldId: string) => {
    setFieldEditorId(fieldId);
    const field = fields.find((candidate) => candidate.definition.id === fieldId);
    setFieldDraft(field ? fieldUpdate(field) : null);
    setPreferencesDraft(field ? preferenceUpdate(field) : null);
  };

  const replaceField = (next: CandidatureFieldConfiguration) => {
    setFields((current) =>
      current.map((field) => (field.definition.id === next.definition.id ? next : field)),
    );
    setFieldDraft(fieldUpdate(next));
    setPreferencesDraft(preferenceUpdate(next));
  };

  const saveFieldDefinition = async () => {
    if (!fieldDraft) return;
    setError(null);
    try {
      replaceField(await window.aaaat.candidatures.updateField(fieldDraft));
      await loadRecords();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not update this field.");
    }
  };

  const saveFieldPreferences = async () => {
    if (!preferencesDraft) return;
    setError(null);
    try {
      replaceField(await window.aaaat.candidatures.updateFieldPreferences(preferencesDraft));
      await loadRecords();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not update field behavior.");
    }
  };

  const deleteField = async () => {
    if (!fieldDraft || !window.confirm(`Delete unused field “${fieldDraft.label}”?`)) return;
    setError(null);
    try {
      const nextFields = await window.aaaat.candidatures.deleteField(fieldDraft.id);
      setFields(nextFields);
      setFieldEditorId("");
      setFieldDraft(null);
      setPreferencesDraft(null);
      setAddFieldId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not delete this field.");
    }
  };

  const applyFieldFilter = async () => {
    if (!filterFieldId) {
      setFieldMatches(null);
      return;
    }
    const field = fields.find((candidate) => candidate.definition.id === filterFieldId);
    if (!field) return;
    setError(null);
    try {
      let value: CandidatureRuntimeValue | undefined;
      if (filterOperator !== "is_set" && filterOperator !== "is_not_set") {
        if (field.definition.valueType === "number") value = Number(filterValue);
        else if (field.definition.valueType === "boolean") value = filterValue === "true";
        else if (
          field.definition.valueType === "choice" &&
          (filterOperator === "contains_any" || filterOperator === "contains_all")
        ) {
          value = filterChoiceValues;
        } else value = filterValue;
      }
      const ids = await window.aaaat.candidatures.filter({
        fieldId: filterFieldId,
        operator: filterOperator,
        ...(value !== undefined ? { value } : {}),
      });
      setFieldMatches(new Set(ids));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not apply this filter.");
    }
  };

  const clearFieldFilter = () => {
    setFilterFieldId("");
    setFilterOperator("is_set");
    setFilterValue("");
    setFilterChoiceValues([]);
    setFieldMatches(null);
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

  const saveConceptAssociations = async () => {
    if (!selected) return;
    try {
      const saved = await window.aaaat.candidatures.setConcepts({
        candidatureId: selected.id,
        conceptIds: selectedConceptIds,
      });
      storeRecord(saved);
      if (selectedConceptId && !saved.conceptIds.includes(selectedConceptId)) {
        setSelectedConceptId(saved.conceptIds[0] ?? null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save concept associations.");
    }
  };

  const saveConcept = async () => {
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this concept.");
    }
  };

  const startNewConcept = () => {
    setConceptEditorOpen(true);
    setEditingConceptId(null);
    setConceptDraft(emptyConcept);
    setAliasesText("");
  };

  const chooseConceptForEdit = (conceptId: string) => {
    const concept = concepts.find((candidate) => candidate.id === conceptId);
    if (!concept) return;
    setConceptEditorOpen(true);
    setEditingConceptId(concept.id);
    setConceptDraft(conceptInput(concept));
    setAliasesText(concept.aliases.join(", "));
  };

  const handleSourcesChanged = useCallback(async () => {
    try {
      const nextRecords = await window.aaaat.candidatures.list();
      setRecords(nextRecords);
    } catch {
      setError("AAAAT could not refresh the candidature after the Source changed.");
    }
  }, []);

  const enabledMissingFields = selected
    ? fields.filter(
        (field) =>
          field.definition.enabled &&
          !selected.values.some((value) => value.fieldId === field.definition.id),
      )
    : [];
  const addField = fields.find((field) => field.definition.id === addFieldId);
  const editorField = fields.find((field) => field.definition.id === fieldEditorId);

  return (
    <section className="candidatures-workspace" aria-label="Candidatures">
      <div className="candidature-toolbar">
        <div>
          <p className="eyebrow">Sparse opportunity information</p>
          <h2>Candidatures</h2>
        </div>
        <button type="button" onClick={() => void create()}>New candidature</button>
      </div>

      <div className="candidature-filters" aria-label="Candidature filters">
        <label>
          Search retained information
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Organisation, role, custom field, concept…"
          />
        </label>
        <label>
          Field
          <select
            value={filterFieldId}
            onChange={(event) => {
              const id = event.target.value;
              setFilterFieldId(id);
              const nextField = fields.find((field) => field.definition.id === id);
              setFilterOperator(operatorsFor(nextField)[0] ?? "is_set");
              setFilterValue("");
              setFilterChoiceValues([]);
            }}
          >
            <option value="">No field filter</option>
            {fields.filter((field) => field.definition.enabled).map((field) => (
              <option key={field.definition.id} value={field.definition.id}>
                {field.definition.label}
              </option>
            ))}
          </select>
        </label>
        {currentFilterField ? (
          <label>
            Operator
            <select
              value={filterOperator}
              onChange={(event) => {
                setFilterOperator(event.target.value as CandidatureFilterOperator);
                setFilterValue("");
                setFilterChoiceValues([]);
              }}
            >
              {availableOperators.map((operator) => (
                <option key={operator} value={operator}>{operatorLabel(operator)}</option>
              ))}
            </select>
          </label>
        ) : null}
        {currentFilterField && filterOperator !== "is_set" && filterOperator !== "is_not_set" ? (
          currentFilterField.definition.valueType === "choice" &&
          (filterOperator === "contains_any" || filterOperator === "contains_all") ? (
            <fieldset className="choice-filter-values">
              <legend>Values</legend>
              {currentFilterField.definition.choices.map((choice) => (
                <label key={choice.id}>
                  <input
                    type="checkbox"
                    checked={filterChoiceValues.includes(choice.id)}
                    onChange={(event) =>
                      setFilterChoiceValues((current) =>
                        event.target.checked
                          ? [...current.filter((id) => id !== choice.id), choice.id]
                          : current.filter((id) => id !== choice.id),
                      )
                    }
                  />
                  {choice.label}
                </label>
              ))}
            </fieldset>
          ) : (
            <label>
              Value
              {currentFilterField.definition.valueType === "choice" ? (
                <select value={filterValue} onChange={(event) => setFilterValue(event.target.value)}>
                  <option value="">Choose…</option>
                  {currentFilterField.definition.choices.map((choice) => (
                    <option key={choice.id} value={choice.id}>{choice.label}</option>
                  ))}
                </select>
              ) : currentFilterField.definition.valueType === "boolean" ? (
                <select value={filterValue} onChange={(event) => setFilterValue(event.target.value)}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              ) : (
                <input
                  type={
                    currentFilterField.definition.valueType === "number"
                      ? "number"
                      : currentFilterField.definition.valueType === "date"
                        ? "date"
                        : "text"
                  }
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                />
              )}
            </label>
          )
        ) : null}
        <div className="button-row">
          <button type="button" onClick={() => void applyFieldFilter()}>Apply field filter</button>
          {fieldMatches ? (
            <button type="button" className="compact-secondary" onClick={clearFieldFilter}>
              Clear field filter
            </button>
          ) : null}
        </div>
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
            <p>No candidatures yet. A completely sparse or Source-only candidature is valid.</p>
          ) : visibleRecords.length === 0 ? (
            <p>No candidatures match these filters.</p>
          ) : (
            visibleRecords.map((record) => (
              <button
                type="button"
                key={record.id}
                className={record.id === selectedId ? "selected-candidature" : ""}
                onClick={() => {
                  if (!confirmDiscard()) return;
                  hydrate(record);
                }}
              >
                <strong>{record.label}</strong>
                <span>
                  {record.values.length} retained {record.values.length === 1 ? "field" : "fields"}
                  {record.archived ? " · archived" : ""}
                </span>
              </button>
            ))
          )}
        </aside>

        <div className="candidature-editor">
          {selected ? (
            <>
              <div className="candidature-editor-heading">
                <div>
                  <p className="eyebrow">Candidature</p>
                  <h3>{selected.label}</h3>
                </div>
                <button
                  type="button"
                  className="compact-secondary"
                  onClick={() => void setArchived(!selected.archived)}
                >
                  {selected.archived ? "Restore from archive" : "Archive candidature"}
                </button>
              </div>

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

              <div className="candidature-section-panel" role="tabpanel">
                {section === "focus" ? (
                  <CandidatureFocusPanel
                    record={selected}
                    fields={fields}
                    concepts={concepts}
                    documents={documents}
                    selectedConceptId={selectedConceptId}
                    onSelectConcept={setSelectedConceptId}
                    onNavigate={focusNavigate}
                  />
                ) : null}

                {section === "information" ? (
                  <section className="section-surface" aria-label="Candidature information">
                    <div>
                      <p className="eyebrow">Retained information</p>
                      <h3>Information</h3>
                      <p>Missing fields stay absent. Add only information that is useful to retain.</p>
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
                                onDiscover={() => discoverValue(field.definition.id)}
                              />
                            </article>
                          );
                        })}
                      </div>
                    )}

                    <details className="add-information-panel">
                      <summary>+ Add information</summary>
                      {enabledMissingFields.length > 0 ? (
                        <label>
                          Existing field
                          <select value={addFieldId} onChange={(event) => setAddFieldId(event.target.value)}>
                            <option value="">Choose information…</option>
                            {enabledMissingFields.map((field) => (
                              <option key={field.definition.id} value={field.definition.id}>
                                {field.definition.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p>All enabled fields already have retained values.</p>
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
                          onDiscover={() => discoverValue(addField.definition.id)}
                        />
                      ) : null}

                      <details>
                        <summary>+ New field</summary>
                        <label>
                          Name
                          <input
                            value={newFieldLabel}
                            onChange={(event) => setNewFieldLabel(event.target.value)}
                            placeholder="Minimum flight hours"
                          />
                        </label>
                        <details>
                          <summary>Advanced field options</summary>
                          <label>
                            Description
                            <textarea
                              rows={3}
                              value={newFieldDescription}
                              onChange={(event) => setNewFieldDescription(event.target.value)}
                            />
                          </label>
                          <label>
                            Type
                            <select value={newFieldType} onChange={(event) => setNewFieldType(event.target.value as CandidatureFieldUpdate["valueType"])}>
                              <option value="text">Text</option>
                              <option value="long_text">Long text</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                              <option value="date">Date</option>
                              <option value="url">URL</option>
                              <option value="choice">Choice</option>
                            </select>
                          </label>
                          <label>
                            Cardinality
                            <select value={newFieldCardinality} onChange={(event) => setNewFieldCardinality(event.target.value as CandidatureFieldUpdate["cardinality"])}>
                              <option value="one">One value</option>
                              <option value="many">Many values</option>
                            </select>
                          </label>
                          {newFieldType === "choice" ? (
                            <label>
                              Choices — one per line
                              <textarea rows={4} value={newChoiceLabels} onChange={(event) => setNewChoiceLabels(event.target.value)} />
                            </label>
                          ) : null}
                        </details>
                        <button type="button" disabled={!newFieldLabel.trim()} onClick={() => void createField()}>
                          Create field
                        </button>
                      </details>
                    </details>

                    <details className="field-management">
                      <summary>Manage candidature fields</summary>
                      <label>
                        Field
                        <select value={fieldEditorId} onChange={(event) => chooseFieldEditor(event.target.value)}>
                          <option value="">Choose field…</option>
                          {fields.map((field) => (
                            <option key={field.definition.id} value={field.definition.id}>
                              {field.definition.label}{field.definition.enabled ? "" : " · retired"}
                            </option>
                          ))}
                        </select>
                      </label>

                      {editorField && fieldDraft && preferencesDraft ? (
                        <div className="field-editor">
                          <h4>Definition</h4>
                          <label>Label<input value={fieldDraft.label} onChange={(event) => setFieldDraft({ ...fieldDraft, label: event.target.value })} /></label>
                          <label>Description<textarea rows={3} value={fieldDraft.description} onChange={(event) => setFieldDraft({ ...fieldDraft, description: event.target.value })} /></label>
                          <label>
                            Type
                            <select value={fieldDraft.valueType} onChange={(event) => setFieldDraft({ ...fieldDraft, valueType: event.target.value as CandidatureFieldUpdate["valueType"], choices: event.target.value === "choice" ? fieldDraft.choices : [] })}>
                              <option value="text">Text</option><option value="long_text">Long text</option><option value="number">Number</option><option value="boolean">Boolean</option><option value="date">Date</option><option value="url">URL</option><option value="choice">Choice</option>
                            </select>
                          </label>
                          <label>
                            Cardinality
                            <select value={fieldDraft.cardinality} onChange={(event) => setFieldDraft({ ...fieldDraft, cardinality: event.target.value as CandidatureFieldUpdate["cardinality"] })}>
                              <option value="one">One</option><option value="many">Many</option>
                            </select>
                          </label>
                          {fieldDraft.valueType === "choice" ? (
                            <div className="choice-definition-list">
                              {fieldDraft.choices.map((choice, index) => (
                                <div key={choice.id} className="button-row">
                                  <input
                                    value={choice.label}
                                    onChange={(event) => setFieldDraft({
                                      ...fieldDraft,
                                      choices: fieldDraft.choices.map((candidate, choiceIndex) =>
                                        choiceIndex === index ? { ...candidate, label: event.target.value } : candidate,
                                      ),
                                    })}
                                  />
                                  <button type="button" className="compact-secondary" onClick={() => setFieldDraft({ ...fieldDraft, choices: fieldDraft.choices.filter((candidate) => candidate.id !== choice.id) })}>
                                    Remove
                                  </button>
                                </div>
                              ))}
                              <button type="button" className="compact-secondary" onClick={() => setFieldDraft({ ...fieldDraft, choices: [...fieldDraft.choices, { id: crypto.randomUUID(), label: "New choice" }] })}>
                                Add choice
                              </button>
                            </div>
                          ) : null}
                          <label><input type="checkbox" checked={fieldDraft.enabled} onChange={(event) => setFieldDraft({ ...fieldDraft, enabled: event.target.checked })} /> Enabled</label>
                          <button type="button" onClick={() => void saveFieldDefinition()}>Save definition</button>

                          <h4>Focus, identity and AI</h4>
                          <label><input type="checkbox" checked={preferencesDraft.focusVisible} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, focusVisible: event.target.checked })} /> Show in Focus when retained</label>
                          <label>Focus order<input type="number" min="0" value={preferencesDraft.focusOrder ?? ""} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, focusOrder: event.target.value ? Number(event.target.value) : null })} /></label>
                          <label>
                            Focus prominence
                            <select value={preferencesDraft.focusProminence} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, focusProminence: event.target.value as CandidatureFieldPreferencesUpdate["focusProminence"] })}>
                              <option value="compact">Compact</option><option value="normal">Normal</option><option value="wide">Wide</option>
                            </select>
                          </label>
                          <label>Identity order<input type="number" min="0" value={preferencesDraft.identityOrder ?? ""} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, identityOrder: event.target.value ? Number(event.target.value) : null })} /></label>
                          <label><input type="checkbox" checked={preferencesDraft.aiDiscovery} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, aiDiscovery: event.target.checked })} /> AI may discover this field from Sources</label>
                          <label>
                            AI context
                            <select value={preferencesDraft.aiContextMode} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, aiContextMode: event.target.value as CandidatureFieldPreferencesUpdate["aiContextMode"] })}>
                              <option value="omit">Omit</option><option value="expose">Expose</option><option value="token">Tokenize</option>
                            </select>
                          </label>
                          <button type="button" onClick={() => void saveFieldPreferences()}>Save behavior</button>
                          {editorField.definition.systemKey === null ? (
                            <button type="button" className="compact-secondary" onClick={() => void deleteField()}>
                              Delete unused field
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </details>
                  </section>
                ) : null}

                {section === "sources" ? (
                  <CandidatureSourcesPanel
                    candidatureId={selected.id}
                    onSourcesChanged={() => void handleSourcesChanged()}
                    onDirtyChange={setSourceDirty}
                  />
                ) : null}

                {section === "concepts" ? (
                  <section className="candidature-concepts section-surface" aria-label="Concepts">
                    <div className="candidature-editor-heading">
                      <div><p className="eyebrow">Reusable knowledge</p><h3>Concepts</h3></div>
                      <button type="button" className="compact-secondary" onClick={startNewConcept}>Add concept</button>
                    </div>
                    {concepts.length === 0 ? <p className="compact-empty">No shared concepts yet.</p> : (
                      <div className="concept-association-list">
                        {concepts.map((concept) => (
                          <article key={concept.id} className="concept-association-card">
                            <label>
                              <input type="checkbox" checked={selectedConceptIds.includes(concept.id)} onChange={(event) => setSelectedConceptIds((current) => event.target.checked ? [...current.filter((id) => id !== concept.id), concept.id] : current.filter((id) => id !== concept.id))} />
                              <span><strong>{concept.name}</strong>{concept.aliases.length > 0 ? <small>{concept.aliases.join(", ")}</small> : null}</span>
                            </label>
                            {concept.definition ? <p>{concept.definition}</p> : null}
                            <button type="button" className="compact-secondary" onClick={() => chooseConceptForEdit(concept.id)}>Edit concept</button>
                          </article>
                        ))}
                      </div>
                    )}
                    <button type="button" disabled={!conceptSelectionDirty} onClick={() => void saveConceptAssociations()}>Save concept associations</button>
                    {conceptEditorOpen ? (
                      <div className="concept-editor" aria-label="Concept editor">
                        <h3>{editingConceptId ? "Edit concept" : "New concept"}</h3>
                        <label>Name<input value={conceptDraft.name} onChange={(event) => setConceptDraft({ ...conceptDraft, name: event.target.value })} /></label>
                        <label>Aliases<input value={aliasesText} onChange={(event) => setAliasesText(event.target.value)} /></label>
                        <label>Definition<textarea rows={4} value={conceptDraft.definition} onChange={(event) => setConceptDraft({ ...conceptDraft, definition: event.target.value })} /></label>
                        <div className="button-row">
                          <button type="button" disabled={!conceptEditorDirty} onClick={() => void saveConcept()}>{editingConceptId ? "Save concept" : "Create concept"}</button>
                          <button type="button" className="compact-secondary" onClick={resetConceptEditor}>Cancel</button>
                        </div>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {section === "documents" ? (
                  <section className="candidature-documents section-surface" aria-label="Documents">
                    <div><p className="eyebrow">Application material</p><h3>Documents</h3></div>
                    {documents.length === 0 ? <p className="compact-empty">No documents are available yet.</p> : (
                      <div className="document-association-list">
                        {documents.map((document) => (
                          <label key={document.id}>
                            <input type="checkbox" checked={selectedDocumentIds.includes(document.id)} onChange={(event) => setSelectedDocumentIds((current) => event.target.checked ? [...current.filter((id) => id !== document.id), document.id] : current.filter((id) => id !== document.id))} />
                            {document.title} ({document.kind === "cv" ? "CV" : "cover letter"})
                          </label>
                        ))}
                      </div>
                    )}
                    <button type="button" disabled={!documentSelectionDirty} onClick={() => void saveDocuments()}>Save document associations</button>
                  </section>
                ) : null}
              </div>

              <details className="optional-ai-assistance">
                <summary>Optional AI assistance</summary>
                <div className="optional-ai-content">
                  <CandidatureFitPanel key={`fit-${selected.id}`} record={selected} />
                  <VariantRecommendationPanel key={`variant-${selected.id}`} record={selected} />
                </div>
              </details>
            </>
          ) : (
            <div className="candidature-empty-detail">
              <h3>Select or create a candidature.</h3>
              <p>A Source-only candidature and a completely sparse candidature are valid.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
