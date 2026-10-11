import { useEffect, useRef, useState } from "react";
import type { PartialJobExtractionResult, PartialTagInferenceResult } from "../shared/ai-proposal-outcomes";
import type { CandidatureFieldConfiguration, CandidatureRuntimeValue } from "../shared/contracts";
import { compactSourceText } from "../shared/source-text";
import { useShellActions } from "./shell-actions";

interface EntryProps {
  readonly onCancel: () => void;
  readonly onCreated: (candidatureId: string, tags?: PartialTagInferenceResult) => void;
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


function valueDraft(field: CandidatureFieldConfiguration, value: CandidatureRuntimeValue): FieldDraft {
  if (field.definition.valueType === "choice") return { text: "", choices: Array.isArray(value) ? value.map(String) : [String(value)] };
  return { text: Array.isArray(value) ? value.map(String).join("\n") : String(value), choices: [] };
}

export function CandidatureManualEntryPanel({ onCancel, onCreated, onDirtyChange }: EntryProps) {
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({});
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<PartialJobExtractionResult["proposals"]>([]);
  const [tagResult, setTagResult] = useState<PartialTagInferenceResult>();
  const edits = useRef<Record<string, number>>({});
  const sourceRevision = useRef(0);
  const currentDrafts = useRef(drafts);
  const active = useRef(true);
  const taskId = useRef("application-draft:" + crypto.randomUUID());

  useEffect(() => {
    active.current = true;
    const requestId = taskId.current;
    void window.aaaat.candidatures.listFields().then((next) => {
      if (!active.current) return;
      const enabled = next.filter((field) => field.definition.enabled);
      const initial = draftsFor(enabled);
      currentDrafts.current = initial;
      setFields(enabled); setDrafts(initial); setFieldsLoading(false);
    }).catch(() => {
      if (active.current) { setFieldsLoading(false); setError("Application fields could not be loaded."); }
    });
    return () => {
      active.current = false;
      void window.aaaat.aiTasks.cancelJobExtraction(requestId).catch(() => undefined);
      void window.aaaat.aiTasks.cancelTagInference(requestId + ":tags").catch(() => undefined);
    };
  }, []);

  const dirty = source.length > 0 || Boolean(tagResult) || Object.values(drafts).some((draft) => draft.text.length > 0 || draft.choices.length > 0);
  useEffect(() => { onDirtyChange?.(dirty); return () => onDirtyChange?.(false); }, [dirty, onDirtyChange]);

  const setDraft = (fieldId: string, draft: FieldDraft) => {
    edits.current[fieldId] = (edits.current[fieldId] ?? 0) + 1;
    currentDrafts.current = { ...currentDrafts.current, [fieldId]: draft };
    setDrafts(currentDrafts.current);
    setConflicts((current) => current.filter((proposal) => proposal.fieldId !== fieldId));
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


  const extract = async () => {
    if (extracting || !source.trim()) return;
    setExtracting(true); setError(null); setMessage(null);
    const versions = { ...edits.current };
    const sourceAtRequest = sourceRevision.current;
    const targets = fields.filter((field) => field.preferences.aiUseAllowed && !(currentDrafts.current[field.definition.id]?.text.trim() || currentDrafts.current[field.definition.id]?.choices.length));
    const request = { sourceTitle: "", sourceUrl: "", sourceText: compactSourceText(source).slice(0, 50000) };
    try {
      const [information, tags] = await Promise.allSettled([
        targets.length ? window.aaaat.aiTasks.extractJob(taskId.current, { ...request, targetFieldIds: targets.map((field) => field.definition.id) }) : Promise.resolve<PartialJobExtractionResult>({ proposals: [], issues: [] }),
        window.aaaat.aiTasks.inferTags(taskId.current + ":tags", request),
      ]);
      if (!active.current) return;
      if (sourceRevision.current !== sourceAtRequest) { setMessage("The material changed while AI was working. Extract again to use the new text."); return; }
      if (tags.status === "fulfilled") setTagResult(tags.value);
      const skipped: PartialJobExtractionResult["proposals"] = [];
      let count = 0;
      if (information.status === "fulfilled") {
        const next = { ...currentDrafts.current };
        for (const proposal of information.value.proposals) {
          const field = targets.find((candidate) => candidate.definition.id === proposal.fieldId);
          if (!field) continue;
          if ((edits.current[proposal.fieldId] ?? 0) !== (versions[proposal.fieldId] ?? 0) || Boolean(next[proposal.fieldId]?.text.trim() || next[proposal.fieldId]?.choices.length)) {
            skipped.push(proposal); continue;
          }
          next[proposal.fieldId] = valueDraft(field, proposal.value); count += 1;
        }
        currentDrafts.current = next; setDrafts(next); setConflicts(skipped);
        setMessage(`${count} field${count === 1 ? "" : "s"} filled. Edit anything before saving.`);
        if (information.value.issues.length) setError(information.value.issues.map((issue) => issue.reason).join(" "));
      } else setError(information.reason instanceof Error ? information.reason.message : "Information extraction was unavailable.");
      if (tags.status === "rejected") setError((current) => [current, "Tag suggestions were unavailable."].filter(Boolean).join(" "));
    } catch (reason) {
      if (active.current) setError(reason instanceof Error ? reason.message : "AI could not extract this material.");
    } finally { if (active.current) setExtracting(false); }
  };

  const save = async () => {
    if (saving || extracting) return;
    const values: { fieldId: string; value: CandidatureRuntimeValue }[] = [];
    try {
      for (const field of fields) {
        const value = parseDraft(field, currentDrafts.current[field.definition.id] ?? { text: "", choices: [] });
        if (value !== null && (!Array.isArray(value) || value.length)) values.push({ fieldId: field.definition.id, value });
      }
      if (!source.trim() && !values.length) { setError("Add an offer, note, or application detail."); return; }
      setSaving(true); setError(null);
      const created = await window.aaaat.candidatures.create({
        values,
        ...(source.trim() ? { source: { kind: "other" as const, title: "", url: "", sourceText: source } } : {}),
      });
      onCreated(created.id, tagResult);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The application could not be saved."); }
    finally { setSaving(false); }
  };
  const cancel = () => {
    if (dirty && !window.confirm("Discard this application draft?")) return;
    onCancel();
  };
  useShellActions({
    title: "New application",
    actions: [
      { id: "save-application", label: saving ? "Saving…" : "Save", onClick: () => void save(), primary: true, disabled: saving || extracting || !dirty },
      { id: "extract-draft", label: extracting ? "Extracting…" : "Extract with AI", onClick: () => void extract(), disabled: !source.trim() || extracting || saving || fieldsLoading },
      { id: "close-application", label: "Cancel", onClick: cancel, disabled: saving },
    ],
  }, 1);

  return (
    <section className="application-draft" aria-label="New application">
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="application-draft-columns">
        <label className="application-draft-source">
          <span>Offer or notes</span>
          <textarea rows={18} maxLength={50000} value={source} disabled={saving} onChange={(event) => { sourceRevision.current += 1; setSource(event.target.value); setTagResult(undefined); }} placeholder="Paste an offer, recruiter message, link, or notes" />
          <small>Extract with AI sends this material to your configured AI to fill fields and suggest Tags.</small>
        </label>
        <div className="application-draft-fields">
          {fieldsLoading ? <p>Loading fields…</p> : (
            <div className="manual-field-grid">
              {fields.map((field) => (
                <div className="manual-field" key={field.definition.id}>
                  <label className="manual-field-label">{field.definition.label}</label>
                  {renderInput(field)}
                  {field.definition.description ? <details className="field-description"><summary>About this field</summary><p>{field.definition.description}</p></details> : null}
                </div>
              ))}
            </div>
          )}
          {conflicts.map((proposal) => {
            const field = fields.find((candidate) => candidate.definition.id === proposal.fieldId);
            if (!field) return null;
            return <div className="application-draft-conflict" key={proposal.fieldId}><strong>{field.definition.label}: another value found</strong><p>{Array.isArray(proposal.value) ? proposal.value.join(", ") : String(proposal.value)}</p><button type="button" onClick={() => setDraft(proposal.fieldId, valueDraft(field, proposal.value))}>Use suggestion</button><button type="button" onClick={() => setConflicts((current) => current.filter((item) => item.fieldId !== proposal.fieldId))}>Dismiss</button></div>;
          })}
          {tagResult && (tagResult.existingTags.length + tagResult.newTags.length > 0) ? <div className="application-draft-tags"><strong>Suggested Tags</strong><p>{[...tagResult.existingTags.map((tag) => tag.name), ...tagResult.newTags.map((tag) => tag.name)].join(" · ")}</p><small>Review these Tags with the saved application.</small></div> : null}
        </div>
      </div>
    </section>
  );
}
