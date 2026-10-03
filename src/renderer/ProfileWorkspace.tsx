import { useEffect, useMemo, useState } from "react";

import type { ProfileItem, ProfileItemInput, ProfileSnapshot } from "../shared/contracts";
import type { ProfileVariantRecord } from "../shared/profile-variant-contracts";
import { ProfileItemAiDisclosureControl } from "./ProfileItemAiDisclosureControl";

interface ItemFormState {
  kind: string;
  title: string;
  subtitle: string;
  description: string;
  startDate: string;
  endDate: string;
  url: string;
}

type OptionalDetail = "subtitle" | "description" | "startDate" | "endDate" | "url";

const optionalDetails: readonly { key: OptionalDetail; label: string }[] = [
  { key: "subtitle", label: "Context" },
  { key: "description", label: "Description" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "url", label: "Link" },
];

const informationTypes = [
  ["identity", "Identity"],
  ["contact", "Contact"],
  ["summary", "Summary"],
  ["experience", "Experience"],
  ["education", "Education"],
  ["project", "Project"],
  ["skill", "Skill"],
  ["certification", "Certification"],
  ["language", "Language"],
  ["link", "Link"],
  ["other", "Other"],
] as const;

const contactTypes = ["Email", "Phone", "Location", "Website", "Other"] as const;

