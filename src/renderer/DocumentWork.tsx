import { useContext, useEffect, useMemo, useRef, useState } from "react";

import type { CoverLetterDraft, CoverLetterContextPreview, CvWritingField, CvWritingRequest, CvWritingResult, CvWritingContextPreview } from "../shared/ai-contracts";
import type { ProfileItem } from "../shared/contracts";
import type {
  BlueprintSummary,
  CoverLetterRecord,
  CvSectionPresentationRole,
  CvTemplateItem,
  CvTemplateSection,
  DocumentCollections,
  WorkingCvItem,
  WorkingCvRecord,
  WorkingCvSection,
} from "../shared/document-domain-contracts";
import type { ProfileVariantRecord } from "../shared/profile-variant-contracts";
import { startAiTask, useAiTask } from "./ai-task-store";
import { useContextualHandoffs } from "./contextual-handoffs";
import { PageToolbar } from "./PageToolbar";
import { ToolbarVisible } from "./toolbar-context";
import "./documents.css";
import "./document-image.css";

const emptyCollections: DocumentCollections = {
  templates: [],
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};

function readableDocumentError(reason: unknown, fallback: string): string {
  if (!(reason instanceof Error) || !reason.message.trim()) return fallback;
  return reason.message
    .replace(/^Error invoking remote method '[^']+':\s*/u, "")
    .replace(/^Error:\s*/u, "")
    .trim() || fallback;
}

function contactLabel(item: ProfileItem): string {
  return item.subtitle?.trim() || "Contact";
}

function letterSenderFromProfile(profile: readonly ProfileItem[]): CoverLetterRecord["sender"] {
  const identity = profile.find(
    (item) => item.kind.trim().toLocaleLowerCase() === "identity" && item.title.trim(),
  );
  const details: CoverLetterRecord["sender"]["details"] = [];
  if (identity?.url?.trim()) {
    details.push({ id: crypto.randomUUID(), label: "Website", value: identity.url.trim() });
  }
  for (const item of profile) {
    const kind = item.kind.trim().toLocaleLowerCase();
    if (kind === "contact" && item.title.trim()) {
      details.push({
        id: crypto.randomUUID(),
        label: contactLabel(item),
        value: item.title.trim(),
      });
    } else if (kind === "link" && item.url?.trim()) {
      details.push({
        id: crypto.randomUUID(),
        label: item.title.trim() || item.subtitle?.trim() || "Website",
        value: item.url.trim(),
      });
    }
  }
  return {
    name: identity?.title.trim() ?? "",
    headline: identity?.subtitle?.trim() ?? "",
    details,
  };
}

function letterSenderHasContent(sender: CoverLetterRecord["sender"]): boolean {
  return Boolean(
    sender.name.trim()
    || sender.headline.trim()
    || sender.details.some((detail) => detail.label.trim() || detail.value.trim()),
  );
}

function useBlueprintSelection(): {
  blueprints: BlueprintSummary[];
  selectedBlueprintId: string;
  setSelectedBlueprintId: (id: string) => void;
} {
  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([]);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState("");

  useEffect(() => {
    let active = true;
    void window.aaaat.documentDomain.blueprints().then((available) => {
      if (!active) return;
      setBlueprints(available);
      setSelectedBlueprintId((current) =>
        available.some((blueprint) => blueprint.id === current)
          ? current
          : available[0]?.id ?? "",
      );
    });
    return () => { active = false; };
  }, []);

  return { blueprints, selectedBlueprintId, setSelectedBlueprintId };
}

function BlueprintRenderChoice({
  blueprints,
  selectedBlueprintId,
  onChange,
}: {
  readonly blueprints: readonly BlueprintSummary[];
  readonly selectedBlueprintId: string;
  readonly onChange: (id: string) => void;
}) {
  return (
    <label className="blueprint-render-choice">
      <span>PDF style</span>
      <select
        aria-label="PDF style"
        value={selectedBlueprintId}
        disabled={blueprints.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {blueprints.length === 0 ? <option value="">Loading…</option> : null}
        {blueprints.map((blueprint) => (
          <option key={blueprint.id} value={blueprint.id}>{blueprint.name}</option>
        ))}
      </select>
    </label>
  );
}

function profileContent(item: ProfileItem): WorkingCvItem["content"] {
  return {
    kind: item.kind,
    title: item.title,
    ...(item.subtitle ? { subtitle: item.subtitle } : {}),
    ...(item.description ? { description: item.description } : {}),
    ...(item.startDate ? { startDate: item.startDate } : {}),
    ...(item.endDate ? { endDate: item.endDate } : {}),
    ...(item.url ? { url: item.url } : {}),
  };
}

function templateSections(working: WorkingCvRecord): CvTemplateSection[] {
  return working.sections.map((section) => ({
    id: section.id,
    name: section.name,
    presentationRole: section.presentationRole,
    items: section.items.map((item): CvTemplateItem => {
      const id = item.templateItemId ?? crypto.randomUUID();
      if (item.sourceMode === "custom" || item.profileItemId === null) {
        return { id, sourceMode: "custom", content: item.content };
      }
      if (item.sourceMode === "variant" && item.profileVariantId) {
        return {
          id,
          sourceMode: "variant",
          profileItemId: item.profileItemId,
          profileVariantId: item.profileVariantId,
        };
      }
      if (item.sourceMode === "current") {
        return { id, sourceMode: "current", profileItemId: item.profileItemId };
      }
      return {
        id,
        sourceMode: "override",
        profileItemId: item.profileItemId,
        content: item.content,
      };
    }),
  }));
}

function move<T>(items: readonly T[], index: number, offset: -1 | 1): T[] {
  const target = index + offset;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const current = next[index];
  const other = next[target];
  if (current === undefined || other === undefined) return next;
  next[index] = other;
  next[target] = current;
  return next;
}

function dateRange(item: WorkingCvItem): string | null {
  if (item.content.startDate && item.content.endDate) return `${item.content.startDate} – ${item.content.endDate}`;
  return item.content.startDate ?? item.content.endDate ?? null;
}

type OptionalCvDetail = "subtitle" | "description" | "startDate" | "endDate" | "url";
type CvReuseTarget = "" | "profile" | "profile_variant" | "template";
type CvTemplateReuseChoice = "" | "new" | "source";

const optionalCvDetails: readonly { key: OptionalCvDetail; label: string }[] = [
  { key: "subtitle", label: "Subtitle" },
  { key: "description", label: "Description" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "url", label: "Link" },
];

function populatedOptionalDetails(content: WorkingCvItem["content"]): OptionalCvDetail[] {
  return optionalCvDetails
    .filter(({ key }) => Boolean(content[key]))
    .map(({ key }) => key);
}

function useApplicationDocumentAccess(candidatureId: string | null) {
  const visible = useContext(ToolbarVisible);
  const [allowed, setAllowed] = useState(candidatureId === null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!candidatureId || !visible) return;
    let active = true;
    void window.aaaat.documentDomain.externalApplicationAccess(candidatureId).then(access => { if (active) setAllowed(access.allowed); }).catch(() => { if (active) setAllowed(false); });
    return () => { active = false; };
  }, [candidatureId, visible]);
  const toggle = async () => {
    if (!candidatureId || busy) return;
    setBusy(true); setError(null);
    try {
      const saved = await window.aaaat.documentDomain.updateExternalApplicationAccess({ candidatureId, allowed: !allowed });
      setAllowed(saved.allowed);
    } catch (reason) { setError(readableDocumentError(reason, "AAAAT could not update document AI access.")); }
    finally { setBusy(false); }
  };
  return { allowed, toggle, busy, error };
}

