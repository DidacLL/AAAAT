import { useCallback, useEffect, useState } from "react";
import type { CandidatureOpportunityResearchAccess } from "../shared/candidature-opportunity-research-access-contracts";
import type { ExternalApplicationInformationPendingResult } from "../shared/external-assistant-contracts";
import { applicationInformationTaskInstruction } from "../shared/external-ai-task-templates";
import { recordCompletedAiTask } from "./ai-task-store";

type Intent = "application-information" | "interview";
type Transport = "copy" | "file" | "connected";
type BusyAction = "prepare" | "connect" | "copy" | "export" | "submit" | "import" | "retain" | "close";

export function CandidatureOpportunityResearchAccessPanel({ candidatureId, contextDirty, onClose }: {
  readonly candidatureId: string; readonly contextDirty: boolean; readonly onClose?: () => void;
}) {
  const [access, setAccess] = useState<CandidatureOpportunityResearchAccess | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [taskText, setTaskText] = useState("");
  const [preparedText, setPreparedText] = useState("");
  const [resultText, setResultText] = useState("");
  const [connectedText, setConnectedText] = useState<string | null>(null);
  const [transport, setTransport] = useState<Transport>("copy");
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const putInFieldReview = useCallback((pending: ExternalApplicationInformationPendingResult) => {
    recordCompletedAiTask(`candidature-inference:${candidatureId}:missing`, pending.result,
      "Fill application details", `Completed · ${pending.result.proposals.length} suggestions ready`, pending.scopeFieldIds);
    setMessage("Suggestions received. Empty fields fill directly; existing values and current edits stay unchanged.");
  }, [candidatureId]);

  useEffect(() => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    let active = true;
    void api.current(candidatureId).then((current) => {
      if (!active) return;
      setAccess(current); if (!current.allowed) setIntent(null);
    }).catch(() => { if (active) setError("External AI access could not be loaded."); });
    return () => { active = false; };
  }, [candidatureId]);

  useEffect(() => {
    if (!access?.taskAvailable || intent !== "application-information") return;
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    let active = true;
    const takePending = async () => {
      try {
        const pending = await api.takeApplicationInformationResult(candidatureId);
        if (active && pending) putInFieldReview(pending);
      } catch { if (active) setError("Application suggestions could not be received."); }
    };
    void takePending();
    const interval = window.setInterval(() => void takePending(), 1200);
    return () => { active = false; window.clearInterval(interval); };
  }, [access?.taskAvailable, intent, candidatureId, putInFieldReview]);

  useEffect(() => {
    if (!contextDirty || !access?.allowed) return;
    let active = true;
    void window.aaaat.candidatureOpportunityResearchAccess.update({ candidatureId, allowed: false }).then((saved) => {
      if (!active) return;
      setAccess(saved); setIntent(null); setTaskText(""); setPreparedText(""); setConnectedText(null);
      setMessage("Save or discard application edits before preparing a task.");
    }).catch(() => { if (active) setError("External AI access could not be updated."); });
    return () => { active = false; };
  }, [access?.allowed, candidatureId, contextDirty]);

  const perform = async (action: BusyAction, operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(action); setError(null); setMessage(null);
    try { await operation(); } catch (reason) { setError(reason instanceof Error ? reason.message : "This task could not be completed."); }
    finally { setBusy(null); }
  };
  const prepare = async (nextIntent: Intent) => {
    if (contextDirty) return;
    if (taskText !== preparedText && taskText.trim() && !window.confirm("Replace this edited task with current application context?")) return;
    await perform("prepare", async () => {
      const api = window.aaaat.candidatureOpportunityResearchAccess;
      const text = nextIntent === "application-information"
        ? (await api.privateApplicationInformationTask(candidatureId, applicationInformationTaskInstruction)).taskText
        : await (async () => { await api.privateInterviewContext(candidatureId); return api.interviewTaskText(); })();
      setIntent(nextIntent); setTaskText(text); setPreparedText(text); setResultText(""); setConnectedText(null);
      setAccess(await api.current(candidatureId));
    });
  };
  const connectTask = () => perform("connect", async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (intent === "application-information") await api.useConnectedApplicationInformationTask(taskText);
    else await api.useConnectedInterviewTask(taskText);
    setAccess(await api.current(candidatureId));
    setConnectedText(taskText);
  });
  const disableConnectedAccess = () => perform("connect", async () => {
    setAccess(await window.aaaat.candidatureOpportunityResearchAccess.disableConnectedTaskAccess(candidatureId));
    setConnectedText(null);
  });
  const copy = () => perform("copy", async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (intent === "application-information") await api.copyApplicationInformationTask(taskText);
    else await api.copyInterviewTask(taskText);
    setMessage("Task copied.");
  });
  const exportTask = () => perform("export", async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    const result = intent === "application-information" ? await api.exportApplicationInformationTask(taskText) : await api.exportInterviewTask(taskText);
    if (result === "exported") setMessage("Task file saved.");
  });
  const submit = () => perform(intent === "application-information" ? "submit" : "retain", async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (intent === "application-information") {
      putInFieldReview(await api.submitApplicationInformationResult(resultText));
      await api.takeApplicationInformationResult(candidatureId);
    } else {
      await api.retainInterviewResult(resultText); setMessage("Notes saved with this application.");
    }
    setResultText("");
  });
  const importResult = () => perform("import", async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (intent === "application-information") {
      const pending = await api.importApplicationInformationResult();
      if (pending !== "cancelled") { putInFieldReview(pending); await api.takeApplicationInformationResult(candidatureId); }
    } else if (await api.importInterviewResult() === "imported") setMessage("Notes saved with this application.");
  });
  const close = () => perform("close", async () => {
    const saved = await window.aaaat.candidatureOpportunityResearchAccess.update({ candidatureId, allowed: false });
    setAccess(saved); setIntent(null); setTaskText(""); setPreparedText(""); setResultText(""); onClose?.();
  });
  const disabled = busy !== null;
  return <section className="application-external-task" aria-label="Send this application to my AI">
    <header className="external-task-heading"><h2>Send to my AI</h2><button type="button" disabled={disabled} onClick={() => void close()}>Close</button></header>
    {error ? <p className="error-message" role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {contextDirty ? <p className="compact-help">Save or discard application edits first.</p> : null}
    {!intent ? <>
      <button type="button" disabled={disabled || contextDirty || access === null} onClick={() => void prepare("application-information")}>Fill application details</button>
      <details className="application-secondary-task"><summary>Other tasks for this application</summary>
        <button type="button" className="compact-secondary" disabled={disabled || contextDirty || access === null} onClick={() => void prepare("interview")}>Interview notes</button>
      </details>
    </> : <>
      <label className="application-task-text">Task for my AI<textarea rows={12} maxLength={1024 * 1024} value={taskText} disabled={disabled || contextDirty} onChange={(event) => setTaskText(event.target.value)} /></label>
      <div className="button-row">
        <label>Use with <select aria-label="Task transport" value={transport} disabled={disabled} onChange={(event) => setTransport(event.target.value as Transport)}>
          <option value="copy">Copy to my AI</option>
          <option value="file">Task file</option>
          <option value="connected">Connected AI</option>
        </select></label>
        <button type="button" disabled={disabled || contextDirty || !taskText.trim()} onClick={() => void (transport === "copy" ? copy() : transport === "file" ? exportTask() : connectTask())}>
          {transport === "copy" ? "Copy task" : transport === "file" ? "Export file…" : "Use connected AI"}
        </button>
      </div>
      {transport === "connected" ? <>
        <small>{access?.taskAvailable && connectedText !== taskText ? "Your connected AI can read the previous task text. Use connected AI to update it." : "Lets your connected AI read this task."}</small>
        {access?.allowed ? <details className="application-secondary-task"><summary>Connected access</summary>
          <label><input type="checkbox" checked={access.allowed} disabled={disabled} onChange={() => void disableConnectedAccess()} />Allow further access to this application</label>
        </details> : null}
      </> : null}
      <details className="application-secondary-task"><summary>Task options</summary>
        <button type="button" className="compact-secondary" disabled={disabled || contextDirty} onClick={() => void prepare(intent)}>Refresh from application</button>
      </details>
      <details open={transport !== "connected"} className="application-secondary-task"><summary>Paste or import a result</summary>
      <label className="application-task-result">{intent === "application-information" ? "Suggestions from my AI" : "Notes from my AI"}
        <textarea rows={6} value={resultText} disabled={disabled || contextDirty} onChange={(event) => setResultText(event.target.value)} />
      </label>
      <div className="button-row">
        <button type="button" disabled={disabled || contextDirty || !resultText.trim()} onClick={() => void submit()}>{intent === "application-information" ? "Use suggestions" : "Save notes"}</button>
        <button type="button" disabled={disabled || contextDirty} onClick={() => void importResult()}>Import result…</button>
      </div>
      </details>
    </>}
  </section>;
}
