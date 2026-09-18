import { useEffect, useMemo, useState } from "react";

import type { ProfileItem } from "../shared/contracts";
import type {
  CoverLetterRecord,
  CvTemplateItem,
  CvTemplateSection,
  DocumentCollections,
  WorkingCvItem,
  WorkingCvRecord,
  WorkingCvSection,
} from "../shared/document-domain-contracts";
import type { ProfileVariantRecord } from "../shared/profile-variant-contracts";
import { useContextualHandoffs } from "./contextual-handoffs";
import "./documents.css";

const emptyCollections: DocumentCollections = {
  templates: [], workingCvs: [], renderedCvs: [], letters: [], applicationPackets: [],
};

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

function sourceLabel(item: WorkingCvItem, variants: readonly ProfileVariantRecord[]): string {
  if (item.sourceMode === "custom" || item.sourceMode === "override") return "This CV only";
  if (item.sourceMode === "current") return "My information — current";
  const variant = variants.find((candidate) => candidate.id === item.profileVariantId);
  return variant ? `Saved variation — ${variant.name}` : "Saved variation";
}

function dateRange(item: WorkingCvItem): string | null {
  if (item.content.startDate && item.content.endDate) return `${item.content.startDate} – ${item.content.endDate}`;
  return item.content.startDate ?? item.content.endDate ?? null;
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
  const { documentHandoff, openProfessionalInformationItem, openSettingsFor, returnToCandidature } = useContextualHandoffs();
  const [draft, setDraft] = useState<WorkingCvRecord>(document);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [addingToSectionId, setAddingToSectionId] = useState<string | null>(null);
  const [sectionName, setSectionName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [variantNameByItem, setVariantNameByItem] = useState<Record<string, string>>({});
  const [tailoringNotes, setTailoringNotes] = useState<Record<string, string>>({});
  const [tailoringMessage, setTailoringMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renderSettingsSuggested, setRenderSettingsSuggested] = useState(false);
  const dirty = JSON.stringify({ title: draft.title, language: draft.language, sections: draft.sections }) !== JSON.stringify({ title: document.title, language: document.language, sections: document.sections });

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    // This editor deliberately resets its local draft when its selected document changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(document);
    setEditingItemId(null);
    setRenamingSectionId(null);
    setAddingToSectionId(null);
    setTailoringNotes({});
    setTailoringMessage(null);
    setRenderSettingsSuggested(false);
  }, [document]);

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
    setSections([...draft.sections, { id: crypto.randomUUID(), name, items: [] }]);
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
  };

  const chooseSource = (sectionId: string, item: WorkingCvItem, value: string) => {
    if (!item.profileItemId) return;
    const base = profile.find((candidate) => candidate.id === item.profileItemId);
    if (!base) return;
    if (value === "current") {
      updateItem(sectionId, item.id, (current) => ({
        ...current,
        sourceMode: "current",
        profileVariantId: null,
        content: profileContent(base),
      }));
      return;
    }
    const variant = variants.find((candidate) => candidate.id === value && candidate.itemId === base.id);
    if (variant) {
      updateItem(sectionId, item.id, (current) => ({
        ...current,
        sourceMode: "variant",
        profileVariantId: variant.id,
        content: { kind: base.kind, ...variant.content },
      }));
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
    if (!draft.candidatureId || busy) return;
    setBusy(true);
    setError(null);
    setTailoringMessage(null);
    try {
      const saved = dirty ? await persistDraft() : draft;
      const result = await window.aaaat.ai.tailorCv({
        candidatureId: saved.candidatureId!,
        workingCvId: saved.id,
      });
      const rank = new Map(result.recommendations.map((recommendation, index) => [recommendation.itemId, index]));
      const notes = Object.fromEntries(result.recommendations.map((recommendation) => [recommendation.itemId, recommendation.rationale]));
      const sections = saved.sections.map((section) => ({
        ...section,
        items: [...section.items].sort(
          (left, right) => (rank.get(left.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.id) ?? Number.MAX_SAFE_INTEGER),
        ),
      }));
      setDraft({ ...saved, sections });
      setTailoringNotes(notes);
      setTailoringMessage(
        result.recommendations.length > 0
          ? "AI suggestions changed only this Working CV draft. Review them, then Save or keep editing."
          : "AI did not recommend a different emphasis for this Working CV.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not tailor this Working CV with AI.");
    } finally {
      setBusy(false);
    }
  };

  const render = async () => {
    setBusy(true);
    setError(null);
    setRenderSettingsSuggested(false);
    try {
      const saved = dirty ? await persistDraft() : draft;
      const rendered = await window.aaaat.documentDomain.renderCv(saved.id);
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
    <section className="document-work working-cv-editor" aria-label="Working CV">
      <header className="document-console-heading working-cv-console-heading">
        <div>
          <p className="eyebrow">Working CV</p>
          <h1>{draft.title}</h1>
          <small>{draft.candidatureId ? "Owned by this application" : "Standalone CV"}</small>
        </div>
        <div className="button-row working-cv-primary-actions">
          {documentHandoff?.candidatureId ? (
            <button type="button" className="compact-secondary" onClick={returnToCandidature}>Return to application</button>
          ) : null}
          {draft.candidatureId ? (
            <button type="button" className="compact-secondary" disabled={busy} onClick={() => void askAiToTailor()}>Ask AI to tailor</button>
          ) : null}
          <button type="button" disabled={!dirty || busy} onClick={() => void save()}>Save</button>
          <button type="button" disabled={busy} onClick={() => void render()}>Render PDF</button>
        </div>
      </header>

      {error ? (
        <div className="button-row">
          <p className="error-message" role="alert">{error}</p>
          {renderSettingsSuggested ? <button className="compact-secondary" type="button" onClick={() => openSettingsFor("documents", "documents")}>Open Document settings</button> : null}
        </div>
      ) : null}
      {tailoringMessage ? <p className="compact-note" role="status">{tailoringMessage}</p> : null}

      <details className="working-cv-document-details">
        <summary>Document details{draft.language ? ` · ${draft.language}` : ""}</summary>
        <div className="document-metadata-grid">
          <label>Title<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
          <label>Language<input value={draft.language ?? ""} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value.trim() || undefined }))} placeholder="Optional" /></label>
        </div>
      </details>

      <div className="working-cv-composition" aria-label="CV composition">
        {draft.sections.length === 0 ? <p className="compact-empty">This CV is blank. Add a section, then add My information or custom content.</p> : null}
        <div className="working-cv-sections">
          {draft.sections.map((section, sectionIndex) => (
            <section key={section.id} className="working-cv-section" aria-label={`${section.name} section`}>
              <header className="working-cv-section-heading">
                <div className="working-cv-section-title">
                  {renamingSectionId === section.id ? (
                    <label>
                      <span className="visually-hidden">Section name</span>
                      <input aria-label={`Rename ${section.name} section`} value={section.name} onChange={(event) => updateSection(section.id, (current) => ({ ...current, name: event.target.value }))} />
                    </label>
                  ) : <h2>{section.name}</h2>}
                  <span>{section.items.length} {section.items.length === 1 ? "item" : "items"}</span>
                </div>
                <div className="working-cv-compact-controls">
                  <button type="button" className="compact-secondary" onClick={() => setRenamingSectionId((current) => current === section.id ? null : section.id)}>{renamingSectionId === section.id ? "Done" : "Rename"}</button>
                  <button type="button" className="compact-secondary working-cv-icon-button" aria-label={`Move ${section.name} section up`} disabled={sectionIndex === 0} onClick={() => setSections(move(draft.sections, sectionIndex, -1))}>↑</button>
                  <button type="button" className="compact-secondary working-cv-icon-button" aria-label={`Move ${section.name} section down`} disabled={sectionIndex === draft.sections.length - 1} onClick={() => setSections(move(draft.sections, sectionIndex, 1))}>↓</button>
                  <button type="button" className="compact-secondary" onClick={() => setSections(draft.sections.filter((candidate) => candidate.id !== section.id))}>Remove</button>
                </div>
              </header>

              <div className="working-cv-items">
                {section.items.length === 0 ? <p className="working-cv-section-empty">No information in this section yet.</p> : null}
                {section.items.map((item, itemIndex) => {
                  const itemVariants = item.profileItemId ? variants.filter((variant) => variant.itemId === item.profileItemId) : [];
                  const editing = editingItemId === item.id;
                  const dates = dateRange(item);
                  return (
                    <article key={item.id} className={editing ? "working-cv-item working-cv-item-editing" : "working-cv-item"} aria-label={`${item.content.title} CV item`}>
                      <div className="working-cv-item-heading">
                        <div className="working-cv-item-copy">
                          <strong>{item.content.title}</strong>
                          {item.content.subtitle ? <span>{item.content.subtitle}</span> : null}
                          {dates ? <small>{dates}</small> : null}
                        </div>
                        <div className="working-cv-compact-controls">
                          <button type="button" className="compact-secondary" onClick={() => setEditingItemId(editing ? null : item.id)}>{editing ? "Done" : "Edit"}</button>
                          <button type="button" className="compact-secondary working-cv-icon-button" aria-label={`Move ${item.content.title} up`} disabled={itemIndex === 0} onClick={() => updateSection(section.id, (current) => ({ ...current, items: move(current.items, itemIndex, -1) }))}>↑</button>
                          <button type="button" className="compact-secondary working-cv-icon-button" aria-label={`Move ${item.content.title} down`} disabled={itemIndex === section.items.length - 1} onClick={() => updateSection(section.id, (current) => ({ ...current, items: move(current.items, itemIndex, 1) }))}>↓</button>
                          <button type="button" className="compact-secondary" onClick={() => {
                            updateSection(section.id, (current) => ({ ...current, items: current.items.filter((candidate) => candidate.id !== item.id) }));
                            if (editingItemId === item.id) setEditingItemId(null);
                          }}>Remove</button>
                        </div>
                      </div>

                      {item.content.description ? <p className="working-cv-description">{item.content.description}</p> : null}
                      {item.content.url ? <p className="working-cv-link">{item.content.url}</p> : null}
                      <div className="working-cv-source-summary">
                        <span>{sourceLabel(item, variants)}</span>
                        {item.profileItemId && !editing ? <button type="button" className="working-cv-link-button" onClick={() => openProfessionalInformationItem(draft.id, item.profileItemId!)}>Open My information</button> : null}
                      </div>
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
                                <label>
                                  Wording source
                                  <select value={item.sourceMode === "variant" ? item.profileVariantId ?? "current" : "current"} onChange={(event) => chooseSource(section.id, item, event.target.value)}>
                                    <option value="current">My information — current</option>
                                    {itemVariants.map((variant) => <option key={variant.id} value={variant.id}>Saved variation — {variant.name}</option>)}
                                  </select>
                                </label>
                                <button type="button" className="compact-secondary" onClick={() => openProfessionalInformationItem(draft.id, item.profileItemId!)}>Open My information</button>
                              </div>
                            )
                          ) : <span className="working-cv-source-chip">This CV only</span>}

                          <div className="working-cv-edit-fields">
                            <label>Title<input value={item.content.title} onChange={(event) => updateItemContent(section.id, item.id, { title: event.target.value })} /></label>
                            <label>Subtitle<input value={item.content.subtitle ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { subtitle: event.target.value || undefined })} /></label>
                            <label className="working-cv-wide-field">Description<textarea rows={5} value={item.content.description ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { description: event.target.value || undefined })} /></label>
                            <label>Start date<input value={item.content.startDate ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { startDate: event.target.value || undefined })} /></label>
                            <label>End date<input value={item.content.endDate ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { endDate: event.target.value || undefined })} /></label>
                            <label className="working-cv-wide-field">Link<input value={item.content.url ?? ""} onChange={(event) => updateItemContent(section.id, item.id, { url: event.target.value || undefined })} /></label>
                          </div>

                          {item.profileItemId && item.sourceMode === "override" ? (
                            <div className="ownership-actions">
                              <strong>These changes are only in this CV.</strong>
                              <span>Keep them here, or deliberately reuse this wording elsewhere.</span>
                              <div className="working-cv-ownership-buttons">
                                {draft.sourceTemplateId && item.templateItemId ? <button type="button" className="compact-secondary" onClick={() => void saveOwnership(item, "template")}>Save to template</button> : null}
                                <button type="button" className="compact-secondary" onClick={() => void saveOwnership(item, "profile")}>Update My information</button>
                              </div>
                              <div className="working-cv-variant-save">
                                <label>Variation name<input value={variantNameByItem[item.id] ?? ""} onChange={(event) => setVariantNameByItem((current) => ({ ...current, [item.id]: event.target.value }))} placeholder="e.g. Leadership emphasis" /></label>
                                <button type="button" className="compact-secondary" onClick={() => void saveOwnership(item, "profile_variant")}>Save as profile variant</button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>

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
          ))}
        </div>

        <details className="working-cv-add-section">
          <summary>＋ Add section</summary>
          <div>
            <label>Section name<input value={sectionName} onChange={(event) => setSectionName(event.target.value)} placeholder="Experience" /></label>
            <button type="button" className="compact-secondary" disabled={!sectionName.trim()} onClick={addSection}>Add section</button>
          </div>
        </details>
      </div>

      <details className="working-cv-reuse">
        <summary>Reuse this CV</summary>
        <div className="working-cv-reuse-body">
          {draft.sourceTemplateId ? (
            <button type="button" className="compact-secondary" onClick={() => void saveCompositionToTemplate()}>Save current composition to source template</button>
          ) : null}
          <div className="working-cv-template-save">
            <label>Save as new template<input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Template name" /></label>
            <button type="button" className="compact-secondary" disabled={!templateName.trim()} onClick={() => void saveAsTemplate()}>Save template</button>
          </div>
        </div>
      </details>
    </section>
  );
}

