import { readableSourceText } from "../shared/source-text";
import { useEffect, useMemo, useRef, useState } from "react";

import type {
  CandidatureSource,
  CandidatureSourceInput,
  CandidatureSourceKind,
} from "../shared/contracts";

const emptySource = (candidatureId: string): CandidatureSourceInput => ({
  candidatureId,
  kind: "other",
  title: "",
  url: "",
  sourceText: "",
});

function sourceLabel(source: CandidatureSource): string {
  return source.title.trim() || source.kind.replaceAll("_", " ");
}

function kindLabel(kind: CandidatureSourceKind): string {
  return kind.replaceAll("_", " ");
}

function sourcePreview(source: CandidatureSource): string {
  const normalized = readableSourceText(source.sourceText).replaceAll(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > 220 ? `${normalized.slice(0, 217)}…` : normalized;
}

export function CandidatureSourcesPanel({
  candidatureId,
  refreshRevision = 0,
  onSourcesChanged,
  onDirtyChange,
}: {
  candidatureId: string;
  refreshRevision?: number;
  onSourcesChanged?: (sources: CandidatureSource[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [sources, setSources] = useState<CandidatureSource[]>([]);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CandidatureSourceInput>(() => emptySource(candidatureId));
  const [persistedDraft, setPersistedDraft] = useState<CandidatureSourceInput>(() => emptySource(candidatureId));
  const [error, setError] = useState<string | null>(null);
  const loadedCandidatureId = useRef<string | null>(null);

  const dirty = useMemo(
    () => editorOpen && JSON.stringify(draft) !== JSON.stringify(persistedDraft),
    [draft, editorOpen, persistedDraft],
  );
  const readingSource = readingId
    ? sources.find((source) => source.id === readingId) ?? null
    : null;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const resetEditor = () => {
    const next = emptySource(candidatureId);
    setEditorOpen(false);
    setEditingId(null);
    setDraft(next);
    setPersistedDraft(next);
  };

  const startNew = () => {
    if (dirty && !window.confirm("Discard unsaved source edits?")) return;
    const next = emptySource(candidatureId);
    setReadingId(null);
    setEditorOpen(true);
    setEditingId(null);
    setDraft(next);
    setPersistedDraft(next);
  };

  const edit = (source: CandidatureSource) => {
    if (editorOpen && source.id === editingId) return;
    if (dirty && !window.confirm("Discard unsaved source edits?")) return;
    const next: CandidatureSourceInput = {
      candidatureId,
      kind: source.kind,
      title: source.title,
      url: source.url,
      sourceText: source.sourceText,
    };
    setReadingId(null);
    setEditorOpen(true);
    setEditingId(source.id);
    setDraft(next);
    setPersistedDraft(next);
  };

  const cancel = () => {
    if (dirty && !window.confirm("Discard unsaved source edits?")) return;
    resetEditor();
  };

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures
      .listSources(candidatureId)
      .then((next) => {
        if (!active) return;
        setSources(next);
        if (loadedCandidatureId.current === candidatureId) return;
        loadedCandidatureId.current = candidatureId;
        setReadingId(null);
        const empty = emptySource(candidatureId);
        setEditorOpen(false);
        setEditingId(null);
        setDraft(empty);
        setPersistedDraft(empty);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidature sources.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId, refreshRevision]);

  useEffect(() => () => onDirtyChange?.(false), [candidatureId, onDirtyChange]);

  const store = (next: CandidatureSource[]) => {
    setSources(next);
    onSourcesChanged?.(next);
  };

  const save = async () => {
    setError(null);
    try {
      const next = editingId
        ? await window.aaaat.candidatures.updateSource({ id: editingId, ...draft })
        : await window.aaaat.candidatures.addSource(draft);
      store(next);
      resetEditor();
    } catch {
      setError("AAAAT could not save this source.");
    }
  };

  const remove = async () => {
    if (!editingId) return;
    if (!window.confirm("Remove this source? The candidature will be kept.")) return;
    setError(null);
    try {
      const next = await window.aaaat.candidatures.removeSource({
        candidatureId,
        sourceId: editingId,
      });
      store(next);
      resetEditor();
    } catch {
      setError("AAAAT could not remove this source.");
    }
  };

  return (
    <section className="candidature-sources section-surface" aria-label="Sources">
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">Application material</p>
          <h3 title="Job postings, messages, links and other material saved with this application">Sources</h3>
        </div>
        {readingSource ? (
          <button type="button" className="compact-secondary" onClick={() => setReadingId(null)}>
            Back
          </button>
        ) : !editorOpen ? (
          <button type="button" className="compact-secondary" onClick={startNew}>
            Add
          </button>
        ) : null}
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {readingSource ? (
        <article className="source-reader-panel" aria-label="Source content">
          <div className="source-reader-heading">
            <div>
              <p className="eyebrow">{kindLabel(readingSource.kind)}</p>
              <h4>{sourceLabel(readingSource)}</h4>
            </div>
            <button type="button" className="compact-secondary" onClick={() => edit(readingSource)}>
              Edit
            </button>
          </div>
          <details className="source-original-disclosure"><summary>Original</summary><pre>{readingSource.sourceText}</pre></details>
          {readingSource.url ? <p className="source-reference">{readingSource.url}</p> : null}
          {readingSource.sourceText ? (
            <p className="source-reader-content">{readableSourceText(readingSource.sourceText)}</p>
          ) : (
            <p className="compact-empty">This Source has no retained text.</p>
          )}
        </article>
      ) : sources.length === 0 ? (
        <p className="compact-empty">No Sources.</p>
      ) : (
        <div className="source-card-list" aria-label="Source list">
          {sources.map((source) => {
            const preview = sourcePreview(source);
            return (
              <article className="source-card" key={source.id}>
                <div className="source-card-heading">
                  <div>
                    <strong>{sourceLabel(source)}</strong>
                    <span>{kindLabel(source.kind)}</span>
                  </div>
                  <button type="button" className="compact-secondary" onClick={() => setReadingId(source.id)}>
                    Read
                  </button>
                </div>
                {source.url ? <p className="source-reference">{source.url}</p> : null}
                {preview ? <p>{preview}</p> : null}
              </article>
            );
          })}
        </div>
      )}

      {editorOpen ? (
        <div className="source-editor-panel" aria-label={editingId ? "Edit source" : "Add source"}>
          <div className="candidature-fields source-editor">
            <label>
              Kind
              <select
                value={draft.kind}
                onChange={(event) =>
                  setDraft({ ...draft, kind: event.target.value as CandidatureSourceKind })
                }
              >
                <option value="recruiter_message">Recruiter message</option>
                <option value="job_posting">Job posting</option>
                <option value="application_form">Application form</option>
                <option value="conversation">Conversation</option>
                <option value="link">Link</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Title
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
            </label>
            <label className="wide-field">
              URL or reference
              <input value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} />
            </label>
            <label className="wide-field">
              Source material
              <textarea
                rows={7}
                value={draft.sourceText}
                onChange={(event) => setDraft({ ...draft, sourceText: event.target.value })}
              />
            </label>
          </div>
          <div className="button-row">
            <button type="button" className="primary-action" disabled={!dirty} onClick={() => void save()}>
              {editingId ? "Save source" : "Add source"}
            </button>
            <button type="button" className="compact-secondary" onClick={cancel}>
              Cancel
            </button>
            {editingId ? (
              <button type="button" className="compact-secondary danger-action" onClick={() => void remove()}>
                Remove source
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
