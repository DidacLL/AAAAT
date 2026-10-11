import type { PreparedDocumentAi } from "../shared/ai-contracts";

export function DocumentAiContext({ preview, busy, sourceIds = [], onSources, onSend, onClose }: {
  readonly preview: PreparedDocumentAi;
  readonly busy: boolean;
  readonly sourceIds?: readonly string[];
  readonly onSources?: (ids: string[]) => void;
  readonly onSend: () => void;
  readonly onClose: () => void;
}) {
  return <aside className="document-ai-context" aria-label="AI task">
    <header><strong>{preview.connection.name} · {preview.connection.model}</strong>
      <button type="button" onClick={onClose} disabled={busy}>Close</button></header>
    {preview.sources.length > 0 && onSources ? <fieldset><legend>Include offer or notes</legend>
      {preview.sources.map((source) => <label key={source.id}><input type="checkbox" checked={sourceIds.includes(source.id)} disabled={busy}
        onChange={(event) => onSources(event.target.checked ? [...sourceIds, source.id] : sourceIds.filter((id) => id !== source.id))} />{source.title}</label>)}
    </fieldset> : null}
    <details><summary>Information sent</summary><pre>{preview.contextText}</pre></details>
    <details><summary>Instructions and destination</summary><p>{preview.connection.endpoint}</p><pre>{preview.instruction}</pre></details>
    <button type="button" className="compact-primary" disabled={busy} onClick={onSend}>{busy ? "Working…" : "Send"}</button>
  </aside>;
}
