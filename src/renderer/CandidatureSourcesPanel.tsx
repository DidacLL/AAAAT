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

export function CandidatureSourcesPanel({
  candidatureId,
  onSourcesChanged,
}: {
  candidatureId: string;
  onSourcesChanged?: (sources: CandidatureSource[]) => void;
}) {
  const [sources, setSources] = useState<CandidatureSource[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CandidatureSourceInput>(() => emptySource(candidatureId));
  const [persistedDraft, setPersistedDraft] = useState<CandidatureSourceInput>(() => emptySource(candidatureId));
  const [error, setError] = useState<string | null>(null);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(persistedDraft),
    [draft, persistedDraft],
  );

  const startNew = () => {
    if (dirty && !window.confirm("Discard unsaved source edits?")) return;
    const next = emptySource(candidatureId);
    setEditingId(null);
    setDraft(next);
    setPersistedDraft(next);
  };

  const edit = (source: CandidatureSource) => {
    if (source.id === editingId) return;
    if (dirty && !window.confirm("Discard unsaved source edits?")) return;
    const next: CandidatureSourceInput = {
      candidatureId,
      kind: source.kind,
      title: source.title,
      url: source.url,
      sourceText: source.sourceText,
    };
    setEditingId(source.id);
    setDraft(next);
    setPersistedDraft(next);
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
  }, [candidatureId]);

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
      const saved = editingId ? next.find((source) => source.id === editingId) : next.at(-1);
      if (saved) {
        const savedDraft: CandidatureSourceInput = {
          candidatureId,
          kind: saved.kind,
          title: saved.title,
          url: saved.url,
          sourceText: saved.sourceText,
        };
        setEditingId(saved.id);
        setDraft(savedDraft);
        setPersistedDraft(savedDraft);
      } else {
        startNew();
      }
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
      const empty = emptySource(candidatureId);
      setEditingId(null);
      setDraft(empty);
      setPersistedDraft(empty);
    } catch {
      setError("AAAAT could not remove this source.");
    }
  };

  return (
    <section className="candidature-sources" aria-label="Sources">
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">Supplied context</p>
          <h3>Sources</h3>
        </div>
        <button type="button" className="compact-secondary" onClick={startNew}>
          Add source
        </button>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {sources.length === 0 ? (
        <p>No source material yet. The opportunity can remain incomplete.</p>
      ) : (
        <div className="source-chip-list" aria-label="Source list">
          {sources.map((source) => (
            <button
              type="button"
              key={source.id}
              className={source.id === editingId ? "selected-source" : "compact-secondary"}
              onClick={() => edit(source)}
            >
              {sourceLabel(source)}
            </button>
          ))}
        </div>
      )}

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
          URL
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
        {editingId ? (
          <button type="button" className="compact-secondary" onClick={() => void remove()}>
            Remove source
          </button>
        ) : null}
      </div>
    </section>
  );
}
