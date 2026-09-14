import { useEffect, useMemo, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../shared/contracts";

interface Props {
  readonly candidatureId?: string;
  readonly sourceText?: string;
  readonly title: string;
  readonly onDone: () => void;
  readonly onChanged: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

interface FieldDraft {
  readonly text: string;
  readonly choices: readonly string[];
}

function textFor(value: CandidatureRuntimeValue | undefined): string {
  if (value === undefined) return "";
  if (Array.isArray(value)) return value.map(String).join("\n");
  return typeof value === "boolean" ? (value ? "true" : "false") : String(value);
}

function choicesFor(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue | undefined,
): readonly string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return typeof value === "string" && field.definition.valueType === "choice" ? [value] : [];
}

function draftsFor(
  fields: readonly CandidatureFieldConfiguration[],
  record: CandidatureRecord | null,
): Record<string, FieldDraft> {
  const values = new Map(record?.values.map((value) => [value.fieldId, value.value]) ?? []);
  return Object.fromEntries(
    fields.map((field) => {
      const value = values.get(field.definition.id);
      return [
        field.definition.id,
        { text: textFor(value), choices: choicesFor(field, value) },
      ];
    }),
  );
}

function parseDraft(
  field: CandidatureFieldConfiguration,
  draft: FieldDraft,
): CandidatureRuntimeValue | null {
  const definition = field.definition;
  if (definition.valueType === "choice") {
    if (definition.cardinality === "many") return [...draft.choices];
    return draft.choices[0] ?? null;
  }
  if (definition.cardinality === "many") {
    const items = draft.text
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
      return items.map((item) => {
        if (item === "true") return true;
        if (item === "false") return false;
        throw new Error("Enter Yes or No for each value.");
      });
    }
    return items;
  }
  if (!draft.text.trim()) return null;
  if (definition.valueType === "number") {
    const number = Number(draft.text);
    if (!Number.isFinite(number)) throw new Error("Enter a valid number.");
    return number;
  }
  if (definition.valueType === "boolean") {
    if (draft.text === "true") return true;
    if (draft.text === "false") return false;
    return null;
  }
  return draft.text.trim();
}

function orderFields(fields: readonly CandidatureFieldConfiguration[]) {
  return [...fields]
    .filter((field) => field.definition.enabled)
    .sort((left, right) => {
      if (left.preferences.focusVisible !== right.preferences.focusVisible) {
        return left.preferences.focusVisible ? -1 : 1;
      }
      const leftOrder = left.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.definition.label.localeCompare(right.definition.label);
    });
}

