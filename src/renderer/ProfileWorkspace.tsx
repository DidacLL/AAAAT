import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import type {
  ProfileItem,
  ProfileItemContentPatch,
  ProfileItemInput,
  ProfileItemKind,
  ProfileSnapshot,
  ProfileVariant,
  ResolvedProfile,
} from "../shared/contracts";
import { useContextualHandoffs } from "./contextual-handoffs";
import { ProfileItemAiDisclosureControl } from "./ProfileItemAiDisclosureControl";

type ProfessionalInformationView = "overview" | "item" | "variations";

interface CareerSectionDefinition {
  readonly kind: ProfileItemKind;
  readonly section: string;
  readonly addLabel: string;
  readonly titleLabel: string;
  readonly titlePlaceholder: string;
  readonly subtitleLabel?: string;
  readonly subtitlePlaceholder?: string;
  readonly descriptionLabel: string;
  readonly supportsDates?: boolean;
  readonly supportsLink?: boolean;
}

const careerSections: readonly CareerSectionDefinition[] = [
  { kind: "identity", section: "Personal details", addLabel: "Personal details", titleLabel: "Name", titlePlaceholder: "Full name", subtitleLabel: "Professional headline", descriptionLabel: "About me" },
  { kind: "contact", section: "Personal details", addLabel: "Contact detail", titleLabel: "Email, phone or location", titlePlaceholder: "name@example.com", subtitleLabel: "Label", subtitlePlaceholder: "Email", descriptionLabel: "Additional detail" },
  { kind: "summary", section: "Profile", addLabel: "Summary", titleLabel: "Heading", titlePlaceholder: "Professional summary", descriptionLabel: "Summary" },
  { kind: "experience", section: "Work experience", addLabel: "Work experience", titleLabel: "Role", titlePlaceholder: "Product engineer", subtitleLabel: "Organisation", descriptionLabel: "Work and achievements", supportsDates: true, supportsLink: true },
  { kind: "education", section: "Education", addLabel: "Education", titleLabel: "Qualification or course", titlePlaceholder: "Computer Science", subtitleLabel: "Institution", descriptionLabel: "Subjects and results", supportsDates: true, supportsLink: true },
  { kind: "project", section: "Projects", addLabel: "Project", titleLabel: "Project", titlePlaceholder: "Project name", subtitleLabel: "Role or client", descriptionLabel: "What I built or contributed", supportsDates: true, supportsLink: true },
  { kind: "skill", section: "Skills", addLabel: "Skill", titleLabel: "Skill", titlePlaceholder: "TypeScript", subtitleLabel: "Level or context", descriptionLabel: "Evidence and detail" },
  { kind: "language", section: "Languages", addLabel: "Language", titleLabel: "Language", titlePlaceholder: "English", subtitleLabel: "Level", subtitlePlaceholder: "Professional working proficiency", descriptionLabel: "Additional detail" },
  { kind: "certification", section: "Qualifications", addLabel: "Qualification", titleLabel: "Qualification", titlePlaceholder: "Certification or licence", subtitleLabel: "Issuer", descriptionLabel: "Credential detail", supportsDates: true, supportsLink: true },
  { kind: "link", section: "Links", addLabel: "Link", titleLabel: "Link name", titlePlaceholder: "Portfolio", descriptionLabel: "What this link contains", supportsLink: true },
  { kind: "other", section: "Other career information", addLabel: "Other career detail", titleLabel: "Title", titlePlaceholder: "Career information", subtitleLabel: "Context", descriptionLabel: "Details", supportsDates: true, supportsLink: true },
];

const sectionOrder = [...new Set(careerSections.map((definition) => definition.section))];

function careerSection(kind: ProfileItemKind): CareerSectionDefinition {
  return careerSections.find((definition) => definition.kind === kind) ?? {
    kind,
    section: "Other career information",
    addLabel: "Career detail",
    titleLabel: "Title",
    titlePlaceholder: "Career information",
    subtitleLabel: "Context",
    descriptionLabel: "Details",
    supportsDates: true,
    supportsLink: true,
  };
}

interface ItemFormState {
  kind: ProfileItemKind;
  title: string;
  subtitle: string;
  description: string;
  startDate: string;
  endDate: string;
  url: string;
}

interface VariantFormState {
  name: string;
  focus: string;
  targetTags: string;
  preferredLanguage: string;
}

