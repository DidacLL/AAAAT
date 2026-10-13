import { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import type { TagRecord } from "../shared/contracts";
import "./tag-glossary.css";

export interface ApplicationTagContext {
  readonly candidatureId: string;
  readonly tags: readonly TagRecord[];
  readonly focusedTagId?: string;
}

export function TagVisor({ applicationContext }: { readonly applicationContext: ApplicationTagContext | null }) {
  const id = useId().replace(/:/g, "");
  const [glossary, setGlossary] = useState<TagRecord[]>([]);
  const [choice, setChoice] = useState<{ context: string; tagId: string | null; query: string } | null>(null);
  const candidatureId = applicationContext?.candidatureId;
  const focusedTagId = applicationContext?.focusedTagId;
  const firstTagId = applicationContext?.tags[0]?.id;
  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures.listTags().then(tags => { if (active) setGlossary(tags); }).catch(() => undefined);
    return () => { active = false; };
  }, [candidatureId]);
  const contextKey = `${candidatureId ?? "glossary"}:${focusedTagId ?? ""}`;
  const selectedId = choice?.context === contextKey ? choice.tagId : focusedTagId ?? firstTagId ?? null;
  const query = choice?.context === contextKey ? choice.query : "";
  const tags = useMemo(() => [...new Map([...glossary, ...(applicationContext?.tags ?? [])].map(tag => [tag.id, tag])).values()], [glossary, applicationContext]);
  const selected = tags.find(tag => tag.id === selectedId);
  return <section className="tag-visor" aria-label="Tags console">
    <strong className="tag-visor-heading">Tags</strong>
    <input aria-label="Find a Tag" type="search" placeholder="Find a Tag…" list={`tag-options-${id}`} value={query}
      onChange={event => {
        const value = event.target.value;
        const match = tags.find(tag => [tag.name, ...tag.aliases].some(name => name.toLocaleLowerCase() === value.trim().toLocaleLowerCase()));
        setChoice({ context: contextKey, tagId: match?.id ?? selectedId, query: value });
      }} />
    <datalist id={`tag-options-${id}`}>{tags.map(tag => <option key={tag.id} value={tag.name}>{tag.aliases.join(", ")}</option>)}</datalist>
    {applicationContext?.tags.length ? <div className="tag-visor-context" aria-label="Application Tags">
      {applicationContext.tags.map(tag => <button type="button" key={tag.id} aria-pressed={selectedId === tag.id}
        title={tag.definition} onClick={() => setChoice({ context: contextKey, tagId: tag.id, query: "" })}>{tag.name}</button>)}
    </div> : null}
    {selected ? <article className="tag-visor-readout">
      <button type="button" className="tag-visor-term" style={{ "--tag-anchor": `--tag-${id}` } as CSSProperties}
        popoverTarget={`tag-meaning-${id}`} title="Read full Tag definition">{selected.name} ↗</button>
      <p>{selected.definition}</p>
      {selected.aliases.length ? <small>{selected.aliases.join(" · ")}</small> : null}
      {selected.notes ? <p className="tag-visor-notes">{selected.notes}</p> : null}
      <div popover="auto" id={`tag-meaning-${id}`} className="tag-meaning" style={{ "--tag-anchor": `--tag-${id}` } as CSSProperties}>
        <header><strong>{selected.name}</strong><button type="button" popoverTarget={`tag-meaning-${id}`} popoverTargetAction="hide" aria-label="Close Tag definition">×</button></header>
        <p>{selected.definition}</p>
        {selected.aliases.length ? <p><small>Aliases</small>{selected.aliases.join(", ")}</p> : null}
        {selected.notes ? <p><small>Notes</small>{selected.notes}</p> : null}
      </div>
    </article> : null}
  </section>;
}
