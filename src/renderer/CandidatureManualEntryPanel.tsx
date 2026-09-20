import { useEffect, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import { createApplicationDocuments } from "./create-application-documents";
import { maybeStartApplicationDocumentPreparation } from "./application-document-preparation";

interface Props {
  readonly title: string;
  readonly onDone: () => void;
  readonly onChanged: () => void;
  readonly onPrepared?: (candidatureId: string, documents: readonly { id: string; kind: "cv" | "cover_letter" }[]) => void;
  readonly onOptionalStatus?: (message: string) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

interface FieldDraft {
  readonly text: string;
  readonly choices: readonly string[];
}

function draftsFor(
  fields: readonly CandidatureFieldConfiguration[],
): Record<string, FieldDraft> {
  return Object.fromEntries(fields.map((field) => [field.definition.id, { text: "", choices: [] }]));
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

function enabledFieldsInDefinitionOrder(fields: readonly CandidatureFieldConfiguration[]) {
  return fields.filter((field) => field.definition.enabled);
}

export function CandidatureManualEntryPanel({
  title,
  onDone,
  onChanged,
  onPrepared,
  onOptionalStatus,
  onDirtyChange,
}: Props) {
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({});
  const [baseline, setBaseline] = useState<Record<string, FieldDraft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState("");
  const [parseWithAi, setParseWithAi] = useState(false);
  const [createCv, setCreateCv] = useState(false);
  const [createCoverLetter, setCreateCoverLetter] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [handoffBusy, setHandoffBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures.listFields()
      .then((nextFields) => {
        if (!active) return;
        const ordered = enabledFieldsInDefinitionOrder(nextFields);
        const nextDrafts = draftsFor(ordered);
        setFields(ordered);
        setDrafts(nextDrafts);
        setBaseline(nextDrafts);
        setFieldsLoading(false);
      })
      .catch(() => {
        if (active) {
          setFieldsLoading(false);
          setError("Application fields could not be loaded. Pasted material can still be saved.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const dirty = source.length > 0 || JSON.stringify(drafts) !== JSON.stringify(baseline);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

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
          aria-label={field.definition.label}
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
        <select aria-label={field.definition.label} value={draft.text} disabled={saving} onChange={(event) => setText(event.target.value)}>
          <option value="">Not set</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (field.definition.cardinality === "many" || field.definition.valueType === "long_text") {
      return (
        <textarea
          aria-label={field.definition.label}
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
        aria-label={field.definition.label}
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

  const importExternalHandoff = async () => {
    if (saving || handoffBusy) return;
    if (dirty && !window.confirm("Discard unsaved application edits and import the external handoff?")) {
      return;
    }
    setHandoffBusy(true);
    setError(null);
    try {
      const imported = await window.aaaat.applicationHandoff.importFile();
      if (imported.status === "cancelled") {
        setHandoffBusy(false);
        return;
      }
      onChanged();
      onOptionalStatus?.("External AI handoff imported. The application and requested documents are saved locally.");
      setHandoffBusy(false);
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not import this external AI handoff.");
      setHandoffBusy(false);
    }
  };

  const save = async () => {
    const parsedValues: { fieldId: string; value: CandidatureRuntimeValue }[] = [];
    try {
      for (const field of fields) {
        const value = parseDraft(
          field,
          drafts[field.definition.id] ?? { text: "", choices: [] },
        );
        if (value !== null && (!Array.isArray(value) || value.length > 0)) {
          parsedValues.push({ fieldId: field.definition.id, value });
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Check the candidature information.");
      return;
    }

    if (parsedValues.length === 0 && !source.trim()) {
      setError("Add a name, a note, or any information you want to keep.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await window.aaaat.candidatures.create({
          values: parsedValues,
          ...(source.trim() ? { source: {
            kind: "other" as const,
            title: "",
            url: "",
            sourceText: source.trim(),
          } } : {}),
      });
      onChanged();
      onDone();
      if (parseWithAi && !source.trim()) onOptionalStatus?.("Application saved. Add pasted material later to use AI parsing.");
      if (createCv || createCoverLetter || (parseWithAi && source.trim())) {
        void (async () => {
          try {
            const documents = createCv || createCoverLetter
              ? await createApplicationDocuments({
                  candidatureId: created.id,
                  sourceText: source.trim(),
                  cv: createCv,
                  coverLetter: createCoverLetter,
                })
              : [];
            if (documents.length > 0) onPrepared?.(created.id, documents);
            const aiStarted = await maybeStartApplicationDocumentPreparation({
              candidatureId: created.id,
              sourceText: source.trim(),
              documents,
              extract: parseWithAi && Boolean(source.trim()),
            });
            if (parseWithAi && !aiStarted) onOptionalStatus?.("Application saved. AI could not run; check its connection in Settings.");
            onChanged();
          } catch {
            onOptionalStatus?.("Application saved. Optional document or AI preparation needs attention.");
          }
        })();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this application.");
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
          <h2>{title}</h2>
        </div>
        <div className="button-row">
          <button
            type="button"
            className="compact-secondary"
            disabled={saving || handoffBusy}
            onClick={() => void importExternalHandoff()}
          >
            {handoffBusy ? "Importing…" : "Import external AI handoff…"}
          </button>
          <button type="button" className="compact-secondary" disabled={saving || handoffBusy} onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className="manual-entry-layout with-source">
        <section className="manual-source-pane" aria-label="Pasted application material">
          <h3>Paste or write</h3>
          <textarea
            aria-label="Application notes or offer"
            rows={8}
            maxLength={50000}
            value={source}
            disabled={saving}
            onChange={(event) => setSource(event.target.value)}
            placeholder="Offer, company details, recruiter message, or a note to yourself"
          />
        </section>

        <form
          className="manual-fields-pane"
          aria-label="Application information"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <div className="manual-fields-heading">
            <h3>Application information</h3>
            <button type="button" className="manual-fields-toggle compact-secondary" onClick={() => setManualOpen(!manualOpen)}>{manualOpen ? "Hide fields" : "Show fields"}</button>
          </div>
          {fieldsLoading ? (
            <p className="manual-fields-loading">Loading fields…</p>
          ) : fields.length === 0 ? (
            <p className="manual-fields-loading">Paste or write anything on the left, then save.</p>
          ) : (
            <div className={manualOpen ? "manual-field-grid manual-open" : "manual-field-grid"}>
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
            <div className="application-save-options" aria-label="Optional actions after saving">
              <label><input type="checkbox" checked={parseWithAi} onChange={(event) => setParseWithAi(event.target.checked)} /> Parse with AI</label>
              <label><input type="checkbox" checked={createCv} onChange={(event) => setCreateCv(event.target.checked)} /> Dedicated CV</label>
              <label><input type="checkbox" checked={createCoverLetter} onChange={(event) => setCreateCoverLetter(event.target.checked)} /> Cover letter</label>
            </div>
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save application"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
