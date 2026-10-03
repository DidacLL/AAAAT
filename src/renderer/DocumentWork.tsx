import { useEffect, useMemo, useRef, useState } from "react";

import type { CoverLetterDraft, CvTailoringResult } from "../shared/ai-contracts";
import type { ProfileItem } from "../shared/contracts";
import type {
  BlueprintSummary,
  CoverLetterRecord,
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
import "./documents.css";

const emptyCollections: DocumentCollections = {
  templates: [],
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};

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

export function WorkingCvEditor({
  document,
  profile,
  variants,
  collections,
  onSaved,
  onCollections,
  onDirtyChange,
}: {
  readonly document: WorkingCvRecord;
  readonly profile: readonly ProfileItem[];
  readonly variants: readonly ProfileVariantRecord[];
  readonly collections: DocumentCollections;
  readonly onSaved: (document: WorkingCvRecord) => void;
  readonly onCollections: (collections: DocumentCollections) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { documentHandoff, openProfessionalInformationItem, openSettingsFor, returnToCandidature, returnToDocuments } = useContextualHandoffs();
  const { blueprints, selectedBlueprintId, setSelectedBlueprintId } = useBlueprintSelection();
  const [draft, setDraft] = useState<WorkingCvRecord>(document);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingOptionalDetails, setEditingOptionalDetails] = useState<OptionalCvDetail[]>([]);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [variantNameByItem, setVariantNameByItem] = useState<Record<string, string>>({});
  const [tailoringNotes, setTailoringNotes] = useState<Record<string, string>>({});
  const [tailoringMessage, setTailoringMessage] = useState<string | null>(null);
  const tailoringTaskKey = `document:cv-tailoring:${document.id}`;
  const tailoringTask = useAiTask<CvTailoringResult>(tailoringTaskKey);
  const handledTailoringResult = useRef<CvTailoringResult | null>(null);
  const tailoringActive =
    tailoringTask?.status === "queued" || tailoringTask?.status === "working";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderSettingsSuggested, setRenderSettingsSuggested] = useState(false);
  const dirty = JSON.stringify({ title: draft.title, language: draft.language, sections: draft.sections }) !== JSON.stringify({ title: document.title, language: document.language, sections: document.sections });

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const result = tailoringTask?.status === "completed" ? tailoringTask.result : undefined;
    if (!result || handledTailoringResult.current === result) return;
    handledTailoringResult.current = result;
    const rank = new Map(
      result.recommendations.map((recommendation, index) => [recommendation.itemId, index]),
    );
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) => ({
        ...section,
        items: [...section.items].sort(
          (left, right) =>
            (rank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (rank.get(right.id) ?? Number.MAX_SAFE_INTEGER),
        ),
      })),
    }));
    setTailoringNotes(
      Object.fromEntries(
        result.recommendations.map((recommendation) => [
          recommendation.itemId,
          recommendation.rationale,
        ]),
      ),
    );
    setTailoringMessage(
      result.recommendations.length > 0
        ? "AI suggestions are ready in this CV draft. Review them, then Save or keep editing."
        : "AI did not recommend a different emphasis for this CV.",
    );
  }, [tailoringTask]);

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
    const saved = await window.aaaat.documentDomain.updateWorkingCv({
      id: draft.id,
      title: draft.title,
      language: draft.language,
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
      const message = reason instanceof Error ? reason.message : "AAAAT could not save this Working CV.";
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

  const saveOwnership = async (item: WorkingCvItem, target: "template" | "profile_variant" | "profile") => {
    setError(null);
    try {
      const saved = dirty ? await persistDraft() : draft;
      const refreshed = await window.aaaat.documentDomain.saveWorkingItem({
        workingCvId: saved.id,
        itemId: item.id,
        target,
        ...(target === "profile_variant" ? {
          variantName: variantNameByItem[item.id]?.trim() || "CV wording",
        } : {}),
      });
      setDraft(refreshed);
      onSaved(refreshed);
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
      const saved = dirty ? await persistDraft() : draft;
      onCollections(await window.aaaat.documentDomain.updateTemplate({
        id: template.id,
        name: template.name,
        language: saved.language,
        sections: templateSections(saved),
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not update the template.");
    }
  };

  const saveAsTemplate = async () => {
    const name = templateName.trim();
    if (!name) return;
    setError(null);
    try {
      const saved = dirty ? await persistDraft() : draft;
      await window.aaaat.documentDomain.saveWorkingAsTemplate({ workingCvId: saved.id, name });
      onCollections(await window.aaaat.documentDomain.collections());
      setTemplateName("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save the new template.");
    }
  };

  const askAiToTailor = async () => {
    if (!draft.candidatureId || tailoringActive) return;
    setError(null);
    setTailoringMessage(null);
    try {
      const saved = dirty ? await persistDraft() : draft;
      startAiTask<CvTailoringResult>(
        tailoringTaskKey,
        async (updateDetail) => {
          updateDetail("Reviewing application context and CV content…");
          return window.aaaat.ai.tailorCv({
            candidatureId: saved.candidatureId!,
            workingCvId: saved.id,
          });
        },
        "Tailor CV",
        (result) =>
          result.recommendations.length > 0 ? "Suggestions ready" : "No changes suggested",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not prepare this CV for AI.");
    }
  };

  const render = async () => {
    if (!selectedBlueprintId) return;
    setBusy(true);
    setError(null);
    setRenderSettingsSuggested(false);
    try {
      const saved = dirty ? await persistDraft() : draft;
      const rendered = await window.aaaat.documentDomain.renderCv({
        cvId: saved.id,
        blueprintId: selectedBlueprintId,
      });
      onCollections(await window.aaaat.documentDomain.collections());
      await window.aaaat.documentDomain.openRenderedCv(rendered.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not render this CV.");
      setRenderSettingsSuggested(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="document-work document-page-editor working-cv-editor" aria-label="CV editor">
      <header className="document-editor-toolbar">
        <div className="document-editor-context">
          <button
            type="button"
            className="document-back-button"
            onClick={documentHandoff?.candidatureId ? returnToCandidature : returnToDocuments}
          >
            ← {documentHandoff?.candidatureId ? "Application" : "Documents"}
          </button>
          <div>
            <p className="eyebrow">CV</p>
            <span className="document-save-state">{dirty ? "Unsaved changes" : "Saved"}</span>
          </div>
        </div>
        <div className="document-editor-actions">
          {draft.candidatureId ? (
            <button type="button" className="compact-secondary" disabled={busy || tailoringActive} onClick={() => void askAiToTailor()}>
              {tailoringActive ? "AI working…" : "Tailor with AI"}
            </button>
          ) : null}
          <button type="button" disabled={!dirty || busy} onClick={() => void save()}>Save</button>
          <button type="button" className="compact-primary" disabled={busy || !selectedBlueprintId} onClick={() => void render()}>
            {busy ? "Creating PDF…" : "Create PDF"}
          </button>
        </div>
      </header>

      {error ? (
        <div className="document-editor-message">
          <p className="error-message" role="alert">{error}</p>
          {renderSettingsSuggested ? <button className="compact-secondary" type="button" onClick={() => openSettingsFor("documents", "documents")}>Document setup</button> : null}
        </div>
      ) : null}
      {tailoringMessage ? <p className="compact-note document-editor-message" role="status">{tailoringMessage}</p> : null}

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
        {draft.sections.length === 0 ? <p className="compact-empty">This CV is blank. Add a section, then add My information or custom content.</p> : null}
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
                          Role
                          <select
                            aria-label={`${section.name} presentation role`}
                            value={section.presentationRole}
                            onChange={(event) => updateSection(section.id, (current) => ({
                              ...current,
                              presentationRole: event.target.value === "secondary" ? "secondary" : "main",
                            }))}
                          >
                            <option value="main">Main</option>
                            <option value="secondary">Secondary</option>
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
                              {tailoringNotes[item.id] ? <p className="compact-note"><strong>AI:</strong> {tailoringNotes[item.id]}</p> : null}

                              {editing ? (
                                <div className="document-item-editor" aria-label={`Edit ${item.content.title}`}>
                                  {item.profileItemId ? (
                                    item.sourceMode === "override" ? (
                                      <div className="working-source-row working-source-override">
                                        <span className="working-cv-source-chip">This CV only</span>
                                        <div className="button-row">
                                          <button type="button" className="compact-secondary" onClick={() => chooseSource(section.id, item, "current")}>Reset from My information</button>
                                          <button type="button" className="compact-secondary" onClick={() => openProfessionalInformationItem(draft.id, item.profileItemId!)}>Open My information</button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="working-source-row">
                                        {itemVariants.length > 0 ? (
                                          <label>
                                            Use wording
                                            <select value={item.sourceMode === "variant" ? item.profileVariantId ?? "current" : "current"} onChange={(event) => chooseSource(section.id, item, event.target.value)}>
                                              <option value="current">Current My information</option>
                                              {itemVariants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
                                            </select>
                                          </label>
                                        ) : <span className="working-cv-source-chip">Uses My information</span>}
                                        <button type="button" className="compact-secondary" onClick={() => openProfessionalInformationItem(draft.id, item.profileItemId!)}>Open My information</button>
                                      </div>
                                    )
                                  ) : <span className="working-cv-source-chip">This CV only</span>}

                                  <div className="working-cv-edit-fields">
                                    <label>Title<input value={item.content.title} onChange={(event) => updateItemContent(section.id, item.id, { title: event.target.value })} /></label>
                                    {editingOptionalDetails.includes("subtitle") ? <label>Subtitle<input value={item.content.subtitle ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { subtitle: event.target.value || undefined })} /></label> : null}
                                    {editingOptionalDetails.includes("description") ? <label className="working-cv-wide-field">Description<textarea rows={5} value={item.content.description ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { description: event.target.value || undefined })} /></label> : null}
                                    {editingOptionalDetails.includes("startDate") ? <label>Start date<input value={item.content.startDate ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { startDate: event.target.value || undefined })} /></label> : null}
                                    {editingOptionalDetails.includes("endDate") ? <label>End date<input value={item.content.endDate ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { endDate: event.target.value || undefined })} /></label> : null}
                                    {editingOptionalDetails.includes("url") ? <label className="working-cv-wide-field">Link<input value={item.content.url ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { url: event.target.value || undefined })} /></label> : null}
                                  </div>

                                  {availableOptionalDetails.length > 0 ? (
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
                                      <summary>Reuse these edits elsewhere</summary>
                                      <div>
                                        <span>These changes are currently only in this CV.</span>
                                        <div className="working-cv-ownership-buttons">
                                          {draft.sourceTemplateId && item.templateItemId ? <button type="button" className="compact-secondary" onClick={() => void saveOwnership(item, "template")}>Update template</button> : null}
                                          <button type="button" className="compact-secondary" onClick={() => void saveOwnership(item, "profile")}>Update My information</button>
                                        </div>
                                        <div className="working-cv-variant-save">
                                          <label>Save alternate wording<input value={variantNameByItem[item.id] ?? ""} onChange={(event) => setVariantNameByItem((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="e.g. Leadership emphasis" /></label>
                                          <button type="button" className="compact-secondary" onClick={() => void saveOwnership(item, "profile_variant")}>Save variation</button>
                                        </div>
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
                      <label>
                        From My information
                        <select defaultValue="" onChange={(event) => { if (event.target.value) addProfileItem(section.id, event.target.value); event.target.value = ""; }}>
                          <option value="">Choose…</option>
                          {profile.filter((item) => !section.items.some((current) => current.profileItemId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                        </select>
                      </label>
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
          {blueprints.length > 1 ? (
            <BlueprintRenderChoice
              blueprints={blueprints}
              selectedBlueprintId={selectedBlueprintId}
              onChange={setSelectedBlueprintId}
            />
          ) : null}
          <details className="document-reuse-disclosure">
            <summary>Reuse this CV</summary>
            <div className="working-cv-reuse-body">
              {draft.sourceTemplateId ? (
                <button type="button" className="compact-secondary" onClick={() => void saveCompositionToTemplate()}>
                  Update source template
                </button>
              ) : null}
              <div className="working-cv-template-save">
                <label>
                  New template name
                  <input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name" />
                </label>
                <button type="button" className="compact-secondary" disabled={!templateName.trim()} onClick={() => void saveAsTemplate()}>
                  Save as template
                </button>
              </div>
            </div>
          </details>
        </div>
      </details>
    </section>
  );
}

function LetterEditor({
  document,
  collections,
  onSaved,
  onCollections,
  onDirtyChange,
}: {
  readonly document: CoverLetterRecord;
  readonly collections: DocumentCollections;
  readonly onSaved: (document: CoverLetterRecord) => void;
  readonly onCollections: (collections: DocumentCollections) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { documentHandoff, returnToCandidature, returnToDocuments } = useContextualHandoffs();
  const { blueprints, selectedBlueprintId, setSelectedBlueprintId } = useBlueprintSelection();
  const [draft, setDraft] = useState(document);
  const [body, setBody] = useState(document.bodyParagraphs.join("\n\n"));
  const draftingTaskKey = `document:cover-letter-draft:${document.id}`;
  const draftingTask = useAiTask<CoverLetterDraft>(draftingTaskKey);
  const handledDraftResult = useRef<CoverLetterDraft | null>(null);
  const draftingActive =
    draftingTask?.status === "queued" || draftingTask?.status === "working";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productionMessage, setProductionMessage] = useState<string | null>(null);

  const latestRendered = collections.renderedLetters.find(
    (candidate) => candidate.coverLetterId === document.id,
  ) ?? null;
  const bodyParagraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const dirty = JSON.stringify({ ...draft, bodyParagraphs }) !== JSON.stringify(document);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const suggestion = draftingTask?.status === "completed" ? draftingTask.result : undefined;
    if (!suggestion || handledDraftResult.current === suggestion) return;
    handledDraftResult.current = suggestion;
    setDraft((current) => ({
      ...current,
      recipient: suggestion.recipient || undefined,
      subject: suggestion.subject || undefined,
      closing: suggestion.closing || undefined,
    }));
    setBody(suggestion.bodyParagraphs.join("\n\n"));
  }, [draftingTask]);

  const persistDraft = async (): Promise<CoverLetterRecord> => {
    const saved = await window.aaaat.documentDomain.updateLetter({
      id: draft.id,
      title: draft.title,
      language: draft.language,
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

  const askAi = async () => {
    if (draftingActive) return;
    setError(null);
    try {
      const saved = dirty ? await persistDraft() : draft;
      startAiTask<CoverLetterDraft>(
        draftingTaskKey,
        async (updateDetail) => {
          updateDetail("Drafting from the application and allowed My information…");
          return window.aaaat.ai.draftCoverLetter({ coverLetterId: saved.id });
        },
        "Draft cover letter",
        () => "Draft ready",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not prepare this cover letter for AI.");
    }
  };

  const renderLetter = async () => {
    if (!selectedBlueprintId) return;
    setBusy(true);
    setError(null);
    setProductionMessage(null);
    try {
      const saved = dirty ? await persistDraft() : draft;
      const rendered = await window.aaaat.documentDomain.renderLetter({
        letterId: saved.id,
        blueprintId: selectedBlueprintId,
      });
      onCollections(await window.aaaat.documentDomain.collections());
      await window.aaaat.documentDomain.openRenderedLetter(rendered.id);
      setProductionMessage("Rendered cover letter retained.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not render this cover letter.");
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
      <header className="document-editor-toolbar">
        <div className="document-editor-context">
          {documentHandoff?.candidatureId ? (
            <button type="button" className="document-back-button" onClick={returnToCandidature}>← Application</button>
          ) : null}
          <div>
            <p className="eyebrow">Cover letter</p>
            <span className="document-save-state">{dirty ? "Unsaved changes" : "Saved"}</span>
          </div>
        </div>
        <div className="document-editor-actions">
          <button type="button" className="compact-secondary" disabled={busy || draftingActive} onClick={() => void askAi()}>
            {draftingActive ? "AI working…" : "Draft with AI"}
          </button>
          <button type="button" disabled={!dirty || busy} onClick={() => void save()}>Save</button>
          <button type="button" className="compact-primary" disabled={busy || !selectedBlueprintId} onClick={() => void renderLetter()}>
            {busy ? "Creating PDF…" : "Create PDF"}
          </button>
        </div>
      </header>

      {error ? <p className="error-message document-editor-message" role="alert">{error}</p> : null}
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
          {blueprints.length > 1 ? (
            <BlueprintRenderChoice
              blueprints={blueprints}
              selectedBlueprintId={selectedBlueprintId}
              onChange={setSelectedBlueprintId}
            />
          ) : null}
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
  const { documentHandoff } = useContextualHandoffs();
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

  const id = documentHandoff?.documentId ?? null;
  const working = useMemo(() => collections.workingCvs.find((candidate) => candidate.id === id) ?? null, [collections, id]);
  const letter = useMemo(() => collections.letters.find((candidate) => candidate.id === id) ?? null, [collections, id]);
  const storeWorking = (saved: WorkingCvRecord) => setCollections((current) => ({
    ...current,
    workingCvs: current.workingCvs.map((candidate) => candidate.id === saved.id ? saved : candidate),
  }));
  const storeLetter = (saved: CoverLetterRecord) => setCollections((current) => ({
    ...current,
    letters: current.letters.map((candidate) => candidate.id === saved.id ? saved : candidate),
  }));

  if (error) return <section className="document-work"><p className="error-message" role="alert">{error}</p></section>;
  if (!id) return <section className="document-work"><p className="compact-empty">Choose a Working CV or letter to edit.</p></section>;
  if (working) return <WorkingCvEditor key={working.id} document={working} profile={profile} variants={variants} collections={collections} onSaved={storeWorking} onCollections={setCollections} onDirtyChange={onDirtyChange} />;
  if (letter) return <LetterEditor key={letter.id} document={letter} collections={collections} onSaved={storeLetter} onCollections={setCollections} onDirtyChange={onDirtyChange} />;
  return <section className="document-work"><p className="error-message" role="alert">This editable document no longer exists.</p></section>;
}
