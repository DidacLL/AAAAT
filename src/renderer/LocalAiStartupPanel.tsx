import { useEffect, useRef, useState } from "react";

import type { LocalAiStartupSettings } from "../shared/optional-tools-contracts";

export function LocalAiStartupPanel({ revision, onDirtyChange }: {
  readonly revision: number;
  readonly onDirtyChange: (dirty: boolean) => void;
}) {
  const [saved, setSaved] = useState<LocalAiStartupSettings | null>(null);
  const [draft, setDraft] = useState<LocalAiStartupSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const lastSaved = useRef<LocalAiStartupSettings | null>(null);
  const dirty = Boolean(saved && draft && (saved.enabled !== draft.enabled || saved.script !== draft.script));

  useEffect(() => {
    let active = true;
    void window.aaaat.optionalTools.startupCurrent().then(next => {
      if (active) {
        const previous = lastSaved.current;
        lastSaved.current = next;
        setSaved(next);
        setDraft(current => !current || (previous && current.enabled === previous.enabled && current.script === previous.script)
          ? next : { ...current, defaultScript: next.defaultScript, error: next.error });
      }
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Could not read startup settings."); });
    return () => { active = false; };
  }, [revision]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);

  const save = async () => {
    if (!draft) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      const next = await window.aaaat.optionalTools.startupSave({ enabled: draft.enabled, script: draft.script });
      lastSaved.current = next;
      setSaved(next); setDraft(next); setNotice("Saved for the next launch.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save startup settings."); }
    finally { setSaving(false); }
  };

  return <details className="profile-column local-ai-startup">
    <summary>Startup{dirty ? " · unsaved" : ""}</summary>
    {draft ? <>
      <label><input type="checkbox" checked={draft.enabled} disabled={saving} onChange={event => { setDraft(current => current ? { ...current, enabled: event.target.checked } : current); setNotice(null); }} /> Run when AAAAT starts</label>
      <label htmlFor="local-ai-startup-script">{draft.shell} script</label>
      <textarea id="local-ai-startup-script" spellCheck={false} value={draft.script} disabled={saving} onChange={event => { setDraft(current => current ? { ...current, script: event.target.value } : current); setNotice(null); }} />
      <div className="row-actions">
        <button type="button" className="compact-primary" disabled={!dirty || saving} onClick={() => void save()}>Save</button>
        <button type="button" className="compact-secondary" disabled={!dirty || saving} onClick={() => { setDraft(saved); setNotice(null); }}>Cancel</button>
        <button type="button" className="compact-secondary" disabled={!draft.defaultScript || saving} onClick={() => { setDraft(current => current ? { ...current, enabled: true, script: current.defaultScript } : current); setNotice(null); }}>Use installed default</button>
      </div>
      {notice ? <p role="status">{notice}</p> : null}
      {draft.error ? <p className="error-message">{draft.error}</p> : null}
    </> : null}
    {error ? <p className="error-message" role="alert">{error}</p> : null}
  </details>;
}
