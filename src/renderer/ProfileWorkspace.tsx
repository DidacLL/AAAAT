import { useEffect, useMemo, useState, type FormEvent } from "react";

import type {
  ProfileItem,
  ProfileItemContentPatch,
  ProfileItemInput,
  ProfileItemKind,
  ProfileSnapshot,
  ProfileVariant,
  ResolvedProfile,
} from "../shared/contracts";

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

function orderedCanonicalItems(
  snapshot: ProfileSnapshot,
  variant: ProfileVariant,
): ProfileItem[] {
  const canonicalRank = new Map(
    snapshot.items.map((item, index) => [item.id, index]),
  );
  const rules = new Map(variant.rules.map((rule) => [rule.itemId, rule]));

  return [...snapshot.items].sort((left, right) => {
    const leftRank =
      rules.get(left.id)?.orderRank ?? canonicalRank.get(left.id) ?? 0;
    const rightRank =
      rules.get(right.id)?.orderRank ?? canonicalRank.get(right.id) ?? 0;
    return leftRank - rightRank;
  });
}

export function ProfileWorkspace() {
  const [snapshot, setSnapshot] = useState<ProfileSnapshot | null>(null);
  const [resolved, setResolved] = useState<ResolvedProfile | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    null,
  );
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemState, setItemState] = useState<ItemFormState>(emptyItem);
  const [variantState, setVariantState] =
    useState<VariantFormState>(emptyVariant);
  const [error, setError] = useState<string | null>(null);

  const selectedVariant = useMemo(
    () =>
      snapshot?.variants.find((variant) => variant.id === selectedVariantId) ??
      null,
    [selectedVariantId, snapshot],
  );

  const orderedItems = useMemo(
    () =>
      snapshot && selectedVariant
        ? orderedCanonicalItems(snapshot, selectedVariant)
        : [],
    [selectedVariant, snapshot],
  );

  const refreshResolved = async (variantId: string | null) => {
    if (!variantId) {
      setResolved(null);
      return;
    }

    try {
      setResolved(await window.aaaat.profile.resolveVariant(variantId));
    } catch {
      setResolved(null);
      setError("AAAAT could not resolve that profile variant.");
    }
  };

  const acceptSnapshot = async (
    next: ProfileSnapshot,
    preferredVariantId: string | null = selectedVariantId,
  ) => {
    setSnapshot(next);
    const nextSelected = next.variants.some(
      (variant) => variant.id === preferredVariantId,
    )
      ? preferredVariantId
      : (next.variants[0]?.id ?? null);
    setSelectedVariantId(nextSelected);
    if (nextSelected) {
      const variant = next.variants.find(
        (candidate) => candidate.id === nextSelected,
      );
      if (variant) {
        setVariantState(variantForm(variant));
      }
    } else {
      setVariantState(emptyVariant);
    }
    await refreshResolved(nextSelected);
  };

  useEffect(() => {
    let active = true;

    void window.aaaat.profile
      .current()
      .then(async (current) => {
        if (!active) {
          return;
        }
        setSnapshot(current);
        const firstVariant = current.variants[0] ?? null;
        setSelectedVariantId(firstVariant?.id ?? null);
        if (firstVariant) {
          setVariantState(variantForm(firstVariant));
          setResolved(await window.aaaat.profile.resolveVariant(firstVariant.id));
        }
      })
      .catch(() => {
        if (active) {
          setError("AAAAT could not load the professional profile.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const submitItem = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    try {
      const next = editingItemId
        ? await window.aaaat.profile.updateItem({
            id: editingItemId,
            item: itemInput(itemState),
          })
        : await window.aaaat.profile.addItem(itemInput(itemState));
      setEditingItemId(null);
      setItemState(emptyItem);
      await acceptSnapshot(next);
    } catch {
      setError("Check the profile item fields and try again.");
    }
  };

  const removeItem = async (itemId: string) => {
    setError(null);
    try {
      await acceptSnapshot(await window.aaaat.profile.removeItem(itemId));
      if (editingItemId === itemId) {
        setEditingItemId(null);
        setItemState(emptyItem);
      }
    } catch {
      setError("AAAAT could not remove that profile item.");
    }
  };

  const createVariant = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const next = await window.aaaat.profile.createVariant(
        variantInput(variantState),
      );
      const created = next.variants.find(
        (variant) => variant.name === variantState.name.trim(),
      );
      await acceptSnapshot(next, created?.id ?? null);
    } catch {
      setError("Use a unique variant name and check its focus metadata.");
    }
  };

  const saveVariant = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedVariantId) {
      return;
    }

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
      setError("Use a unique variant name and check its focus metadata.");
    }
  };

  const removeVariant = async () => {
    if (!selectedVariantId) {
      return;
    }

    setError(null);
    try {
      await acceptSnapshot(
        await window.aaaat.profile.removeVariant(selectedVariantId),
        null,
      );
    } catch {
      setError("AAAAT could not remove that profile variant.");
    }
  };

  const selectVariant = async (variant: ProfileVariant) => {
    setSelectedVariantId(variant.id);
    setVariantState(variantForm(variant));
    setError(null);
    await refreshResolved(variant.id);
  };

  const applyVariantItem = async (
    event: FormEvent<HTMLFormElement>,
    item: ProfileItem,
  ) => {
    event.preventDefault();
    if (!selectedVariantId || !selectedVariant) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const included = formData.get("included") === "on";
    const title = String(formData.get("overrideTitle") ?? "").trim();
    const description = String(
      formData.get("overrideDescription") ?? "",
    ).trim();
    const existing = selectedVariant.rules.find(
      (rule) => rule.itemId === item.id,
    );
    const patch: Record<string, string> = {
      ...(existing?.contentPatch ?? {}),
    };

    if (title.length > 0) {
      patch.title = title;
    } else {
      delete patch.title;
    }
    if (description.length > 0) {
      patch.description = description;
    } else {
      delete patch.description;
    }

    setError(null);
    try {
      await acceptSnapshot(
        await window.aaaat.profile.configureVariantItem({
          variantId: selectedVariantId,
          itemId: item.id,
          included,
          contentPatch:
            Object.keys(patch).length === 0
              ? null
              : (patch as ProfileItemContentPatch),
        }),
        selectedVariantId,
      );
    } catch {
      setError("AAAAT could not apply that variant rule.");
    }
  };

  const moveItem = async (itemId: string, offset: -1 | 1) => {
    if (!selectedVariantId) {
      return;
    }

    const ids = orderedItems.map((item) => item.id);
    const index = ids.indexOf(itemId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= ids.length) {
      return;
    }

    [ids[index], ids[target]] = [ids[target], ids[index]];
    setError(null);
    try {
      await acceptSnapshot(
        await window.aaaat.profile.reorderVariant({
          variantId: selectedVariantId,
          itemIds: ids,
        }),
        selectedVariantId,
      );
    } catch {
      setError("AAAAT could not reorder that profile variant.");
    }
  };

  if (!snapshot) {
    return (
      <section className="profile-workspace" aria-label="Professional profile">
        <p>{error ?? "Loading professional profile..."}</p>
      </section>
    );
  }

  return (
    <section className="profile-workspace" aria-label="Professional profile">
      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : null}

      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Authoritative</p>
            <h2>Canonical profile</h2>
          </div>
          <span>{snapshot.items.length} items</span>
        </div>

        <form className="editor-card" onSubmit={(event) => void submitItem(event)}>
          <label>
            Type
            <select
              value={itemState.kind}
              onChange={(event) =>
                setItemState({
                  ...itemState,
                  kind: event.target.value as ProfileItemKind,
                })
              }
            >
              {itemKinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </label>
          <label>
            Title
            <input
              required
              value={itemState.title}
              onChange={(event) =>
                setItemState({ ...itemState, title: event.target.value })
              }
            />
          </label>
          <label>
            Subtitle
            <input
              value={itemState.subtitle}
              onChange={(event) =>
                setItemState({ ...itemState, subtitle: event.target.value })
              }
            />
          </label>
          <label className="wide-field">
            Description
            <textarea
              value={itemState.description}
              onChange={(event) =>
                setItemState({ ...itemState, description: event.target.value })
              }
            />
          </label>
          <label>
            Start
            <input
              value={itemState.startDate}
              onChange={(event) =>
                setItemState({ ...itemState, startDate: event.target.value })
              }
            />
          </label>
          <label>
            End
            <input
              value={itemState.endDate}
              onChange={(event) =>
                setItemState({ ...itemState, endDate: event.target.value })
              }
            />
          </label>
          <label className="wide-field">
            URL
            <input
              type="url"
              value={itemState.url}
              onChange={(event) =>
                setItemState({ ...itemState, url: event.target.value })
              }
            />
          </label>
          <div className="form-actions wide-field">
            <button className="compact-primary" type="submit">
              {editingItemId ? "Save item" : "Add item"}
            </button>
            {editingItemId ? (
              <button
                className="compact-secondary"
                type="button"
                onClick={() => {
                  setEditingItemId(null);
                  setItemState(emptyItem);
                }}
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="item-list">
          {snapshot.items.map((item) => (
            <article className="profile-item" key={item.id}>
              <div>
                <span className="item-kind">{item.kind}</span>
                <h3>{item.title}</h3>
                {item.subtitle ? <p>{item.subtitle}</p> : null}
                {item.description ? <p>{item.description}</p> : null}
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItemId(item.id);
                    setItemState(itemForm(item));
                  }}
                >
                  Edit
                </button>
                <button type="button" onClick={() => void removeItem(item.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Difference-only</p>
            <h2>Focused variants</h2>
          </div>
          <span>{snapshot.variants.length} variants</span>
        </div>

        {selectedVariant ? (
          <>
            <div className="variant-tabs" aria-label="Profile variants">
              {snapshot.variants.map((variant) => (
                <button
                  className={
                    variant.id === selectedVariantId ? "active-variant" : ""
                  }
                  type="button"
                  key={variant.id}
                  onClick={() => void selectVariant(variant)}
                >
                  {variant.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSelectedVariantId(null);
                  setResolved(null);
                  setVariantState(emptyVariant);
                }}
              >
                New
              </button>
            </div>

            <form
              className="editor-card"
              onSubmit={(event) => void saveVariant(event)}
            >
              <label>
                Name
                <input
                  required
                  value={variantState.name}
                  onChange={(event) =>
                    setVariantState({
                      ...variantState,
                      name: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Preferred language
                <input
                  value={variantState.preferredLanguage}
                  onChange={(event) =>
                    setVariantState({
                      ...variantState,
                      preferredLanguage: event.target.value,
                    })
                  }
                />
              </label>
              <label className="wide-field">
                Focus
                <textarea
                  value={variantState.focus}
                  onChange={(event) =>
                    setVariantState({
                      ...variantState,
                      focus: event.target.value,
                    })
                  }
                />
              </label>
              <label className="wide-field">
                Target tags
                <input
                  placeholder="backend, platform, typescript"
                  value={variantState.targetTags}
                  onChange={(event) =>
                    setVariantState({
                      ...variantState,
                      targetTags: event.target.value,
                    })
                  }
                />
              </label>
              <div className="form-actions wide-field">
                <button className="compact-primary" type="submit">
                  Save variant
                </button>
                <button
                  className="compact-secondary"
                  type="button"
                  onClick={() => void removeVariant()}
                >
                  Remove variant
                </button>
              </div>
            </form>

            <div className="variant-rule-list">
              {orderedItems.map((item, index) => {
                const rule = selectedVariant.rules.find(
                  (candidate) => candidate.itemId === item.id,
                );
                const effective = resolved?.items.find(
                  (candidate) => candidate.id === item.id,
                );
                return (
                  <form
                    className="variant-rule"
                    key={`${selectedVariant.id}:${item.id}:${JSON.stringify(rule)}`}
                    onSubmit={(event) => void applyVariantItem(event, item)}
                  >
                    <div className="variant-rule-title">
                      <label className="check-field">
                        <input
                          name="included"
                          type="checkbox"
                          defaultChecked={!rule?.excluded}
                        />
                        Include
                      </label>
                      <strong>{effective?.title ?? item.title}</strong>
                      <div className="order-actions">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => void moveItem(item.id, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          disabled={index === orderedItems.length - 1}
                          onClick={() => void moveItem(item.id, 1)}
                        >
                          Down
                        </button>
                      </div>
                    </div>
                    <label>
                      Override title
                      <input
                        name="overrideTitle"
                        defaultValue={rule?.contentPatch?.title ?? ""}
                      />
                    </label>
                    <label className="wide-field">
                      Override description
                      <textarea
                        name="overrideDescription"
                        defaultValue={rule?.contentPatch?.description ?? ""}
                      />
                    </label>
                    <button className="compact-secondary" type="submit">
                      Apply item rule
                    </button>
                  </form>
                );
              })}
            </div>
          </>
        ) : (
          <form
            className="editor-card"
            onSubmit={(event) => void createVariant(event)}
          >
            <label>
              Name
              <input
                required
                value={variantState.name}
                onChange={(event) =>
                  setVariantState({ ...variantState, name: event.target.value })
                }
              />
            </label>
            <label>
              Preferred language
              <input
                value={variantState.preferredLanguage}
                onChange={(event) =>
                  setVariantState({
                    ...variantState,
                    preferredLanguage: event.target.value,
                  })
                }
              />
            </label>
            <label className="wide-field">
              Focus
              <textarea
                value={variantState.focus}
                onChange={(event) =>
                  setVariantState({ ...variantState, focus: event.target.value })
                }
              />
            </label>
            <label className="wide-field">
              Target tags
              <input
                value={variantState.targetTags}
                onChange={(event) =>
                  setVariantState({
                    ...variantState,
                    targetTags: event.target.value,
                  })
                }
              />
            </label>
            <button className="compact-primary wide-field" type="submit">
              Create variant
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
