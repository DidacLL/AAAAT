import { useEffect, useMemo, useState } from "react";

import type { CandidatureSource } from "../shared/contracts";
import { readableSourceText } from "../shared/source-text";

function primarySource(sources: readonly CandidatureSource[]): CandidatureSource | null {
  return sources.find((source) => source.kind === "job_posting") ?? sources[0] ?? null;
}

export function CandidatureOfferPanel({ candidatureId }: { readonly candidatureId: string }) {
  const [sources, setSources] = useState<CandidatureSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures.listSources(candidatureId).then((next) => {
      if (!active) return;
      setSources(next);
      setSelectedId(primarySource(next)?.id ?? null);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [candidatureId]);

  const selected = useMemo(
    () => sources.find((source) => source.id === selectedId) ?? primarySource(sources),
    [selectedId, sources],
  );

  return (
    <section className="section-surface candidature-offer-panel" aria-label="Retained offer">
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">Opportunity</p>
          <h3>Offer</h3>
        </div>
        {sources.length > 1 ? (
          <label className="candidature-offer-source-switcher">
            Source
            <select
              aria-label="Offer source"
              value={selected?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>{source.title || source.kind.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {failed ? <p className="error-message">AAAAT could not read the retained offer.</p> : null}
      {!failed && !selected ? <p className="compact-empty">No retained offer or Source yet.</p> : null}
      {selected ? (
        <article className="candidature-offer-body">
          <div className="source-reader-heading">
            <div>
              <p className="eyebrow">{selected.kind.replaceAll("_", " ")}</p>
              <h4>{selected.title || "Retained Source"}</h4>
            </div>
          </div>
          {selected.url ? <p className="source-reference">{selected.url}</p> : null}
          {selected.sourceText ? (
            <p className="source-reader-content">{readableSourceText(selected.sourceText)}</p>
          ) : <p className="compact-empty">This Source has no retained text.</p>}
          <details className="source-original-disclosure">
            <summary>Original Source</summary>
            <pre>{selected.sourceText}</pre>
          </details>
        </article>
      ) : null}
    </section>
  );
}
