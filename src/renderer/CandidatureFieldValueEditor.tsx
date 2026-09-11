import { useEffect, useRef, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";

interface Props {
  readonly field: CandidatureFieldConfiguration;
  readonly value?: CandidatureRuntimeValue;
  readonly onSave: (value: CandidatureRuntimeValue) => Promise<void>;
  readonly onClear: () => Promise<void>;
  readonly onDiscover: () => Promise<void>;
  readonly onDirtyChange?: (dirty: boolean) => void;
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
  onDirtyChange,
}: Props) {
  const [editing, setEditing] = useState(value === undefined);
  const [text, setText] = useState(textFor(value));
  const [choices, setChoices] = useState<string[]>(choicesFor(field, value));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onDirtyChangeRef = useRef(onDirtyChange);

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    setText(textFor(value));
    setChoices(choicesFor(field, value));
    setError(null);
  }, [field, value]);

  const dirty =
    editing &&
    (text !== textFor(value) || JSON.stringify(choices) !== JSON.stringify(choicesFor(field, value)));

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

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const parsed = parsedValue();
      if (parsed === null || (Array.isArray(parsed) && parsed.length === 0)) {
        await onClear();
      } else {
        await onSave(parsed);
      }
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this value.");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    setError(null);
    try {
      await onClear();
      setEditing(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not clear this value.");
    } finally {
      setBusy(false);
    }
  };

  const discover = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDiscover();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not discover this value.");
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    setText(textFor(value));
    setChoices(choicesFor(field, value));
    setError(null);
    setEditing(false);
  };

  if (value !== undefined && !editing) {
    return (
      <div className="candidature-value-editor candidature-value-reader">
        <p style={{ margin: 0, overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
          {displayValue(field, value)}
        </p>
        <div className="button-row">
          <button type="button" className="compact-secondary" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
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
    <div className="candidature-value-editor">
      {input}
      <div className="button-row">
        <button type="button" disabled={busy} onClick={() => void save()}>Save</button>
        {value !== undefined ? (
          <>
            <button type="button" className="compact-secondary" disabled={busy} onClick={() => void clear()}>
              Clear
            </button>
            <button type="button" className="compact-secondary" disabled={busy} onClick={cancel}>
              Cancel
            </button>
          </>
        ) : null}
        <button type="button" className="compact-secondary" disabled={busy} onClick={() => void discover()}>
          Discover from Sources
        </button>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </div>
  );
}
