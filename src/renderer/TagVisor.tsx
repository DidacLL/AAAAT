import { useEffect, useMemo, useState } from "react";

import type { TagRecord } from "../shared/contracts";
import "./tag-glossary.css";

interface Props {
  readonly workspaceKey: string;
  readonly refreshRevision: number;
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function matchesQuery(tag: TagRecord, query: string): boolean {
  return [tag.name, ...tag.aliases, tag.definition, tag.notes ?? ""]
    .some((value) => normalized(value).includes(query));
}

export function TagVisor({ workspaceKey, refreshRevision }: Props) {
  const [tags, setTags] = useState<readonly TagRecord[] | null>(null);
  const [query, setQuery] = useState("");
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures.listTags()
      .then((nextTags) => {
        if (!active) return;
        setTags(nextTags);
        setError(null);
      })
      .catch(() => {
        if (!active) return;
        setTags([]);
        setError("Tags are unavailable.");
      });
    return () => {
      active = false;
    };
  }, [refreshRevision, workspaceKey]);

  const normalizedQuery = normalized(query);
  const matches = useMemo(
    () => normalizedQuery && tags
      ? tags.filter((tag) => matchesQuery(tag, normalizedQuery)).slice(0, 8)
      : [],
    [normalizedQuery, tags],
  );
  const selectedTag = tags?.find((tag) => tag.id === selectedTagId) ?? null;

  return (
    <section className="tag-visor" aria-label="Tags glossary">
      <div className="tag-visor-heading">
        <strong>Tags</strong>
        <span>Workspace glossary</span>
      </div>
      <label className="tag-visor-search">
        <span className="visually-hidden">Search Tags</span>
        <input
          type="search"
          aria-label="Search Tags"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a Tag…"
        />
      </label>

      {tags === null && !error ? <p className="tag-visor-message" role="status">Loading Tags…</p> : null}
      {error ? <p className="tag-visor-message error-message" role="alert">{error}</p> : null}
      {!error && tags?.length === 0 ? <p className="tag-visor-message">No Tags in this workspace yet.</p> : null}
      {!error && tags && tags.length > 0 && !normalizedQuery ? (
        <p className="tag-visor-message">Search names or aliases.</p>
      ) : null}
      {!error && normalizedQuery && matches.length === 0 ? (
        <p className="tag-visor-message">No matching Tags.</p>
      ) : null}
      {!error && matches.length > 0 ? (
        <ul className="tag-visor-results" aria-label="Tag search results">
          {matches.map((tag) => (
            <li key={tag.id}>
              <button
                type="button"
                aria-pressed={selectedTagId === tag.id}
                onClick={() => setSelectedTagId(tag.id)}
              >
                {tag.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {selectedTag ? (
        <article className="tag-visor-readout" aria-label="Selected Tag">
          <strong>{selectedTag.name}</strong>
          {selectedTag.aliases.length > 0 ? (
            <p><span>Aliases</span>{selectedTag.aliases.join(", ")}</p>
          ) : null}
          <p>{selectedTag.definition}</p>
          {selectedTag.notes ? <p><span>Notes</span>{selectedTag.notes}</p> : null}
        </article>
      ) : null}
    </section>
  );
}
