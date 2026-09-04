import { useEffect, useMemo, useState } from "react";

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
  const normalized = source.sourceText.trim().replaceAll(/\s+/g, " ");
  if (!normalized) return "";
  return normalized.length > 220 ? `${normalized.slice(0, 217)}…` : normalized;
}

export function CandidatureSourcesPanel({
  candidatureId,
  onSourcesChanged,
  onDirtyChange,
}: {
  candidatureId: string;
  onSourcesChanged?: (sources: CandidatureSource[]) => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [sources, setSources] = useState<CandidatureSource[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CandidatureSourceInput>(() => emptySource(candidatureId));
  const [persistedDraft, setPersistedDraft] = useState<CandidatureSourceInput>(() => emptySource(candidatureId));
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => editorOpen && JSON.stringify(draft) !== JSON.stringify(persistedDraft),
    [draft, editorOpen, persistedDraft],
  );

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
    setError(null);
    void window.aaaat.candidatures
      .listSources(candidatureId)
      .then((next) => {
        if (!active) return;
        setSources(next);
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
      onDirtyChange?.(false);
    };
  }, [candidatureId, onDirtyChange]);

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
          <p className="eyebrow">Supplied context</p>
          <h3>Sources</h3>
          <p>Add only the material you actually have.</p>
        </div>
        {!editorOpen ? (
          <button type="button" className="compact-secondary" onClick={startNew}>
            Add source
          </button>
        ) : null}
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {sources.length === 0 ? (
        <p className="compact-empty">No source material yet. The opportunity can remain incomplete.</p>
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
                  <button type="button" className="compact-secondary" onClick={() => edit(source)}>
                    Edit source
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