function informationTypeLabel(kind: string): string {
  return informationTypes.find(([value]) => value === kind)?.[1]
    ?? kind.replace(/[-_]+/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function primaryFieldLabel(kind: string, contactType: string): string {
  if (kind === "identity") return "Name";
  if (kind === "contact") {
    if (contactType.toLocaleLowerCase() === "email") return "Email address";
    if (contactType.toLocaleLowerCase() === "phone") return "Phone number";
    if (contactType.toLocaleLowerCase() === "location") return "Location";
    if (contactType.toLocaleLowerCase() === "website") return "Website";
    return "Contact detail";
  }
  if (kind === "experience") return "Role";
  if (kind === "education") return "Qualification";
  if (kind === "project") return "Project";
  if (kind === "skill") return "Skill";
  if (kind === "certification") return "Certification";
  if (kind === "language") return "Language";
  if (kind === "link") return "Link name";
  if (kind === "summary") return "Heading";
  return "Name";
}

function secondaryFieldLabel(kind: string): string {
  if (kind === "identity") return "Professional headline";
  if (kind === "experience") return "Organisation";
  if (kind === "education") return "Institution";
  if (kind === "project") return "Organisation or context";
  if (kind === "skill") return "Level or context";
  if (kind === "certification") return "Issuer";
  if (kind === "language") return "Proficiency";
  if (kind === "link") return "Type";
  if (kind === "summary") return "Context";
  return "Context";
}

function detailLabel(key: OptionalDetail, kind: string): string {
  if (key === "subtitle") return secondaryFieldLabel(kind);
  return optionalDetails.find((detail) => detail.key === key)?.label ?? key;
}

const emptyItem: ItemFormState = {
  kind: "other",
  title: "",
  subtitle: "",
  description: "",
  startDate: "",
  endDate: "",
  url: "",
};

function itemForm(item?: ProfileItem): ItemFormState {
  return item
    ? {
        kind: item.kind,
        title: item.title,
        subtitle: item.subtitle ?? "",
        description: item.description ?? "",
        startDate: item.startDate ?? "",
        endDate: item.endDate ?? "",
        url: item.url ?? "",
      }
    : { ...emptyItem };
}

function itemInput(draft: ItemFormState): ProfileItemInput {
  return {
    kind: draft.kind.trim() || "other",
    title: draft.title.trim(),
    ...(draft.subtitle.trim() ? { subtitle: draft.subtitle.trim() } : {}),
    ...(draft.description.trim() ? { description: draft.description.trim() } : {}),
    ...(draft.startDate.trim() ? { startDate: draft.startDate.trim() } : {}),
    ...(draft.endDate.trim() ? { endDate: draft.endDate.trim() } : {}),
    ...(draft.url.trim() ? { url: draft.url.trim() } : {}),
  };
}

function variantDraft(variant?: ProfileVariantRecord) {
  return {
    name: variant?.name ?? "",
    title: variant?.content.title ?? "",
    subtitle: variant?.content.subtitle ?? "",
    description: variant?.content.description ?? "",
    startDate: variant?.content.startDate ?? "",
    endDate: variant?.content.endDate ?? "",
    url: variant?.content.url ?? "",
  };
}

function newVariantDraft(item?: ProfileItem) {
  return {
    ...variantDraft(),
    ...(item
      ? {
          title: item.title,
          subtitle: item.subtitle ?? "",
          description: item.description ?? "",
          startDate: item.startDate ?? "",
          endDate: item.endDate ?? "",
          url: item.url ?? "",
        }
      : {}),
  };
}

function retainedOptionalDetails(value: Pick<ItemFormState, OptionalDetail>): OptionalDetail[] {
  return optionalDetails.filter(({ key }) => value[key].trim().length > 0).map(({ key }) => key);
}

function dateRange(value: { readonly startDate?: string; readonly endDate?: string }): string | null {
  if (value.startDate && value.endDate) return `${value.startDate} – ${value.endDate}`;
  return value.startDate ?? value.endDate ?? null;
}

export function ProfileWorkspace({
  initialItemId,
  onDirtyChange,
}: {
  readonly initialItemId?: string;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [snapshot, setSnapshot] = useState<ProfileSnapshot>({ items: [] });
  const [variants, setVariants] = useState<ProfileVariantRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialItemId ?? null);
  const [creating, setCreating] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [draft, setDraft] = useState<ItemFormState>({ ...emptyItem });
  const [itemDetails, setItemDetails] = useState<OptionalDetail[]>([]);
  const [editingVariant, setEditingVariant] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variant, setVariant] = useState(variantDraft());
  const [variantDetails, setVariantDetails] = useState<OptionalDetail[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([window.aaaat.profile.current(), window.aaaat.profileVariants.list()])
      .then(([nextSnapshot, nextVariants]) => {
        if (!active) return;
        setSnapshot(nextSnapshot);
        setVariants(nextVariants);
        const requested =
          initialItemId && nextSnapshot.items.some((item) => item.id === initialItemId)
            ? initialItemId
            : nextSnapshot.items[0]?.id ?? null;
        const requestedItem = nextSnapshot.items.find((item) => item.id === requested);
        setSelectedId(requested);
        setDraft(itemForm(requestedItem));
        setItemDetails(retainedOptionalDetails(itemForm(requestedItem)));
        setCreating(false);
        setEditingItem(false);
        setEditingVariant(false);
        setEditingVariantId(null);
        setVariant(variantDraft());
        setVariantDetails([]);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load My information.");
      });
    return () => {
      active = false;
    };
  }, [initialItemId]);

  const selected = snapshot.items.find((item) => item.id === selectedId) ?? null;
  const selectedVariants = useMemo(
    () => variants.filter((candidate) => candidate.itemId === selectedId),
    [variants, selectedId],
  );
  const groups = useMemo(() => [...new Set(snapshot.items.map((item) => item.kind))], [snapshot.items]);
  const availableItemDetails = optionalDetails.filter(
    ({ key }) => !itemDetails.includes(key) && !(draft.kind === "contact" && key === "subtitle"),
  );
  const availableVariantDetails = optionalDetails.filter(({ key }) => !variantDetails.includes(key));

  const itemDirty = creating
    ? JSON.stringify(draft) !== JSON.stringify(emptyItem)
    : selected && editingItem
      ? JSON.stringify(draft) !== JSON.stringify(itemForm(selected))
      : false;
  const persistedVariant = editingVariantId
    ? variants.find((candidate) => candidate.id === editingVariantId)
    : undefined;
  const variantBaseline = editingVariantId
    ? variantDraft(persistedVariant)
    : newVariantDraft(selected ?? undefined);
  const variantDirty = editingVariant && JSON.stringify(variant) !== JSON.stringify(variantBaseline);

  useEffect(() => {
    onDirtyChange?.(itemDirty || variantDirty);
    return () => onDirtyChange?.(false);
  }, [itemDirty, variantDirty, onDirtyChange]);

  const resetVariantEditor = () => {
    setEditingVariant(false);
    setEditingVariantId(null);
    setVariant(variantDraft());
    setVariantDetails([]);
  };

  const confirmDiscard = () =>
    !(itemDirty || variantDirty) || window.confirm("Discard unsaved My information edits?");

  const selectItem = (item: ProfileItem) => {
    if (!confirmDiscard()) return;
    setCreating(false);
    setEditingItem(false);
    setSelectedId(item.id);
    const nextDraft = itemForm(item);
    setDraft(nextDraft);
    setItemDetails(retainedOptionalDetails(nextDraft));
    resetVariantEditor();
    setError(null);
  };

  const startNew = () => {
    if (!confirmDiscard()) return;
    setCreating(true);
    setEditingItem(true);
    setSelectedId(null);
    setDraft({ ...emptyItem });
    setItemDetails([]);
    resetVariantEditor();
    setError(null);
  };

  const startItemEdit = () => {
    if (!selected) return;
    if (variantDirty && !window.confirm("Discard unsaved variation edits?")) return;
    resetVariantEditor();
    const nextDraft = itemForm(selected);
    setDraft(nextDraft);
    setItemDetails(retainedOptionalDetails(nextDraft));
    setEditingItem(true);
    setError(null);
  };

  const cancelItemEdit = () => {
    if (itemDirty && !window.confirm("Discard unsaved My information edits?")) return;
    if (creating) {
      setCreating(false);
      const first = snapshot.items[0] ?? null;
      setSelectedId(first?.id ?? null);
      const nextDraft = itemForm(first ?? undefined);
      setDraft(nextDraft);
      setItemDetails(retainedOptionalDetails(nextDraft));
    } else if (selected) {
      const nextDraft = itemForm(selected);
      setDraft(nextDraft);
      setItemDetails(retainedOptionalDetails(nextDraft));
    }
    setEditingItem(false);
    setError(null);
  };

  const saveItem = async () => {
    const input = itemInput(draft);
    if (!input.title) return;
    setBusy(true);
    setError(null);
    try {
      const selectedItemId = selected?.id ?? null;
      const next = creating || !selectedItemId
        ? await window.aaaat.profile.addItem(input)
        : await window.aaaat.profile.updateItem({ id: selectedItemId, item: input });
      setSnapshot(next);
      const saved = creating
        ? next.items.at(-1) ?? null
        : next.items.find((item) => item.id === selectedItemId) ?? null;
      setCreating(false);
      setEditingItem(false);
      setSelectedId(saved?.id ?? null);
      const nextDraft = itemForm(saved ?? undefined);
      setDraft(nextDraft);
      setItemDetails(retainedOptionalDetails(nextDraft));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this information.");
    } finally {
      setBusy(false);
    }
  };

  const removeItem = async () => {
    if (!selected || !window.confirm(`Remove “${selected.title}” from My information?`)) return;
    setBusy(true);
    setError(null);
    try {
      const next = await window.aaaat.profile.removeItem(selected.id);
      setSnapshot(next);
      const first = next.items[0] ?? null;
      setSelectedId(first?.id ?? null);
      const nextDraft = itemForm(first ?? undefined);
      setDraft(nextDraft);
      setItemDetails(retainedOptionalDetails(nextDraft));
      setEditingItem(false);
      resetVariantEditor();
      setVariants((current) => current.filter((candidate) => candidate.itemId !== selected.id));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not remove this information. It may still be referenced by a reusable CV template.",
      );
    } finally {
      setBusy(false);
    }
  };

  const editVariant = (candidate?: ProfileVariantRecord) => {
    if (itemDirty && !window.confirm("Discard unsaved My information edits?")) return;
    if (variantDirty && !window.confirm("Discard unsaved variation edits?")) return;
    if (editingItem && selected) {
      const nextDraft = itemForm(selected);
      setDraft(nextDraft);
      setItemDetails(retainedOptionalDetails(nextDraft));
      setEditingItem(false);
    }
    const nextVariant = candidate ? variantDraft(candidate) : newVariantDraft(selected ?? undefined);
    setEditingVariant(true);
    setEditingVariantId(candidate?.id ?? null);
    setVariant(nextVariant);
    setVariantDetails(retainedOptionalDetails(nextVariant));
    setError(null);
  };

  const closeVariant = () => {
    if (variantDirty && !window.confirm("Discard unsaved variation edits?")) return;
    resetVariantEditor();
    setError(null);
  };

  const saveVariant = async () => {
    if (!selected || !variant.name.trim() || !variant.title.trim()) return;
    setBusy(true);
    setError(null);
    const content = {
      title: variant.title.trim(),
      ...(variant.subtitle.trim() ? { subtitle: variant.subtitle.trim() } : {}),
      ...(variant.description.trim() ? { description: variant.description.trim() } : {}),
      ...(variant.startDate.trim() ? { startDate: variant.startDate.trim() } : {}),
      ...(variant.endDate.trim() ? { endDate: variant.endDate.trim() } : {}),
      ...(variant.url.trim() ? { url: variant.url.trim() } : {}),
    };
    try {
      const next = editingVariantId
        ? await window.aaaat.profileVariants.update({
            id: editingVariantId,
            name: variant.name.trim(),
            content,
          })
        : await window.aaaat.profileVariants.create({
            itemId: selected.id,
            name: variant.name.trim(),
            content,
          });
      setVariants(next);
      const saved = next.find((candidate) => candidate.id === editingVariantId)
        ?? next.find((candidate) => candidate.itemId === selected.id && candidate.name === variant.name.trim())
        ?? null;
      setEditingVariant(true);
      setEditingVariantId(saved?.id ?? null);
      const nextVariant = variantDraft(saved ?? undefined);
      setVariant(nextVariant);
      setVariantDetails(retainedOptionalDetails(nextVariant));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this variation.");
    } finally {
      setBusy(false);
    }
  };

  const removeVariant = async () => {
    if (!editingVariantId || !window.confirm("Remove this saved variation?")) return;
    setBusy(true);
    setError(null);
    try {
      setVariants(await window.aaaat.profileVariants.remove(editingVariantId));
      resetVariantEditor();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not remove this variation. It may still be used by a template.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-workspace professional-information-area" aria-label="My information">
      <header className="document-console-heading">
        <div>
          <p className="eyebrow">Reusable professional information</p>
          <h1>My information</h1>
        </div>
        <button type="button" className="compact-primary" onClick={startNew}>
          ＋ Add information
        </button>
      </header>
      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className="professional-information-layout">
        <aside className="professional-information-index" aria-label="My information index">
          {snapshot.items.length === 0 ? (
            <p className="compact-empty">No reusable information yet.</p>
          ) : (
            groups.map((kind) => (
              <section key={kind} aria-label={`${kind} group`}>
                <h2>{informationTypeLabel(kind)}</h2>
                {snapshot.items
                  .filter((item) => item.kind === kind)
                  .map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={item.id === selectedId ? "active" : ""}
                      aria-current={item.id === selectedId ? "true" : undefined}
                      onClick={() => selectItem(item)}
                    >
                      <strong>{item.title}</strong>
                      {item.subtitle ? <small>{item.subtitle}</small> : null}
                    </button>
                  ))}
              </section>
            ))
          )}
        </aside>

        <div className="professional-information-editor">
          {creating || selected ? (
            <section className="section-surface professional-information-item" aria-label={creating ? "New information" : `${selected?.title ?? "Information"} details`}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">{creating ? "New information" : informationTypeLabel(selected?.kind ?? "other")}</p>
                  <h2>{creating ? "Add information" : selected?.title}</h2>
                </div>
                {selected ? <ProfileItemAiDisclosureControl itemId={selected.id} /> : null}
              </div>

              {creating || editingItem ? (
                <div className="professional-information-item-editor" aria-label={creating ? "Edit new information" : `Edit ${selected?.title ?? "information"}`}>
                  <div className="profile-item-form">
                    <label>
                      Information type
                      <select
                        value={informationTypes.some(([value]) => value === draft.kind) ? draft.kind : "other"}
                        onChange={(event) => {
                          const kind = event.target.value;
                          setDraft((current) => ({
                            ...current,
                            kind,
                            subtitle:
                              kind === "contact" && !current.subtitle.trim()
                                ? "Email"
                                : current.subtitle,
                          }));
                        }}
                      >
                        {informationTypes.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    {draft.kind === "contact" ? (
                      <label>
                        Contact type
                        <select
                          value={contactTypes.includes(draft.subtitle as typeof contactTypes[number]) ? draft.subtitle : "Other"}
                          onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))}
                        >
                          {contactTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                        </select>
                      </label>
                    ) : null}
                    <label className={draft.kind === "contact" ? "profile-wide-field" : undefined}>
                      {primaryFieldLabel(draft.kind, draft.subtitle)}
                      <input
                        value={draft.title}
                        maxLength={200}
                        onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                      />
                    </label>
                    {draft.kind !== "contact" && itemDetails.includes("subtitle") ? (
                      <label className="profile-wide-field">
                        {secondaryFieldLabel(draft.kind)}
                        <input value={draft.subtitle} maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, subtitle: event.target.value }))} />
                      </label>
                    ) : null}
                    {itemDetails.includes("description") ? (
                      <label className="profile-wide-field">
                        Description
                        <textarea rows={6} value={draft.description} maxLength={5000} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
                      </label>
                    ) : null}
                    {itemDetails.includes("startDate") ? (
                      <label>
                        Start date
                        <input value={draft.startDate} maxLength={40} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} />
                      </label>
                    ) : null}
                    {itemDetails.includes("endDate") ? (
                      <label>
                        End date
                        <input value={draft.endDate} maxLength={40} onChange={(event) => setDraft((current) => ({ ...current, endDate: event.target.value }))} />
                      </label>
                    ) : null}
                    {itemDetails.includes("url") ? (
                      <label className="profile-wide-field">
                        Link
                        <input type="url" value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} />
                      </label>
                    ) : null}
                  </div>

                  {availableItemDetails.length > 0 ? (
                    <label className="profile-add-detail">
                      <span>Add detail</span>
                      <select
                        aria-label="Add information detail"
                        value=""
                        onChange={(event) => {
                          const key = event.target.value as OptionalDetail;
                          if (key) setItemDetails((current) => current.includes(key) ? current : [...current, key]);
                        }}
                      >
                        <option value="">Choose…</option>
                        {availableItemDetails.map(({ key }) => <option key={key} value={key}>{detailLabel(key, draft.kind)}</option>)}
                      </select>
                    </label>
                  ) : null}

                  <div className="button-row">
                    <button type="button" disabled={!draft.title.trim() || busy} onClick={() => void saveItem()}>
                      {busy ? "Saving…" : "Save"}
                    </button>
                    <button type="button" className="compact-secondary" onClick={cancelItemEdit}>Cancel</button>
                    {selected ? (
                      <button type="button" className="compact-secondary" disabled={busy} onClick={() => void removeItem()}>
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : selected ? (
                <>
                  <div className="profile-item-readout">
                    {selected.subtitle ? <p className="profile-item-subtitle">{selected.subtitle}</p> : null}
                    {selected.description ? <p className="profile-item-description">{selected.description}</p> : null}
                    {dateRange(selected) ? (
                      <p className="profile-item-meta"><span>Dates</span><strong>{dateRange(selected)}</strong></p>
                    ) : null}
                    {selected.url ? (
                      <p className="profile-item-meta"><span>Link</span><span>{selected.url}</span></p>
                    ) : null}
                  </div>
                  <div className="button-row profile-item-primary-actions">
                    <button type="button" onClick={startItemEdit}>Edit</button>
                    <button type="button" className="compact-secondary" disabled={busy} onClick={() => void removeItem()}>Remove</button>
                  </div>
                </>
              ) : null}

              {selected && !editingItem ? (
                <details className="profile-variations" aria-label="Saved variations" open={editingVariant || undefined}>
                  <summary>
                    <span>Saved variations</span>
                    <span>{selectedVariants.length === 0 ? "Optional" : `${String(selectedVariants.length)} saved`}</span>
                  </summary>
                  <div className="profile-variations-content">
                    <div className="profile-variations-heading">
                      <p className="compact-help">Optional reusable alternate content for this item. The base information above remains the primary record.</p>
                      {!editingVariant ? (
                        <button type="button" className="compact-secondary" onClick={() => editVariant()}>
                          New variation
                        </button>
                      ) : null}
                    </div>

                    {selectedVariants.length === 0 && !editingVariant ? (
                      <p className="compact-empty">No saved variations. None is required for ordinary use.</p>
                    ) : null}

                    {selectedVariants.length > 0 ? (
                      <div className="profile-variant-list" aria-label="Variations for selected information">
                        {selectedVariants.map((candidate) => {
                          const range = dateRange(candidate.content);
                          return (
                            <article key={candidate.id} className="profile-variant-readout" aria-label={`${candidate.name} variation`}>
                              <div>
                                <strong>{candidate.name}</strong>
                                <span>{candidate.content.title}</span>
                                {candidate.content.subtitle ? <small>{candidate.content.subtitle}</small> : null}
                              </div>
                              {candidate.content.description ? <p>{candidate.content.description}</p> : null}
                              {range ? <small>{range}</small> : null}
                              {candidate.content.url ? <small>{candidate.content.url}</small> : null}
                              {editingVariantId !== candidate.id ? (
                                <button type="button" className="compact-secondary" onClick={() => editVariant(candidate)}>Edit variation</button>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>
                    ) : null}

                    {editingVariant ? (
                      <div className="profile-variant-editor" aria-label={editingVariantId ? `Edit ${variant.name} variation` : "Edit new variation"}>
                        <label>
                          Variation name
                          <input value={variant.name} onChange={(event) => setVariant((current) => ({ ...current, name: event.target.value }))} placeholder="Leadership emphasis" />
                        </label>
                        <label>
                          Title
                          <input value={variant.title} onChange={(event) => setVariant((current) => ({ ...current, title: event.target.value }))} />
                        </label>
                        {variantDetails.includes("subtitle") ? (
                          <label className="profile-wide-field">
                            Subtitle
                            <input value={variant.subtitle} onChange={(event) => setVariant((current) => ({ ...current, subtitle: event.target.value }))} />
                          </label>
                        ) : null}
                        {variantDetails.includes("description") ? (
                          <label className="profile-wide-field">
                            Description
                            <textarea rows={5} value={variant.description} onChange={(event) => setVariant((current) => ({ ...current, description: event.target.value }))} />
                          </label>
                        ) : null}
                        {variantDetails.includes("startDate") ? (
                          <label>
                            Start date
                            <input value={variant.startDate} onChange={(event) => setVariant((current) => ({ ...current, startDate: event.target.value }))} />
                          </label>
                        ) : null}
                        {variantDetails.includes("endDate") ? (
                          <label>
                            End date
                            <input value={variant.endDate} onChange={(event) => setVariant((current) => ({ ...current, endDate: event.target.value }))} />
                          </label>
                        ) : null}
                        {variantDetails.includes("url") ? (
                          <label className="profile-wide-field">
                            Link
                            <input type="url" value={variant.url} onChange={(event) => setVariant((current) => ({ ...current, url: event.target.value }))} />
                          </label>
                        ) : null}

                        {availableVariantDetails.length > 0 ? (
                          <label className="profile-add-detail profile-wide-field">
                            <span>Add detail</span>
                            <select
                              aria-label="Add variation detail"
                              value=""
                              onChange={(event) => {
                                const key = event.target.value as OptionalDetail;
                                if (key) setVariantDetails((current) => current.includes(key) ? current : [...current, key]);
                              }}
                            >
                              <option value="">Choose…</option>
                              {availableVariantDetails.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                            </select>
                          </label>
                        ) : null}

                        <div className="button-row profile-variant-actions">
                          <button type="button" disabled={!variant.name.trim() || !variant.title.trim() || busy} onClick={() => void saveVariant()}>
                            {busy ? "Saving…" : "Save variation"}
                          </button>
                          {editingVariantId ? (
                            <button type="button" className="compact-secondary" disabled={busy} onClick={() => void removeVariant()}>Remove variation</button>
                          ) : null}
                          <button type="button" className="compact-secondary" onClick={closeVariant}>Close</button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </details>
              ) : null}
            </section>
          ) : (
            <section className="section-surface" aria-label="My information empty selection">
              <p className="compact-empty">Select an item or add reusable professional information.</p>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
