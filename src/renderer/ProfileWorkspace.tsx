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

const itemKinds: readonly ProfileItemKind[] = [
  "identity",
  "contact",
  "summary",
  "experience",
  "education",
  "project",
  "skill",
  "certification",
  "language",
  "link",
];

type ProfessionalInformationView = "overview" | "item" | "variations";

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

const emptyItem: ItemFormState = {
  kind: "summary",
  title: "",
  subtitle: "",
  description: "",
  startDate: "",
  endDate: "",
  url: "",
};

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
  const [itemState, setItemState] = useState<ItemFormState>(emptyItem);
  const [variantState, setVariantState] = useState<VariantFormState>(emptyVariant);
  const [view, setView] = useState<ProfessionalInformationView>("overview");
  const [error, setError] = useState<string | null>(null);
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
  const itemDirty = JSON.stringify(itemState) !== JSON.stringify(editedItem ? itemForm(editedItem) : emptyItem);

  useEffect(() => {
    onDirtyChange?.(variantDirty || itemDirty);
    return () => onDirtyChange?.(false);
  }, [itemDirty, onDirtyChange, variantDirty]);

  const confirmItemDiscard = () => !itemDirty || window.confirm("Discard unsaved information edits?");

  const startNewItem = () => {
    if (!confirmItemDiscard()) return;
    setEditingItemId(null);
    setItemState(emptyItem);
    setError(null);
    setView("item");
  };

  const startItemEdit = (item: ProfileItem) => {
    if (item.id !== editingItemId && !confirmItemDiscard()) return;
    setEditingItemId(item.id);
    setItemState(itemForm(item));
    setError(null);
    setView("item");
  };

  const cancelItemEdit = () => {
    if (!confirmItemDiscard()) return;
    setEditingItemId(null);
    setItemState(emptyItem);
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
        if (active) setError("AAAAT could not load professional information.");
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
          setError("The reusable professional-information item is no longer available.");
          return;
        }
        setSnapshot(current);
        setEditingItemId(item.id);
        setItemState(itemForm(item));
        setError(null);
        setView("item");
      })
      .catch(() => {
        if (active) setError("AAAAT could not open that reusable professional information.");
      });
    return () => {
      active = false;
    };
  }, [initialItemId]);

  const submitItem = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const next = editingItemId
        ? await window.aaaat.profile.updateItem({ id: editingItemId, item: itemInput(itemState) })
        : await window.aaaat.profile.addItem(itemInput(itemState));
      setEditingItemId(null);
      setItemState(emptyItem);
      await acceptSnapshot(next, selectedVariantId, true);
      setView("overview");
      if (professionalInformationHandoff) returnToDocument();
    } catch {
      setError("Check the information fields and try again.");
    }
  };

  const removeItem = async (itemId: string) => {
    if (itemId === editingItemId && !confirmItemDiscard()) return;
    setError(null);
    try {
      await acceptSnapshot(await window.aaaat.profile.removeItem(itemId), selectedVariantId, true);
      if (editingItemId === itemId) {
        setEditingItemId(null);
        setItemState(emptyItem);
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
      <section className="profile-workspace" aria-label="Professional information">
        <p>{error ?? "Loading professional information..."}</p>
      </section>
    );
  }

  return (
    <section className="profile-workspace" aria-label="Professional information">
      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {view === "overview" ? (
        <div className="profile-column professional-information-overview">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Reusable information</p>
              <h2>Professional information</h2>
              <p className="profile-intro">
                Keep only the experience, skills, education and other information you want to reuse in CVs and letters.
              </p>
            </div>
            <button className="compact-primary" type="button" onClick={startNewItem}>
              Add information
            </button>
          </div>

          {snapshot.items.length === 0 ? (
            <div className="professional-information-empty">
              <h3>No professional information yet.</h3>
              <p>Add one useful thing to start. There is no completeness requirement.</p>
            </div>
          ) : (
            <div className="item-list" aria-label="Professional information items">
              {snapshot.items.map((item) => (
                <article className="profile-item" key={item.id}>
                  <div>
                    <span className="item-kind">{item.kind}</span>
                    <h3>{item.title}</h3>
                    {item.subtitle ? <p>{item.subtitle}</p> : null}
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                  <div className="row-actions">
                    <button type="button" onClick={() => startItemEdit(item)}>Edit</button>
                    <button type="button" onClick={() => void removeItem(item.id)}>Remove</button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <section className="professional-information-secondary" aria-label="Saved variations">
            <div>
              <strong>Saved variations</strong>
              <p>
                Optional reusable differences for a recurring role, language or emphasis. Your default professional information already works without one.
              </p>
            </div>
            <button className="compact-secondary" type="button" onClick={() => setView("variations")}>
              {snapshot.variants.length === 0
                ? "Create saved variation"
                : `Saved variations (${String(snapshot.variants.length)})`}
            </button>
            {variantDirty ? <span>Unsaved variation changes</span> : null}
          </section>
        </div>
      ) : null}

      {view === "item" ? (
        <div className="profile-column professional-information-editor">
          <button className="compact-secondary professional-information-back" type="button" onClick={cancelItemEdit}>
            {professionalInformationHandoff ? "Return to document" : "Back to professional information"}
          </button>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Reusable information</p>
              <h2>{editingItemId ? "Edit information" : "Add information"}</h2>
            </div>
            {itemDirty ? <span>Unsaved changes</span> : null}
          </div>
          <form className="editor-card" onSubmit={(event) => void submitItem(event)}>
            <label>
              Type
              <select
                value={itemState.kind}
                onChange={(event) => setItemState({ ...itemState, kind: event.target.value as ProfileItemKind })}
              >
                {itemKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
              </select>
            </label>
            <label>
              Title
              <input required value={itemState.title} onChange={(event) => setItemState({ ...itemState, title: event.target.value })} />
            </label>
            <label>
              Subtitle
              <input value={itemState.subtitle} onChange={(event) => setItemState({ ...itemState, subtitle: event.target.value })} />
            </label>
            <label className="wide-field">
              Description
              <textarea value={itemState.description} onChange={(event) => setItemState({ ...itemState, description: event.target.value })} />
            </label>
            <label>
              Start
              <input value={itemState.startDate} onChange={(event) => setItemState({ ...itemState, startDate: event.target.value })} />
            </label>
            <label>
              End
              <input value={itemState.endDate} onChange={(event) => setItemState({ ...itemState, endDate: event.target.value })} />
            </label>
            <label className="wide-field">
              URL
              <input type="url" value={itemState.url} onChange={(event) => setItemState({ ...itemState, url: event.target.value })} />
            </label>
            <div className="form-actions wide-field">
              <button className="compact-primary" type="submit">
                {editingItemId ? "Save information" : "Add information"}
              </button>
              <button className="compact-secondary" type="button" onClick={cancelItemEdit}>Cancel</button>
            </div>
          </form>
          {editingItemId ? (
            <ProfileItemAiDisclosureControl key={editingItemId} itemId={editingItemId} />
          ) : null}
        </div>
      ) : null}

      {view === "variations" ? (
        <div className="profile-column saved-variations-workspace">
          <button
            className="compact-secondary professional-information-back"
            type="button"
            onClick={() => setView("overview")}
          >
            Back to professional information
          </button>
          <div className="section-heading">
            <div>
              <p className="eyebrow">Optional reuse</p>
              <h2>Saved variations</h2>
              <p className="profile-intro">
                Keep only what differs from your default professional information. Unchanged information continues to come from the default.
              </p>
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
                  Preferred language
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
              <p className="wide-field profile-intro">
                A saved variation is optional. With no differences, it simply uses your default professional information.
              </p>
              <label>
                Name
                <input required value={variantState.name} onChange={(event) => setVariantState({ ...variantState, name: event.target.value })} />
              </label>
              <label>
                Preferred language
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