function LetterEditor({ document, onSaved, onDirtyChange }: { readonly document: CoverLetterRecord; readonly onSaved: (document: CoverLetterRecord) => void; readonly onDirtyChange?: (dirty: boolean) => void }) {
  const { documentHandoff, returnToCandidature } = useContextualHandoffs();
  const [draft, setDraft] = useState(document);
  const [body, setBody] = useState(document.bodyParagraphs.join("\n\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This editor deliberately resets its local draft when its selected document changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(document);
    setBody(document.bodyParagraphs.join("\n\n"));
  }, [document]);

  const bodyParagraphs = body.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const dirty = JSON.stringify({ ...draft, bodyParagraphs }) !== JSON.stringify(document);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this cover letter.");
    } finally {
      setBusy(false);
    }
  };

  const askAi = async () => {
    setBusy(true);
    setError(null);
    try {
      const suggestion = await window.aaaat.ai.draftCoverLetter({ coverLetterId: draft.id });
      setDraft((current) => ({
        ...current,
        recipient: suggestion.recipient || undefined,
        subject: suggestion.subject || undefined,
        closing: suggestion.closing || undefined,
      }));
      setBody(suggestion.bodyParagraphs.join("\n\n"));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not draft this cover letter with AI.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="document-work" aria-label="Cover letter">
      <header className="document-console-heading">
        <div>
          <p className="eyebrow">Cover letter</p>
          <h1>{draft.title}</h1>
          <small>{draft.candidatureId ? "Owned by this application" : "Standalone letter"}</small>
        </div>
        <div className="button-row">
          {documentHandoff?.candidatureId ? <button type="button" className="compact-secondary" onClick={returnToCandidature}>Return to application</button> : null}
          <button type="button" className="compact-secondary" disabled={busy} onClick={() => void askAi()}>Ask AI to draft</button>
          <button type="button" disabled={!dirty || busy} onClick={() => void save()}>Save</button>
        </div>
      </header>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <div className="letter-editor">
        <label>Title<input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} /></label>
        <label>Language<input value={draft.language ?? ""} onChange={(event) => setDraft((current) => ({ ...current, language: event.target.value.trim() || undefined }))} /></label>
        <label>Recipient<input value={draft.recipient ?? ""} onChange={(event) => setDraft((current) => ({ ...current, recipient: event.target.value || undefined }))} /></label>
        <label>Subject<input value={draft.subject ?? ""} onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value || undefined }))} /></label>
        <label>Body<textarea rows={18} value={body} onChange={(event) => setBody(event.target.value)} /></label>
        <label>Closing<input value={draft.closing ?? ""} onChange={(event) => setDraft((current) => ({ ...current, closing: event.target.value || undefined }))} /></label>
      </div>
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
  if (working) return <WorkingCvEditor document={working} profile={profile} variants={variants} collections={collections} onSaved={storeWorking} onCollections={setCollections} onDirtyChange={onDirtyChange} />;
  if (letter) return <LetterEditor document={letter} onSaved={storeLetter} onDirtyChange={onDirtyChange} />;
  return <section className="document-work"><p className="error-message" role="alert">This editable document no longer exists.</p></section>;
}
