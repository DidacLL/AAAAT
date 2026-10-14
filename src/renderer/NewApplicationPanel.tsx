import { useEffect, useRef, useState } from "react";
import type { CandidatureFieldConfiguration, CandidatureRuntimeValue, TagInput, TagRecord } from "../shared/contracts";
import type { PartialTagInferenceResult } from "../shared/ai-proposal-outcomes";
import { aiTaskFailure } from "./ai-task-store";
import { PageToolbar } from "./PageToolbar";
import { useContextualHandoffs } from "./contextual-handoffs";

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


function emptyDraft(draft: FieldDraft): boolean { return !draft.text.trim() && draft.choices.length === 0; }
function draftValue(field: CandidatureFieldConfiguration, value: CandidatureRuntimeValue): FieldDraft {
  if (field.definition.valueType === "choice") return { text: "", choices: Array.isArray(value) ? value.map(String) : [String(value)] };
  return { text: Array.isArray(value) ? value.map(String).join("\n") : String(value), choices: [] };
}

export function NewApplicationPanel({ onCreated, onCancel, onDirtyChange }: {
  readonly onCreated: (id: string) => void;
  readonly onCancel: () => void;
  readonly onDirtyChange: (dirty: boolean) => void;
}) {
  const { openSettingsFor } = useContextualHandoffs();
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [drafts, setDrafts] = useState<Record<string, FieldDraft>>({});
  const [source, setSource] = useState("");
  const sourceRef = useRef(source);
  const fieldRevisions = useRef(new Map<string, number>());
  const [tags, setTags] = useState<TagRecord[]>([]);
  const tagRevision = useRef(0);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [newTags, setNewTags] = useState<(TagInput & { selected: boolean })[]>([]);
  const [tagQuery, setTagQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [filling, setFilling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [routeName, setRouteName] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([window.aaaat.candidatures.listFields(), window.aaaat.candidatures.listTags(), window.aaaat.aiConnections.list()])
      .then(([configured, glossary, connections]) => {
        if (!active) return;
        const enabled = configured.filter(field => field.definition.enabled);
        setFields(enabled); setDrafts(draftsFor(enabled)); setTags(glossary);
        setRouteName(connections.find(c => c.isDefault)?.name ?? null);
        setLoading(false);
      }).catch(reason => { if (active) { setLoading(false); setError(aiTaskFailure(reason).message); } });
    return () => { active = false; if (requestId.current) { void window.aaaat.aiTasks.cancelJobExtraction(requestId.current); void window.aaaat.aiTasks.cancelTagInference(requestId.current + ":tags"); } };
  }, []);
  const dirty = Boolean(source || Object.values(drafts).some(draft => !emptyDraft(draft)) || tagIds.length || newTags.length);
  useEffect(() => { onDirtyChange(dirty); return () => onDirtyChange(false); }, [dirty, onDirtyChange]);

  const setDraft = (fieldId: string, draft: FieldDraft) => {
    fieldRevisions.current.set(fieldId, (fieldRevisions.current.get(fieldId) ?? 0) + 1);
    setDrafts(current => ({ ...current, [fieldId]: draft })); setError(null);
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


  const fill = async () => {
    if (filling || saving || !source.trim()) return;
    const connections = await window.aaaat.aiConnections.list().catch(() => []);
    const route = connections.find(c => c.isDefault);
    if (!route) { openSettingsFor("ai", "candidatures"); return; }
    setRouteName(route.name); setFilling(true); setError(null); setFeedback(null);
    const requestedText = source;
    const requested = fields.filter(field => field.preferences.aiUseAllowed && emptyDraft(drafts[field.definition.id] ?? { text: "", choices: [] }));
    const revisions = new Map(fieldRevisions.current);
    const startedTagRevision = tagRevision.current;
    const id = crypto.randomUUID(); requestId.current = id;
    const request = { sourceTitle: "Application text", sourceUrl: "", sourceText: requestedText };
    try {
      const [fieldResult, tagResult] = await Promise.allSettled([
        requested.length ? window.aaaat.aiTasks.extractJob(id, { ...request, targetFieldIds: requested.map(field => field.definition.id) }) : Promise.resolve({ proposals: [], issues: [] }),
        window.aaaat.aiTasks.inferTags(id + ":tags", request),
      ]);
      if (requestId.current !== id) return;
      if (sourceRef.current !== requestedText) { setFeedback("Text changed. Fill again to use the current text."); return; }
      if (fieldResult.status === "fulfilled") {
        setDrafts(current => {
          const next = { ...current };
          for (const proposal of fieldResult.value.proposals) {
            const field = requested.find(item => item.definition.id === proposal.fieldId);
            if (field && emptyDraft(current[proposal.fieldId] ?? { text: "", choices: [] }) && (fieldRevisions.current.get(proposal.fieldId) ?? 0) === (revisions.get(proposal.fieldId) ?? 0)) next[proposal.fieldId] = draftValue(field, proposal.value);
          }
          return next;
        });
      } else setError(aiTaskFailure(fieldResult.reason).message);
      if (tagResult.status === "fulfilled") {
        const result: PartialTagInferenceResult = tagResult.value;
        if (tagRevision.current === startedTagRevision) setTagIds(current => [...new Set([...current, ...result.existingTags.map(tag => tag.tagId)])]);
        setNewTags(current => [...current, ...result.newTags.filter(tag => !current.some(existing => existing.name.toLocaleLowerCase() === tag.name.toLocaleLowerCase())).map(tag => ({ name: tag.name, definition: tag.definition, aliases: tag.aliases, selected: false }))]);
        if (result.issues.length) setFeedback(result.issues.map(issue => issue.reason).join(" "));
      } else setFeedback("Tag suggestions unavailable. " + aiTaskFailure(tagResult.reason).message);
      if (fieldResult.status === "fulfilled" && fieldResult.value.issues.length) setFeedback(fieldResult.value.issues.map(issue => issue.reason).join(" "));
    } finally { if (requestId.current === id) { requestId.current = null; setFilling(false); } }
  };

  const stopFill = () => {
    const id = requestId.current;
    requestId.current = null;
    setFilling(false);
    if (id) {
      void window.aaaat.aiTasks.cancelJobExtraction(id).catch(() => undefined);
      void window.aaaat.aiTasks.cancelTagInference(id + ":tags").catch(() => undefined);
    }
  };
  const save = async () => {
    setError(null);
    try {
      const values = fields.flatMap(field => {
        const value = parseDraft(field, drafts[field.definition.id] ?? { text: "", choices: [] });
        return value !== null && (!Array.isArray(value) || value.length) ? [{ fieldId: field.definition.id, value }] : [];
      });
      if (!values.length && !source.trim()) { setError("Add application text or a detail."); return; }
      stopFill();
      setSaving(true);
      const created = await window.aaaat.candidatures.create({ values, tagIds,
        newTags: newTags.filter(tag => tag.selected).map(tag => ({ name: tag.name, definition: tag.definition, aliases: tag.aliases, notes: tag.notes })),
        ...(source.trim() ? { source: { kind: "other" as const, title: "", url: "", sourceText: source } } : {}),
      });
      onCreated(created.id);
    } catch (reason) { setError(aiTaskFailure(reason).message); }
    finally { setSaving(false); }
  };
  const cancel = () => { if (!dirty || window.confirm("Discard this application draft?")) onCancel(); };
  const matches = tagQuery.trim() ? tags.filter(tag => !tagIds.includes(tag.id) && [tag.name, ...tag.aliases].some(name => name.toLocaleLowerCase().includes(tagQuery.trim().toLocaleLowerCase()))).slice(0, 8) : [];
  return <section className="new-application-editor" aria-label="New application">
    <PageToolbar>
      <button type="button" disabled={saving || filling || loading || !source.trim()} title={routeName ? "Fill empty fields and suggest Tags from Application text with " + routeName : "Configure AI to fill from Application text"} onClick={() => void fill()}>{filling ? "Filling…" : "Fill"}</button>
      <button type="button" disabled={saving || loading} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</button>
      {filling ? <button type="button" onClick={stopFill}>Stop</button> : null}
      <button type="button" disabled={saving} onClick={cancel}>Cancel</button>
    </PageToolbar>
    <h2>New application</h2>
    {error ? <p role="alert" className="error-message">{error}</p> : null}
    {feedback ? <p role="status">{feedback}</p> : null}
    <div className="new-application-layout">
      <section className="new-application-source">
        <label htmlFor="new-application-text">Application text</label>
        <textarea id="new-application-text" value={source} maxLength={50000} disabled={saving} placeholder="Paste an offer, message, link or notes" onChange={event => { sourceRef.current = event.target.value; setSource(event.target.value); setError(null); }} />
      </section>
      <section className="new-application-fields" aria-label="Application details">
        <h3>Details</h3>
        {loading ? <p>Loading…</p> : <div className="manual-field-grid">
          {fields.map(field => <label className="manual-field" key={field.definition.id}>
            <span className="manual-field-label" title={field.definition.description}>{field.definition.label}</span>
            {renderInput(field)}
          </label>)}
        </div>}
        <section className="new-application-tags" aria-label="Tags">
          <h3>Tags</h3>
          <div className="tag-chip-list">{tagIds.map(id => <span className="tag-chip" key={id}>{tags.find(tag => tag.id === id)?.name ?? "Tag"}<button type="button" aria-label={"Remove " + (tags.find(tag => tag.id === id)?.name ?? "Tag")} onClick={() => { tagRevision.current++; setTagIds(current => current.filter(tagId => tagId !== id)); }}>×</button></span>)}</div>
          <input aria-label="Add Tag" placeholder="Find a Tag…" value={tagQuery} onChange={event => setTagQuery(event.target.value)} />
          {matches.map(tag => <button type="button" key={tag.id} onClick={() => { tagRevision.current++; setTagIds(current => [...new Set([...current, tag.id])]); setTagQuery(""); }}>{tag.name}</button>)}
          {tagQuery.trim() && !tags.some(tag => [tag.name, ...tag.aliases].some(name => name.toLocaleLowerCase() === tagQuery.trim().toLocaleLowerCase())) ? <button type="button" onClick={() => { setNewTags(current => [...current, { name: tagQuery.trim(), definition: "", aliases: [], selected: true }]); setTagQuery(""); }}>Create “{tagQuery.trim()}”</button> : null}
          {newTags.map((tag, index) => <div className="new-tag-draft" key={index}>
            <label><input type="checkbox" checked={tag.selected} onChange={event => setNewTags(current => current.map((item, i) => i === index ? { ...item, selected: event.target.checked } : item))} />{tag.name}</label>
            <details><summary>Definition</summary><label>Name<input value={tag.name} onChange={event => setNewTags(current => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /></label><label>Definition<textarea value={tag.definition} onChange={event => setNewTags(current => current.map((item, i) => i === index ? { ...item, definition: event.target.value } : item))} /></label></details>
          </div>)}
        </section>
      </section>
    </div>
  </section>;
}
