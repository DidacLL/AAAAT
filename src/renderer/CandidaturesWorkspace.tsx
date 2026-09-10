import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
import { OpportunityReviewPanel } from "./OpportunityReviewPanel";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";
import { CandidatureFocusPanel, type FocusDestination } from "./CandidatureFocusPanel";
import { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";
import { HistoricalFieldDiscoveryPanel } from "./HistoricalFieldDiscoveryPanel";
import { useContextualHandoffs } from "./contextual-handoffs";
import { VariantRecommendationPanel } from "./VariantRecommendationPanel";
import {
  candidatureRecognitionCues,
  filterCandidatures,
  type ArchiveFilter,
} from "./candidature-projections";

type CandidatureSection = "focus" | "information" | "sources" | "documents";

const sectionLabels: readonly { key: CandidatureSection; label: string }[] = [
  { key: "focus", label: "Focus" },
  { key: "information", label: "Information" },
  { key: "sources", label: "Sources" },
  { key: "documents", label: "Application material" },
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
  const [concepts, setConcepts] = useState<ConceptRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [section, setSection] = useState<CandidatureSection>("focus");
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [selectedConceptIds, setSelectedConceptIds] = useState<string[]>([]);
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{
    readonly query: string;
    readonly ids: ReadonlySet<string>;
  } | null>(null);
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
  const [valueEditorDirty, setValueEditorDirty] = useState<ReadonlySet<string>>(new Set());
  const [discoveryFieldId, setDiscoveryFieldId] = useState<string | null>(null);
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
  const newFieldDirty =
    newFieldLabel.length > 0 ||
    newFieldDescription.length > 0 ||
    newFieldType !== "text" ||
    newFieldCardinality !== "one" ||
    newChoiceLabels.length > 0;
  const editedField = fields.find((field) => field.definition.id === fieldEditorId);
  const fieldDefinitionDirty =
    editedField !== undefined &&
    fieldDraft !== null &&
    JSON.stringify(fieldDraft) !== JSON.stringify(fieldUpdate(editedField));
  const fieldPreferencesDirty =
    editedField !== undefined &&
    preferencesDraft !== null &&
    JSON.stringify(preferencesDraft) !== JSON.stringify(preferenceUpdate(editedField));
  const hasUnsavedChanges =
    sourceDirty ||
    conceptSelectionDirty ||
    conceptEditorDirty ||
    documentSelectionDirty ||
    newFieldDirty ||
    fieldDefinitionDirty ||
    fieldPreferencesDirty ||
    valueEditorDirty.size > 0;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
    return () => onDirtyChange?.(false);
  }, [hasUnsavedChanges, onDirtyChange]);

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
    setDiscoveryFieldId(null);
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

  useEffect(() => {
    const previous = previousDocumentHandoff.current;
    previousDocumentHandoff.current = documentHandoff;
    if (!previous?.candidatureId || documentHandoff !== null) return;

    const baseline = records.find((record) => record.id === previous.candidatureId) ?? null;
    let active = true;
    void Promise.all([window.aaaat.candidatures.list(), window.aaaat.documents.list()])
      .then(([nextRecords, nextDocuments]) => {
        if (!active) return;
        const refreshed = nextRecords.find((record) => record.id === previous.candidatureId);
        setRecords(nextRecords);
        setDocuments(nextDocuments);
        if (!refreshed) return;
        if (!hasUnsavedChanges) {
          hydrate(refreshed);
          return;
        }
        const baselineIds = new Set(baseline?.documentIds ?? []);
        const newlyAuthoritativeIds = refreshed.documentIds.filter((id) => !baselineIds.has(id));
        if (newlyAuthoritativeIds.length > 0) {
          setSelectedDocumentIds((current) => [
            ...current,
            ...newlyAuthoritativeIds.filter((id) => !current.includes(id)),
          ]);
        }
      })
      .catch(() => {
        if (active) setError("AAAAT could not refresh application material after returning.");
      });
    return () => {
      active = false;
    };
  }, [documentHandoff, hasUnsavedChanges, hydrate, records]);

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
  }, [normalizedQuery, records, fields, concepts]);

  const currentFilterField = fields.find((field) => field.definition.id === filterFieldId);
  const availableOperators = operatorsFor(currentFilterField);
  const textMatches = useMemo<ReadonlySet<string> | null>(() => {
    if (!normalizedQuery) return null;
    return searchResult?.query === normalizedQuery ? searchResult.ids : new Set();
  }, [normalizedQuery, searchResult]);
  const visibleRecords = useMemo(
    () => filterCandidatures(records, archiveFilter, fieldMatches, textMatches),
    [records, archiveFilter, fieldMatches, textMatches],
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
    !hasUnsavedChanges || window.confirm("Discard unsaved candidature edits?");
  const confirmSectionDiscard = () => {
    if (section === "sources" && sourceDirty) {
      return window.confirm("Discard unsaved Source edits?");
    }
    if (section === "documents" && documentSelectionDirty) {
      return window.confirm("Discard unsaved application material associations?");
    }
    return true;
  };
  const confirmConceptEditorDiscard = () =>
    !conceptEditorDirty || window.confirm("Discard unsaved concept edits?");
  const confirmFieldEditorDiscard = () =>
    (!fieldDefinitionDirty && !fieldPreferencesDirty) ||
    window.confirm("Discard unsaved information settings?");
  const confirmAddValueDiscard = () =>
    !addFieldId ||
    !valueEditorDirty.has(addFieldId) ||
    window.confirm("Discard unsaved information value edits?");

  const setEditorDirty = (fieldId: string, dirty: boolean) => {
    setValueEditorDirty((current) => {
      if (current.has(fieldId) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  };

  const selectAddField = (fieldId: string) => {
    if (fieldId === addFieldId) return;
    if (!confirmAddValueDiscard()) return;
    setAddFieldId(fieldId);
  };

  const switchSection = (next: CandidatureSection) => {
    if (next === section) return;
    if (!confirmSectionDiscard()) return;
    if (section === "documents" && selected) setSelectedDocumentIds(selected.documentIds);
    if (section === "sources") setSourceDirty(false);
    if (section === "information") setDiscoveryFieldId(null);
    setSection(next);
  };

  const focusNavigate = (destination: FocusDestination) => switchSection(destination);

  const setArchived = async (archived: boolean) => {
    if (!selected) return;
    if (!confirmDiscard()) return;
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
    setDiscoveryFieldId(fieldId);
  };

  const createField = async () => {
    if (!newFieldLabel.trim()) return;
    if (!confirmAddValueDiscard() || !confirmFieldEditorDiscard()) return;
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
      setError(reason instanceof Error ? reason.message : "AAAAT could not create this information.");
    }
  };

  const chooseFieldEditor = (fieldId: string) => {
    if (fieldId === fieldEditorId) return;
    if (!confirmFieldEditorDiscard()) return;
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
      setError(reason instanceof Error ? reason.message : "AAAAT could not update this information.");
    }
  };

  const saveFieldPreferences = async () => {
    if (!preferencesDraft) return;
    setError(null);
    try {
      replaceField(await window.aaaat.candidatures.updateFieldPreferences(preferencesDraft));
      await loadRecords();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not update information settings.");
    }
  };

  const deleteField = async () => {
    if (!fieldDraft || !window.confirm(`Delete unused information “${fieldDraft.label}”?`)) return;
    setError(null);
    try {
      const nextFields = await window.aaaat.candidatures.deleteField(fieldDraft.id);
      setFields(nextFields);
      setFieldEditorId("");
      setFieldDraft(null);
      setPreferencesDraft(null);
      setAddFieldId("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not delete this information.");
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
    if (!confirmConceptEditorDiscard()) return;
    setConceptEditorOpen(true);
    setEditingConceptId(null);
    setConceptDraft(emptyConcept);
    setAliasesText("");
  };

  const chooseConceptForEdit = (conceptId: string) => {
    if (conceptId === editingConceptId) return;
    if (!confirmConceptEditorDiscard()) return;
    const concept = concepts.find((candidate) => candidate.id === conceptId);
    if (!concept) return;
    setConceptEditorOpen(true);
    setEditingConceptId(concept.id);
    setConceptDraft(conceptInput(concept));
    setAliasesText(concept.aliases.join(", "));
  };

  const cancelConceptEditor = () => {
    if (!confirmConceptEditorDiscard()) return;
    resetConceptEditor();
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
  const discoveryField = fields.find((field) => field.definition.id === discoveryFieldId);

  return (
    <section className="candidatures-workspace" aria-label="Candidatures">
      <div className="candidature-toolbar">
        <div>
          <p className="eyebrow">Sparse opportunity information</p>
          <h2>Candidatures</h2>
        </div>
      </div>

      <div className="candidature-filters" aria-label="Candidature filters">
        <label>
          Search retained information
          <input
            type="search"
            value={query}
            maxLength={200}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Organisation, role, kind of information, concept…"
          />
        </label>
        <label>
          Information kind
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
            <option value="">No information filter</option>
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
          <button type="button" onClick={() => void applyFieldFilter()}>Apply information filter</button>
          {fieldMatches ? (
            <button type="button" className="compact-secondary" onClick={clearFieldFilter}>
              Clear information filter
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
            visibleRecords.map((record) => {
              const recognitionCues = candidatureRecognitionCues(record, fields);
              return (
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
                  {recognitionCues.length > 0 ? (
                    <span className="candidature-recognition-cues">
                      {recognitionCues.map((cue, index) => (
                        <span className="candidature-recognition-cue" key={`${cue.label}-${index}`}>
                          <span>{cue.label}</span>
                          <span>{cue.value}</span>
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <small>
                    {record.values.length} retained {record.values.length === 1 ? "item of information" : "items of information"}
                    {record.archived ? " · archived" : ""}
                  </small>
                </button>
              );
            })
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
                      <p>Missing information stays absent. Add only information that is useful to retain.</p>
                    </div>

                    {selected.values.length === 0 ? (
                      <p className="compact-empty">No additional information is retained yet.</p>
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
                          Choose information to add
                          <select value={addFieldId} onChange={(event) => selectAddField(event.target.value)}>
                            <option value="">Choose information…</option>
                            {enabledMissingFields.map((field) => (
                              <option key={field.definition.id} value={field.definition.id}>
                                {field.definition.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : (
                        <p>All available information already has a retained value.</p>
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
                          onDirtyChange={(dirty) => setEditorDirty(addField.definition.id, dirty)}
                        />
                      ) : null}

                      <details>
                        <summary>+ Add something not listed</summary>
                        <label>
                          What is it?
                          <input
                            value={newFieldLabel}
                            onChange={(event) => setNewFieldLabel(event.target.value)}
                            placeholder="Minimum flight hours"
                          />
                        </label>
                        <p className="compact-help">AAAAT will start this as simple text. Other formats and behavior remain available under Advanced information settings.</p>
                        <button type="button" disabled={!newFieldLabel.trim()} onClick={() => void createField()}>
                          Continue
                        </button>
                      </details>
                    </details>

                    <details className="field-management">
                      <summary>Advanced information settings</summary>
                      <label>
                        Kind of information
                        <select value={fieldEditorId} onChange={(event) => chooseFieldEditor(event.target.value)}>
                          <option value="">Choose information…</option>
                          {fields.map((field) => (
                            <option key={field.definition.id} value={field.definition.id}>
                              {field.definition.label}{field.definition.enabled ? "" : " · unavailable"}
                            </option>
                          ))}
                        </select>
                      </label>

                      {editorField && fieldDraft && preferencesDraft ? (
                        <div className="field-editor">
                          <h4>Display and format</h4>
                          <label>Name<input value={fieldDraft.label} onChange={(event) => setFieldDraft({ ...fieldDraft, label: event.target.value })} /></label>
                          <label>Description<textarea rows={3} value={fieldDraft.description} onChange={(event) => setFieldDraft({ ...fieldDraft, description: event.target.value })} /></label>
                          <label>
                            Format
                            <select value={fieldDraft.valueType} onChange={(event) => setFieldDraft({ ...fieldDraft, valueType: event.target.value as CandidatureFieldUpdate["valueType"], choices: event.target.value === "choice" ? fieldDraft.choices : [] })}>
                              <option value="text">Text</option><option value="long_text">Long text</option><option value="number">Number</option><option value="boolean">Yes / no</option><option value="date">Date</option><option value="url">URL</option><option value="choice">Choice</option>
                            </select>
                          </label>
                          <label>
                            Values
                            <select value={fieldDraft.cardinality} onChange={(event) => setFieldDraft({ ...fieldDraft, cardinality: event.target.value as CandidatureFieldUpdate["cardinality"] })}>
                              <option value="one">Single value</option><option value="many">Multiple values</option>
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
                          <label><input type="checkbox" checked={fieldDraft.enabled} onChange={(event) => setFieldDraft({ ...fieldDraft, enabled: event.target.checked })} /> Available for adding</label>
                          <button type="button" onClick={() => void saveFieldDefinition()}>Save display and format</button>

                          <h4>Focus, recognition and AI</h4>
                          <label><input type="checkbox" checked={preferencesDraft.focusVisible} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, focusVisible: event.target.checked })} /> Show in Focus when retained</label>
                          <label>Focus order<input type="number" min="0" value={preferencesDraft.focusOrder ?? ""} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, focusOrder: event.target.value ? Number(event.target.value) : null })} /></label>
                          <label>
                            Focus prominence
                            <select value={preferencesDraft.focusProminence} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, focusProminence: event.target.value as CandidatureFieldPreferencesUpdate["focusProminence"] })}>
                              <option value="compact">Compact</option><option value="normal">Normal</option><option value="wide">Wide</option>
                            </select>
                          </label>
                          <label>Recognition priority<input type="number" min="0" value={preferencesDraft.identityOrder ?? ""} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, identityOrder: event.target.value ? Number(event.target.value) : null })} /></label>
                          <label><input type="checkbox" checked={preferencesDraft.aiDiscovery} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, aiDiscovery: event.target.checked })} /> AI may suggest this information from Sources</label>
                          <label>
                            When AI uses candidature context
                            <select value={preferencesDraft.aiContextMode} onChange={(event) => setPreferencesDraft({ ...preferencesDraft, aiContextMode: event.target.value as CandidatureFieldPreferencesUpdate["aiContextMode"] })}>
                              <option value="omit">Do not share</option><option value="expose">Share value</option><option value="token">Use local placeholder</option>
                            </select>
                          </label>
                          <button type="button" onClick={() => void saveFieldPreferences()}>Save information settings</button>
                          {editorField.definition.systemKey === null ? (
                            <button type="button" className="compact-secondary" onClick={() => void deleteField()}>
                              Delete unused information kind
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

                {section === "documents" ? (
                  <section className="candidature-documents section-surface" aria-label="Application material">
                    <div className="candidature-editor-heading">
                      <div><p className="eyebrow">Application material</p><h3>Application material</h3></div>
                      <button
                        type="button"
                        className="compact-secondary"
                        onClick={() => openDocumentFromCandidature(selected.id)}
                      >
                        Create CV or letter for this candidature
                      </button>
                    </div>
                    {documents.length === 0 ? <p className="compact-empty">No documents are available yet.</p> : (
                      <div className="document-association-list">
                        {documents.map((document) => (
                          <div className="button-row" key={document.id}>
                            <label>
                              <input type="checkbox" checked={selectedDocumentIds.includes(document.id)} onChange={(event) => setSelectedDocumentIds((current) => event.target.checked ? [...current.filter((id) => id !== document.id), document.id] : current.filter((id) => id !== document.id))} />
                              {document.title} ({document.kind === "cv" ? "CV" : "cover letter"})
                            </label>
                            {selected.documentIds.includes(document.id) ? (
                              <button
                                type="button"
                                className="compact-secondary"
                                onClick={() => openDocumentFromCandidature(selected.id, document.id)}
                              >
                                Open in CVs &amp; letters
                              </button>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                    <button type="button" disabled={!documentSelectionDirty} onClick={() => void saveDocuments()}>Save document associations</button>
                  </section>
                ) : null}
              </div>

              <details className="candidature-concepts-support">
                <summary>Concepts</summary>
                <section className="candidature-concepts section-surface" aria-label="Concepts">
                  <div className="candidature-editor-heading">
                    <div><p className="eyebrow">Contextual knowledge</p><h3>Concepts</h3></div>
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
                        <button type="button" className="compact-secondary" onClick={cancelConceptEditor}>Cancel</button>
                      </div>
                    </div>
                  ) : null}
                </section>
              </details>

              <details className="optional-ai-assistance">
                <summary>Optional AI assistance</summary>
                <div className="optional-ai-content">
                  <OpportunityReviewPanel key={`review-${selected.id}`} record={selected} />
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