const emptyItem = (kind: ProfileItemKind = "other"): ItemFormState => ({
  kind,
  title: "",
  subtitle: "",
  description: "",
  startDate: "",
  endDate: "",
  url: "",
});

const emptyVariant: VariantFormState = {
  name: "",
  focus: "",
  targetTags: "",
  preferredLanguage: "",
};

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function itemInput(form: ItemFormState): ProfileItemInput {
  return {
    kind: form.kind,
    title: form.title.trim(),
    subtitle: optional(form.subtitle),
    description: optional(form.description),
    startDate: optional(form.startDate),
    endDate: optional(form.endDate),
    url: optional(form.url),
  };
}

function itemForm(item: ProfileItem): ItemFormState {
  return {
    kind: item.kind,
    title: item.title,
    subtitle: item.subtitle ?? "",
    description: item.description ?? "",
    startDate: item.startDate ?? "",
    endDate: item.endDate ?? "",
    url: item.url ?? "",
  };
}

function variantForm(variant: ProfileVariant): VariantFormState {
  return {
    name: variant.name,
    focus: variant.focus,
    targetTags: variant.targetTags.join(", "),
    preferredLanguage: variant.preferredLanguage ?? "",
  };
}

function variantInput(form: VariantFormState) {
  return {
    name: form.name.trim(),
    focus: form.focus.trim(),
    targetTags: form.targetTags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
    preferredLanguage: optional(form.preferredLanguage),
  };
}

function orderedBaseItems(snapshot: ProfileSnapshot, variant: ProfileVariant): ProfileItem[] {
  const baseRank = new Map(snapshot.items.map((item, index) => [item.id, index]));
  const rules = new Map(variant.rules.map((rule) => [rule.itemId, rule]));

  return [...snapshot.items].sort((left, right) => {
    const leftRank = rules.get(left.id)?.orderRank ?? baseRank.get(left.id) ?? 0;
    const rightRank = rules.get(right.id)?.orderRank ?? baseRank.get(right.id) ?? 0;
    return leftRank - rightRank;
  });
}

