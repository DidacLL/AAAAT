import { useCallback, useEffect, useState } from "react";

import type { CandidatureOpportunityResearchAccess } from "../shared/candidature-opportunity-research-access-contracts";
import type {
  ExternalApplicationInformationPendingResult,
  ExternalApplicationInformationTask,
  ExternalInterviewPreparationContext,
} from "../shared/external-assistant-contracts";
import {
  applicationInformationTaskInstruction,
  interviewPreparationTaskInstruction,
} from "../shared/external-ai-task-templates";
import { recordCompletedAiTask } from "./ai-task-store";

type Intent = "application-information" | "interview";

type BusyAction =
  | "open-application-information"
  | "open-interview"
  | "update-connected"
  | "copy"
  | "export"
  | "submit"
  | "import"
  | "retain"
  | "close";

function reviewDetail(result: ExternalApplicationInformationPendingResult): string {
  const usable = result.result.proposals.length;
  const issues = result.result.issues.length;
  return `Completed · ${usable} suggestion${usable === 1 ? "" : "s"} ready${issues ? ` · ${issues} need review` : ""}`;
}

export function CandidatureOpportunityResearchAccessPanel({
  candidatureId,
  contextDirty,
}: {
  readonly candidatureId: string;
  readonly contextDirty: boolean;
}) {
  const [access, setAccess] = useState<CandidatureOpportunityResearchAccess | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [applicationTask, setApplicationTask] =
    useState<ExternalApplicationInformationTask | null>(null);
  const [interviewContext, setInterviewContext] =
    useState<ExternalInterviewPreparationContext | null>(null);
  const [applicationInstruction, setApplicationInstruction] =
    useState(applicationInformationTaskInstruction);
  const [interviewInstruction, setInterviewInstruction] =
    useState(interviewPreparationTaskInstruction);
  const [resultText, setResultText] = useState("");
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const putInFieldReview = useCallback((pending: ExternalApplicationInformationPendingResult) => {
    recordCompletedAiTask(
      `candidature-inference:${candidatureId}:missing`,
      pending.result,
      "Fill application information with my AI",
      reviewDetail(pending),
      pending.scopeFieldIds,
    );
    setMessage(
      pending.result.issues.length > 0
        ? "Suggestions are ready on the application fields. AAAAT kept usable suggestions and marked the others for review."
        : "Suggestions are ready on the application fields. Nothing has been saved yet.",
    );
  }, [candidatureId]);

  useEffect(() => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    let active = true;
    void api.current(candidatureId)
      .then((current) => {
        if (!active) return;
        setAccess(current);
        if (!current.allowed) setIntent(null);
      })
      .catch(() => {
        if (active) setError("AAAAT could not prepare AI assistance for this application.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  useEffect(() => {
    if (!access?.allowed) return;
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    let active = true;

    const takePending = async () => {
      try {
        const pending = await api.takeApplicationInformationResult(candidatureId);
        if (!active || !pending) return;
        putInFieldReview(pending);
      } catch {
        if (active) setError("AAAAT could not receive application information from your AI.");
      }
    };

    void takePending();
    const interval = window.setInterval(() => void takePending(), 1200);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [access?.allowed, candidatureId, putInFieldReview]);

  useEffect(() => {
    if (!contextDirty || !access?.allowed) return;
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    let active = true;
    void api
      .update({ candidatureId, allowed: false })
      .then((saved) => {
        if (!active) return;
        setAccess(saved);
        setIntent(null);
        setApplicationTask(null);
        setInterviewContext(null);
        setMessage("Save or discard the application edits before using it with your AI.");
      })
      .catch(() => {
        if (active) setError("AAAAT could not refresh the AI context after the application changed.");
      });
    return () => {
      active = false;
    };
  }, [access?.allowed, candidatureId, contextDirty]);

  const begin = async (): Promise<typeof window.aaaat.candidatureOpportunityResearchAccess> => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) throw new Error("External AI access is unavailable.");
    const saved = await api.update({ candidatureId, allowed: true });
    setAccess(saved);
    return api;
  };

  const openApplicationInformation = async () => {
    if (contextDirty) return;
    setBusy("open-application-information");
    setMessage(null);
    setError(null);
    try {
      const api = await begin();
      const task = await api.applicationInformationTask(applicationInstruction);
      setApplicationTask(task);
      setInterviewContext(null);
      setIntent("application-information");
    } catch {
      setError("AAAAT could not prepare application information for your AI.");
    } finally {
      setBusy(null);
    }
  };

  const openInterview = async () => {
    if (contextDirty) return;
    setBusy("open-interview");
    setMessage(null);
    setError(null);
    try {
      const api = await begin();
      const context = await api.interviewContext();
      setInterviewContext(context);
      setApplicationTask(null);
      setIntent("interview");
    } catch {
      setError("AAAAT could not prepare interview context for your AI.");
    } finally {
      setBusy(null);
    }
  };

  const updateConnectedTask = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || intent !== "application-information" || !applicationInstruction.trim()) return;
    setBusy("update-connected");
    setMessage(null);
    setError(null);
    try {
      const task = await api.applicationInformationTask(applicationInstruction);
      setApplicationTask(task);
      setMessage("The prepared application-information task is up to date.");
    } catch {
      setError("AAAAT could not update the prepared application-information task.");
    } finally {
      setBusy(null);
    }
  };

  const copyTask = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !intent) return;
    setBusy("copy");
    setMessage(null);
    setError(null);
    try {
      if (intent === "application-information") {
        const task = await api.applicationInformationTask(applicationInstruction);
        setApplicationTask(task);
        await api.copyApplicationInformationTask(applicationInstruction);
      } else {
        await api.copyInterviewTask(interviewInstruction);
      }
      setMessage("Task copied.");
    } catch {
      setError("AAAAT could not copy this task.");
    } finally {
      setBusy(null);
    }
  };

  const exportTask = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !intent) return;
    setBusy("export");
    setMessage(null);
    setError(null);
    try {
      const result = intent === "application-information"
        ? await (async () => {
            const task = await api.applicationInformationTask(applicationInstruction);
            setApplicationTask(task);
            return api.exportApplicationInformationTask(applicationInstruction);
          })()
        : await api.exportInterviewTask(interviewInstruction);
      if (result === "exported") setMessage("Task file saved.");
    } catch {
      setError("AAAAT could not export this task.");
    } finally {
      setBusy(null);
    }
  };

  const submitApplicationResult = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !resultText.trim()) return;
    setBusy("submit");
    setMessage(null);
    setError(null);
    try {
      const pending = await api.submitApplicationInformationResult(resultText);
      putInFieldReview(pending);
      await api.takeApplicationInformationResult(candidatureId);
      setResultText("");
    } catch {
      setError("AAAAT could not use these application-information suggestions.");
    } finally {
      setBusy(null);
    }
  };

  const importApplicationResult = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    setBusy("import");
    setMessage(null);
    setError(null);
    try {
      const pending = await api.importApplicationInformationResult();
      if (pending !== "cancelled") {
        putInFieldReview(pending);
        await api.takeApplicationInformationResult(candidatureId);
      }
    } catch {
      setError("AAAAT could not import these application-information suggestions.");
    } finally {
      setBusy(null);
    }
  };

  const retainInterviewResult = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !resultText.trim()) return;
    setBusy("retain");
    setMessage(null);
    setError(null);
    try {
      await api.retainInterviewResult(resultText);
      setResultText("");
      setMessage("Interview preparation saved as a Source on this application.");
    } catch {
      setError("AAAAT could not save the interview preparation.");
    } finally {
      setBusy(null);
    }
  };

  const importInterviewResult = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    setBusy("import");
    setMessage(null);
    setError(null);
    try {
      const result = await api.importInterviewResult();
      if (result === "imported") {
        setMessage("Interview preparation saved as a Source on this application.");
      }
    } catch {
      setError("AAAAT could not import the interview preparation.");
    } finally {
      setBusy(null);
    }
  };

  const close = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    setBusy("close");
    setMessage(null);
    setError(null);
    try {
      const saved = await api.update({ candidatureId, allowed: false });
      setAccess(saved);
      setIntent(null);
      setApplicationTask(null);
      setInterviewContext(null);
      setResultText("");
    } catch {
      setError("AAAAT could not close this AI task.");
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <section className="manual-source-warning" aria-label="Use my AI for this application">
      <h3>Use my AI</h3>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}

      {!intent ? (
        <>
          <p>Choose what you want your AI to help with. AAAAT keeps validation and saving under your control.</p>
          {contextDirty ? <p className="compact-help">Save or discard the application edits first.</p> : null}
          <div className="button-row">
            <button
              type="button"
              disabled={disabled || contextDirty || access === null}
              onClick={() => void openApplicationInformation()}
            >
              {busy === "open-application-information"
                ? "Preparing…"
                : "Fill application information with my AI"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled || contextDirty || access === null}
              onClick={() => void openInterview()}
            >
              {busy === "open-interview"
                ? "Preparing…"
                : "Prepare for interview with my AI"}
            </button>
          </div>
        </>
      ) : intent === "application-information" ? (
        <>
          <h4>Fill application information with my AI</h4>
          <p className="compact-help">
            Your AI can suggest values only for the application information AAAAT lists here.
            Suggestions are checked locally and appear on the existing fields for Use, Edit, or Dismiss.
          </p>

          <label htmlFor={`application-information-instruction-${candidatureId}`}>
            Instructions for my AI
          </label>
          <textarea
            id={`application-information-instruction-${candidatureId}`}
            rows={5}
            value={applicationInstruction}
            disabled={disabled}
            onChange={(event) => setApplicationInstruction(event.currentTarget.value)}
          />

          {applicationTask ? (
            <details>
              <summary>Review what will be shared</summary>
              <p><strong>Application information your AI may propose:</strong></p>
              <ul>
                {applicationTask.fields.map((field) => (
                  <li key={field.fieldRef}>
                    {field.label} · {field.valueType} · {field.cardinality}
                  </li>
                ))}
              </ul>
              <pre className="compact-help">{applicationTask.context}</pre>
            </details>
          ) : null}

          <div className="button-row">
            <button
              type="button"
              disabled={disabled || !applicationInstruction.trim()}
              onClick={() => void copyTask()}
            >
              {busy === "copy" ? "Copying…" : "Copy task"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled || !applicationInstruction.trim()}
              onClick={() => void exportTask()}
            >
              {busy === "export" ? "Exporting…" : "Export file…"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled || !applicationInstruction.trim()}
              onClick={() => void updateConnectedTask()}
            >
              {busy === "update-connected" ? "Updating…" : "Update connected task"}
            </button>
          </div>

          <label htmlFor={`application-information-result-${candidatureId}`}>
            Paste suggestions from my AI
          </label>
          <textarea
            id={`application-information-result-${candidatureId}`}
            rows={6}
            value={resultText}
            disabled={disabled}
            onChange={(event) => setResultText(event.currentTarget.value)}
            placeholder='{"taskRef":"…","proposals":[…]}'
          />
          <div className="button-row">
            <button
              type="button"
              disabled={disabled || !resultText.trim()}
              onClick={() => void submitApplicationResult()}
            >
              {busy === "submit" ? "Checking…" : "Review suggestions"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled}
              onClick={() => void importApplicationResult()}
            >
              {busy === "import" ? "Importing…" : "Import suggestions…"}
            </button>
            <button type="button" className="compact-secondary" disabled={disabled} onClick={() => void close()}>
              {busy === "close" ? "Closing…" : "Close"}
            </button>
          </div>
        </>
      ) : (
        <>
          <h4>Prepare for interview with my AI</h4>
          <p className="compact-help">
            This is a separate writing task. Returned interview preparation is retained as a Source; it does not propose application fields.
          </p>

          <label htmlFor={`interview-instruction-${candidatureId}`}>Instructions for my AI</label>
          <textarea
            id={`interview-instruction-${candidatureId}`}
            rows={5}
            value={interviewInstruction}
            disabled={disabled}
            onChange={(event) => setInterviewInstruction(event.currentTarget.value)}
          />

          {interviewContext ? (
            <details>
              <summary>Review what will be shared</summary>
              {interviewContext.information.length > 0 ? (
                <dl>
                  {interviewContext.information.map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              <p className="compact-help">
                {interviewContext.sources.length} retained Source
                {interviewContext.sources.length === 1 ? "" : "s"} included.
              </p>
            </details>
          ) : null}

          <div className="button-row">
            <button
              type="button"
              disabled={disabled || !interviewInstruction.trim()}
              onClick={() => void copyTask()}
            >
              {busy === "copy" ? "Copying…" : "Copy task"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled || !interviewInstruction.trim()}
              onClick={() => void exportTask()}
            >
              {busy === "export" ? "Exporting…" : "Export file…"}
            </button>
          </div>

          <label htmlFor={`interview-result-${candidatureId}`}>Paste interview preparation</label>
          <textarea
            id={`interview-result-${candidatureId}`}
            rows={6}
            value={resultText}
            disabled={disabled}
            onChange={(event) => setResultText(event.currentTarget.value)}
          />
          <div className="button-row">
            <button
              type="button"
              disabled={disabled || !resultText.trim()}
              onClick={() => void retainInterviewResult()}
            >
              {busy === "retain" ? "Saving…" : "Save as Source"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled}
              onClick={() => void importInterviewResult()}
            >
              {busy === "import" ? "Importing…" : "Import result…"}
            </button>
            <button type="button" className="compact-secondary" disabled={disabled} onClick={() => void close()}>
              {busy === "close" ? "Closing…" : "Close"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
