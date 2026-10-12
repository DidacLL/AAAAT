import {
  providerCoverLetterContextSchema,
  providerCvWritingContextSchema,
  type PreparedDocumentAi,
} from "../shared/ai-contracts";

type ContextRow = { readonly title: string; readonly value: string };
const privatePlaceholder = /\[USERPRIVATE:[^\]\r\n]+\]/gu;

function ContextValue({ value }: { readonly value: string }) {
  if (!value.trim()) return <span className="document-ai-empty">Empty</span>;
  const visible = value.replace(privatePlaceholder, "Excluded");
  return <span className={visible === "Excluded" ? "document-ai-excluded" : undefined}>{visible}</span>;
}

function ContextGroup({ title, rows }: { readonly title: string; readonly rows: readonly ContextRow[] }) {
  if (rows.length === 0) return null;
  const excluded = rows.filter((row) => /\[USERPRIVATE:[^\]\r\n]+\]/u.test(row.value)).length;
  return <details className="document-ai-information">
    <summary>{title} · {rows.length} {rows.length === 1 ? "value" : "values"}{excluded ? ` · ${excluded} with excluded information` : ""}</summary>
    <dl>{rows.map((row, index) => <div key={index}><dt>{row.title}</dt><dd><ContextValue value={row.value} /></dd></div>)}</dl>
  </details>;
}

function readContext(text: string) {
  try {
    const raw: unknown = JSON.parse(text);
    const letter = providerCoverLetterContextSchema.safeParse(raw);
    if (letter.success) return { letter: letter.data, cv: null };
    const cv = providerCvWritingContextSchema.safeParse(raw);
    if (cv.success) return { letter: null, cv: cv.data };
  } catch { /* A new preparation supplies valid task context. */ }
  return null;
}

export function DocumentAiContext({ preview, busy, sourceIds = [], onSources, onSend, onClose }: {
  readonly preview: PreparedDocumentAi;
  readonly busy: boolean;
  readonly sourceIds?: readonly string[];
  readonly onSources?: (ids: string[]) => void;
  readonly onSend: () => void;
  readonly onClose: () => void;
}) {
  const context = readContext(preview.contextText);
  const letter = context?.letter;
  const cv = context?.cv;
  return <aside className="document-ai-context" aria-label="AI task">
    <header><strong>{preview.connection.name} · {preview.connection.model}</strong>
      <button type="button" onClick={onClose} disabled={busy}>Close</button></header>
    {letter ? <p className="document-ai-summary">Draft this letter · {letter.applicationInformation.length} application values · {letter.myInformation.length} My information values · {letter.sources.length} {letter.sources.length === 1 ? "offer or note" : "offers or notes"}</p> : null}
    {cv ? <p className="document-ai-summary">Write CV text · {cv.target.title}</p> : null}
    {preview.sources.length > 0 && onSources ? <fieldset><legend>Include offer or notes</legend>
      {preview.sources.map((source) => <label key={source.id}><input type="checkbox" checked={sourceIds.includes(source.id)} disabled={busy}
        onChange={(event) => onSources(event.target.checked ? [...sourceIds, source.id] : sourceIds.filter((id) => id !== source.id))} />{source.title}</label>)}
    </fieldset> : null}
    {letter ? <section className="document-ai-readable" aria-label="Information sent">
      <ContextGroup title="Current letter" rows={[
        { title: "To", value: letter.currentLetter.recipient },
        { title: "Subject", value: letter.currentLetter.subject },
        { title: "Body", value: letter.currentLetter.bodyParagraphs.join("\n\n") },
        { title: "Closing", value: letter.currentLetter.closing },
        { title: "Language", value: letter.currentLetter.language },
      ].filter((row) => row.value.trim())} />
      <ContextGroup title="Application information" rows={letter.applicationInformation} />
      <ContextGroup title="Career preferences" rows={letter.careerContext} />
      <ContextGroup title="My information" rows={letter.myInformation} />
      {letter.sources.length === 0 ? <p className="document-ai-empty">No offer or notes included.</p> : <details className="document-ai-information"><summary>Selected offer or notes · {letter.sources.length}</summary>
        {letter.sources.map((source, index) => <dl key={index}><div><dt>Title</dt><dd><ContextValue value={source.title} /></dd></div>
          {source.url ? <div><dt>Link</dt><dd><ContextValue value={source.url} /></dd></div> : null}
          <div><dt>Content</dt><dd><ContextValue value={source.sourceText} /></dd></div></dl>)}
      </details>}
    </section> : null}
    {cv ? <section className="document-ai-readable" aria-label="Information sent"><ContextGroup title="Information for this CV text" rows={cv.availableInformation} /></section> : null}
    {!context ? <p role="alert">This task's information could not be displayed. Close it and open AI again.</p> : null}
    <details className="document-ai-information"><summary>Writing instructions</summary><p>{preview.instruction}</p></details>
    <details><summary>Technical details</summary><p>{preview.connection.endpoint}</p><pre>{preview.contextText}</pre></details>
    <button type="button" className="compact-primary" disabled={busy || !context} onClick={onSend}>{busy ? "Working…" : "Send"}</button>
  </aside>;
}
