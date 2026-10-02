import type { TagRecord } from "../shared/contracts";
import "./tag-glossary.css";

export interface ApplicationTagContext {
  readonly candidatureId: string;
  readonly tags: readonly TagRecord[];
}

interface Props {
  readonly applicationContext: ApplicationTagContext | null;
}

export function TagVisor({ applicationContext }: Props) {
  return (
    <section className="tag-visor" aria-label="Tags glossary">
      <div className="tag-visor-heading">
        <strong>Tags</strong>
        <span>Application context</span>
      </div>
      {!applicationContext ? (
        <p className="tag-visor-message">Select an application to inspect its Tags</p>
      ) : applicationContext.tags.length === 0 ? (
        <p className="tag-visor-message">No Tags attached to this application.</p>
      ) : (
        <div className="tag-visor-monitor-list" aria-label="Application Tags">
          {applicationContext.tags.map((tag) => (
            <article className="tag-visor-readout" key={tag.id}>
              <strong>{tag.name}</strong>
              <p>{tag.definition}</p>
              {tag.aliases.length > 0 ? (
                <p className="tag-visor-aliases"><span>Also known as</span>{tag.aliases.join(", ")}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
