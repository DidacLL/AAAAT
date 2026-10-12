import { useCallback, useEffect, useRef, useState } from "react";
import type { CandidatureOpportunityResearchAccess, CandidaturePreparedTaskTarget } from "../shared/candidature-opportunity-research-access-contracts";
import type { ExternalApplicationInformationPendingResult } from "../shared/external-assistant-contracts";
import { applicationInformationTaskInstruction } from "../shared/external-ai-task-templates";
import { recordCompletedAiTask } from "./ai-task-store";

type Intent = "application-information" | "interview";
type Transport = "copy" | "file" | "connected";
type BusyAction = "prepare" | "connect" | "copy" | "export" | "submit" | "import" | "retain" | "close";

export function CandidatureOpportunityResearchAccessPanel({ candidatureId, contextDirty, onClose, onCloseReady }: {
  readonly candidatureId: string; readonly contextDirty: boolean; readonly onClose?: () => void;
  readonly onCloseReady?: (close: (() => Promise<void>) | null) => void;
}) {
  const [access, setAccess] = useState<CandidatureOpportunityResearchAccess | null>(null);
  const [preparedTarget, setPreparedTarget] = useState<CandidaturePreparedTaskTarget | null>(null);
  const targetRef = useRef<CandidaturePreparedTaskTarget | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [taskText, setTaskText] = useState("");
  const [preparedText, setPreparedText] = useState("");
  const [resultText, setResultText] = useState("");
  const [connectedText, setConnectedText] = useState<string | null>(null);
  const [transport, setTransport] = useState<Transport>("copy");
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const putInFieldReview = useCallback((pending: ExternalApplicationInformationPendingResult, target: CandidaturePreparedTaskTarget) => {
    if (target.candidatureId !== candidatureId || targetRef.current?.taskRef !== target.taskRef) return;
    recordCompletedAiTask(`candidature-inference:${target.candidatureId}:missing`, pending.result,
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
    if (!access?.taskAvailable || intent !== "application-information" || !preparedTarget) return;
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    let active = true;
    const takePending = async () => {
      if (!active) return;
      try {
        const pending = await api.takeApplicationInformationResult(preparedTarget);
        if (active && pending) putInFieldReview(pending, preparedTarget);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Application suggestions could not be received.");
        active = false;
      }
    };
    void takePending();
    const interval = window.setInterval(() => void takePending(), 1200);
    return () => { active = false; window.clearInterval(interval); };
  }, [access?.taskAvailable, intent, preparedTarget, putInFieldReview]);

  useEffect(() => {
    if (!contextDirty || !access?.allowed || !preparedTarget) return;
    let active = true;
    void window.aaaat.candidatureOpportunityResearchAccess.closePrivateTask(preparedTarget).then(async () => {
      const saved = await window.aaaat.candidatureOpportunityResearchAccess.current(candidatureId);
      if (!active) return;
      setAccess(saved); setIntent(null); setTaskText(""); setPreparedText(""); setConnectedText(null); targetRef.current = null; setPreparedTarget(null);
      setMessage("Save or discard application edits before preparing a task.");
    }).catch(() => { if (active) setError("External AI access could not be updated."); });
    return () => { active = false; };
  }, [access?.allowed, candidatureId, contextDirty, preparedTarget]);

  const perform = useCallback(async (action: BusyAction, operation: () => Promise<void>) => {
    if (busy) return;
    setBusy(action); setError(null); setMessage(null);
    try { await operation(); } catch (reason) { setError(reason instanceof Error ? reason.message : "This task could not be completed."); }
    finally { setBusy(null); }
  }, [busy]);
  const prepare = async (nextIntent: Intent) => {
    if (contextDirty) return;
    if (taskText !== preparedText && taskText.trim() && !window.confirm("Replace this edited task with current application context?")) return;
    await perform("prepare", async () => {
      const api = window.aaaat.candidatureOpportunityResearchAccess;
      const task = nextIntent === "application-information"
        ? await api.privateApplicationInformationTask(candidatureId, applicationInformationTaskInstruction)
        : await api.privateInterviewContext(candidatureId);
      if (task.candidatureId !== candidatureId) throw new Error("This task belongs to another application.");
      const target = { candidatureId: task.candidatureId, taskRef: task.taskRef };
      targetRef.current = target; setPreparedTarget(target);
      setIntent(nextIntent); setTaskText(task.taskText); setPreparedText(task.taskText); setResultText(""); setConnectedText(null);
      setAccess(await api.current(candidatureId));
    });
  };
  const requireTarget = (): CandidaturePreparedTaskTarget => {
    const target = targetRef.current;
    if (!target || target.candidatureId !== candidatureId) throw new Error("Prepare a task for this application first.");
    return target;
  };
  const connectTask = () => perform("connect", async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (intent === "application-information") await api.useConnectedApplicationInformationTask(requireTarget(), taskText);
    else await api.useConnectedInterviewTask(requireTarget(), taskText);
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
    const target = requireTarget();
    if (intent === "application-information") {
      const pending = await api.submitApplicationInformationResult(target, resultText);
      await api.takeApplicationInformationResult(target);
      putInFieldReview(pending, target);
    } else {
      await api.retainInterviewResult(target, resultText); setMessage("Notes saved with this application.");
    }
    setResultText("");
  });
  const importResult = () => perform("import", async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    const target = requireTarget();
    if (intent === "application-information") {
      const pending = await api.importApplicationInformationResult(target);
      if (pending !== "cancelled") { await api.takeApplicationInformationResult(target); putInFieldReview(pending, target); }
    } else if (await api.importInterviewResult(target) === "imported") setMessage("Notes saved with this application.");
  });
  const close = useCallback(() => perform("close", async () => {
    const target = targetRef.current;
    if (target) await window.aaaat.candidatureOpportunityResearchAccess.closePrivateTask(target);
    targetRef.current = null; setPreparedTarget(null);
    setIntent(null); setTaskText(""); setPreparedText(""); setResultText(""); onClose?.();
  }), [perform, onClose]);
  useEffect(() => {
    onCloseReady?.(close);
    return () => onCloseReady?.(null);
  }, [close, onCloseReady]);
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