export function WorkingCvEditor({
  document,
  provisional = false,
  profile,
  variants,
  collections,
  onSaved,
  onCollections,
  onDirtyChange,
}: {
  readonly document: WorkingCvRecord;
  readonly provisional?: boolean;
  readonly profile: readonly ProfileItem[];
  readonly variants: readonly ProfileVariantRecord[];
  readonly collections: DocumentCollections;
  readonly onSaved: (document: WorkingCvRecord) => void;
  readonly onCollections: (collections: DocumentCollections) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { documentHandoff, documentRemoved, openProfessionalInformationItem, openSettingsFor, returnToCandidature, returnToDocuments } = useContextualHandoffs();
  const { blueprints, selectedBlueprintId, setSelectedBlueprintId } = useBlueprintSelection();
  const documentAi = useApplicationDocumentAccess(document.candidatureId);
  const [draft, setDraft] = useState<WorkingCvRecord>(document);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ assetId: string; url: string } | null>(null);
  const imageAssetId = draft.image?.assetId;
  useEffect(() => {
    if (!imageAssetId) return;
    let active = true;
    void window.aaaat.documentDomain.cvImagePreview(imageAssetId).then(url => {
      if (active) setImagePreview({ assetId: imageAssetId, url });
    }).catch(reason => {
      if (active) setError(readableDocumentError(reason, "The CV image could not be opened."));
    });
    return () => { active = false; };
  }, [imageAssetId]);
  const [writingSuggestion, setWritingSuggestion] = useState<CvWritingResult | null>(null);
  const writingSnapshot = useRef<{ itemId: string; field: CvWritingField; item: string; value: string } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingOptionalDetails, setEditingOptionalDetails] = useState<OptionalCvDetail[]>([]);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [cvTemplateReuseChoice, setCvTemplateReuseChoice] = useState<CvTemplateReuseChoice>("");
  const [variantNameByItem, setVariantNameByItem] = useState<Record<string, string>>({});
  const [reuseChoiceByItem, setReuseChoiceByItem] = useState<Record<string, CvReuseTarget>>({});
  const [writingMessage, setWritingMessage] = useState<string | null>(null);
  const [aiContext, setAiContext] = useState<CvWritingContextPreview | null>(null);
  const [writingTarget, setWritingTarget] = useState<{
    readonly itemId: string;
    readonly field: CvWritingField;
  } | null>(null);
  const writingTaskKey = `document:cv-writing:${document.id}`;
  const writingTask = useAiTask<CvWritingResult>(writingTaskKey);
  const handledWritingResult = useRef<CvWritingResult | null>(null);
  const writingActive =
    writingTask?.status === "queued" || writingTask?.status === "working";
  const [busy, setBusy] = useState(false);
  const [renderSettingsSuggested, setRenderSettingsSuggested] = useState(false);
  const dirty = JSON.stringify({
    title: draft.title,
    image: draft.image,
    language: draft.language,
    pdfMetadata: draft.pdfMetadata,
    parserSummary: draft.parserSummary,
    sections: draft.sections,
  }) !== JSON.stringify({
    title: document.title,
    image: document.image,
    language: document.language,
    pdfMetadata: document.pdfMetadata,
    parserSummary: document.parserSummary,
    sections: document.sections,
  });

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const applyWritingSuggestion = (result: CvWritingResult) => {
    setDraft(current => ({ ...current, sections: current.sections.map(section => ({ ...section, items: section.items.map(item => item.id === result.itemId
      ? { ...item, sourceMode: item.sourceMode === "custom" ? "custom" : "override", profileVariantId: null, content: { ...item.content, [result.field]: result.content } }
      : item) })) }));
    setWritingSuggestion(null);
  };
  useEffect(() => {
    const result = writingTask?.status === "completed" ? writingTask.result : undefined;
    if (!result || handledWritingResult.current === result) return;
    handledWritingResult.current = result;
    const item = draft.sections.flatMap(section => section.items).find(item => item.id === result.itemId);
    const snapshot = writingSnapshot.current;
    setWritingTarget(null);
    if (!item || !snapshot || snapshot.itemId !== result.itemId || snapshot.field !== result.field || snapshot.value.trim() || snapshot.item !== JSON.stringify(item)) {
      setWritingSuggestion(result);
      return;
    }
    applyWritingSuggestion(result);
    setWritingMessage("Draft added. Save when ready.");
  }, [writingTask, draft.sections]);

  const setSections = (sections: WorkingCvSection[]) => setDraft((current) => ({ ...current, sections }));
  const updateSection = (sectionId: string, update: (section: WorkingCvSection) => WorkingCvSection) => {
    setSections(draft.sections.map((section) => section.id === sectionId ? update(section) : section));
  };
  const updateItem = (sectionId: string, itemId: string, update: (item: WorkingCvItem) => WorkingCvItem) => {
    updateSection(sectionId, (section) => ({
      ...section,
      items: section.items.map((item) => item.id === itemId ? update(item) : item),
    }));
  };
  const updateItemContent = (
    sectionId: string,
    itemId: string,
    content: Partial<WorkingCvItem["content"]>,
  ) => {
    updateItem(sectionId, itemId, (current) => ({
      ...current,
      sourceMode: current.sourceMode === "custom" ? "custom" : "override",
      profileVariantId: null,
      content: { ...current.content, ...content },
    }));
  };

  const toggleItemEditing = (item: WorkingCvItem) => {
    if (editingItemId === item.id) {
      setEditingItemId(null);
      setEditingOptionalDetails([]);
      return;
    }
    setEditingItemId(item.id);
    setEditingOptionalDetails(populatedOptionalDetails(item.content));
  };

  const persistDraft = async (): Promise<WorkingCvRecord> => {
    const saved = provisional ? await window.aaaat.documentDomain.createWorkingCv({
      id: draft.id, title: draft.title, language: draft.language, candidatureId: draft.candidatureId,
      image: draft.image,
      source: draft.sourceTemplateId ? { kind: "template", templateId: draft.sourceTemplateId } : { kind: "blank" },
      content: { sections: draft.sections, pdfMetadata: draft.pdfMetadata, parserSummary: draft.parserSummary },
    }) : await window.aaaat.documentDomain.updateWorkingCv({
      id: draft.id,
      image: draft.image,
      title: draft.title,
      language: draft.language,
      pdfMetadata: draft.pdfMetadata,
      parserSummary: draft.parserSummary,
      sections: draft.sections,
    });
    setDraft(saved);
    onSaved(saved);
    return saved;
  };

  const save = async (): Promise<WorkingCvRecord> => {
    setBusy(true);
    setError(null);
    try {
      return await persistDraft();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "AAAAT could not save this CV.";
      setError(message);
      throw reason;
    } finally {
      setBusy(false);
    }
  };

  const addSection = () => {
    const name = sectionName.trim();
    if (!name) return;
    setSections([...draft.sections, {
      id: crypto.randomUUID(),
      name,
      presentationRole: "main",
      items: [],
    }]);
    setSectionName("");
  };

  const addProfileItem = (sectionId: string, itemId: string) => {
    const item = profile.find((candidate) => candidate.id === itemId);
    if (!item) return;
    updateSection(sectionId, (section) => ({
      ...section,
      items: [
        ...section.items,
        {
          id: crypto.randomUUID(),
          templateItemId: null,
          sourceMode: "current",
          profileItemId: item.id,
          profileVariantId: null,
          content: profileContent(item),
        },
      ],
    }));
    setAddingToSectionId(null);
  };

  const addCustomItem = (sectionId: string) => {
    const itemId = crypto.randomUUID();
    updateSection(sectionId, (section) => ({
      ...section,
      items: [
        ...section.items,
        {
          id: itemId,
          templateItemId: null,
          sourceMode: "custom",
          profileItemId: null,
          profileVariantId: null,
          content: { kind: "other", title: "New content" },
        },
      ],
    }));
    setAddingToSectionId(null);
    setEditingItemId(itemId);
    setEditingOptionalDetails([]);
  };

  const chooseSource = (sectionId: string, item: WorkingCvItem, value: string) => {
    if (!item.profileItemId) return;
    const base = profile.find((candidate) => candidate.id === item.profileItemId);
    if (!base) return;
    if (value === "current") {
      const content = profileContent(base);
      updateItem(sectionId, item.id, (current) => ({
        ...current,
        sourceMode: "current",
        profileVariantId: null,
        content,
      }));
      setEditingOptionalDetails(populatedOptionalDetails(content));
      return;
    }
    const variant = variants.find((candidate) => candidate.id === value && candidate.itemId === base.id);
    if (variant) {
      const content = { kind: base.kind, ...variant.content };
      updateItem(sectionId, item.id, (current) => ({
        ...current,
        sourceMode: "variant",
        profileVariantId: variant.id,
        content,
      }));
      setEditingOptionalDetails(populatedOptionalDetails(content));
    }
  };

  const saveOwnership = async (item: WorkingCvItem, target: Exclude<CvReuseTarget, "">) => {
    const variantName = variantNameByItem[item.id]?.trim() ?? "";
    if (target === "profile_variant" && !variantName) return;
    setError(null);
    try {
      const saved = dirty || provisional ? await persistDraft() : draft;
      const refreshed = await window.aaaat.documentDomain.saveWorkingItem({
        workingCvId: saved.id,
        itemId: item.id,
        target,
        ...(target === "profile_variant" ? { variantName } : {}),
      });
      setDraft(refreshed);
      onSaved(refreshed);
      setReuseChoiceByItem((current) => ({ ...current, [item.id]: "" }));
      if (target === "profile_variant") {
        setVariantNameByItem((current) => ({ ...current, [item.id]: "" }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save that reusable value.");
    }
  };

  const saveCompositionToTemplate = async () => {
    if (!draft.sourceTemplateId) return;
    const template = collections.templates.find((candidate) => candidate.id === draft.sourceTemplateId);
    if (!template) return;
    setError(null);
    try {
      const saved = dirty || provisional ? await persistDraft() : draft;
      onCollections(await window.aaaat.documentDomain.updateTemplate({
        id: template.id,
        name: template.name,
        language: saved.language,
        pdfMetadata: saved.pdfMetadata,
        image: saved.image,
        parserSummary: saved.parserSummary,
        sections: templateSections(saved),
      }));
      setCvTemplateReuseChoice("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not update the template.");
    }
  };

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    setError(null);
    try {
      const saved = dirty || provisional ? await persistDraft() : draft;
      await window.aaaat.documentDomain.saveWorkingAsTemplate({ workingCvId: saved.id, name });
      onCollections(await window.aaaat.documentDomain.collections());
      setTemplateName("");
      setCvTemplateReuseChoice("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save the new template.");
    }
  };

  const writingRequest = (itemId: string, field: CvWritingField): CvWritingRequest => ({
    workingCvId: draft.id, itemId, field, sections: draft.sections,
    ...(provisional ? { draft } : {}),
  });
  const inspectAiContext = async () => {
    const items = draft.sections.flatMap(section => section.items);
    const item = items.find(candidate => candidate.id === editingItemId) ?? items[0];
    if (!item) return;
    setAiContext(null);
    try { setAiContext(await window.aaaat.ai.cvWritingContext(writingRequest(item.id, "description"))); }
    catch (reason) { setError(readableDocumentError(reason, "AAAAT could not read the AI context.")); }
  };

  const chooseImage = async () => {
    setBusy(true);
    setError(null);
    try {
      const image = await window.aaaat.documentDomain.chooseCvImage();
      if (image) setDraft(current => ({ ...current, image }));
    } catch (reason) {
      setError(readableDocumentError(reason, "The CV image could not be added."));
    } finally {
      setBusy(false);
    }
  };

  const askAiToWrite = (item: WorkingCvItem, field: CvWritingField) => {
    if (writingActive || !documentAi.allowed) return;
    writingSnapshot.current = { itemId: item.id, field, item: JSON.stringify(item), value: String(item.content[field] ?? "") };
    setWritingSuggestion(null);
    setError(null);
    setWritingMessage(null);
    const label = field === "title" ? "Title" : field === "subtitle" ? "Subtitle" : "Description";
    setWritingTarget({ itemId: item.id, field });
    startAiTask<CvWritingResult>(
      writingTaskKey,
      async (updateDetail, signal) => {
        updateDetail(`Writing ${label.toLocaleLowerCase()} from the information assigned to this CV task…`);
        const cancelProvider = () => {
          void window.aaaat.aiTasks.cancelCvWriting(writingTaskKey).catch(() => undefined);
        };
        signal.addEventListener("abort", cancelProvider, { once: true });
        try {
          return await window.aaaat.aiTasks.writeCvField(writingTaskKey, writingRequest(item.id, field));
        } finally {
          signal.removeEventListener("abort", cancelProvider);
        }
      },
      `Write CV ${label.toLocaleLowerCase()}`,
      () => "Draft ready",
    );
  };

  const remove = async () => {
    if (busy || provisional || !window.confirm(`Remove “${document.title}”? Unsaved edits will be discarded. Generated files and templates will remain.`)) return;
    setBusy(true);
    setError(null);
    try {
      await window.aaaat.documentDomain.removeWorkingCv(document.id);
      documentRemoved(document.id);
    } catch (reason) {
      setError(readableDocumentError(reason, "AAAAT could not remove this CV."));
    } finally { setBusy(false); }
  };

  const render = async () => {
    if (!selectedBlueprintId) return;
    setBusy(true);
    setError(null);
    setRenderSettingsSuggested(false);
    try {
      const saved = dirty || provisional ? await persistDraft() : draft;
      const rendered = await window.aaaat.documentDomain.renderCv({
        cvId: saved.id,
        blueprintId: selectedBlueprintId,
      });
      onCollections(await window.aaaat.documentDomain.collections());
      await window.aaaat.documentDomain.openRenderedCv(rendered.id);
    } catch (reason) {
      const message = readableDocumentError(reason, "AAAAT could not render this CV.");
      setError(message);
      setRenderSettingsSuggested(/pdflatex was not found/iu.test(message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="document-work document-page-editor working-cv-editor" aria-label="CV editor">
      <PageToolbar>
        {draft.candidatureId ? <button type="button" disabled={documentAi.busy} aria-pressed={documentAi.allowed} aria-label="Allow AI for this application's documents" title="AI may use this application's documents" onClick={() => void documentAi.toggle()}>👁</button> : null}
        {writingSuggestion ? <><button type="button" className="document-draft-trigger" popoverTarget="cv-writing-preview">Draft ready</button><div id="cv-writing-preview" className="document-draft-preview" popover="auto"><header><strong>Draft</strong><button type="button" onClick={() => applyWritingSuggestion(writingSuggestion)} disabled={!draft.sections.some(section => section.items.some(item => item.id === writingSuggestion.itemId))}>Use</button><button type="button" onClick={() => setWritingSuggestion(null)}>Dismiss</button></header><p>{writingSuggestion.content}</p></div></> : null}
        <button type="button" disabled={busy} onClick={documentHandoff?.candidatureId ? returnToCandidature : returnToDocuments}>{provisional ? "Cancel" : "Close"}</button>
        <button type="button" disabled={(!dirty && !provisional) || busy} onClick={() => void save()}>Save</button>
        <button type="button" disabled={busy || !selectedBlueprintId} onClick={() => void render()}>{busy ? "Creating…" : "PDF"}</button>
        <button type="button" className="cv-context-trigger" popoverTarget="cv-ai-context" disabled={!draft.sections.some(section => section.items.length)} title="AI context" onClick={() => void inspectAiContext()}>Context</button>
        <div id="cv-ai-context" className="letter-ai-context cv-ai-context" popover="auto">
          {aiContext ? <>
            <strong>{aiContext.connection ? `${aiContext.connection.name} · ${aiContext.connection.model}` : "AI not configured"}</strong>
            <dl>{aiContext.context.availableInformation.map((item, index) => <div key={index}>
              <dt>{item.title}</dt><dd>{item.value.startsWith("[USERPRIVATE:") ? "Private" : item.value}</dd>
            </div>)}</dl>
          </> : <span>Loading…</span>}
        </div>
        {!provisional ? <>
          <button type="button" className="document-actions-trigger" aria-label="Document actions" popoverTarget="cv-document-actions">•••</button>
          <div id="cv-document-actions" className="application-actions-menu document-actions-menu" popover="auto">
            <button type="button" disabled={busy} onClick={() => void remove()}>Remove CV</button>
          </div>
        </> : null}
      </PageToolbar>

      {error ? (
        <div className="document-editor-message">
          <p className="error-message" role="alert">{error}</p>
          {renderSettingsSuggested ? <button className="compact-secondary" type="button" onClick={() => openSettingsFor("documents", "documents")}>Document setup</button> : null}
        </div>
      ) : null}
      {writingMessage ? <p className="compact-note document-editor-message" role="status">{writingMessage}</p> : null}

      <div className="working-cv-composition document-sheet" aria-label="CV document">
        <header className="document-sheet-heading">
          <input
            className="document-sheet-title"
            aria-label="CV title"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
          <small>{draft.candidatureId ? "Application CV" : "Standalone CV"}</small>
        </header>
        <details className="cv-image-options">
          <summary>Photo or banner <small>optional</small></summary>
          <div className="cv-image-controls">
            <button type="button" disabled={busy} onClick={() => void chooseImage()}>{draft.image ? "Replace image" : "Choose image"}</button>
            {draft.image ? <>
              <label>Use as
                <select aria-label="CV image presentation" disabled={busy} value={draft.image.mode}
                  onChange={event => setDraft(current => ({ ...current, image: current.image ? { ...current.image, mode: event.target.value as "photo" | "banner" } : null }))}>
                  <option value="photo">Photo</option>
                  <option value="banner">Banner</option>
                </select>
              </label>
              <button type="button" disabled={busy} onClick={() => setDraft(current => ({ ...current, image: null }))}>Remove image</button>
            </> : null}
          </div>
          {draft.image ? <figure className={`cv-document-image cv-document-image-${draft.image.mode}`}>
            {imagePreview?.assetId === draft.image.assetId ? <img src={imagePreview.url} alt={draft.image.mode === "photo" ? "Selected CV photo" : "Selected CV banner"} /> : null}
            <figcaption>{draft.image.name}</figcaption>
          </figure> : <p className="compact-note">Choose a PNG or JPEG. Photos fit a square area; banners fit a wide area. The image keeps its proportions.</p>}
        </details>
        {draft.sections.length === 0 ? <p className="compact-empty">Empty CV</p> : null}
        {draft.sections.length > 0 ? (
          <ol className="working-cv-sections" aria-label="CV sections">
            {draft.sections.map((section, sectionIndex) => (
              <li key={section.id} className="working-cv-section-entry">
                <section className="working-cv-section" aria-label={`${section.name} section`}>
                  <header className="working-cv-section-heading">
                    <div className="working-cv-section-title">
                      {renamingSectionId === section.id ? (
                        <label>
                          <span className="visually-hidden">Section name</span>
                          <input aria-label={`Rename ${section.name} section`} value={section.name} onChange={(event) => updateSection(section.id, (current) => ({ ...current, name: event.target.value }))} />
                        </label>
                      ) : <h2>{section.name}</h2>}

                    </div>
                    <details className="working-cv-section-options">
                      <summary aria-label={`${section.name} section options`}>•••</summary>
                      <div className="working-cv-compact-controls">
                        <label>
                          Placement
                          <select
                            aria-label={`${section.name} placement`}
                            value={section.presentationRole}
                            onChange={(event) => updateSection(section.id, (current) => ({
                              ...current,
                              presentationRole: event.target.value as CvSectionPresentationRole,
                            }))}
                          >
                            <option value="header">Header</option>
                            <option value="main">Main body</option>
                            <option value="secondary">Secondary body</option>
                            <option value="footer">Footer</option>
                          </select>
                        </label>
                        <button type="button" className="compact-secondary" onClick={() => setRenamingSectionId((current) => current === section.id ? null : section.id)}>{renamingSectionId === section.id ? "Done" : "Rename"}</button>
                        <button type="button" className="compact-secondary working-cv-icon-button" aria-label={`Move ${section.name} section up`} disabled={sectionIndex === 0} onClick={() => setSections(move(draft.sections, sectionIndex, -1))}>↑</button>
                        <button type="button" className="compact-secondary working-cv-icon-button" aria-label={`Move ${section.name} section down`} disabled={sectionIndex === draft.sections.length - 1} onClick={() => setSections(move(draft.sections, sectionIndex, 1))}>↓</button>
                        <button type="button" className="compact-secondary" onClick={() => setSections(draft.sections.filter((candidate) => candidate.id !== section.id))}>Remove</button>
                      </div>
                    </details>
                  </header>

                  {section.items.length === 0 ? <p className="working-cv-section-empty">No information in this section yet.</p> : (
                    <ol className="working-cv-items" aria-label={`${section.name} items`}>
                      {section.items.map((item, itemIndex) => {
                        const itemVariants = item.profileItemId ? variants.filter((variant) => variant.itemId === item.profileItemId) : [];
                        const editing = editingItemId === item.id;
                        const dates = dateRange(item);
                        const availableOptionalDetails = optionalCvDetails.filter(({ key }) => !editingOptionalDetails.includes(key));
                        return (
                          <li key={item.id} className="working-cv-item-entry">
                            <article className={editing ? "working-cv-item working-cv-item-editing" : "working-cv-item"} aria-label={`${item.content.title} CV item`}>
                              <div className="working-cv-item-heading">
                                <div className="working-cv-item-copy">
                                  <strong>{item.content.title}</strong>
                                  {item.content.subtitle ? <span>{item.content.subtitle}</span> : null}
                                  {dates ? <small>{dates}</small> : null}
                                </div>
                                <div className="working-cv-item-controls">
                                  <button type="button" className="compact-secondary" onClick={() => toggleItemEditing(item)}>{editing ? "Done" : "Edit"}</button>
                                  <details className="working-cv-item-options">
                                    <summary aria-label={`${item.content.title} item actions`}>•••</summary>
                                    <div className="working-cv-compact-controls">
                                      <button type="button" className="compact-secondary working-cv-icon-button" aria-label={`Move ${item.content.title} up`} disabled={itemIndex === 0} onClick={() => updateSection(section.id, (current) => ({ ...current, items: move(current.items, itemIndex, -1) }))}>↑</button>
                                      <button type="button" className="compact-secondary working-cv-icon-button" aria-label={`Move ${item.content.title} down`} disabled={itemIndex === section.items.length - 1} onClick={() => updateSection(section.id, (current) => ({ ...current, items: move(current.items, itemIndex, 1) }))}>↓</button>
                                      <button type="button" className="compact-secondary" onClick={() => {
                                        updateSection(section.id, (current) => ({ ...current, items: current.items.filter((candidate) => candidate.id !== item.id) }));
                                        if (editingItemId === item.id) {
                                          setEditingItemId(null);
                                          setEditingOptionalDetails([]);
                                        }
                                      }}>Remove</button>
                                    </div>
                                  </details>
                                </div>
                              </div>

                              {item.content.description ? <p className="working-cv-description">{item.content.description}</p> : null}
                              {item.content.url ? <p className="working-cv-link">{item.content.url}</p> : null}
                              {editing ? (
                                <div className="document-item-editor" aria-label={`Edit ${item.content.title}`}>
                                  {item.profileItemId && item.sourceMode === "override" ? (
                                    <div className="working-source-row working-source-override">
                                      <span>Edits here apply only to this CV.</span>
                                      <div className="button-row">
                                        <button type="button" className="compact-secondary" onClick={() => chooseSource(section.id, item, "current")}>Reset from My information</button>
                                        <button type="button" className="compact-secondary" onClick={() => openProfessionalInformationItem(draft.id, item.profileItemId!)}>Open My information</button>
                                      </div>
                                    </div>
                                  ) : item.profileItemId && itemVariants.length > 0 ? (
                                    <div className="working-source-row">
                                      <label>
                                        Use My information
                                        <select value={item.sourceMode === "variant" ? item.profileVariantId ?? "current" : "current"} onChange={(event) => chooseSource(section.id, item, event.target.value)}>
                                          <option value="current">Current version</option>
                                          {itemVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
                                        </select>
                                      </label>
                                      <button type="button" className="compact-secondary" onClick={() => openProfessionalInformationItem(draft.id, item.profileItemId!)}>Open My information</button>
                                    </div>
                                  ) : null}

                                  <div className="working-cv-edit-fields">
                                    <div className="working-cv-field">
                                      <div className="working-cv-field-heading">
                                        <label htmlFor={`cv-${item.id}-title`}>Title</label>
                                        <button
                                          type="button"
                                          className="working-cv-link-button"
                                          disabled={writingActive || !documentAi.allowed}
                                          aria-label="Write title with AI" title="Write title with AI"
                                          onClick={() => askAiToWrite(item, "title")}
                                        >
                                          {writingActive && writingTarget?.itemId === item.id && writingTarget.field === "title" ? "…" : "✨"}
                                        </button>
                                      </div>
                                      <input id={`cv-${item.id}-title`} value={item.content.title} onChange={(event) => updateItemContent(section.id, item.id, { title: event.target.value })} />
                                    </div>
                                    {editingOptionalDetails.includes("subtitle") ? (
                                      <div className="working-cv-field">
                                        <div className="working-cv-field-heading">
                                          <label htmlFor={`cv-${item.id}-subtitle`}>Subtitle</label>
                                          <button
                                            type="button"
                                            className="working-cv-link-button"
                                            disabled={writingActive || !documentAi.allowed}
                                            aria-label="Write subtitle with AI" title="Write subtitle with AI"
                                            onClick={() => askAiToWrite(item, "subtitle")}
                                          >
                                            {writingActive && writingTarget?.itemId === item.id && writingTarget.field === "subtitle" ? "…" : "✨"}
                                          </button>
                                        </div>
                                        <input id={`cv-${item.id}-subtitle`} value={item.content.subtitle ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { subtitle: event.target.value || undefined })} />
                                      </div>
                                    ) : null}
                                    {editingOptionalDetails.includes("description") ? (
                                      <div className="working-cv-field working-cv-wide-field">
                                        <div className="working-cv-field-heading">
                                          <label htmlFor={`cv-${item.id}-description`}>Description</label>
                                          <button
                                            type="button"
                                            className="working-cv-link-button"
                                            disabled={writingActive || !documentAi.allowed}
                                            aria-label="Write description with AI" title="Write description with AI"
                                            onClick={() => askAiToWrite(item, "description")}
                                          >
                                            {writingActive && writingTarget?.itemId === item.id && writingTarget.field === "description" ? "…" : "✨"}
                                          </button>
                                        </div>
                                        <textarea id={`cv-${item.id}-description`} rows={5} value={item.content.description ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { description: event.target.value || undefined })} />
                                      </div>
                                    ) : null}
                                    {editingOptionalDetails.includes("startDate") ? <label>Start date<input value={item.content.startDate ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { startDate: event.target.value || undefined })} /></label> : null}
                                    {editingOptionalDetails.includes("endDate") ? <label>End date<input value={item.content.endDate ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { endDate: event.target.value || undefined })} /></label> : null}
                                    {editingOptionalDetails.includes("url") ? <label className="working-cv-wide-field">Link<input value={item.content.url ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { url: event.target.value || undefined })} /></label> : null}
                                  </div>

                                  {availableOptionalDetails.length === 1 ? (
                                    <button
                                      type="button"
                                      className="compact-secondary working-cv-add-detail-button"
                                      onClick={() => {
                                        const key = availableOptionalDetails[0]?.key;
                                        if (key) setEditingOptionalDetails((current) => current.includes(key) ? current : [...current, key]);
                                      }}
                                    >
                                      + {availableOptionalDetails[0]?.label}
                                    </button>
                                  ) : availableOptionalDetails.length > 1 ? (
                                    <label className="working-cv-add-detail">
                                      <span>Add detail</span>
                                      <select
                                        aria-label={`Add detail to ${item.content.title}`}
                                        value=""
                                        onChange={(event) => {
                                          const key = event.target.value as OptionalCvDetail;
                                          if (!key) return;
                                          setEditingOptionalDetails((current) => current.includes(key) ? current : [...current, key]);
                                        }}
                                      >
                                        <option value="">Choose…</option>
                                        {availableOptionalDetails.map((detail) => <option key={detail.key} value={detail.key}>{detail.label}</option>)}
                                      </select>
                                    </label>
                                  ) : null}

                                  {item.profileItemId && item.sourceMode === "override" ? (
                                    <details className="ownership-actions">
                                      <summary>Save this edit for reuse</summary>
                                      <div>
                                        <span>This edit stays only in this CV unless you choose to reuse it.</span>
                                        <label>
                                          Reuse it as
                                          <select
                                            value={reuseChoiceByItem[item.id] ?? ""}
                                            onChange={(event) => setReuseChoiceByItem((current) => ({
                                              ...current,
                                              [item.id]: event.target.value as CvReuseTarget,
                                            }))}
                                          >
                                            <option value="">Choose…</option>
                                            <option value="profile_variant">Another My information version</option>
                                            <option value="profile">Replace the current My information version</option>
                                            {draft.sourceTemplateId && item.templateItemId ? (
                                              <option value="template">Update the CV template this came from</option>
                                            ) : null}
                                          </select>
                                        </label>
                                        {reuseChoiceByItem[item.id] === "profile_variant" ? (
                                          <label>
                                            Version name
                                            <input
                                              value={variantNameByItem[item.id] ?? ""}
                                              onChange={(event) => setVariantNameByItem((current) => ({
                                                ...current,
                                                [item.id]: event.target.value,
                                              }))}
                                              placeholder="e.g. Leadership emphasis"
                                            />
                                          </label>
                                        ) : null}
                                        {reuseChoiceByItem[item.id] ? (
                                          <button
                                            type="button"
                                            className="compact-secondary"
                                            disabled={
                                              reuseChoiceByItem[item.id] === "profile_variant"
                                              && !(variantNameByItem[item.id]?.trim())
                                            }
                                            onClick={() => void saveOwnership(
                                              item,
                                              reuseChoiceByItem[item.id] as Exclude<CvReuseTarget, "">,
                                            )}
                                          >
                                            Save for reuse
                                          </button>
                                        ) : null}
                                      </div>
                                    </details>
                                  ) : null}
                                </div>
                              ) : null}
                            </article>
                          </li>
                        );
                      })}
                    </ol>
                  )}

                  {addingToSectionId === section.id ? (
                    <div className="working-cv-add-row">
                      {(() => {
                        const available = profile.filter(
                          (item) => !section.items.some((current) => current.profileItemId === item.id),
                        );
                        if (available.length === 0) return null;
                        if (available.length === 1) {
                          const item = available[0]!;
                          return (
                            <button
                              type="button"
                              className="compact-secondary"
                              onClick={() => addProfileItem(section.id, item.id)}
                            >
                              Add {item.title} from My information
                            </button>
                          );
                        }
                        return (
                          <label>
                            From My information
                            <select defaultValue="" onChange={(event) => { if (event.target.value) addProfileItem(section.id, event.target.value); event.target.value = ""; }}>
                              <option value="">Choose…</option>
                              {available.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                            </select>
                          </label>
                        );
                      })()}
                      <button type="button" className="compact-secondary" onClick={() => addCustomItem(section.id)}>Add custom content</button>
                      <button type="button" className="working-cv-link-button" onClick={() => setAddingToSectionId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <button type="button" className="working-cv-add-information" onClick={() => setAddingToSectionId(section.id)}>＋ Add information</button>
                  )}
                </section>
              </li>
            ))}
          </ol>
        ) : null}

        <details className="working-cv-add-section">
          <summary>＋ Add section</summary>
          <div>
            <label>Section name<input value={sectionName} onChange={(event) => setSectionName(event.target.value)} placeholder="Experience" /></label>
            <button type="button" className="compact-secondary" disabled={!sectionName.trim()} onClick={addSection}>Add section</button>
          </div>
        </details>
      </div>

      <details className="document-editor-secondary">
        <summary>Document options</summary>
        <div className="document-editor-secondary-body">
          <label>
            Language
            <input
              value={draft.language ?? ""}
              onChange={(event) => setDraft((current) => ({
                ...current,
                language: event.target.value.trim() || undefined,
              }))}
              placeholder="Optional"
            />
          </label>
          <fieldset>
            <legend>PDF metadata</legend>
            <label>
              Title
              <input
                value={draft.pdfMetadata.title}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  pdfMetadata: { ...current.pdfMetadata, title: event.target.value },
                }))}
              />
            </label>
            <label>
              Author
              <input
                value={draft.pdfMetadata.author}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  pdfMetadata: { ...current.pdfMetadata, author: event.target.value },
                }))}
              />
            </label>
            <label>
              Subject
              <input
                value={draft.pdfMetadata.subject}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  pdfMetadata: { ...current.pdfMetadata, subject: event.target.value },
                }))}
              />
            </label>
            <label>
              Keywords
              <input
                value={draft.pdfMetadata.keywords}
                onChange={(event) => setDraft((current) => ({
                  ...current,
                  pdfMetadata: { ...current.pdfMetadata, keywords: event.target.value },
                }))}
              />
            </label>
          </fieldset>
          <label>
            Parser summary
            <textarea
              rows={4}
              value={draft.parserSummary}
              onChange={(event) => setDraft((current) => ({
                ...current,
                parserSummary: event.target.value,
              }))}
              placeholder="Optional plain-text summary for parsers"
            />
          </label>
          {blueprints.length > 1 ? (
            <BlueprintRenderChoice
              blueprints={blueprints}
              selectedBlueprintId={selectedBlueprintId}
              onChange={setSelectedBlueprintId}
            />
          ) : null}
          <details className="document-reuse-disclosure">
            <summary>Save this CV for reuse</summary>
            <div className="working-cv-reuse-body">
              {draft.sourceTemplateId ? (
                <>
                  <label>
                    Reuse this CV as
                    <select
                      value={cvTemplateReuseChoice}
                      onChange={(event) => setCvTemplateReuseChoice(event.target.value as CvTemplateReuseChoice)}
                    >
                      <option value="">Choose…</option>
                      <option value="new">New reusable CV template</option>
                      <option value="source">Update the template this CV started from</option>
                    </select>
                  </label>
                  {cvTemplateReuseChoice === "source" ? (
                    <button type="button" className="compact-secondary" onClick={() => void saveCompositionToTemplate()}>
                      Update template
                    </button>
                  ) : null}
                </>
              ) : null}
              {!draft.sourceTemplateId || cvTemplateReuseChoice === "new" ? (
                <div className="working-cv-template-save">
                  <label>
                    Template name
                    <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name" />
                  </label>
                  <button type="button" className="compact-secondary" disabled={!templateName.trim()} onClick={() => void saveAsTemplate()}>
                    Save template
                  </button>
                </div>
              ) : null}
            </div>
          </details>
        </div>
      </details>
    </section>
  );
}

