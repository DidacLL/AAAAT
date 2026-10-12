import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureFieldUpdate,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
  TagInput,
  TagRecord,
} from "../shared/contracts";
import type { BlueprintSummary, DocumentCollections } from "../shared/document-domain-contracts";
import { CandidatureActivityPanel } from "./CandidatureActivityPanel";
import { CandidatureBulkAiReview } from "./CandidatureBulkAiReview";
import { CandidatureFieldAiState } from "./CandidatureFieldAiState";
import { CandidatureFieldDefinitionsPanel } from "./CandidatureFieldDefinitionsPanel";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";
import { CandidatureInferencePanel } from "./CandidatureInferencePanel";
import { CandidatureOfferPanel } from "./CandidatureOfferPanel";
import { CandidatureOpportunityResearchAccessPanel } from "./CandidatureOpportunityResearchAccessPanel";
import { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";
import { useContextualHandoffs } from "./contextual-handoffs";
import {
  candidatureCardRecognitionProjection,
  candidatureRecognitionProjection,
  candidatureSearchMatchCue,
  filterCandidatures,
  type ArchiveFilter,
  type CandidatureRecognitionCue,
  type RecencyFilter,
} from "./candidature-projections";
import { cancelAiTask, clearAiTask, getAiTask, markAiTaskFieldHandled, useAiTask } from "./ai-task-store";
import { useShellActions } from "./shell-actions";
import { rememberDocumentDraft, unsavedDocumentDrafts } from "./document-drafts";
import { candidatureInferenceContext } from "./candidature-inference-context";
import type { ApplicationTagContext } from "./TagVisor";
import "./candidatures.css";
import "./candidature-recovery.css";
import "./owner-feedback-recovery.css";
import "./tag-glossary.css";

type CandidatureMode = "corpus" | "selected";
type InitialCandidatureTask = "tags";
interface InitialCandidatureSelection {
  readonly candidatureId: string;
  readonly task?: InitialCandidatureTask;
}
interface SharedFieldDefinitionDraft {
  readonly fieldId: string;
  readonly label: string;
  readonly description: string;
}
type AiRequestFeedback = "unconfigured" | "missing-context" | "context-unavailable" | "active";
interface FieldAiRequestFeedback {
  readonly fieldId: string;
  readonly kind: AiRequestFeedback;
}
const emptyTag: TagInput = { name: "", definition: "", notes: "", aliases: [] };
const emptyCollections: DocumentCollections = {
  templates: [], workingCvs: [], renderedCvs: [], letters: [], renderedLetters: [], applicationPackets: [],
};

function readableDocumentError(reason: unknown, fallback: string): string {
  if (!(reason instanceof Error) || !reason.message.trim()) return fallback;
  return reason.message
    .replace(/^Error invoking remote method '[^']+':\s*/u, "")
    .replace(/^Error:\s*/u, "")
    .trim() || fallback;
}

function aliasesFromText(value: string): string[] {
  return value.split(",").map((alias) => alias.trim()).filter(Boolean);
}
function tagDraft(tag: TagRecord): TagInput {
  return { name: tag.name, definition: tag.definition, notes: tag.notes ?? "", aliases: tag.aliases };
}
function normalizedTagText(value: string): string { return value.trim().toLocaleLowerCase(); }
function hasJobExtractionRoute(connections: Awaited<ReturnType<typeof window.aaaat.aiConnections.list>>): boolean {
  return connections.some((connection) => connection.defaultForOperations.includes("job_extraction") || connection.isDefault);
}
function aiRequestFeedbackMessage(kind: AiRequestFeedback): string {
  if (kind === "unconfigured") return "AI isn't configured for this action";
  if (kind === "missing-context") {
    return "AI needs retained Source or AI-allowed application information for this request.";
  }
  if (kind === "context-unavailable") return "AAAAT couldn't read retained information for this AI request.";
  return "AI is already working on this request.";
}
function corpusActionIdentity(
  cues: readonly CandidatureRecognitionCue[],
  retainedSourceCue: CandidatureRecognitionCue | null,
): string {
  const visible = cues.length > 0 ? cues : retainedSourceCue ? [retainedSourceCue] : [];
  const identity = visible
    .map((cue) => cue.value.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" · ");
  if (!identity) return "Saved application";
  return identity.length > 180 ? `${identity.slice(0, 179).trimEnd()}…` : identity;
}

function cueLengthClass(value: string): "short" | "medium" | "long" {
  if (value.length <= 28) return "short";
  if (value.length <= 96) return "medium";
  return "long";
}

function CorpusRecognitionCue({ cue, sourceLabel = false }: { readonly cue: CandidatureRecognitionCue; readonly sourceLabel?: boolean }) {
  return <span className={`candidature-recognition-cue candidature-cue-size-${cue.presentationSize} candidature-cue-length-${cueLengthClass(cue.value)}`}>
    <span className="candidature-cue-label">{sourceLabel ? "Offer or notes" : cue.label}</span>
    <span className="candidature-cue-value">{cue.value}</span>
  </span>;
}

export function CandidaturesWorkspace({
  initialSelection,
  onInitialSelectionCleared,
  onDirtyChange,
  onTagGlossaryChange,
  onTagContextChange,
  onNewApplication,
}: {
  readonly initialSelection?: InitialCandidatureSelection;
  readonly onInitialSelectionCleared?: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onTagGlossaryChange?: () => void;
  readonly onTagContextChange?: (context: ApplicationTagContext | null) => void;
  readonly onNewApplication?: () => void;
}) {
  const { documentHandoff, openDocumentFromCandidature, openSettingsFor } = useContextualHandoffs();
  const [records, setRecords] = useState<CandidatureRecord[]>([]);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [collections, setCollections] = useState<DocumentCollections>(emptyCollections);
  const [documentCreationBusy, setDocumentCreationBusy] = useState<"cv" | "cover_letter" | null>(null);
  const [documentExternalAccessAllowed, setDocumentExternalAccessAllowed] = useState(false);
  const [documentExternalAccessBusy, setDocumentExternalAccessBusy] = useState(false);
  const [applicationCvSource, setApplicationCvSource] = useState("profile");
  const [packetWorkingCvId, setPacketWorkingCvId] = useState("");
  const [packetLetterId, setPacketLetterId] = useState("");
  const [packetBlueprints, setPacketBlueprints] = useState<BlueprintSummary[]>([]);
  const [packetBlueprintId, setPacketBlueprintId] = useState("");
  const [packetBusy, setPacketBusy] = useState(false);
  const [tags, setTags] = useState<TagRecord[]>([]);
  const [mode, setMode] = useState<CandidatureMode>("corpus");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<{ readonly query: string; readonly ids: ReadonlySet<string> } | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [recencyFilter, setRecencyFilter] = useState<RecencyFilter>("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [tagQuery, setTagQuery] = useState("");
  const [sourceDirty, setSourceDirty] = useState(false);
  const [valueEditorDirty, setValueEditorDirty] = useState<ReadonlySet<string>>(new Set());
  const [activeFieldEditorId, setActiveFieldEditorId] = useState<string | null>(null);
  const [fieldDefinitionsDirty, setFieldDefinitionsDirty] = useState(false);
  const [fieldDefinitionDraft, setFieldDefinitionDraft] = useState<SharedFieldDefinitionDraft | null>(null);
  const [discoveryFieldId, setDiscoveryFieldId] = useState<string | null>(null);
  const [fieldRequestAttempt, setFieldRequestAttempt] = useState(0);
  const [bulkRequestAttempt, setBulkRequestAttempt] = useState(0);
  const [tagRequestAttempt, setTagRequestAttempt] = useState(0);
  const [fieldAiFeedback, setFieldAiFeedback] = useState<FieldAiRequestFeedback | null>(null);
  const [openFieldOptionsId, setOpenFieldOptionsId] = useState<string | null>(null);
  const [bulkInferenceOpen, setBulkInferenceOpen] = useState(false);
  const [tagInferenceOpen, setTagInferenceOpen] = useState(false);
  const [externalAiOpen, setExternalAiOpen] = useState(false);
  const externalDialog = useRef<HTMLDialogElement>(null);
  const closeExternalTask = useRef<(() => Promise<void>) | null>(null);
  const registerExternalClose = useCallback((close: (() => Promise<void>) | null) => { closeExternalTask.current = close; }, []);
  const protectedTaskFields = useRef(new Map<string, Set<string>>());
  const tagMutationTail = useRef<Promise<void>>(Promise.resolve());
  const alive = useRef(true);
  const currentSelection = useRef(selectedId);
  useEffect(() => { currentSelection.current = selectedId; }, [selectedId]);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (externalAiOpen) externalDialog.current?.showModal(); }, [externalAiOpen]);
  const [bulkAiFeedback, setBulkAiFeedback] = useState<AiRequestFeedback | null>(null);
  const [tagEditorOpen, setTagEditorOpen] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tagEditorDraft, setTagEditorDraft] = useState<TagInput>(emptyTag);
  const [tagAliasesText, setTagAliasesText] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialSelectionId = initialSelection?.candidatureId;
  const initialTask = initialSelection?.task;
  const selected = records.find((record) => record.id === selectedId) ?? null;
  const persistedTag = editingTagId ? tags.find((tag) => tag.id === editingTagId) ?? null : null;
  const tagEditorDirty = tagEditorOpen
    ? JSON.stringify({ ...tagEditorDraft, aliases: aliasesFromText(tagAliasesText) }) !== JSON.stringify(persistedTag ? tagDraft(persistedTag) : emptyTag)
    : false;
  const persistedFieldDefinition = fieldDefinitionDraft
    ? fields.find((field) => field.definition.id === fieldDefinitionDraft.fieldId)?.definition ?? null
    : null;
  const fieldDefinitionDraftDirty = fieldDefinitionDraft !== null && (
    persistedFieldDefinition === null
    || fieldDefinitionDraft.label !== persistedFieldDefinition.label
    || fieldDefinitionDraft.description !== persistedFieldDefinition.description
  );
  const taskContextDirty = fieldDefinitionsDirty || fieldDefinitionDraftDirty || valueEditorDirty.size > 0;
  const hasUnsavedChanges = sourceDirty || tagEditorDirty || taskContextDirty;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
    return () => onDirtyChange?.(false);
  }, [hasUnsavedChanges, onDirtyChange]);

  const resetEditorDrafts = useCallback((record?: CandidatureRecord) => {
    setSelectedTagIds(record?.tagIds ?? []);
    setSelectedTagId(record?.tagIds[0] ?? null);
    setTagQuery(""); setSourceDirty(false); setValueEditorDirty(new Set());
    setActiveFieldEditorId(null);
    setFieldDefinitionsDirty(false); setFieldDefinitionDraft(null); setDiscoveryFieldId(null); setFieldAiFeedback(null);
    setOpenFieldOptionsId(null); setBulkInferenceOpen(false); setTagInferenceOpen(false); setExternalAiOpen(false); setBulkAiFeedback(null);
    setTagEditorOpen(false); setEditingTagId(null); setTagEditorDraft(emptyTag);
    setTagAliasesText(""); setActivityOpen(false);
    setApplicationCvSource("profile"); setPacketWorkingCvId(""); setPacketLetterId("");
    setDocumentExternalAccessAllowed(false); setDocumentExternalAccessBusy(false);
  }, [setSelectedTagIds, setSelectedTagId, setTagQuery, setSourceDirty, setValueEditorDirty, setActiveFieldEditorId, setFieldDefinitionsDirty, setFieldDefinitionDraft, setDiscoveryFieldId, setFieldAiFeedback, setOpenFieldOptionsId, setBulkInferenceOpen, setTagInferenceOpen, setExternalAiOpen, setBulkAiFeedback, setTagEditorOpen, setEditingTagId, setTagEditorDraft, setTagAliasesText, setActivityOpen, setApplicationCvSource, setPacketWorkingCvId, setPacketLetterId, setDocumentExternalAccessAllowed, setDocumentExternalAccessBusy]);

  const hydrate = useCallback((record: CandidatureRecord) => {
    setSelectedId(record.id); resetEditorDrafts(record); setError(null);
  }, [resetEditorDrafts, setSelectedId, setError]);

  const refreshCollections = useCallback(async () => {
    try { setCollections(await window.aaaat.documentDomain.collections()); }
    catch { setError("AAAAT could not refresh application documents."); }
  }, [setCollections, setError]);

  useEffect(() => {
    let active = true;
    void window.aaaat.documentDomain.blueprints()
      .then((available) => {
        if (!active) return;
        setPacketBlueprints(available);
        setPacketBlueprintId((current) =>
          available.some((blueprint) => blueprint.id === current)
            ? current
            : available[0]?.id ?? "",
        );
      })
      .catch(() => {
        if (active) setError("AAAAT could not load document formatting.");
      });
    return () => { active = false; };
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
      const requested = initialSelectionId
        ? nextRecords.find((record) => record.id === initialSelectionId)
        : undefined;
      if (requested) {
        hydrate(requested);
        setTagInferenceOpen(initialTask === "tags");
        setMode("selected");
      }
    }).catch(() => { if (active) setError("AAAAT could not load applications."); });
    return () => { active = false; };
  }, [hydrate, initialSelectionId, initialTask]);

  useEffect(() => {
    if (documentHandoff !== null) return;
    // The refresh is asynchronous; state changes occur only after the IPC response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshCollections();
  }, [documentHandoff, refreshCollections]);

  useEffect(() => {
    if (!selectedId) return;
    const readAccess = window.aaaat.documentDomain.externalApplicationAccess;
    if (typeof readAccess !== "function") return;
    let active = true;
    void readAccess(selectedId)
      .then((access) => {
        if (active) setDocumentExternalAccessAllowed(access.allowed);
      })
      .catch(() => {
        if (active) setError("AAAAT could not read document access for your external AI.");
      });
    return () => { active = false; };
  }, [selectedId]);

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
  const visibleRecords = useMemo(
    () => filterCandidatures(records, archiveFilter, null, textMatches, recencyFilter),
    [records, archiveFilter, textMatches, recencyFilter],
  );
  const contextualRecord = mode === "selected"
    ? selected
    : null;
  const tagContext = useMemo<ApplicationTagContext | null>(
    () => contextualRecord
      ? {
          candidatureId: contextualRecord.id,
          tags: tags.filter((tag) => contextualRecord.tagIds.includes(tag.id)),
        }
      : null,
    [contextualRecord, tags],
  );
  useEffect(() => {
    onTagContextChange?.(tagContext);
  }, [onTagContextChange, tagContext]);
  useEffect(() => () => onTagContextChange?.(null), [onTagContextChange]);

  const confirmDiscard = () => !hasUnsavedChanges || window.confirm("Discard unsaved application edits?");
  const storeRecord = (record: CandidatureRecord) => setRecords((current) => current.map((candidate) => candidate.id === record.id ? record : candidate));
  const openRecord = (record: CandidatureRecord) => {
    if (!confirmDiscard()) return;
    hydrate(record);
    setMode("selected");
  };
  const returnToCorpus = () => {
    if (!confirmDiscard()) return;
    setMode("corpus"); setSelectedId(null); resetEditorDrafts();
    onInitialSelectionCleared?.();
  };

  const protectManualEdit = (fieldId: string) => {
    if (!selected) return;
    for (const key of [`candidature-inference:${selected.id}:${fieldId}`, `candidature-inference:${selected.id}:missing`]) {
      if (!getAiTask(key)) continue;
      markAiTaskFieldHandled(key, fieldId);
      const protectedFields = protectedTaskFields.current.get(key) ?? new Set<string>();
      protectedFields.add(fieldId);
      protectedTaskFields.current.set(key, protectedFields);
    }
  };
  const setEditorDirty = (fieldId: string, dirty: boolean) => {
    if (dirty) protectManualEdit(fieldId);
    setValueEditorDirty((current) => {
      const next = new Set(current); if (dirty) next.add(fieldId); else next.delete(fieldId); return next;
    });
  };
  const requestFieldEditor = (fieldId: string) => {
    if (activeFieldEditorId === fieldId) {
      if (valueEditorDirty.has(fieldId) && !window.confirm("Discard this field edit?")) return;
      setActiveFieldEditorId(null); return;
    }
    if (activeFieldEditorId && valueEditorDirty.has(activeFieldEditorId)) {
      const activeField = fields.find((field) => field.definition.id === activeFieldEditorId);
      if (!window.confirm(`Discard unsaved changes to ${activeField?.definition.label ?? "this information"}?`)) return;
    }
    setActiveFieldEditorId(fieldId);
  };
  const closeFieldEditor = (fieldId: string) => {
    if (activeFieldEditorId === fieldId) setActiveFieldEditorId(null);
  };
  const setValue = async (fieldId: string, value: CandidatureRuntimeValue) => {
    if (!selected) return;
    protectManualEdit(fieldId);
    const updated = await window.aaaat.candidatures.setFieldValue({ candidatureId: selected.id, fieldId, value });
    storeRecord(updated); setEditorDirty(fieldId, false);
  };
  const fillEmptyValue = async (fieldId: string, value: CandidatureRuntimeValue, taskKey: string): Promise<boolean> => {
    if (!selected || sourceDirty || activeFieldEditorId === fieldId || protectedTaskFields.current.get(taskKey)?.has(fieldId)) return false;
    const updated = await window.aaaat.candidatures.setFieldValue({
      candidatureId: selected.id, fieldId, value, onlyIfEmpty: true,
    });
    storeRecord(updated);
    return JSON.stringify(updated.values.find((item) => item.fieldId === fieldId)?.value) === JSON.stringify(value);
  };
  const clearValue = async (fieldId: string) => {
    if (!selected) return;
    protectManualEdit(fieldId);
    const updated = await window.aaaat.candidatures.clearFieldValue({ candidatureId: selected.id, fieldId });
    storeRecord(updated); setEditorDirty(fieldId, false);
  };
  const setArchived = async (archived: boolean) => {
    if (!selected || !confirmDiscard()) return;
    try { const updated = await window.aaaat.candidatures.update({ id: selected.id, archived }); storeRecord(updated); resetEditorDrafts(updated); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not change archive state."); }
  };
  const replaceField = (updated: CandidatureFieldConfiguration) => setFields((current) => current.map((field) => field.definition.id === updated.definition.id ? updated : field));
  const updateFieldPreference = async (field: CandidatureFieldConfiguration, patch: Partial<CandidatureFieldConfiguration["preferences"]>) => {
    const optimistic = { ...field, preferences: { ...field.preferences, ...patch } };
    replaceField(optimistic);
    try { replaceField(await window.aaaat.candidatures.updateFieldPreferences({ ...optimistic.preferences, fieldId: field.definition.id })); }
    catch (reason) { replaceField(field); setError(reason instanceof Error ? reason.message : "AAAAT could not save this information setting."); throw reason; }
  };
  const refreshFields = async () => {
    try { setFields(await window.aaaat.candidatures.listFields()); } catch { setError("AAAAT could not refresh application information."); }
  };
  const updateFieldDefinition = async (update: CandidatureFieldUpdate) => {
    try {
      replaceField(await window.aaaat.candidatures.updateField(update));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not update this information.");
      throw reason;
    }
  };
  const inferencePreflight = async (
    targetFieldIds: readonly string[],
  ): Promise<AiRequestFeedback | null> => {
    if (!selected) return "context-unavailable";

    let connections: Awaited<ReturnType<typeof window.aaaat.aiConnections.list>>;
    try {
      connections = await window.aaaat.aiConnections.list();
    } catch {
      return "unconfigured";
    }
    if (!hasJobExtractionRoute(connections)) return "unconfigured";

    let sources: CandidatureSource[];
    try {
      sources = await window.aaaat.candidatures.listSources(selected.id);
    } catch {
      return "context-unavailable";
    }
    return candidatureInferenceContext(
      selected,
      fields,
      sources,
      new Set(targetFieldIds),
    )
      ? null
      : "missing-context";
  };

  const requestFieldInference = async (field: CandidatureFieldConfiguration) => {
    if (!selected || !field.preferences.aiUseAllowed) return;
    if (sourceDirty) { setFieldAiFeedback({ fieldId: field.definition.id, kind: "context-unavailable" }); return; }
    setFieldAiFeedback(null);

    const feedback = await inferencePreflight([field.definition.id]);
    if (feedback) {
      setDiscoveryFieldId(null);
      setFieldAiFeedback({ fieldId: field.definition.id, kind: feedback });
      return;
    }

    const taskId = `candidature-inference:${selected.id}:${field.definition.id}`;
    const current = getAiTask(taskId);
    if (current?.status === "queued" || current?.status === "working") {
      setDiscoveryFieldId(field.definition.id);
      setFieldAiFeedback({ fieldId: field.definition.id, kind: "active" });
      return;
    }
    if (current) clearAiTask(taskId);
    protectedTaskFields.current.delete(taskId);
    setFieldRequestAttempt((attempt) => attempt + 1);
    setDiscoveryFieldId(field.definition.id);
  };

  const discardFieldDefinitionDraft = () =>
    !fieldDefinitionDraftDirty || window.confirm("Discard unsaved application edits?");
  const toggleFieldOptions = (field: CandidatureFieldConfiguration) => {
    if (openFieldOptionsId === field.definition.id) {
      if (!discardFieldDefinitionDraft()) return;
      setOpenFieldOptionsId(null);
      setFieldDefinitionDraft(null);
      return;
    }
    if (!discardFieldDefinitionDraft()) return;
    setOpenFieldOptionsId(field.definition.id);
    setFieldDefinitionDraft({
      fieldId: field.definition.id,
      label: field.definition.label,
      description: field.definition.description,
    });
  };

  useEffect(() => {
    if (!openFieldOptionsId) return;
    const closeOptions = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest(".candidature-field-options")) return;
      if (fieldDefinitionDraftDirty) return;
      setOpenFieldOptionsId(null);
      setFieldDefinitionDraft(null);
    };
    document.addEventListener("pointerdown", closeOptions);
    return () => document.removeEventListener("pointerdown", closeOptions);
  }, [fieldDefinitionDraftDirty, openFieldOptionsId]);

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

  const mutateTagIds = (change: (current: readonly string[]) => string[]): Promise<void> => {
    if (!selected) return Promise.resolve();
    const candidatureId = selected.id;
    const next = tagMutationTail.current.catch(() => undefined).then(async () => {
      if (!alive.current) return;
      const current = (await window.aaaat.candidatures.list()).find((record) => record.id === candidatureId);
      if (!current || !alive.current) return;
      const updated = await window.aaaat.candidatures.setTags({ candidatureId, tagIds: change(current.tagIds) });
      if (!alive.current) return;
      storeRecord(updated);
      if (currentSelection.current === candidatureId) {
        setSelectedTagIds(updated.tagIds);
        setSelectedTagId((id) => id && updated.tagIds.includes(id) ? id : updated.tagIds[0] ?? null);
      }
    });
    tagMutationTail.current = next;
    return next;
  };
  const attachTagIds = (ids: readonly string[]) => mutateTagIds((current) => [...new Set([...current, ...ids])]);
  const detachTagId = (id: string) => mutateTagIds((current) => current.filter((candidate) => candidate !== id));
  const reportTagFailure = (reason: unknown) => setError(reason instanceof Error ? reason.message : "The Tag association could not be saved.");
  const startNewTag = (initialName = "") => {
    if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return;
    setTagEditorOpen(true); setEditingTagId(null); setTagEditorDraft({ ...emptyTag, name: initialName }); setTagAliasesText("");
  };
  const editTag = (tag: TagRecord) => {
    if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return;
    setTagEditorOpen(true); setEditingTagId(tag.id); setTagEditorDraft(tagDraft(tag)); setTagAliasesText(tag.aliases.join(", "));
  };
  const closeTagEditor = () => {
    if (tagEditorDirty && !window.confirm("Discard unsaved Tag edits?")) return;
    setTagEditorOpen(false); setEditingTagId(null);
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
      if (isNew && selected) await attachTagIds([saved.id]);
      setEditingTagId(saved.id); setTagEditorDraft(tagDraft(saved)); setTagAliasesText(saved.aliases.join(", ")); setSelectedTagId(saved.id); setTagQuery("");
      onTagGlossaryChange?.();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not save this Tag."); }
  };

  const invalidateSourceTasks = useCallback((pendingOnly = false) => {
    if (!selectedId) return;
    for (const suffix of ["missing", "tags", ...fields.map((field) => field.definition.id)]) {
      const key = `candidature-inference:${selectedId}:${suffix}`;
      const task = getAiTask(key);
      if (!pendingOnly || task?.status === "queued" || task?.status === "working") clearAiTask(key);
    }
  }, [selectedId, fields]);
  const beforeSourcesChange = async () => {
    invalidateSourceTasks();
    if (selectedId) {
      const api = window.aaaat.candidatureOpportunityResearchAccess;
      const access = await api.current(selectedId);
      if (access.allowed) await api.update({ candidatureId: selectedId, allowed: false });
    }
  };
  const handleSourceDirty = useCallback((dirty: boolean) => {
    if (dirty) invalidateSourceTasks(true);
    setSourceDirty(dirty);
  }, [invalidateSourceTasks]);
  const handleSourcesChanged = useCallback(async () => {
    invalidateSourceTasks();
    try { setRecords(await window.aaaat.candidatures.list()); setSourceDirty(false); }
    catch { setError("AAAAT could not refresh the application after the Source changed."); }
  }, [invalidateSourceTasks, setRecords, setSourceDirty, setError]);
  const openDocument = (documentId: string) => {
    if (!selected) return;
    openDocumentFromCandidature(selected.id, documentId);
  };
  const updateDocumentExternalAccess = async (allowed: boolean) => {
    if (!selected || documentExternalAccessBusy) return;
    setDocumentExternalAccessBusy(true);
    setError(null);
    try {
      const access = await window.aaaat.documentDomain.updateExternalApplicationAccess({
        candidatureId: selected.id,
        allowed,
      });
      setDocumentExternalAccessAllowed(access.allowed);
    } catch (reason) {
      setError(
        readableDocumentError(
          reason,
          "AAAAT could not update external AI access for these application documents.",
        ),
      );
    } finally {
      setDocumentExternalAccessBusy(false);
    }
  };

  const newDocumentTitle = (base: string, kind: "cv" | "letter"): string => {
    if (!selected) return base;
    const documents = [...collections.workingCvs, ...collections.letters, ...unsavedDocumentDrafts()];
    const titles = new Set(documents.filter((document) => document.candidatureId === selected.id && (kind === "cv" ? "sections" in document : "bodyParagraphs" in document)).map((document) => document.title.trim().toLocaleLowerCase()));
    if (!titles.has(base.toLocaleLowerCase())) return base;
    let index = 2;
    while (titles.has(`${base} ${index}`.toLocaleLowerCase())) index += 1;
    return `${base} ${index}`;
  };
  const createApplicationCoverLetter = async () => {
    if (!selected || documentCreationBusy) return;
    const candidatureId = selected.id;
    setDocumentCreationBusy("cover_letter"); setError(null);
    try {
      const created = await window.aaaat.documentDomain.previewLetter({
        candidatureId: selected.id,
        title: newDocumentTitle(`Letter · ${corpusActionIdentity(candidatureRecognitionProjection(selected, fields).primaryCues, candidatureRecognitionProjection(selected, fields).retainedSourceCue)}`, "letter"),
        bodyParagraphs: [],
      });
      if (!alive.current || currentSelection.current !== candidatureId) return;
      rememberDocumentDraft(created); openDocument(created.id);
    } catch (reason) {
      setError(readableDocumentError(reason, "AAAAT could not create the cover letter."));
    } finally { if (alive.current) setDocumentCreationBusy(null); }
  };
  const createApplicationCvFromSource = async () => {
    if (!selected || documentCreationBusy) return;
    const candidatureId = selected.id;
    setDocumentCreationBusy("cv"); setError(null);
    try {
      const templateId = applicationCvSource.startsWith("template:") ? applicationCvSource.slice("template:".length) : null;
      const source = templateId
        ? { kind: "template" as const, templateId }
        : applicationCvSource === "blank"
          ? { kind: "blank" as const }
          : { kind: "profile" as const };
      const created = await window.aaaat.documentDomain.previewWorkingCv({
        title: newDocumentTitle(`CV · ${corpusActionIdentity(candidatureRecognitionProjection(selected, fields).primaryCues, candidatureRecognitionProjection(selected, fields).retainedSourceCue)}`, "cv"),
        candidatureId: selected.id,
        source,
      });
      if (!alive.current || currentSelection.current !== candidatureId) return;
      rememberDocumentDraft(created); openDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create the application CV.");
    } finally { if (alive.current) setDocumentCreationBusy(null); }
  };

  const enabledFields = fields.filter((field) => field.definition.enabled);
  const favouriteFields = enabledFields
    .filter((field) => field.preferences.favourite)
    .sort((left, right) => {
      const leftOrder = left.preferences.favouriteOrder;
      const rightOrder = right.preferences.favouriteOrder;
      if (leftOrder !== null && rightOrder !== null) return leftOrder - rightOrder;
      if (leftOrder !== null) return -1;
      if (rightOrder !== null) return 1;
      return enabledFields.indexOf(left) - enabledFields.indexOf(right);
    });
  const remainingFields = enabledFields.filter((field) => !field.preferences.favourite);
  const retainedRemainingFields = selected
    ? remainingFields.filter((field) => selected.values.some((value) => value.fieldId === field.definition.id))
    : [];
  const enabledMissingFields = selected
    ? enabledFields.filter(
        (field) =>
          field.preferences.aiUseAllowed &&
          !selected.values.some((value) => value.fieldId === field.definition.id),
      )
    : [];
  const discoveryField = fields.find((field) => field.definition.id === discoveryFieldId);
  const requestBulkInference = async () => {
    if (!selected) return;
    if (sourceDirty) { setBulkAiFeedback("context-unavailable"); return; }
    setBulkAiFeedback(null);
    const targetFieldIds = enabledMissingFields.map((field) => field.definition.id);
    const feedback = await inferencePreflight(targetFieldIds);
    if (feedback) {
      setBulkInferenceOpen(false);
      setBulkAiFeedback(feedback);
      return;
    }

    const taskId = `candidature-inference:${selected.id}:missing`;
    const current = getAiTask(taskId);
    if (current?.status === "queued" || current?.status === "working") {
      setBulkInferenceOpen(true);
      setBulkAiFeedback("active");
      return;
    }
    if (current) clearAiTask(taskId);
    protectedTaskFields.current.delete(taskId);
    setBulkRequestAttempt((attempt) => attempt + 1);
    setBulkInferenceOpen(true);
  };

  const setFavourite = async (
    field: CandidatureFieldConfiguration,
    favourite: boolean,
  ) => {
    if (activeFieldEditorId === field.definition.id) {
      if (
        valueEditorDirty.has(field.definition.id) &&
        !window.confirm(`Discard unsaved changes to ${field.definition.label}?`)
      ) return;
      setActiveFieldEditorId(null);
    }
    await updateFieldPreference(field, {
      favourite,
      favouriteOrder: null,
    });
  };

  const moveFavourite = async (
    field: CandidatureFieldConfiguration,
    direction: -1 | 1,
  ) => {
    const index = favouriteFields.findIndex(
      (candidate) => candidate.definition.id === field.definition.id,
    );
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= favouriteFields.length) return;
    const ordered = favouriteFields.map((candidate) => candidate.definition.id);
    [ordered[index], ordered[targetIndex]] = [ordered[targetIndex]!, ordered[index]!];
    try {
      setFields(await window.aaaat.candidatures.reorderFavouriteFields(ordered));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not reorder primary information.",
      );
    }
  };

  const bulkTask = useAiTask(`candidature-inference:${selected?.id ?? ""}:missing`);
  const bulkPending = bulkTask?.status === "queued" || bulkTask?.status === "working";
  const shellRecognition = selected ? candidatureRecognitionProjection(selected, fields) : null;
  const shellIdentity = shellRecognition ? corpusActionIdentity(shellRecognition.primaryCues.slice(0, 2), shellRecognition.retainedSourceCue) : "Applications";
  const shellTitle = shellIdentity.length > 72 ? `${shellIdentity.slice(0, 71).trimEnd()}…` : shellIdentity;
  useShellActions({
    title: mode === "selected" ? shellTitle : "Applications",
    actions: mode === "selected" ? [
      { id: "back-applications", label: "Close", onClick: returnToCorpus },
      { id: "extract-application", label: bulkPending ? "Stop AI" : "Extract with AI", onClick: () => { if (bulkPending && bulkTask) cancelAiTask(bulkTask.key); else void requestBulkInference(); } },
      ...(onNewApplication ? [{ id: "new-application", label: "New", onClick: onNewApplication }] : []),
    ] : (onNewApplication ? [{ id: "new-application", label: "New", onClick: onNewApplication, primary: true }] : []),
    moreActions: mode === "selected" && selected ? [
      { id: "find-tags", label: "Find Tags with AI", disabled: sourceDirty, onClick: () => { const key = `candidature-inference:${selected.id}:tags`; const existing = getAiTask(key); if (existing?.status !== "working" && existing?.status !== "queued") clearAiTask(key); setTagRequestAttempt((attempt) => attempt + 1); setTagInferenceOpen(true); } },
      { id: "external-ai", label: "Send to my AI…", onClick: () => setExternalAiOpen(true) },
      { id: "archive-application", label: selected.archived ? "Restore" : "Archive", onClick: () => void setArchived(!selected.archived) },
    ] : [],
  }, 1);

  if (mode === "corpus") {
    return (
      <section
        className="candidatures-workspace candidature-corpus"
        aria-label="Applications"
      >
        <header className="candidature-toolbar">
          <div>
            <h2>Applications</h2>
            <span className="corpus-count">{visibleRecords.length} / {records.length} shown</span>
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
              placeholder="Search fields, Sources and Tags…"
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
          <label>
            From
            <select
              aria-label="From"
              value={recencyFilter}
              onChange={(event) => setRecencyFilter(event.target.value as RecencyFilter)}
            >
              <option value="all">All</option>
              <option value="24h">Last 24h</option>
              <option value="48h">Last 48h</option>
              <option value="72h">Last 72h</option>
              <option value="week">Last week</option>
              <option value="month">Last month</option>
            </select>
          </label>
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        {records.length === 0 ? (
          <div className="candidature-empty-state">
            <h3>No saved applications yet</h3>
            <p>Enter a few details or paste whatever material you already have.</p>
          </div>
        ) : visibleRecords.length === 0 ? (
          <p className="compact-empty">No saved applications match this search.</p>
        ) : (
          <div className="candidature-corpus-grid" aria-label="Application corpus">
            {visibleRecords.map((record) => {
              const recordTags = tags.filter((tag) => record.tagIds.includes(tag.id));
              const recognition = candidatureCardRecognitionProjection(record, fields, false);
              const primaryCues = recognition.primaryCues;
              const actionIdentity = corpusActionIdentity(primaryCues, recognition.retainedSourceCue);
              const searchMatchCue =
                normalizedQuery && textMatches?.has(record.id)
                  ? candidatureSearchMatchCue(record, fields, tags, normalizedQuery)
                  : null;
              const distinctSearchCue =
                searchMatchCue &&
                !primaryCues.some(
                  (cue) => cue.label === searchMatchCue.label && cue.value === searchMatchCue.value,
                )
                  ? searchMatchCue
                  : null;
              return (
                <article className="candidature-corpus-card" key={record.id}>
                  <button type="button" className="candidature-corpus-entry" aria-label={`Open application: ${actionIdentity}`} onClick={() => openRecord(record)}>
                    {primaryCues.length ? (
                      <span className="candidature-recognition-cues">
                        {primaryCues.map((cue) => <CorpusRecognitionCue cue={cue} key={cue.fieldId} />)}
                      </span>
                    ) : recognition.retainedSourceCue ? (
                      <span className="candidature-recognition-cues"><CorpusRecognitionCue cue={recognition.retainedSourceCue} sourceLabel /></span>
                    ) : <span className="candidature-neutral-reference">Saved application</span>}
                    {distinctSearchCue ? <span className="candidature-search-match"><span>{distinctSearchCue.label}</span><span>{distinctSearchCue.value}</span></span> : null}
                  </button>
                  <div className="candidature-card-footer">
                    <span className="candidature-collapsed-tags">{recordTags.map((tag) => <span className="candidature-collapsed-tag" key={tag.id}>{tag.name}</span>)}</span>
                    <time dateTime={record.createdAt}>{new Date(record.createdAt).toLocaleDateString()}</time>
                  </div>
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
        <p className="error-message">The selected application is no longer available.</p>
        <button type="button" onClick={returnToCorpus}>Back to applications</button>
      </section>
    );
  }

  const attachedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const normalizedTagQuery = normalizedTagText(tagQuery);
  const tagMatches = normalizedTagQuery
    ? tags
        .filter(
          (tag) =>
            !selectedTagIds.includes(tag.id) &&
            [tag.name, ...tag.aliases].some((term) =>
              normalizedTagText(term).includes(normalizedTagQuery),
            ),
        )
        .slice(0, 8)
    : [];
  const exactTagMatch = normalizedTagQuery
    ? tags.some((tag) =>
        [tag.name, ...tag.aliases].some(
          (term) => normalizedTagText(term) === normalizedTagQuery,
        ),
      )
    : false;
  const selectedTag = attachedTags.find((tag) => tag.id === selectedTagId) ?? null;
  const applicationWorkingCvs = collections.workingCvs.filter(
    (item) => item.candidatureId === selected.id,
  );
  const applicationLetters = collections.letters.filter(
    (item) => item.candidatureId === selected.id,
  );
  const applicationRendered = collections.renderedCvs.filter(
    (item) => item.candidatureId === selected.id,
  );
  const applicationRenderedLetters = collections.renderedLetters.filter(
    (item) => item.candidatureId === selected.id,
  );
  const applicationPackets = collections.applicationPackets.filter(
    (item) => item.candidatureId === selected.id,
  );
  const selectedPacketCvId = applicationWorkingCvs.some(
    (item) => item.id === packetWorkingCvId,
  )
    ? packetWorkingCvId
    : applicationWorkingCvs[0]?.id ?? "";
  const selectedPacketLetterId = applicationLetters.some(
    (item) => item.id === packetLetterId,
  )
    ? packetLetterId
    : applicationLetters[0]?.id ?? "";
  const selectedPacketBlueprintId = packetBlueprints.some(
    (blueprint) => blueprint.id === packetBlueprintId,
  )
    ? packetBlueprintId
    : packetBlueprints[0]?.id ?? "";

  const createPacket = async () => {
    if (!selectedPacketCvId || !selectedPacketLetterId || !selectedPacketBlueprintId || packetBusy) return;
    setPacketBusy(true);
    setError(null);
    try {
      await window.aaaat.documentDomain.createPacket({
        candidatureId: selected.id,
        workingCvId: selectedPacketCvId,
        coverLetterId: selectedPacketLetterId,
        blueprintId: selectedPacketBlueprintId,
      });
      await refreshCollections();
    } catch (reason) {
      setError(readableDocumentError(reason, "AAAAT could not create the application PDF."));
    } finally {
      setPacketBusy(false);
    }
  };

  const renderInformationField = (field: CandidatureFieldConfiguration) => {
    const retained = selected.values.find((value) => value.fieldId === field.definition.id);
    const retainedText = retained
      ? Array.isArray(retained.value)
        ? retained.value.map(String).join(", ")
        : String(retained.value)
      : "";
    const longReading =
      field.definition.valueType === "long_text" ||
      retainedText.length > 180 ||
      activeFieldEditorId === field.definition.id;
    const mediumReading =
      !longReading &&
      (retainedText.length > 80 || field.definition.description.length > 140);
    const favouriteIndex = favouriteFields.findIndex(
      (candidate) => candidate.definition.id === field.definition.id,
    );
    const favourite = favouriteIndex >= 0;
    return (
      <article
        key={field.definition.id}
        className={`retained-information-card candidature-information-unit${longReading ? " candidature-information-unit-long-content" : mediumReading ? " candidature-information-unit-medium-content" : ""}`}
        aria-label={`${field.definition.label} information`}
      >
        <div className="candidature-information-unit-heading">
          <div className="candidature-information-unit-meta">
            <h4>{field.definition.label}</h4>

          </div>
          <div className="candidature-field-context-controls" role="group" aria-label={`${field.definition.label} field controls`}>
            <button
              type="button"
              className="candidature-icon-button candidature-favourite-star"
              aria-label={favourite ? `Remove ${field.definition.label} from favourites` : `Add ${field.definition.label} to favourites`}
              aria-pressed={favourite}
              title={favourite ? "Remove from favourite card information" : "Add to favourite card information"}
              onClick={() => void setFavourite(field, !favourite)}
            >
              <span aria-hidden="true">{favourite ? "★" : "☆"}</span>
            </button>
            <button
              type="button"
              className="candidature-icon-button candidature-edit-field"
              aria-label={`${activeFieldEditorId === field.definition.id ? "Close editor for" : "Edit"} ${field.definition.label}`}
              title={`Edit ${field.definition.label}`}
              onClick={() => requestFieldEditor(field.definition.id)}
            >
              <span aria-hidden="true">{activeFieldEditorId === field.definition.id ? "×" : "✎"}</span>
            </button>
            <button
              type="button"
              className="candidature-icon-button candidature-ai-use-eye"
              aria-label={field.preferences.aiUseAllowed ? `Prevent AI from using ${field.definition.label}` : `Allow AI to use ${field.definition.label}`}
              aria-pressed={field.preferences.aiUseAllowed}
              title={field.preferences.aiUseAllowed ? "AI may use this information" : "AI will not use this information"}
              onClick={() => void updateFieldPreference(field, { aiUseAllowed: !field.preferences.aiUseAllowed })}
            >
              <span aria-hidden="true">👁</span>
            </button>
            <button
              type="button"
              className="candidature-icon-button candidature-ai-sparkle"
              aria-label={`Ask AI to fill ${field.definition.label}`}
              title={field.preferences.aiUseAllowed ? `Ask AI to fill ${field.definition.label}` : "Allow AI to use this information first"}
              disabled={!field.preferences.aiUseAllowed}
              onClick={() => void requestFieldInference(field)}
            >
              <span aria-hidden="true">✨</span>
            </button>
            <details
              className="candidature-field-options"
              open={openFieldOptionsId === field.definition.id}
            >
              <summary
                onClick={(event) => {
                  event.preventDefault();
                  toggleFieldOptions(field);
                }}
                aria-label={`Configure ${field.definition.label}`}
                title={`Configure ${field.definition.label}`}
              >
                <span aria-hidden="true">⚙</span>
              </summary>
              {openFieldOptionsId === field.definition.id ? (
                <div className="candidature-field-options-panel">
                  {field.definition.description ? <p className="compact-help">{field.definition.description}</p> : null}

                  {favourite ? (
                    <>
                      <div className="candidature-field-order-actions">
                        <button
                          type="button"
                          className="compact-secondary"
                          aria-label={`Move ${field.definition.label} earlier`}
                          disabled={favouriteIndex === 0}
                          onClick={() => void moveFavourite(field, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="compact-secondary"
                          aria-label={`Move ${field.definition.label} later`}
                          disabled={favouriteIndex === favouriteFields.length - 1}
                          onClick={() => void moveFavourite(field, 1)}
                        >
                          ↓
                        </button>
                      </div>
                      <label className="candidature-prominence-control">
                        Card size
                        <select
                          aria-label={`${field.definition.label} card size`}
                          value={field.preferences.presentationSize}
                          onChange={(event) =>
                            void updateFieldPreference(field, {
                              presentationSize: event.target.value as
                                CandidatureFieldConfiguration["preferences"]["presentationSize"],
                            })
                          }
                        >
                          <option value="compact">Compact</option>
                          <option value="normal">Normal</option>
                          <option value="wide">Wide</option>
                        </select>
                      </label>
                    </>
                  ) : null}
                  <details className="candidature-shared-field-definition">
                    <summary>Edit field definition</summary>
                    <form
                      className="candidature-shared-field-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        if (fieldDefinitionDraft?.fieldId !== field.definition.id) return;
                        const label = fieldDefinitionDraft.label.trim();
                        if (!label) return;
                        void updateFieldDefinition({
                          id: field.definition.id,
                          label,
                          description: fieldDefinitionDraft.description,
                          valueType: field.definition.valueType,
                          cardinality: field.definition.cardinality,
                          choices: field.definition.choices,
                          enabled: field.definition.enabled,
                        }).then(() => {
                          setFieldDefinitionDraft(null);
                          setOpenFieldOptionsId(null);
                        });
                      }}
                    >
                      <p>Shared field definition · changes apply to every application.</p>
                      <label>
                        Name
                        <input
                          name="label"
                          value={fieldDefinitionDraft?.fieldId === field.definition.id ? fieldDefinitionDraft.label : field.definition.label}
                          maxLength={120}
                          required
                          onChange={(event) =>
                            setFieldDefinitionDraft((current) => ({
                              fieldId: field.definition.id,
                              label: event.target.value,
                              description: current?.fieldId === field.definition.id
                                ? current.description
                                : field.definition.description,
                            }))
                          }
                        />
                      </label>
                      <label>
                        Description
                        <textarea
                          name="description"
                          value={fieldDefinitionDraft?.fieldId === field.definition.id ? fieldDefinitionDraft.description : field.definition.description}
                          maxLength={2000}
                          rows={3}
                          onChange={(event) =>
                            setFieldDefinitionDraft((current) => ({
                              fieldId: field.definition.id,
                              label: current?.fieldId === field.definition.id
                                ? current.label
                                : field.definition.label,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <button type="submit" className="compact-secondary">Save shared field</button>
                    </form>
                  </details>
                </div>
              ) : null}
            </details>
          </div>
        </div>
        <CandidatureFieldValueEditor
          field={field}
          value={retained?.value}
          onSave={(value) => setValue(field.definition.id, value)}
          onClear={() => clearValue(field.definition.id)}
          onDirtyChange={(dirty) => setEditorDirty(field.definition.id, dirty)}
          editing={activeFieldEditorId === field.definition.id}
          onEditingChange={(editing) => {
            if (editing) requestFieldEditor(field.definition.id);
            else closeFieldEditor(field.definition.id);
          }}
          showEditAction={false}
        />
        {fieldAiFeedback?.fieldId === field.definition.id ? (
          <div
            className="candidature-field-ai-preflight"
            role={fieldAiFeedback.kind === "active" ? "status" : "alert"}
          >
            <span>{aiRequestFeedbackMessage(fieldAiFeedback.kind)}</span>
            {fieldAiFeedback.kind === "unconfigured" ? (
              <button
                type="button"
                className="compact-secondary"
                onClick={() => openSettingsFor("ai", "candidatures")}
              >
                Open AI settings
              </button>
            ) : null}
          </div>
        ) : null}
        <CandidatureFieldAiState
          candidatureId={selected.id}
          field={field}
          currentValue={retained?.value}
          onSaveValue={(value) => setValue(field.definition.id, value)}
          onFillEmpty={(value, taskKey) => fillEmptyValue(field.definition.id, value, taskKey)}
          editing={sourceDirty || activeFieldEditorId === field.definition.id}
          onRetry={() => void requestFieldInference(field)}
        />
      </article>
    );
  };

  return (
    <section className="candidatures-workspace candidature-selected" aria-label="Application information">
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {bulkAiFeedback ? (
        <div
          className="candidature-field-ai-preflight"
          role={bulkAiFeedback === "active" ? "status" : "alert"}
        >
          <span>{aiRequestFeedbackMessage(bulkAiFeedback)}</span>
          {bulkAiFeedback === "unconfigured" ? (
            <button
              type="button"
              className="compact-secondary"
              onClick={() => openSettingsFor("ai", "candidatures")}
            >
              Open AI settings
            </button>
          ) : null}
        </div>
      ) : null}

      <section
        className="section-surface candidature-primary-information"
        aria-label="Starred application information"
      >
        <div className="candidature-information-heading">
          <div>
            <p className="eyebrow">Primary information</p>
            <h2>Application</h2>
          </div>
        </div>
        {favouriteFields.some((field) => selected.values.some((value) => value.fieldId === field.definition.id)) ? (
          <div className="candidature-primary-grid">
            {favouriteFields.filter((field) => selected.values.some((value) => value.fieldId === field.definition.id)).map(renderInformationField)}
          </div>
        ) : (
          <p className="compact-empty">
            {selected.sourceSearchText ? selected.sourceSearchText.replace(/\s+/g, " ").slice(0, 400) : "Add the information you want to keep."}
          </p>
        )}
      </section>

      <section
        className={retainedRemainingFields.length > 0 ? "section-surface candidature-information-surface" : "candidature-information-surface candidature-information-tools"}
        aria-label={retainedRemainingFields.length > 0 ? "Remaining application information" : "Application information controls"}
      >
        {retainedRemainingFields.length > 0 ? (
        <div className="candidature-editor-heading candidature-information-heading">
          <div>
            <p className="eyebrow">Information</p>
            <h3>Details</h3>
          </div>
        </div>
        ) : null}
        <CandidatureBulkAiReview candidature={selected} fields={fields} onRetry={() => void requestBulkInference()} />
        {retainedRemainingFields.length > 0 ? (
          <div className="retained-information-list candidature-information-grid">
            {retainedRemainingFields.map(renderInformationField)}
          </div>
        ) : null}
        <details className="application-add-information"><summary>Add information</summary><div className="candidature-information-grid">{enabledFields.filter((field) => !selected.values.some((value) => value.fieldId === field.definition.id)).map(renderInformationField)}</div></details>
        <details className="candidature-field-administration">
          <summary>Information setup</summary>
          <CandidatureFieldDefinitionsPanel onChanged={() => void refreshFields()} onDirtyChange={setFieldDefinitionsDirty} />
        </details>
      </section>

      <section className="section-surface candidature-tags-direct" aria-label="Tags">
        <div className="candidature-editor-heading">
          <div>
            <p className="eyebrow">Shared glossary</p>
            <h3>Tags</h3>
          </div>
        </div>
      {bulkInferenceOpen ? (
        <CandidatureInferencePanel
          candidature={selected}
          fields={fields}
          targetFieldIds={enabledMissingFields.map((field) => field.definition.id)}
          key={`bulk:${selected.id}:${bulkRequestAttempt}`}
          taskId={`candidature-inference:${selected.id}:missing`}
          onAttachTagIds={attachTagIds}
          title="Extract application"
          includeTagInference
          onChanged={() => void refreshInformation()}
        />
      ) : null}
      {tagInferenceOpen ? <CandidatureInferencePanel key={`tags:${selected.id}:${tagRequestAttempt}`} candidature={selected} fields={fields} targetFieldIds={[]} taskId={`candidature-inference:${selected.id}:tags`} title="Find Tags" onAttachTagIds={attachTagIds} includeTagInference onChanged={() => void refreshInformation()} /> : null}
        <div className="tag-chip-list" aria-label="Attached Tags">
          {attachedTags.length === 0 ? (
            <span className="compact-help">No Tags attached.</span>
          ) : (
            attachedTags.map((tag) => (
              <span className="tag-chip" key={tag.id}>
                <button
                  type="button"
                  className="tag-chip-label"
                  onClick={() => setSelectedTagId(tag.id)}
                >
                  {tag.name}
                </button>
                <button
                  type="button"
                  className="tag-chip-remove"
                  aria-label={`Remove ${tag.name}`}
                  onClick={() =>
                    void detachTagId(tag.id).catch(reportTagFailure)
                  }
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
        <div className="tag-attach-control">
          <label>
            Attach Tag
            <input
              type="search"
              value={tagQuery}
              onChange={(event) => setTagQuery(event.target.value)}
              placeholder="Search name or alias…"
            />
          </label>
          {tagMatches.length > 0 ? (
            <div className="tag-search-results">
              {tagMatches.map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => {
                    void attachTagIds([tag.id]).catch(reportTagFailure);
                    setTagQuery("");
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          ) : null}
          {normalizedTagQuery && !exactTagMatch ? (
            <button
              type="button"
              className="compact-secondary"
              onClick={() => startNewTag(tagQuery.trim())}
            >
              Create “{tagQuery.trim()}”
            </button>
          ) : null}
        </div>
        {selectedTag ? (
          <article className="selected-tag-definition">
            <strong>{selectedTag.name}</strong>
            <p>{selectedTag.definition}</p>
            {selectedTag.aliases.length > 0 ? (
              <p><strong>Aliases:</strong> {selectedTag.aliases.join(", ")}</p>
            ) : null}
            {selectedTag.notes ? (
              <p><strong>Notes:</strong> {selectedTag.notes}</p>
            ) : null}
            <button
              type="button"
              className="compact-secondary"
              onClick={() => editTag(selectedTag)}
            >
              Edit shared Tag
            </button>
          </article>
        ) : null}
        {tagEditorOpen ? (
          <form
            className="tag-editor"
            onSubmit={(event) => {
              event.preventDefault();
              void saveTag();
            }}
          >
            <label>
              Name
              <input
                value={tagEditorDraft.name}
                maxLength={120}
                onChange={(event) =>
                  setTagEditorDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
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
                value={tagEditorDraft.definition}
                maxLength={3000}
                onChange={(event) =>
                  setTagEditorDraft((current) => ({
                    ...current,
                    definition: event.target.value,
                  }))
                }
              />
            </label>
            <label>
              Notes
              <textarea
                value={tagEditorDraft.notes ?? ""}
                maxLength={5000}
                onChange={(event) =>
                  setTagEditorDraft((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
              />
            </label>
            <div className="button-row">
              <button
                type="submit"
                disabled={!tagEditorDraft.name.trim() || !tagEditorDraft.definition.trim()}
              >
                Save Tag
              </button>
              <button
                type="button"
                className="compact-secondary"
                onClick={closeTagEditor}
              >
                Close
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="section-surface application-material-workbench" aria-label="Application documents">
        <div className="candidature-editor-heading application-material-heading">
          <div>
            <p className="eyebrow">Application documents</p>
            <h3>CV + cover letter</h3>
            <p>Edit the two source documents separately. Create one application PDF when both are ready.</p>
          </div>
          <label className="application-document-ai-access">
            <input
              type="checkbox"
              checked={documentExternalAccessAllowed}
              disabled={documentExternalAccessBusy || selected.archived}
              onChange={(event) => void updateDocumentExternalAccess(event.target.checked)}
            />
            <span>
              <strong>AI may use these documents</strong>
              <small>
                Allows document assistance and access from your external AI.
              </small>
            </span>
          </label>
        </div>

        <div className="application-document-pair">
          <article className="application-document-source">
            <div className="application-document-source-heading">
              <div>
                <span className="item-kind">CV</span>
                <strong>
                  {applicationWorkingCvs.find((document) => document.id === selectedPacketCvId)?.title ?? "No CV yet"}
                </strong>
              </div>
              {selectedPacketCvId ? (
                <button type="button" className="compact-secondary" onClick={() => openDocument(selectedPacketCvId)}>
                  Edit CV
                </button>
              ) : null}
            </div>

            {applicationWorkingCvs.length > 1 ? (
              <label className="application-document-choice">
                Use for this application
                <select
                  value={selectedPacketCvId}
                  onChange={(event) => setPacketWorkingCvId(event.target.value)}
                >
                  {applicationWorkingCvs.map((document) => (
                    <option key={document.id} value={document.id}>{document.title}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="application-document-create-row">
              <label>
                New CV from
                <select
                  value={applicationCvSource}
                  onChange={(event) => setApplicationCvSource(event.target.value)}
                >
                  <option value="profile">My information</option>
                  <option value="blank">Blank</option>
                  {collections.templates.map((template) => (
                    <option key={template.id} value={`template:${template.id}`}>{template.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="compact-secondary"
                disabled={documentCreationBusy !== null}
                onClick={() => void createApplicationCvFromSource()}
              >
                {documentCreationBusy === "cv" ? "Creating…" : applicationWorkingCvs.length > 0 ? "New CV" : "Create CV"}
              </button>
            </div>
          </article>

          <article className="application-document-source">
            <div className="application-document-source-heading">
              <div>
                <span className="item-kind">Cover letter</span>
                <strong>
                  {applicationLetters.find((document) => document.id === selectedPacketLetterId)?.title ?? "No cover letter yet"}
                </strong>
              </div>
              {selectedPacketLetterId ? (
                <button type="button" className="compact-secondary" onClick={() => openDocument(selectedPacketLetterId)}>
                  Edit letter
                </button>
              ) : null}
            </div>

            {applicationLetters.length > 1 ? (
              <label className="application-document-choice">
                Use for this application
                <select
                  value={selectedPacketLetterId}
                  onChange={(event) => setPacketLetterId(event.target.value)}
                >
                  {applicationLetters.map((document) => (
                    <option key={document.id} value={document.id}>{document.title}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <div className="application-document-create-row application-document-create-row-single">
              <button
                type="button"
                className="compact-secondary"
                disabled={documentCreationBusy !== null}
                onClick={() => void createApplicationCoverLetter()}
              >
                {documentCreationBusy === "cover_letter"
                  ? "Creating…"
                  : applicationLetters.length > 0
                    ? "New cover letter"
                    : "Create cover letter"}
              </button>
            </div>
          </article>
        </div>

        <div className="application-output-bar">
          <div>
            <span className="item-kind">Application PDF</span>
            <strong>One file from the current CV and cover letter</strong>
            <small>The editable source documents stay separate.</small>
          </div>
          {selectedPacketCvId && selectedPacketLetterId && selectedPacketBlueprintId ? (
            <div className="application-output-actions">
              {packetBlueprints.length > 1 ? (
                <label>
                  PDF style
                  <select
                    value={selectedPacketBlueprintId}
                    onChange={(event) => setPacketBlueprintId(event.target.value)}
                  >
                    {packetBlueprints.map((blueprint) => (
                      <option key={blueprint.id} value={blueprint.id}>{blueprint.name}</option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button
                type="button"
                className="compact-primary"
                disabled={packetBusy}
                onClick={() => void createPacket()}
              >
                {packetBusy ? "Creating PDF…" : "Create application PDF"}
              </button>
            </div>
          ) : (
            <small>Add both a CV and a cover letter to create the combined PDF.</small>
          )}
        </div>

        {(applicationRendered.length + applicationRenderedLetters.length + applicationPackets.length) > 0 ? (
          <details className="application-generated-files">
            <summary>
              Generated files
              <span>{applicationRendered.length + applicationRenderedLetters.length + applicationPackets.length}</span>
            </summary>
            <div className="document-intent-list">
              {applicationPackets.map((packet) => (
                <article key={packet.id} className="document-intent-row">
                  <button type="button" onClick={() => void window.aaaat.documentDomain.openPacket(packet.id)}>
                    <span className="item-kind">Application PDF</span>
                    <strong>{packet.title}</strong>
                    <small>Open PDF</small>
                  </button>
                  <button
                    type="button"
                    className="compact-secondary"
                    onClick={() => void window.aaaat.documentDomain.exportPacket(packet.id)}
                  >
                    Export source project
                  </button>
                </article>
              ))}
              {applicationRendered.map((document) => (
                <button
                  type="button"
                  key={document.id}
                  onClick={() => void window.aaaat.documentDomain.openRenderedCv(document.id)}
                >
                  <span className="item-kind">CV PDF</span>
                  <strong>{document.title}</strong>
                  <small>Open PDF</small>
                </button>
              ))}
              {applicationRenderedLetters.map((document) => (
                <button
                  type="button"
                  key={document.id}
                  onClick={() => void window.aaaat.documentDomain.openRenderedLetter(document.id)}
                >
                  <span className="item-kind">Letter PDF</span>
                  <strong>{document.title}</strong>
                  <small>Open PDF</small>
                </button>
              ))}
            </div>
          </details>
        ) : null}
      </section>

      {externalAiOpen ? <dialog ref={externalDialog} className="application-external-ai" aria-label="Send to my AI" onCancel={(event) => {
        event.preventDefault();
        if (closeExternalTask.current) void closeExternalTask.current();
        else setExternalAiOpen(false);
      }}><CandidatureOpportunityResearchAccessPanel key={selected.id} candidatureId={selected.id} contextDirty={taskContextDirty || sourceDirty} onClose={() => setExternalAiOpen(false)} onCloseReady={registerExternalClose} /></dialog> : null}

      <details className="candidature-more">
        <summary>Offer, notes & history</summary>
        <div className="candidature-more-content">
          <CandidatureOfferPanel candidatureId={selected.id} />
                      <CandidatureSourcesPanel
              candidatureId={selected.id}
              onSourcesChanged={() => void handleSourcesChanged()}
              onSourcesChanging={beforeSourcesChange}
              onDirtyChange={handleSourceDirty}
            />
          <section
            className="section-surface candidature-secondary-controls"
            aria-label="Application history"
          >
            <button
              type="button"
              className="compact-secondary"
              onClick={() => setActivityOpen((open) => !open)}
            >
              {activityOpen ? "Hide history" : "Show history"}
            </button>
            {activityOpen ? <CandidatureActivityPanel candidatureId={selected.id} /> : null}
          </section>
        </div>
      </details>

      {discoveryField?.definition.enabled && discoveryField.preferences.aiUseAllowed ? (
        <CandidatureInferencePanel
          candidature={selected}
          fields={fields}
          targetFieldIds={[discoveryField.definition.id]}
          key={`field:${selected.id}:${discoveryField.definition.id}:${fieldRequestAttempt}`}
          taskId={`candidature-inference:${selected.id}:${discoveryField.definition.id}`}
          onAttachTagIds={attachTagIds}
          title={`Fill ${discoveryField.definition.label}`}
        />
      ) : null}

    </section>
  );
}
