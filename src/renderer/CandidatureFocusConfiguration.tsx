import { useMemo, useState } from "react";

import type { CandidatureFieldConfiguration } from "../shared/contracts";

function focusOrder(fields: readonly CandidatureFieldConfiguration[]) {
  return fields
    .filter((field) => field.definition.enabled && field.preferences.focusVisible)
    .sort((left, right) => {
      const leftOrder = left.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.definition.label.localeCompare(right.definition.label);
    });
}

export function CandidatureFocusConfiguration({
  fields,
  onChanged,
  onPersisted,
}: {
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly onChanged: (field: CandidatureFieldConfiguration) => void;
  readonly onPersisted?: () => void;
}) {
  const [busyFieldId, setBusyFieldId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enabledFields = useMemo(
    () => fields.filter((field) => field.definition.enabled),
    [fields],
  );
  const visibleFields = useMemo(() => focusOrder(enabledFields), [enabledFields]);
  const visibleIds = useMemo(
    () => new Set(visibleFields.map((field) => field.definition.id)),
    [visibleFields],
  );
  const displayedFields = useMemo(
    () => [
      ...visibleFields,
      ...enabledFields
        .filter((field) => !visibleIds.has(field.definition.id))
        .sort((left, right) => left.definition.label.localeCompare(right.definition.label)),
    ],
    [enabledFields, visibleFields, visibleIds],
  );

  const persist = async (
    field: CandidatureFieldConfiguration,
    patch: Partial<CandidatureFieldConfiguration["preferences"]>,
  ): Promise<boolean> => {
    const optimistic = {
      ...field,
      preferences: { ...field.preferences, ...patch },
    };
    onChanged(optimistic);
    setBusyFieldId(field.definition.id);
    setError(null);
    try {
      const saved = await window.aaaat.candidatures.updateFieldPreferences({
        ...optimistic.preferences,
        fieldId: field.definition.id,
      });
      onChanged(saved);
      onPersisted?.();
      return true;
    } catch (reason) {
      onChanged(field);
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not save the Focus information settings.",
      );
      return false;
    } finally {
      setBusyFieldId(null);
    }
  };

  const setVisible = async (field: CandidatureFieldConfiguration, visible: boolean) => {
    if (!visible) {
      await persist(field, { focusVisible: false });
      return;
    }
    const nextOrder = visibleFields.reduce(
      (maximum, candidate) => Math.max(maximum, candidate.preferences.focusOrder ?? -1),
      -1,
    ) + 1;
    await persist(field, { focusVisible: true, focusOrder: nextOrder });
  };

  const move = async (field: CandidatureFieldConfiguration, direction: -1 | 1) => {
    const currentIndex = visibleFields.findIndex(
      (candidate) => candidate.definition.id === field.definition.id,
    );
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= visibleFields.length) return;

    const reordered = [...visibleFields];
    const [moved] = reordered.splice(currentIndex, 1);
    if (!moved) return;
    reordered.splice(targetIndex, 0, moved);

    for (const [index, candidate] of reordered.entries()) {
      if (candidate.preferences.focusOrder === index) continue;
      const saved = await persist(candidate, { focusOrder: index });
      if (!saved) return;
    }
  };

  return (
    <details className="candidature-focus-configuration">
      <summary>Choose Focus information</summary>
      <div className="candidature-focus-configuration-panel">
        <p className="compact-help">Choose the application information shown on Focus cards and put the most useful items first.</p>
        {enabledFields.length === 0 ? (
          <p className="compact-empty">No application information fields are available yet.</p>
        ) : (
          <div className="candidature-focus-field-list">
            {displayedFields.map((field) => {
              const visibleIndex = visibleFields.findIndex(
                (candidate) => candidate.definition.id === field.definition.id,
              );
              const isVisible = visibleIndex >= 0;
              const busy = busyFieldId === field.definition.id;
              return (
                <div className="candidature-focus-field-row" key={field.definition.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={isVisible}
                      disabled={busyFieldId !== null}
                      onChange={(event) => void setVisible(field, event.target.checked)}
                    />
                    {field.definition.label}
                  </label>
                  {isVisible ? (
                    <span className="button-row">
                      <button
                        type="button"
                        className="compact-secondary"
                        aria-label={`Move ${field.definition.label} up in Focus`}
                        disabled={busyFieldId !== null || visibleIndex === 0}
                        onClick={() => void move(field, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="compact-secondary"
                        aria-label={`Move ${field.definition.label} down in Focus`}
                        disabled={busyFieldId !== null || visibleIndex === visibleFields.length - 1}
                        onClick={() => void move(field, 1)}
                      >
                        ↓
                      </button>
                    </span>
                  ) : null}
                  {busy ? <span className="compact-help">Saving…</span> : null}
                </div>
              );
            })}
          </div>
        )}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    </details>
  );
}