export function CandidatureManualEntryPanel({
  candidatureId,
  sourceText,
  title,
  onDone,
  onChanged,
  onDirtyChange,
}: Props) {
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [record, setRecord] = useState<CandidatureRecord | null>(null);
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({});
  const [baseline, setBaseline] = useState<Record<string, FieldDraft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.listFields(),
      candidatureId ? window.aaaat.candidatures.list() : Promise.resolve([]),
    ])
      .then(([nextFields, records]) => {
        if (!active) return;
        const ordered = orderFields(nextFields);
        const nextRecord = candidatureId
          ? records.find((candidate) => candidate.id === candidatureId) ?? null
          : null;
        const nextDrafts = draftsFor(ordered, nextRecord);
        setFields(ordered);
        setRecord(nextRecord);
        setDrafts(nextDrafts);
        setBaseline(nextDrafts);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidature information.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  const dirty = JSON.stringify(drafts) !== JSON.stringify(baseline);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const values = useMemo(() => {
    const parsed: { fieldId: string; value: CandidatureRuntimeValue }[] = [];
    for (const field of fields) {
      const draft = drafts[field.definition.id] ?? { text: "", choices: [] };
      const value = parseDraft(field, draft);
      if (value !== null && (!Array.isArray(value) || value.length > 0)) {
        parsed.push({ fieldId: field.definition.id, value });
      }
    }
    return parsed;
  }, [drafts, fields]);

  const setDraft = (fieldId: string, draft: FieldDraft) => {
    setDrafts((current) => ({ ...current, [fieldId]: draft }));
    setError(null);
  };

  const renderInput = (field: CandidatureFieldConfiguration) => {
    const draft = drafts[field.definition.id] ?? { text: "", choices: [] };
    const setText = (text: string) => setDraft(field.definition.id, { ...draft, text });
    const setChoices = (choices: readonly string[]) =>
      setDraft(field.definition.id, { ...draft, choices });

    if (field.definition.valueType === "choice") {
      if (field.definition.cardinality === "many") {
        return (
          <div className="choice-value-list compact-choice-list">
            {field.definition.choices.map((choice) => (
              <label key={choice.id}>
                <input
                  type="checkbox"
                  checked={draft.choices.includes(choice.id)}
                  disabled={saving}
                  onChange={(event) =>
                    setChoices(
                      event.target.checked
                        ? [...draft.choices.filter((id) => id !== choice.id), choice.id]
                        : draft.choices.filter((id) => id !== choice.id),
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
          value={draft.choices[0] ?? ""}
          disabled={saving}
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
        <select value={draft.text} disabled={saving} onChange={(event) => setText(event.target.value)}>
          <option value="">Not set</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (field.definition.cardinality === "many" || field.definition.valueType === "long_text") {
      return (
        <textarea
          rows={field.definition.valueType === "long_text" ? 4 : 3}
          value={draft.text}
          disabled={saving}
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
        value={draft.text}
        disabled={saving}
        onChange={(event) => setText(event.target.value)}
      />
    );
  };

  const save = async () => {
    let parsedValues: { fieldId: string; value: CandidatureRuntimeValue }[];
    try {
      parsedValues = values;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Check the candidature information.");
      return;
    }

    if (!candidatureId && parsedValues.length === 0) {
      setError("Add at least one useful piece of information, or use Paste text instead.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (!candidatureId) {
        await window.aaaat.candidatures.create({ values: parsedValues });
      } else {
        let updated = record;
        for (const field of fields) {
          const fieldId = field.definition.id;
          if (JSON.stringify(drafts[fieldId]) === JSON.stringify(baseline[fieldId])) continue;
          const value = parseDraft(field, drafts[fieldId] ?? { text: "", choices: [] });
          updated =
            value === null || (Array.isArray(value) && value.length === 0)
              ? await window.aaaat.candidatures.clearFieldValue({ candidatureId, fieldId })
              : await window.aaaat.candidatures.setFieldValue({ candidatureId, fieldId, value });
        }
        setRecord(updated);
      }
      setBaseline(drafts);
      onChanged();
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this candidature.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (dirty && !window.confirm("Discard unsaved candidature edits?")) return;
    onDone();
  };

  return (
    <section className="candidature-manual-entry" aria-label={title}>
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">New candidature</p>
          <h2>{title}</h2>
          <p>Keep only what is useful. Missing information is fine.</p>
        </div>
        <button type="button" className="compact-secondary" disabled={saving} onClick={cancel}>
          Cancel
        </button>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className={sourceText ? "manual-entry-layout with-source" : "manual-entry-layout"}>
        {sourceText ? (
          <section className="manual-source-pane" aria-label="Pasted candidature material">
            <h3>Pasted material</h3>
            <pre>{sourceText}</pre>
          </section>
        ) : null}

        <form
          className="manual-fields-pane"
          aria-label="Candidature information"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="manual-fields-heading">
            <h3>Information</h3>
            <span className="compact-help">Fill what you know; leave the rest blank.</span>
          </div>
          {fields.length === 0 ? (
            <p className="compact-empty">No candidature information is currently available.</p>
          ) : (
            <div className="manual-field-grid">
              {fields.map((field) => (
                <label className="manual-field" key={field.definition.id}>
                  <span className="manual-field-label">{field.definition.label}</span>
                  {field.definition.description ? (
                    <span className="field-hint">{field.definition.description}</span>
                  ) : null}
                  {renderInput(field)}
                </label>
              ))}
            </div>
          )}
          <div className="manual-entry-actions">
            <button type="submit" disabled={saving || fields.length === 0}>
              {saving ? "Saving…" : candidatureId ? "Save details" : "Save candidature"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