export function ProfileWorkspace({
  initialItemId,
  onDirtyChange,
}: {
  readonly initialItemId?: string;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { professionalInformationHandoff, returnToDocument } = useContextualHandoffs();
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [resolved, setResolved] = useState<ResolvedProfile | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemState, setItemState] = useState<ItemFormState>(() => emptyItem());
  const [variantState, setVariantState] = useState<VariantFormState>(emptyVariant);
  const [view, setView] = useState<ProfessionalInformationView>("overview");
  const [error, setError] = useState<string | null>(null);
  const [aiDisclosureDirty, setAiDisclosureDirty] = useState(false);
  const handledInitialItemId = useRef<string | null>(null);

  const selectedVariant = useMemo(
    () => snapshot?.variants.find((variant) => variant.id === selectedVariantId) ?? null,
    [selectedVariantId, snapshot],
  );

  const orderedItems = useMemo(
    () => (snapshot && selectedVariant ? orderedBaseItems(snapshot, selectedVariant) : []),
    [selectedVariant, snapshot],
  );

  const variantDirty = selectedVariant
    ? JSON.stringify(variantState) !== JSON.stringify(variantForm(selectedVariant))
    : selectedVariantId === null && JSON.stringify(variantState) !== JSON.stringify(emptyVariant);
  const editedItem = editingItemId
    ? snapshot?.items.find((item) => item.id === editingItemId) ?? null
    : null;
  const itemDirty = JSON.stringify(itemState) !== JSON.stringify(editedItem ? itemForm(editedItem) : emptyItem());
  const itemEditorDirty = itemDirty || aiDisclosureDirty;

  useEffect(() => {
    onDirtyChange?.(variantDirty || itemEditorDirty);
    return () => onDirtyChange?.(false);
  }, [itemEditorDirty, onDirtyChange, variantDirty]);

  const confirmItemDiscard = () =>
    !itemEditorDirty || window.confirm("Discard unsaved information edits?");

  const startNewItem = (kind: ProfileItemKind) => {
    if (!confirmItemDiscard()) return;
    setEditingItemId(null);
    setItemState(emptyItem(kind));
    setAiDisclosureDirty(false);
    setError(null);
    setView("item");
  };

  const startItemEdit = (item: ProfileItem) => {
    if (item.id !== editingItemId && !confirmItemDiscard()) return;
    setEditingItemId(item.id);
    setItemState(itemForm(item));
    setAiDisclosureDirty(false);
    setError(null);
    setView("item");
  };

  const cancelItemEdit = () => {
    if (!confirmItemDiscard()) return;
    setEditingItemId(null);
    setItemState(emptyItem());
    setAiDisclosureDirty(false);
    setError(null);
    setView("overview");
    if (professionalInformationHandoff) returnToDocument();
  };

  const refreshResolved = async (variantId: string | null) => {
    if (!variantId) {
      setResolved(null);
      return;
    }

    try {
      setResolved(await window.aaaat.profile.resolveVariant(variantId));
    } catch {
      setResolved(null);
      setError("AAAAT could not resolve that saved variation.");
    }
  };

  const acceptSnapshot = async (
    next: ProfileSnapshot,
    preferredVariantId: string | null = selectedVariantId,
    preserveVariantDraft = false,
  ) => {
    setSnapshot(next);
    const nextSelected =
      preserveVariantDraft && preferredVariantId === null
        ? null
        : next.variants.some((variant) => variant.id === preferredVariantId)
          ? preferredVariantId
          : (next.variants[0]?.id ?? null);
    const keepDraft = preserveVariantDraft && nextSelected === selectedVariantId;
    setSelectedVariantId(nextSelected);
    if (!keepDraft) {
      if (nextSelected) {
        const variant = next.variants.find((candidate) => candidate.id === nextSelected);
        if (variant) setVariantState(variantForm(variant));
      } else {
        setVariantState(emptyVariant);
      }
    }
    await refreshResolved(nextSelected);
  };

  useEffect(() => {
    let active = true;
    void window.aaaat.profile
      .current()
      .then(async (current) => {
        if (!active) return;
        setSnapshot(current);
        const firstVariant = current.variants[0] ?? null;
        setSelectedVariantId(firstVariant?.id ?? null);
        if (firstVariant) {
          setVariantState(variantForm(firstVariant));
          setResolved(await window.aaaat.profile.resolveVariant(firstVariant.id));
        }
      })
      .catch(() => {
        if (active) setError("AAAAT could not load My information.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!initialItemId) {
      handledInitialItemId.current = null;
      return;
    }
    if (handledInitialItemId.current === initialItemId) return;
    handledInitialItemId.current = initialItemId;
    let active = true;
    void window.aaaat.profile
      .current()
      .then((current) => {
        if (!active) return;
        const item = current.items.find((candidate) => candidate.id === initialItemId);
        if (!item) {
          setError("That item is no longer available in My information.");
          return;
        }
        setSnapshot(current);
        setEditingItemId(item.id);
        setItemState(itemForm(item));
        setAiDisclosureDirty(false);
        setError(null);
        setView("item");
      })
      .catch(() => {
        if (active) setError("AAAAT could not open that item from My information.");
      });
    return () => {
      active = false;
    };
  }, [initialItemId]);

  const submitItem = async (event: FormEvent) => {
    event.preventDefault();
    if (aiDisclosureDirty) {
      setError("Save or revert the AI disclosure change before saving information.");
      return;
    }
    setError(null);
    try {
      const next = editingItemId
        ? await window.aaaat.profile.updateItem({ id: editingItemId, item: itemInput(itemState) })
        : await window.aaaat.profile.addItem(itemInput(itemState));
      setEditingItemId(null);
      setItemState(emptyItem());
      setAiDisclosureDirty(false);
      await acceptSnapshot(next, selectedVariantId, true);
      setView("overview");
      if (professionalInformationHandoff) returnToDocument();
    } catch {
      setError("Check the information fields and try again.");
    }
  };

  const removeItem = async (item: ProfileItem) => {
    if (item.id === editingItemId && !confirmItemDiscard()) return;
    const confirmed = window.confirm(
      `Remove “${item.title}” from My information? Saved variations and documents that use it may change.`,
    );
    if (!confirmed) return;
    setError(null);
    try {
      await acceptSnapshot(await window.aaaat.profile.removeItem(item.id), selectedVariantId, true);
      if (editingItemId === item.id) {
        setEditingItemId(null);
        setItemState(emptyItem());
        setAiDisclosureDirty(false);
        setView("overview");
      }
    } catch {
      setError("AAAAT could not remove that information.");
    }
  };

  const createVariant = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const next = await window.aaaat.profile.createVariant(variantInput(variantState));
      const created = next.variants.find((variant) => variant.name === variantState.name.trim());
      await acceptSnapshot(next, created?.id ?? null);
    } catch {
      setError("Use a unique saved variation name and check its optional context.");
    }
  };

  const saveVariant = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedVariantId) return;
    setError(null);
    try {
      await acceptSnapshot(
        await window.aaaat.profile.updateVariant({
          id: selectedVariantId,
          ...variantInput(variantState),
        }),
        selectedVariantId,
      );
    } catch {
      setError("Use a unique saved variation name and check its optional context.");
    }
  };

  const removeVariant = async () => {
    if (!selectedVariantId) return;
    const confirmed = window.confirm(
      variantDirty
        ? "Remove this saved variation and discard its unsaved edits?"
        : "Remove this saved variation?",
    );
    if (!confirmed) return;
    setError(null);
    try {
      await acceptSnapshot(await window.aaaat.profile.removeVariant(selectedVariantId), null);
    } catch {
      setError("AAAAT could not remove that saved variation.");
    }
  };

  const selectVariant = async (variant: ProfileVariant) => {
    if (variant.id === selectedVariantId) return;
    if (variantDirty && !window.confirm("Discard unsaved saved-variation edits?")) return;
    setSelectedVariantId(variant.id);
    setVariantState(variantForm(variant));
    setError(null);
    await refreshResolved(variant.id);
  };

  const startNewVariant = () => {
    if (variantDirty && !window.confirm("Discard unsaved saved-variation edits?")) return;
    setSelectedVariantId(null);
    setResolved(null);
    setVariantState(emptyVariant);
  };

  const applyVariantItem = async (event: FormEvent<HTMLFormElement>, item: ProfileItem) => {
    event.preventDefault();
    if (!selectedVariantId || !selectedVariant) return;
    const formData = new FormData(event.currentTarget);
    const included = formData.get("included") === "on";
    const title = String(formData.get("overrideTitle") ?? "").trim();
    const description = String(formData.get("overrideDescription") ?? "").trim();
    const existing = selectedVariant.rules.find((rule) => rule.itemId === item.id);
    const patch: Record<string, string> = { ...(existing?.contentPatch ?? {}) };
    if (title.length > 0) patch.title = title;
    else delete patch.title;
    if (description.length > 0) patch.description = description;
    else delete patch.description;

    setError(null);
    try {
      await acceptSnapshot(
        await window.aaaat.profile.configureVariantItem({
          variantId: selectedVariantId,
          itemId: item.id,
          included,
          contentPatch:
            Object.keys(patch).length === 0 ? null : (patch as ProfileItemContentPatch),
        }),
        selectedVariantId,
        true,
      );
    } catch {
      setError("AAAAT could not apply that saved-variation difference.");
    }
  };

  const moveItem = async (itemId: string, offset: -1 | 1) => {
    if (!selectedVariantId) return;
    const ids = orderedItems.map((item) => item.id);
    const index = ids.indexOf(itemId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const moved = ids[index];
    const displaced = ids[target];
    if (!moved || !displaced) return;
    ids[index] = displaced;
    ids[target] = moved;
    setError(null);
    try {
      await acceptSnapshot(
        await window.aaaat.profile.reorderVariant({ variantId: selectedVariantId, itemIds: ids }),
        selectedVariantId,
        true,
      );
    } catch {
      setError("AAAAT could not reorder that saved variation.");
    }
  };

  if (!snapshot) {
    return (
      <section className="profile-workspace" aria-label="My information">
        <p>{error ?? "Loading My information..."}</p>
      </section>
    );
  }

  const activeCareerSection = careerSection(itemState.kind);
  const populatedSections = sectionOrder
    .map((section) => ({
      section,
      items: snapshot.items.filter((item) => careerSection(item.kind).section === section),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section className="profile-workspace" aria-label="My information">
      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {view === "overview" ? (
        <div className="profile-column professional-information-overview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Career profile</p>
              <h2>My information</h2>
            </div>
            <details className="career-add-menu">
              <summary className="compact-primary">+ Add</summary>
              <div className="career-add-options" aria-label="Add to career profile">
                {careerSections.map((definition) => (
                  <button type="button" key={definition.kind} onClick={() => startNewItem(definition.kind)}>
                    {definition.addLabel}
                  </button>
                ))}
              </div>
            </details>
          </div>

          {snapshot.items.length === 0 ? (
            <div className="professional-information-empty">
              <h3>Your career profile is empty</h3>
            </div>
          ) : (
            <div className="career-record" aria-label="Career profile sections">
              {populatedSections.map((group) => (
                <section className="career-record-section" key={group.section} aria-label={group.section}>
                  <header>
                    <h3>{group.section}</h3>
                    <span>{group.items.length}</span>
                  </header>
                  <div className="item-list">
                    {group.items.map((item) => (
                      <article className="profile-item" key={item.id}>
                        <div>
                          <h4>{item.title}</h4>
                          {item.subtitle ? <p className="profile-item-subtitle">{item.subtitle}</p> : null}
                          {item.description ? <p>{item.description}</p> : null}
                          {item.startDate || item.endDate ? <time>{[item.startDate, item.endDate].filter(Boolean).join(" – ")}</time> : null}
                        </div>
                        <div className="row-actions">
                          <button type="button" title={`Edit ${item.title}`} aria-label={`Edit ${item.title}`} onClick={() => startItemEdit(item)}>✎</button>
                          <button type="button" title={`Remove ${item.title}`} aria-label={`Remove ${item.title}`} onClick={() => void removeItem(item)}>×</button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {snapshot.items.length > 0 ? <details className="professional-information-secondary" aria-label="Saved variations">
            <summary>Saved variations (optional)</summary>
            <section>
            <div>
              <strong>Saved variations</strong>
            </div>
            <button className="compact-secondary" type="button" onClick={() => setView("variations")}>
              {snapshot.variants.length === 0
                ? "Create saved variation"
                : `Saved variations (${String(snapshot.variants.length)})`}
            </button>
            {variantDirty ? <span>Unsaved variation changes</span> : null}
            </section>
          </details> : null}
        </div>
      ) : null}

      {view === "item" ? (
        <div className="profile-column professional-information-editor">
          <button className="compact-secondary professional-information-back" type="button" onClick={cancelItemEdit}>
            {professionalInformationHandoff ? "Return to document" : "← All information"}
          </button>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{activeCareerSection.section}</p>
              <h2>{editingItemId ? `Edit ${itemState.title || activeCareerSection.addLabel}` : `Add ${activeCareerSection.addLabel.toLowerCase()}`}</h2>
            </div>
            {itemEditorDirty ? <span>Unsaved changes</span> : null}
          </div>
          <form className="editor-card" onSubmit={(event) => void submitItem(event)}>
            <label>
              {activeCareerSection.titleLabel}
              <input required value={itemState.title} onChange={(event) => setItemState({ ...itemState, title: event.target.value })} placeholder={activeCareerSection.titlePlaceholder} />
            </label>
            {activeCareerSection.subtitleLabel ? <label>
              {activeCareerSection.subtitleLabel}
              <input value={itemState.subtitle} onChange={(event) => setItemState({ ...itemState, subtitle: event.target.value })} placeholder={activeCareerSection.subtitlePlaceholder} />
            </label> : null}
            <label className="wide-field">
              {activeCareerSection.descriptionLabel}
              <textarea value={itemState.description} onChange={(event) => setItemState({ ...itemState, description: event.target.value })} />
            </label>
            {activeCareerSection.supportsDates || activeCareerSection.supportsLink ? <details className="wide-field information-more-details">
              <summary title="Add optional dates or a related link">More</summary>
              <div className="information-more-grid">
                {activeCareerSection.supportsDates ? <>
                  <label>From<input value={itemState.startDate} onChange={(event) => setItemState({ ...itemState, startDate: event.target.value })} /></label>
                  <label>To<input value={itemState.endDate} onChange={(event) => setItemState({ ...itemState, endDate: event.target.value })} /></label>
                </> : null}
                {activeCareerSection.supportsLink ? <label className="wide-field">Link<input type="url" value={itemState.url} onChange={(event) => setItemState({ ...itemState, url: event.target.value })} /></label> : null}
              </div>
            </details> : null}
            <div className="form-actions wide-field">
              <button className="compact-primary" type="submit">
                {editingItemId ? "Save" : `Add ${activeCareerSection.addLabel.toLowerCase()}`}
              </button>
              <button className="compact-secondary" type="button" onClick={cancelItemEdit}>Cancel</button>
            </div>
          </form>
          {editingItemId ? <details className="career-editor-advanced">
            <summary title="Choose whether this item may be included when AI helps with a document">AI use</summary>
            <ProfileItemAiDisclosureControl key={editingItemId} itemId={editingItemId} onDirtyChange={setAiDisclosureDirty} />
          </details> : null}
        </div>
      ) : null}

      {view === "variations" ? (
        <div className="profile-column saved-variations-workspace">
          <button
            className="compact-secondary professional-information-back"
            type="button"
            onClick={() => setView("overview")}
          >
            ← Career profile
          </button>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Optional reuse</p>
              <h2>Saved variations</h2>
            </div>
            <span>{snapshot.variants.length}</span>
          </div>

          {selectedVariant ? (
            <>
              <div className="variant-tabs" aria-label="Saved variations">
                {snapshot.variants.map((variant) => (
                  <button
                    className={variant.id === selectedVariantId ? "active-variant" : ""}
                    type="button"
                    key={variant.id}
                    onClick={() => void selectVariant(variant)}
                  >
                    {variant.name}
                  </button>
                ))}
                <button type="button" onClick={startNewVariant}>New saved variation</button>
              </div>

              <form className="editor-card" onSubmit={(event) => void saveVariant(event)}>
                <label>
                  Name
                  <input required value={variantState.name} onChange={(event) => setVariantState({ ...variantState, name: event.target.value })} />
                </label>
                <label>
                  Writing language (optional)
                  <input value={variantState.preferredLanguage} onChange={(event) => setVariantState({ ...variantState, preferredLanguage: event.target.value })} />
                </label>
                <label className="wide-field">
                  Intended focus
                  <textarea value={variantState.focus} onChange={(event) => setVariantState({ ...variantState, focus: event.target.value })} />
                </label>
                <label className="wide-field">
                  Context tags
                  <input placeholder="backend, platform, typescript" value={variantState.targetTags} onChange={(event) => setVariantState({ ...variantState, targetTags: event.target.value })} />
                </label>
                <div className="form-actions wide-field">
                  <button className="compact-primary" type="submit">Save variation</button>
                  <button className="compact-secondary" type="button" onClick={() => void removeVariant()}>Remove variation</button>
                </div>
              </form>

              <div className="variant-rule-list">
                {orderedItems.map((item, index) => {
                  const rule = selectedVariant.rules.find((candidate) => candidate.itemId === item.id);
                  const effective = resolved?.items.find((candidate) => candidate.id === item.id);
                  return (
                    <form
                      className="variant-rule"
                      key={`${selectedVariant.id}:${item.id}:${JSON.stringify(rule)}`}
                      onSubmit={(event) => void applyVariantItem(event, item)}
                    >
                      <div className="variant-rule-title">
                        <label className="check-field">
                          <input name="included" type="checkbox" defaultChecked={!rule?.excluded} />
                          Include in this variation
                        </label>
                        <strong>{effective?.title ?? item.title}</strong>
                        <div className="order-actions">
                          <button type="button" disabled={index === 0} onClick={() => void moveItem(item.id, -1)}>Move earlier</button>
                          <button type="button" disabled={index === orderedItems.length - 1} onClick={() => void moveItem(item.id, 1)}>Move later</button>
                        </div>
                      </div>
                      <label>
                        Alternate title
                        <input name="overrideTitle" defaultValue={rule?.contentPatch?.title ?? ""} />
                      </label>
                      <label className="wide-field">
                        Alternate description
                        <textarea name="overrideDescription" defaultValue={rule?.contentPatch?.description ?? ""} />
                      </label>
                      <button className="compact-secondary" type="submit">Apply difference</button>
                    </form>
                  );
                })}
              </div>
            </>
          ) : (
            <form className="editor-card" onSubmit={(event) => void createVariant(event)}>
              <label>
                Name
                <input required value={variantState.name} onChange={(event) => setVariantState({ ...variantState, name: event.target.value })} />
              </label>
              <label>
                Writing language (optional)
                <input value={variantState.preferredLanguage} onChange={(event) => setVariantState({ ...variantState, preferredLanguage: event.target.value })} />
              </label>
              <label className="wide-field">
                Intended focus
                <textarea value={variantState.focus} onChange={(event) => setVariantState({ ...variantState, focus: event.target.value })} />
              </label>
              <label className="wide-field">
                Context tags
                <input value={variantState.targetTags} onChange={(event) => setVariantState({ ...variantState, targetTags: event.target.value })} />
              </label>
              <button className="compact-primary wide-field" type="submit">Create saved variation</button>
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
