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
    : emptyItem;
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

function dateRange(item: ProfileItem): string | null {
  if (item.startDate && item.endDate) return `${item.startDate} – ${item.endDate}`;
  return item.startDate ?? item.endDate ?? null;
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
  const [draft, setDraft] = useState<ItemFormState>(emptyItem);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variant, setVariant] = useState(variantDraft());
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
        setSelectedId(requested);
        setDraft(itemForm(nextSnapshot.items.find((item) => item.id === requested)));
        setCreating(false);
        setEditingItem(false);
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
  const itemDirty =
    creating
      ? JSON.stringify(draft) !== JSON.stringify(emptyItem)
      : selected && editingItem
        ? JSON.stringify(draft) !== JSON.stringify(itemForm(selected))
        : false;
  const persistedVariant = editingVariantId
    ? variants.find((candidate) => candidate.id === editingVariantId)
    : undefined;
  const variantDirty =
    editingVariantId !== null || variant.name.trim().length > 0
      ? JSON.stringify(variant) !== JSON.stringify(variantDraft(persistedVariant))
      : false;

  useEffect(() => {
    onDirtyChange?.(itemDirty || variantDirty);
    return () => onDirtyChange?.(false);
  }, [itemDirty, variantDirty, onDirtyChange]);

  const confirmDiscard = () =>
    !(itemDirty || variantDirty) || window.confirm("Discard unsaved My information edits?");

  const selectItem = (item: ProfileItem) => {
    if (!confirmDiscard()) return;
    setCreating(false);
    setEditingItem(false);
    setSelectedId(item.id);
    setDraft(itemForm(item));
    setEditingVariantId(null);
    setVariant(variantDraft());
    setError(null);
  };

  const startNew = () => {
    if (!confirmDiscard()) return;
    setCreating(true);
    setEditingItem(true);
    setSelectedId(null);
    setDraft(emptyItem);
    setEditingVariantId(null);
    setVariant(variantDraft());
    setError(null);
  };

  const cancelItemEdit = () => {
    if (itemDirty && !window.confirm("Discard unsaved My information edits?")) return;
    if (creating) {
      setCreating(false);
      const first = snapshot.items[0] ?? null;
      setSelectedId(first?.id ?? null);
      setDraft(itemForm(first ?? undefined));
    } else if (selected) {
      setDraft(itemForm(selected));
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
      const next =
        creating || !selectedItemId
          ? await window.aaaat.profile.addItem(input)
          : await window.aaaat.profile.updateItem({ id: selectedItemId, item: input });
      setSnapshot(next);
      const saved = creating
        ? next.items.at(-1) ?? null
        : next.items.find((item) => item.id === selectedItemId) ?? null;
      setCreating(false);
      setEditingItem(false);
      setSelectedId(saved?.id ?? null);
      setDraft(itemForm(saved ?? undefined));
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
      setDraft(itemForm(first ?? undefined));
      setEditingItem(false);
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
    if (variantDirty && !window.confirm("Discard unsaved variation edits?")) return;
    setEditingVariantId(candidate?.id ?? null);
    setVariant(variantDraft(candidate));
    if (!candidate && selected) {
      setVariant((current) => ({
        ...current,
        title: selected.title,
        subtitle: selected.subtitle ?? "",
        description: selected.description ?? "",
        startDate: selected.startDate ?? "",
        endDate: selected.endDate ?? "",
        url: selected.url ?? "",
      }));
    }
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
      const saved =
        next.find((candidate) => candidate.id === editingVariantId) ??
        next.find(
          (candidate) =>
            candidate.itemId === selected.id && candidate.name === variant.name.trim(),
        ) ??
        null;
      setEditingVariantId(saved?.id ?? null);
      setVariant(variantDraft(saved ?? undefined));
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
      setEditingVariantId(null);
      setVariant(variantDraft());
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

  const groups = [...new Set(snapshot.items.map((item) => item.kind))];

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
              <section key={kind}>
                <h2>{kind}</h2>
                {snapshot.items
                  .filter((item) => item.kind === kind)
                  .map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className={item.id === selectedId ? "active" : ""}
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
            <>
              <section className="section-surface professional-information-item">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">{creating ? "New information" : selected?.kind}</p>
                    <h2>{creating ? "Add information" : selected?.title}</h2>
                  </div>
                  {selected ? <ProfileItemAiDisclosureControl itemId={selected.id} /> : null}
                </div>

                {creating || editingItem ? (
                  <>
                    <div className="profile-item-form">
                      <label>
                        Kind
                        <input
                          value={draft.kind}
                          maxLength={80}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, kind: event.target.value }))
                          }
                          placeholder="experience, project, skill…"
                        />
                      </label>
                      <label>
                        Title
                        <input
                          value={draft.title}
                          maxLength={200}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, title: event.target.value }))
                          }
                        />
                      </label>
                      <label className="profile-wide-field">
                        Subtitle
                        <input
                          value={draft.subtitle}
                          maxLength={300}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, subtitle: event.target.value }))
                          }
                        />
                      </label>
                      <label className="profile-wide-field">
                        Description
                        <textarea
                          rows={6}
                          value={draft.description}
                          maxLength={5000}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="profile-date-row profile-wide-field">
                        <label>
                          Start
                          <input
                            value={draft.startDate}
                            maxLength={40}
                            onChange={(event) =>
                              setDraft((current) => ({
                                ...current,
                                startDate: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          End
                          <input
                            value={draft.endDate}
                            maxLength={40}
                            onChange={(event) =>
                              setDraft((current) => ({ ...current, endDate: event.target.value }))
                            }
                          />
                        </label>
                      </div>
                      <label className="profile-wide-field">
                        URL
                        <input
                          type="url"
                          value={draft.url}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, url: event.target.value }))
                          }
                        />
                      </label>
                    </div>
                    <div className="button-row">
                      <button
                        type="button"
                        disabled={!draft.title.trim() || busy}
                        onClick={() => void saveItem()}
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                      <button type="button" className="compact-secondary" onClick={cancelItemEdit}>
                        Cancel
                      </button>
                      {selected ? (
                        <button
                          type="button"
                          className="compact-secondary"
                          disabled={busy}
                          onClick={() => void removeItem()}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </>
                ) : selected ? (
                  <>
                    <div className="profile-item-readout">
                      {selected.subtitle ? <p className="profile-item-subtitle">{selected.subtitle}</p> : null}
                      {selected.description ? (
                        <p className="profile-item-description">{selected.description}</p>
                      ) : (
                        <p className="compact-help">No description saved.</p>
                      )}
                      {dateRange(selected) ? (
                        <p className="profile-item-meta">
                          <span>Dates</span>
                          <strong>{dateRange(selected)}</strong>
                        </p>
                      ) : null}
                      {selected.url ? (
                        <p className="profile-item-meta">
                          <span>Link</span>
                          <span>{selected.url}</span>
                        </p>
                      ) : null}
                    </div>
                    <div className="button-row">
                      <button type="button" onClick={() => setEditingItem(true)}>Edit</button>
                      <button
                        type="button"
                        className="compact-secondary"
                        disabled={busy}
                        onClick={() => void removeItem()}
                      >
                        Remove
                      </button>
                    </div>
                  </>
                ) : null}
              </section>

              {selected ? (
                <section className="section-surface" aria-label="Saved variations">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">Optional reuse</p>
                      <h2>Saved variations</h2>
                    </div>
                    <button
                      type="button"
                      className="compact-secondary"
                      onClick={() => editVariant()}
                    >
                      New variation
                    </button>
                  </div>
                  {selectedVariants.length === 0 ? (
                    <p className="compact-empty">No alternate wording saved for this item.</p>
                  ) : (
                    <div className="profile-variant-list">
                      {selectedVariants.map((candidate) => (
                        <button
                          type="button"
                          key={candidate.id}
                          className={candidate.id === editingVariantId ? "active" : ""}
                          onClick={() => editVariant(candidate)}
                        >
                          <strong>{candidate.name}</strong>
                          <small>{candidate.content.title}</small>
                        </button>
                      ))}
                    </div>
                  )}
                  {editingVariantId !== null || variant.name || variant.title ? (
                    <div className="profile-variant-editor">
                      <label>
                        Name
                        <input
                          value={variant.name}
                          onChange={(event) =>
                            setVariant((current) => ({ ...current, name: event.target.value }))
                          }
                          placeholder="Leadership emphasis"
                        />
                      </label>
                      <label>
                        Title
                        <input
                          value={variant.title}
                          onChange={(event) =>
                            setVariant((current) => ({ ...current, title: event.target.value }))
                          }
                        />
                      </label>
                      <label>
                        Subtitle
                        <input
                          value={variant.subtitle}
                          onChange={(event) =>
                            setVariant((current) => ({
                              ...current,
                              subtitle: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <label className="profile-variant-description">
                        Description
                        <textarea
                          rows={5}
                          value={variant.description}
                          onChange={(event) =>
                            setVariant((current) => ({
                              ...current,
                              description: event.target.value,
                            }))
                          }
                        />
                      </label>
                      <div className="button-row profile-variant-actions">
                        <button
                          type="button"
                          disabled={!variant.name.trim() || !variant.title.trim() || busy}
                          onClick={() => void saveVariant()}
                        >
                          Save variation
                        </button>
                        {editingVariantId ? (
                          <button
                            type="button"
                            className="compact-secondary"
                            onClick={() => void removeVariant()}
                          >
                            Remove
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="compact-secondary"
                          onClick={() => {
                            setEditingVariantId(null);
                            setVariant(variantDraft());
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}
            </>
          ) : (
            <section className="section-surface">
              <p className="compact-empty">
                Select an item or add reusable professional information.
              </p>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