function LetterEditor({
  document,
  provisional = false,
  profile,
  collections,
  onSaved,
  onCollections,
  onDirtyChange,
}: {
  readonly document: CoverLetterRecord;
  readonly provisional?: boolean;
  readonly profile: readonly ProfileItem[];
  readonly collections: DocumentCollections;
  readonly onSaved: (document: CoverLetterRecord) => void;
  readonly onCollections: (collections: DocumentCollections) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { documentHandoff, documentRemoved, returnToCandidature, returnToDocuments } = useContextualHandoffs();
  const documentAi = useApplicationDocumentAccess(document.candidatureId);
  const [draft, setDraft] = useState(document);
  const [body, setBody] = useState(document.bodyParagraphs.join("\n\n"));
  const draftingSnapshot = useRef<string | null>(null);
  const [draftSuggestion, setDraftSuggestion] = useState<CoverLetterDraft | null>(null);
  const draftingTaskKey = `document:cover-letter-draft:${document.id}`;
  const draftingTask = useAiTask<CoverLetterDraft>(draftingTaskKey);
  const handledDraftResult = useRef<CoverLetterDraft | null>(null);
  const draftingActive =
    draftingTask?.status === "queued" || draftingTask?.status === "working";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productionMessage, setProductionMessage] = useState<string | null>(null);
  const [aiContext, setAiContext] = useState<CoverLetterContextPreview | null>(null);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const contextRequest = () => ({ coverLetterId: draft.id, sourceIds, ...(provisional ? { draft } : {}) });
  const inspectAiContext = async () => {
    try { setAiContext(await window.aaaat.ai.coverLetterContext(contextRequest())); }
    catch (reason) { setError(readableDocumentError(reason, "AAAAT could not read the AI context.")); }
  };

  const latestRendered = collections.renderedLetters.find(
    (candidate) => candidate.coverLetterId === document.id,
  ) ?? null;
  const profileSenderDefaults = useMemo(() => letterSenderFromProfile(profile), [profile]);
  const bodyParagraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const dirty = JSON.stringify({ ...draft, bodyParagraphs }) !== JSON.stringify(document);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const applyDraftSuggestion = (suggestion: CoverLetterDraft) => {
    setDraft(current => ({ ...current, recipient: current.recipient || suggestion.recipient || undefined,
      subject: current.subject || suggestion.subject || undefined, closing: current.closing || suggestion.closing || undefined }));
    setBody(suggestion.bodyParagraphs.join("\n\n"));
    setDraftSuggestion(null);
  };
  useEffect(() => {
    const suggestion = draftingTask?.status === "completed" ? draftingTask.result : undefined;
    if (!suggestion || handledDraftResult.current === suggestion) return;
    handledDraftResult.current = suggestion;
    if (draftingSnapshot.current === null || draftingSnapshot.current.trim() || body !== draftingSnapshot.current) {
      setDraftSuggestion(suggestion);
      return;
    }
    applyDraftSuggestion(suggestion);
  }, [draftingTask, body]);

  const persistDraft = async (): Promise<CoverLetterRecord> => {
    const saved = provisional ? await window.aaaat.documentDomain.createLetter({
      id: draft.id, candidatureId: draft.candidatureId, title: draft.title, language: draft.language,
      sender: draft.sender, recipient: draft.recipient, subject: draft.subject, bodyParagraphs, closing: draft.closing,
    }) : await window.aaaat.documentDomain.updateLetter({
      id: draft.id,
      title: draft.title,
      language: draft.language,
      sender: draft.sender,
      recipient: draft.recipient,
      subject: draft.subject,
      bodyParagraphs,
      closing: draft.closing,
    });
    setDraft(saved);
    setBody(saved.bodyParagraphs.join("\n\n"));
    onSaved(saved);
    return saved;
  };

  const replaceSenderFromMyInformation = () => {
    if (
      letterSenderHasContent(draft.sender)
      && !window.confirm("Replace this letter's sender information with current My information?")
    ) {
      return;
    }
    setDraft((current) => ({ ...current, sender: profileSenderDefaults }));
  };

  const addSenderDetail = () => {
    setDraft((current) => ({
      ...current,
      sender: {
        ...current.sender,
        details: [
          ...current.sender.details,
          { id: crypto.randomUUID(), label: "", value: "" },
        ],
      },
    }));
  };

  const updateSenderDetail = (
    detailId: string,
    patch: Partial<CoverLetterRecord["sender"]["details"][number]>,
  ) => {
    setDraft((current) => ({
      ...current,
      sender: {
        ...current.sender,
        details: current.sender.details.map((detail) =>
          detail.id === detailId ? { ...detail, ...patch } : detail
        ),
      },
    }));
  };

  const removeSenderDetail = (detailId: string) => {
    setDraft((current) => ({
      ...current,
      sender: {
        ...current.sender,
        details: current.sender.details.filter((detail) => detail.id !== detailId),
      },
    }));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await persistDraft();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this cover letter.");
    } finally {
      setBusy(false);
    }
  };

  const askAi = () => {
    if (draftingActive || !documentAi.allowed) return;
    draftingSnapshot.current = body;
    setDraftSuggestion(null);
    setError(null);
    startAiTask<CoverLetterDraft>(
      draftingTaskKey,
      async (updateDetail, signal) => {
        updateDetail("Drafting from the information assigned to this cover-letter task…");
        const cancelProvider = () => {
          void window.aaaat.aiTasks.cancelCoverLetterDraft(draftingTaskKey).catch(() => undefined);
        };
        signal.addEventListener("abort", cancelProvider, { once: true });
        try {
          return await window.aaaat.aiTasks.draftCoverLetter(draftingTaskKey, {
            coverLetterId: draft.id,
            sourceIds,
            ...(provisional ? { draft } : {}),
          });
        } finally {
          signal.removeEventListener("abort", cancelProvider);
        }
      },
      "Draft cover letter",
      () => "Draft ready",
    );
  };

  const remove = async () => {
    if (busy || provisional || !window.confirm(`Remove “${document.title}”? Unsaved edits will be discarded. Generated files will remain.`)) return;
    setBusy(true);
    setError(null);
    try {
      await window.aaaat.documentDomain.removeLetter(document.id);
      documentRemoved(document.id);
    } catch (reason) {
      setError(readableDocumentError(reason, "AAAAT could not remove this cover letter."));
    } finally { setBusy(false); }
  };

  const renderLetter = async () => {
    setBusy(true);
    setError(null);
    setProductionMessage(null);
    try {
      const saved = dirty || provisional ? await persistDraft() : draft;
      const rendered = await window.aaaat.documentDomain.renderLetter({
        letterId: saved.id,
      });
      onCollections(await window.aaaat.documentDomain.collections());
      await window.aaaat.documentDomain.openRenderedLetter(rendered.id);
      setProductionMessage("Rendered cover letter retained.");
    } catch (reason) {
      setError(readableDocumentError(reason, "AAAAT could not render this cover letter."));
    } finally {
      setBusy(false);
    }
  };

  const exportLatest = async () => {
    if (!latestRendered) return;
    setError(null);
    setProductionMessage(null);
    try {
      const result = await window.aaaat.documentDomain.exportRenderedLetter(latestRendered.id);
      if (result) setProductionMessage("Source project exported.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not export this cover letter.");
    }
  };

  return (
    <section className="document-work document-page-editor letter-page-editor" aria-label="Cover letter editor">
      <PageToolbar>
        <button type="button" disabled={busy} onClick={documentHandoff?.candidatureId ? returnToCandidature : returnToDocuments}>{provisional ? "Cancel" : "Close"}</button>
        {draft.candidatureId ? <button type="button" disabled={documentAi.busy} aria-pressed={documentAi.allowed} aria-label="Allow AI for this application's documents" title="AI may use this application's documents" onClick={() => void documentAi.toggle()}>👁</button> : null}
        <button type="button" disabled={busy || draftingActive || !documentAi.allowed} title="Draft with AI using AI-allowed My information, application details and Sources" onClick={askAi}>{draftingActive ? "Drafting…" : "Draft"}</button>
        {draftSuggestion ? <><button type="button" className="document-draft-trigger" popoverTarget="letter-draft-preview">Draft ready</button><div id="letter-draft-preview" className="document-draft-preview" popover="auto"><header><strong>Draft</strong><button type="button" onClick={() => applyDraftSuggestion(draftSuggestion)}>Use</button><button type="button" onClick={() => setDraftSuggestion(null)}>Dismiss</button></header>{draftSuggestion.bodyParagraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></> : null}
        <button type="button" className="letter-context-trigger" popoverTarget="letter-ai-context" title="AI context" onClick={() => void inspectAiContext()}>Context</button>
        <div id="letter-ai-context" className="letter-ai-context" popover="auto">
          {aiContext ? <>
            <strong>{aiContext.connection ? aiContext.connection.name + " · " + aiContext.connection.model : "AI not configured"}</strong>
            {[{ title: "My information", values: aiContext.context.myInformation }, { title: "Career context", values: aiContext.context.careerContext }, { title: "Application", values: aiContext.context.applicationInformation }].filter(group => group.values.length).map(group => <details key={group.title}><summary>{group.title}</summary><dl>{group.values.map((item, index) => <div key={index}><dt>{item.title}</dt><dd>{item.value.startsWith("[USERPRIVATE:") ? "Private" : item.value}</dd></div>)}</dl></details>)}
            {aiContext.sources.length ? <section><strong>Sources</strong>{aiContext.sources.map(source => <div key={source.id}><label><input type="checkbox" checked={sourceIds.includes(source.id)} onChange={event => setSourceIds(current => event.target.checked ? [...current, source.id] : current.filter(id => id !== source.id))} />{source.title || source.url || "Application text"}</label><details><summary>Read</summary><p>{source.sourceText}</p></details></div>)}</section> : null}
          </> : <span>Loading…</span>}
        </div>
        <button type="button" disabled={(!dirty && !provisional) || busy} onClick={() => void save()}>Save</button>
        <button type="button" disabled={busy} onClick={() => void renderLetter()}>{busy ? "Creating…" : "PDF"}</button>
        {!provisional ? <>
          <button type="button" className="document-actions-trigger" aria-label="Document actions" popoverTarget="letter-document-actions">•••</button>
          <div id="letter-document-actions" className="application-actions-menu document-actions-menu" popover="auto">
            <button type="button" disabled={busy} onClick={() => void remove()}>Remove letter</button>
          </div>
        </> : null}
      </PageToolbar>

      {error || documentAi.error ? <p className="error-message document-editor-message" role="alert">{error ?? documentAi.error}</p> : null}
      {productionMessage ? <p className="compact-note document-editor-message" role="status">{productionMessage}</p> : null}

      <article className="document-sheet letter-document" aria-label="Cover letter page">
        <header className="document-sheet-heading">
          <input
            className="document-sheet-title"
            aria-label="Cover letter title"
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
          />
          <small>{draft.candidatureId ? "Application cover letter" : "Standalone cover letter"}</small>
        </header>

        <section className="letter-sender-editor" aria-label="Sender information for this letter">
          <div className="letter-sender-heading">
            <span>From</span>
            {letterSenderHasContent(profileSenderDefaults) ? (
              <button
                type="button"
                className="working-cv-link-button"
                onClick={replaceSenderFromMyInformation}
              >
                Replace with My information
              </button>
            ) : null}
          </div>
          <label className="letter-sender-name">
            <span>Name</span>
            <input
              value={draft.sender.name}
              onChange={(event) => setDraft((current) => ({
                ...current,
                sender: { ...current.sender, name: event.target.value },
              }))}
              placeholder="Your name"
            />
          </label>
          <label>
            <span>Headline</span>
            <input
              value={draft.sender.headline}
              onChange={(event) => setDraft((current) => ({
                ...current,
                sender: { ...current.sender, headline: event.target.value },
              }))}
              placeholder="Optional"
            />
          </label>
          {draft.sender.details.map((detail) => (
            <div className="letter-sender-detail" key={detail.id}>
              <label>
                <span>Label</span>
                <input
                  value={detail.label}
                  onChange={(event) => updateSenderDetail(detail.id, { label: event.target.value })}
                  placeholder="Email, phone, website…"
                />
              </label>
              <label>
                <span>Value</span>
                <input
                  value={detail.value}
                  onChange={(event) => updateSenderDetail(detail.id, { value: event.target.value })}
                />
              </label>
              <button
                type="button"
                className="working-cv-link-button"
                onClick={() => removeSenderDetail(detail.id)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="working-cv-link-button" onClick={addSenderDetail}>
            ＋ Add sender detail
          </button>
          <small>
            These fields belong to this letter only. AI access is controlled separately in My information.
          </small>
        </section>

        <div className="letter-address-block">
          <label>
            <span>To</span>
            <input
              value={draft.recipient ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, recipient: event.target.value || undefined }))}
              placeholder="Hiring manager or team"
            />
          </label>
          <label>
            <span>Subject</span>
            <input
              value={draft.subject ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value || undefined }))}
              placeholder="Application for…"
            />
          </label>
        </div>

        <label className="letter-body-field">
          <span className="visually-hidden">Letter body</span>
          <textarea
            rows={20}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write the letter here…"
          />
        </label>

        <label className="letter-closing-field">
          <span className="visually-hidden">Closing</span>
          <input
            value={draft.closing ?? ""}
            onChange={(event) => setDraft((current) => ({ ...current, closing: event.target.value || undefined }))}
            placeholder="Closing"
          />
        </label>
      </article>

      <details className="document-editor-secondary">
        <summary>Document options</summary>
        <div className="document-editor-secondary-body">
          <label>
            Language
            <input
              value={draft.language ?? ""}
              onChange={(event) => setDraft((current) => ({
                ...current,
                language: event.target.value.trim() || undefined,
              }))}
              placeholder="Optional"
            />
          </label>
          {latestRendered ? (
            <div className="document-generated-actions">
              <button type="button" className="compact-secondary" onClick={() => void window.aaaat.documentDomain.openRenderedLetter(latestRendered.id)}>
                Open latest PDF
              </button>
              <button type="button" className="compact-secondary" onClick={() => void exportLatest()}>
                Export source project
              </button>
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}

export function DocumentWork({ onDirtyChange }: { readonly onDirtyChange?: (dirty: boolean) => void }) {
  const { documentHandoff, completeDocumentDraft } = useContextualHandoffs();
  const [collections, setCollections] = useState<DocumentCollections>(emptyCollections);
  const [profile, setProfile] = useState<ProfileItem[]>([]);
  const [variants, setVariants] = useState<ProfileVariantRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.documentDomain.collections(),
      window.aaaat.profile.current(),
      window.aaaat.profileVariants.list(),
    ])
      .then(([nextCollections, nextProfile, nextVariants]) => {
        if (!active) return;
        setCollections(nextCollections);
        setProfile(nextProfile.items);
        setVariants(nextVariants);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load this document.");
      });
    return () => { active = false; };
  }, [documentHandoff?.documentId]);

  const id = documentHandoff?.draft?.document.id ?? documentHandoff?.documentId ?? null;
  const working = documentHandoff?.draft?.kind === "cv" ? documentHandoff.draft.document : collections.workingCvs.find(candidate => candidate.id === id) ?? null;
  const letter = documentHandoff?.draft?.kind === "letter" ? documentHandoff.draft.document : collections.letters.find(candidate => candidate.id === id) ?? null;
  const storeWorking = (saved: WorkingCvRecord) => setCollections((current) => ({
    ...current,
    workingCvs: [...current.workingCvs.filter(candidate => candidate.id !== saved.id), saved],
  }));
  const storeLetter = (saved: CoverLetterRecord) => setCollections((current) => ({
    ...current,
    letters: [...current.letters.filter(candidate => candidate.id !== saved.id), saved],
  }));

  if (error) return <section className="document-work"><p className="error-message" role="alert">{error}</p></section>;
  if (!id) return <section className="document-work"><p className="compact-empty">Choose a CV or cover letter to edit.</p></section>;
  if (working) return <WorkingCvEditor provisional={Boolean(documentHandoff?.draft)} key={working.id} document={working} profile={profile} variants={variants} collections={collections} onSaved={saved => { storeWorking(saved); if (documentHandoff?.draft) completeDocumentDraft(saved.id); }} onCollections={setCollections} onDirtyChange={onDirtyChange} />;
  if (letter) return <LetterEditor provisional={Boolean(documentHandoff?.draft)} key={letter.id} document={letter} profile={profile} collections={collections} onSaved={saved => { storeLetter(saved); if (documentHandoff?.draft) completeDocumentDraft(saved.id); }} onCollections={setCollections} onDirtyChange={onDirtyChange} />;
  return <section className="document-work"><p className="error-message" role="alert">This editable document no longer exists.</p></section>;
}
