import { useCallback, useEffect, useState } from "react";

import type { CandidatureOpportunityResearchAccess } from "../shared/candidature-opportunity-research-access-contracts";
import type { ExternalApplicationInformationPendingResult } from "../shared/external-assistant-contracts";
import { recordCompletedAiTask } from "./ai-task-store";

type Intent = "application-information" | "interview";
type RequestDraft = { readonly text: string; readonly result: string; readonly edited: boolean };
export type ApplicationAiDrafts = {
  readonly intent: Intent | null;
  readonly requests: Partial<Record<Intent, RequestDraft>>;
};

export function CandidatureOpportunityResearchAccessPanel({
  candidatureId, contextDirty, draft, onDraftChange, onSourceSaved,
}: {
  readonly candidatureId: string;
  readonly contextDirty: boolean;
  readonly draft: ApplicationAiDrafts;
  readonly onDraftChange: (draft: ApplicationAiDrafts) => void;
  readonly onSourceSaved: () => Promise<void>;
}) {
  const [access, setAccess] = useState<CandidatureOpportunityResearchAccess | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const api = window.aaaat.candidatureOpportunityResearchAccess;
  const intent = draft.intent;
  const request = intent ? draft.requests[intent] : undefined;

  const putInFieldReview = useCallback((pending: ExternalApplicationInformationPendingResult) => {
    recordCompletedAiTask(
      `candidature-inference:${candidatureId}:missing`, pending.result, "Application details",
      `${pending.result.proposals.length} suggestions ready`, pending.scopeFieldIds,
    );
    setMessage("Suggestions ready on the application fields.");
  }, [candidatureId]);

  useEffect(() => {
    let active = true;
    void api.current(candidatureId).then(current => {
      if (active) setAccess(current);
    }).catch(() => { if (active) setError("Could not read connected AI access."); });
    return () => { active = false; };
  }, [api, candidatureId]);

  useEffect(() => {
    if (!access?.allowed || access.kind !== "application-information") return;
    let active = true;
    const receive = async () => {
      try {
        const pending = await api.takeApplicationInformationResult(candidatureId);
        if (active && pending) putInFieldReview(pending);
      } catch { if (active) setError("Could not receive AI suggestions."); }
    };
    void receive();
    const interval = window.setInterval(() => void receive(), 1200);
    return () => { active = false; window.clearInterval(interval); };
  }, [access?.allowed, access?.kind, api, candidatureId, putInFieldReview]);

  const stopFutureReads = useCallback(async () => {
    setAccess(await api.update({ candidatureId, allowed: false }));
  }, [api, candidatureId]);

  useEffect(() => {
    if (!contextDirty || !access?.allowed) return;
    let active = true;
    void api.update({ candidatureId, allowed: false })
      .then(saved => { if (active) setAccess(saved); })
      .catch(() => { if (active) setError("Could not turn off future connected AI reads."); });
    return () => { active = false; };
  }, [access?.allowed, api, candidatureId, contextDirty]);

  const run = async (action: string, work: () => Promise<void>) => {
    setBusy(action); setError(null); setMessage(null);
    try { await work(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not complete this action."); }
    finally { setBusy(null); }
  };

  const open = (kind: Intent) => void run("prepare", async () => {
    if (access?.allowed && access.kind !== kind) await stopFutureReads();
    if (draft.requests[kind]) {
      onDraftChange({ ...draft, intent: kind });
      return;
    }
    const prepared = kind === "application-information"
      ? await api.applicationInformationTask(candidatureId)
      : await api.interviewContext(candidatureId);
    onDraftChange({ intent: kind, requests: { ...draft.requests, [kind]: { text: prepared.text, result: "", edited: false } } });
  });

  const change = (key: keyof RequestDraft, value: string) => {
    if (!intent || !request) return;
    onDraftChange({ ...draft, requests: { ...draft.requests, [intent]: { ...request, [key]: value, edited: true } } });
    if (key === "text" && access?.allowed && access.kind === intent) void run("connection", stopFutureReads);
  };

  const toggleConnection = () => void run("connection", async () => {
    if (access?.allowed && access.kind === intent) { await stopFutureReads(); return; }
    if (!intent || !request) return;
    setAccess(await api.update({ candidatureId, allowed: true, kind: intent, text: request.text }));
  });

  const discard = () => void run("discard", async () => {
    if (!intent) return;
    if (access?.allowed && access.kind === intent) await stopFutureReads();
    const requests = { ...draft.requests };
    delete requests[intent];
    onDraftChange({ intent: null, requests });
  });

  const copy = () => void run("copy", async () => {
    if (!request || !intent) return;
    const input = { candidatureId, text: request.text };
    if (intent === "application-information") await api.copyApplicationInformationTask(input);
    else await api.copyInterviewTask(input);
    setMessage("Copied.");
  });

  const exportRequest = () => void run("export", async () => {
    if (!request || !intent) return;
    const input = { candidatureId, text: request.text };
    const result = intent === "application-information"
      ? await api.exportApplicationInformationTask(input) : await api.exportInterviewTask(input);
    if (result === "exported") setMessage("File saved.");
  });

  const useResult = () => void run("result", async () => {
    if (!request || !intent) return;
    const input = { candidatureId, text: request.result };
    if (intent === "application-information") {
      putInFieldReview(await api.submitApplicationInformationResult(input));
      await api.takeApplicationInformationResult(candidatureId);
    } else {
      await api.retainInterviewResult(input);
      await onSourceSaved();
      setMessage("Saved as a Source.");
    }
    onDraftChange({ ...draft, requests: { ...draft.requests, [intent]: { ...request, result: "" } } });
  });

  const importResult = () => void run("import", async () => {
    if (intent === "application-information") {
      const pending = await api.importApplicationInformationResult(candidatureId);
      if (pending !== "cancelled") {
        putInFieldReview(pending);
        await api.takeApplicationInformationResult(candidatureId);
      }
    } else {
      const result = await api.importInterviewResult(candidatureId);
      if (result === "imported") { await onSourceSaved(); setMessage("Saved as a Source."); }
    }
  });

  const disabled = busy !== null;
  const readable = access?.allowed && access.kind === intent;
  return (
    <section className="application-ai-request" aria-label="Application AI request">
      <div className="application-ai-request-actions">
        <select aria-label="Request" value={intent ?? ""} disabled={disabled} onChange={event => open(event.currentTarget.value as Intent)}>
          <option value="" disabled>Choose request</option>
          <option value="application-information">Application details</option>
          <option value="interview">Interview</option>
        </select>
        {request ? <>
          <button type="button" disabled={disabled || !request.text.trim()} onClick={copy}>Copy</button>
          <button type="button" disabled={disabled || !request.text.trim()} onClick={exportRequest}>Export</button>
          <button type="button" disabled={disabled} onClick={discard}>Discard</button>
          <button type="button" aria-label={readable ? "Turn off future connected AI reads" : "Allow connected AI to read this request"}
            aria-pressed={Boolean(readable)} title={readable ? "Turn off future connected AI reads" : "Allow connected AI to read this request through AAAAT's connection"}
            disabled={disabled || !request.text.trim() || (!access?.allowed && contextDirty)} onClick={toggleConnection}>👁</button>
        </> : null}
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p className="compact-help" role="status">{message}</p> : null}
      {request ? <>
        <label htmlFor={`ai-request-${candidatureId}`}>Request</label>
        <textarea id={`ai-request-${candidatureId}`} className="application-ai-request-text" value={request.text}
          disabled={disabled} onChange={event => change("text", event.currentTarget.value)} />
        <details className="application-ai-result">
          <summary>Result</summary>
          <textarea aria-label="AI result" rows={6} value={request.result} disabled={disabled}
            onChange={event => change("result", event.currentTarget.value)} />
          <div className="button-row">
            <button type="button" disabled={disabled || !request.result.trim()} onClick={useResult}>
              {intent === "application-information" ? "Use suggestions" : "Save as Source"}
            </button>
            <button type="button" disabled={disabled} onClick={importResult}>Import</button>
          </div>
        </details>
      </> : null}
    </section>
  );
}
