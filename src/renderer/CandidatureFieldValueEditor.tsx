import { useEffect, useRef, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureFieldPreferences,
  CandidatureFieldUpdate,
  CandidatureRuntimeValue,
} from "../shared/contracts";

interface Props {
  readonly field: CandidatureFieldConfiguration;
  readonly value?: CandidatureRuntimeValue;
  readonly onSave: (value: CandidatureRuntimeValue) => Promise<void>;
  readonly onClear: () => Promise<void>;
  readonly onDiscover?: () => void | Promise<void>;
  readonly onUpdateField?: (update: CandidatureFieldUpdate) => Promise<void>;
  readonly onUpdatePreferences?: (patch: Partial<CandidatureFieldPreferences>) => Promise<void>;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly initialEditing?: boolean;
  readonly saveLabel?: string;
  readonly clearLabel?: string;
  readonly discoverLabel?: string;
  readonly showFieldControls?: boolean;
}

function textFor(value: CandidatureRuntimeValue | undefined): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.map(String).join("\n");
  return typeof value === "boolean" ? (value ? "true" : "false") : String(value);
}

function choicesFor(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue | undefined,
): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" && field.definition.valueType === "choice" ? [value] : [];
}

function displayValue(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): string {
  const displayOne = (item: string | number | boolean): string => {
    if (field.definition.valueType === "choice" && typeof item === "string") {
      return field.definition.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    if (typeof item === "boolean") return item ? "Yes" : "No";
    return String(item);
  };
  return Array.isArray(value) ? value.map(displayOne).join(", ") : displayOne(value);
}

export function CandidatureFieldValueEditor({
  field,
  value,
  onSave,
  onClear,
  onDiscover,
  onUpdateField,
  onUpdatePreferences,
  onDirtyChange,
  initialEditing = false,
  saveLabel = "Save",
  clearLabel = "Clear",
  discoverLabel = "Ask AI to fill",
  showFieldControls = true,
}: Props) {
  const [editing, setEditing] = useState(initialEditing);
  const [text, setText] = useState(textFor(value));
  const [choices, setChoices] = useState<string[]>(choicesFor(field, value));
  const [definitionName, setDefinitionName] = useState(field.definition.label);
  const [definitionDescription, setDefinitionDescription] = useState(field.definition.description);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDirtyChangeRef = useRef(onDirtyChange);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  const valueDirty =
    editing &&
    (text !== textFor(value) || JSON.stringify(choices) !== JSON.stringify(choicesFor(field, value)));
  const definitionDirty =
    editing &&
    showFieldControls &&
    onUpdateField !== undefined &&
    (definitionName !== field.definition.label || definitionDescription !== field.definition.description);
  const dirty = valueDirty || definitionDirty;

  useEffect(() => {
    if (dirty) return;
    setText(textFor(value));
    setChoices(choicesFor(field, value));
    setDefinitionName(field.definition.label);
    setDefinitionDescription(field.definition.description);
    setError(null);
  }, [dirty, field, value]);

  useEffect(() => {
    onDirtyChangeRef.current?.(dirty);
  }, [dirty]);

  useEffect(
    () => () => {
      onDirtyChangeRef.current?.(false);
    },
    [],
  );

  const parsedValue = (): CandidatureRuntimeValue | null => {
    const definition = field.definition;
    if (definition.valueType === "choice") {
      if (definition.cardinality === "many") return choices;
      return choices[0] ?? null;
    }
    if (definition.cardinality === "many") {
      const items = text
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);
      if (items.length === 0) return null;
      if (definition.valueType === "number") {
        const numbers = items.map(Number);
        if (numbers.some((item) => !Number.isFinite(item))) {
          throw new Error("Enter one valid number per line.");
        }
        return numbers;
      }
      if (definition.valueType === "boolean") {
        const booleans = items.map((item) => {
          if (item === "true") return true;
          if (item === "false") return false;
          throw new Error("Enter true or false on each line.");
        });
        return booleans;
      }
      return items;
    }
    if (!text.trim()) return null;
    if (definition.valueType === "number") {
      const number = Number(text);
      if (!Number.isFinite(number)) throw new Error("Enter a valid number.");
      return number;
    }
    if (definition.valueType === "boolean") {
      if (text === "true") return true;
      if (text === "false") return false;
      return null;
    }
    return text;
  };

  const persistDefinition = async () => {
    if (!definitionDirty || !onUpdateField) return;
    await onUpdateField({
      id: field.definition.id,
      label: definitionName.trim(),
      description: definitionDescription,
      valueType: field.definition.valueType,
      cardinality: field.definition.cardinality,
      choices: field.definition.choices,
      enabled: field.definition.enabled,
    });
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (!definitionName.trim()) throw new Error("Information name cannot be empty.");
      await persistDefinition();
      const parsed = parsedValue();
      if (parsed === null || (Array.isArray(parsed) && parsed.length === 0)) {
        await onClear();
      } else {
        await onSave(parsed);
      }
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this information.");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setError(null);
    try {
      await persistDefinition();
      await onClear();
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not clear this information.");
    } finally {
      setBusy(false);
    }
  };

  const discover = async () => {
    if (!onDiscover) return;
    setError(null);
    try {
      await onDiscover();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not request an AI suggestion.");
    }
  };

  const updatePreferences = async (patch: Partial<CandidatureFieldPreferences>) => {
    if (!onUpdatePreferences) return;
    setBusy(true);
    setError(null);
    try {
      await onUpdatePreferences(patch);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this information setting.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setText(textFor(value));
    setChoices(choicesFor(field, value));
    setDefinitionName(field.definition.label);
    setDefinitionDescription(field.definition.description);
    setError(null);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="candidature-value-editor candidature-value-reader">
        <p className={value === undefined ? "candidature-missing-value" : undefined}>
          {value === undefined ? "Not set" : displayValue(field, value)}
        </p>
        <div className="candidature-field-affordances">
          <button
            type="button"
            className="candidature-icon-button"
            aria-label={`Edit ${field.definition.label}`}
            title="Edit"
            onClick={() => setEditing(true)}
          >
            <span aria-hidden="true">✎</span>
          </button>
          {onDiscover ? (
            <button
              type="button"
              className="candidature-icon-button candidature-ai-button"
              aria-label={`Ask AI to fill ${field.definition.label}`}
              title={discoverLabel}
              onClick={() => void discover()}
            >
              <span aria-hidden="true">✦</span>
            </button>
          ) : null}
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>
    );
  }

  const input = (() => {
    if (field.definition.valueType === "choice") {
      if (field.definition.cardinality === "many") {
        return (
          <div className="choice-value-list">
            {field.definition.choices.map((choice) => (
              <label key={choice.id}>
                <input
                  type="checkbox"
                  checked={choices.includes(choice.id)}
                  disabled={busy}
                  onChange={(event) =>
                    setChoices((current) =>
                      event.target.checked
                        ? [...current.filter((id) => id !== choice.id), choice.id]
                        : current.filter((id) => id !== choice.id),
                    )
                  }
                />
                {choice.label}
              </label>
            ))}
          </div>
        );
      }
      return (
        <select
          value={choices[0] ?? ""}
          disabled={busy}
          onChange={(event) => setChoices(event.target.value ? [event.target.value] : [])}
        >
          <option value="">Not set</option>
          {field.definition.choices.map((choice) => (
            <option key={choice.id} value={choice.id}>{choice.label}</option>
          ))}
        </select>
      );
    }
    if (field.definition.valueType === "boolean" && field.definition.cardinality === "one") {
      return (
        <select value={text} disabled={busy} onChange={(event) => setText(event.target.value)}>
          <option value="">Not set</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }
    if (field.definition.cardinality === "many" || field.definition.valueType === "long_text") {
      return (
        <textarea
          rows={field.definition.valueType === "long_text" ? 5 : 4}
          value={text}
          disabled={busy}
          onChange={(event) => setText(event.target.value)}
          placeholder={field.definition.cardinality === "many" ? "One value per line" : undefined}
        />
      );
    }
    return (
      <input
        type={
          field.definition.valueType === "number"
            ? "number"
            : field.definition.valueType === "date"
              ? "date"
              : field.definition.valueType === "url"
                ? "url"
                : "text"
        }
        value={text}
        disabled={busy}
        onChange={(event) => setText(event.target.value)}
      />
    );
  })();

  return (
    <div className="candidature-value-editor candidature-value-editor-active">
      {showFieldControls && onUpdateField ? (
        <div className="candidature-field-definition-inline">
          <label>
            Name
            <input
              value={definitionName}
              disabled={busy}
              onChange={(event) => setDefinitionName(event.target.value)}
            />
          </label>
          <label>
            Details <span className="compact-help">optional</span>
            <input
              value={definitionDescription}
              disabled={busy}
              onChange={(event) => setDefinitionDescription(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      <label className="candidature-value-input">
        Value
        {input}
      </label>

      {showFieldControls && onUpdatePreferences ? (
        <div className="candidature-field-inline-controls">
          <label>
            <input
              type="checkbox"
              checked={field.preferences.focusVisible}
              disabled={busy}
              onChange={(event) => void updatePreferences({ focusVisible: event.target.checked })}
            />
            Show in Focus
          </label>
          <label>
            <input
              type="checkbox"
              checked={field.preferences.aiContextMode === "expose"}
              disabled={busy}
              onChange={(event) =>
                void updatePreferences({ aiContextMode: event.target.checked ? "expose" : "omit" })
              }
            />
            Allow AI to use this information
          </label>
          {field.preferences.aiContextMode === "token" ? (
            <small>This field currently uses a local placeholder for AI context. Changing the toggle replaces that advanced setting.</small>
          ) : null}
        </div>
      ) : null}

      <div className="button-row candidature-field-edit-actions">
        <button type="button" disabled={busy} onClick={() => void save()}>{saveLabel}</button>
        {value !== undefined ? (
          <button type="button" className="compact-secondary" disabled={busy} onClick={() => void clear()}>
            {clearLabel}
          </button>
        ) : null}
        <button type="button" className="compact-secondary" disabled={busy} onClick={cancel}>
          Cancel
        </button>
        {onDiscover ? (
          <button
            type="button"
            className="candidature-icon-button candidature-ai-button"
            aria-label={`Ask AI to fill ${field.definition.label}`}
            title={discoverLabel}
            disabled={busy}
            onClick={() => void discover()}
          >
            <span aria-hidden="true">✦</span>
          </button>
        ) : null}
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </div>
  );
}
