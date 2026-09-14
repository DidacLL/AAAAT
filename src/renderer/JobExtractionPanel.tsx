import { useEffect, useState } from "react";
import type { JobExtractionRequest } from "../shared/ai-contracts";
import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import type { PartialJobExtractionResult } from "../shared/ai-proposal-outcomes";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import {
  markAiTaskFieldApplied,
  recordAiTaskFieldIssue,
  startAiTask,
  useAiTask,
} from "./ai-task-store";
import { useContextualHandoffs } from "./contextual-handoffs";

interface JobExtractionPanelProps {
  candidatureId: string;
  source: JobExtractionRequest;
  onAccepted: () => void;
  onDismiss: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function extractionConnection(connections: NamedAiConnection[]) {
  const operationDefault = connections.find(
    (connection) =>
      connection.defaultForOperations.includes("job_extraction") &&
      connection.validatedOperations.includes("job_extraction"),
  );
  if (operationDefault) return operationDefault;

  return (
    connections.find(
      (connection) =>
        connection.isDefault && connection.validatedOperations.includes("job_extraction"),
    ) ?? null
  );
}

function isLocalConnection(endpoint: string): boolean {
  const hostname = new URL(endpoint).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function proposalLabel(
  proposal: PartialJobExtractionResult["proposals"][number],
  fields: CandidatureFieldConfiguration[],
) {
  const fieldLabel =
    fields.find((field) => field.definition.id === proposal.fieldId)?.definition.label ??
    "Information";
  const value = Array.isArray(proposal.value) ? proposal.value.join(", ") : proposal.value;
  return value === "" ? fieldLabel : `${fieldLabel}: ${value}`;
}

function issueValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value === undefined) return "(missing)";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function JobExtractionPanel({
  candidatureId,
  source,
  onAccepted,
  onDismiss,
  onDirtyChange,
}: JobExtractionPanelProps) {
  const { openSettingsFor } = useContextualHandoffs();
  const [connection, setConnection] = useState<NamedAiConnection | null | undefined>(undefined);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [excludedProposalIndexes, setExcludedProposalIndexes] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const taskKey = `initial-extraction:${candidatureId}`;
  const task = useAiTask<PartialJobExtractionResult>(taskKey);
  const proposal = task?.status === "completed" ? task.result ?? null : null;
  const taskActive = task?.status === "queued" || task?.status === "working";

  useEffect(() => {
    let active = true;

    void Promise.all([
      window.aaaat.aiConnections.list(),
      window.aaaat.candidatures.listFields(),
    ])
      .then(([connections, configuredFields]) => {
        if (!active) return;
        setConnection(extractionConnection(connections));
        setFields(configuredFields);
      })
      .catch(() => {
        if (active) setConnection(null);
      });

    return () => {
      active = false;
    };
  }, [task?.status]);

  useEffect(() => {
    onDirtyChange?.(proposal !== null);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, proposal]);

  if (source.sourceText.trim() === "") return null;

  const requestProposal = () => {
    setExcludedProposalIndexes([]);
    startAiTask<PartialJobExtractionResult>(
      taskKey,
      async (updateDetail, signal) => {
        updateDetail("Looking through the saved Source for useful information. Slow local models can take several minutes; you can continue using AAAAT.");
        const cancelProvider = () => {
          void window.aaaat.aiTasks.cancelJobExtraction(taskKey).catch(() => undefined);
        };
        signal.addEventListener("abort", cancelProvider, { once: true });
        try {
          return await window.aaaat.aiTasks.extractJob(taskKey, source);
        } finally {
          signal.removeEventListener("abort", cancelProvider);
        }
      },
      "Find candidature information",
      (result) => {
        const review = result.issues.length;
        return review > 0
          ? `Completed · ${result.proposals.length} value${result.proposals.length === 1 ? "" : "s"} found · ${review} needs review`
          : `Completed · ${result.proposals.length} value${result.proposals.length === 1 ? "" : "s"} found`;
      },
    );
  };

  const acceptSelected = async () => {
    if (proposal === null) return;

    setSaving(true);
    setSaveError(null);
    let saved = 0;
    let failed = 0;

    for (const [index, selected] of proposal.proposals.entries()) {
      if (excludedProposalIndexes.includes(index)) continue;
      const field = fields.find(
        (candidate) => candidate.definition.id === selected.fieldId,
      );
      if (field === undefined) {
        failed += 1;
        recordAiTaskFieldIssue(taskKey, {
          kind: "stale",
          fieldId: selected.fieldId,
          fieldLabel: null,
          proposedValue: selected.value,
          reason: "This information definition changed before the AI proposal could be kept.",
        });
        continue;
      }

      const value: CandidatureRuntimeValue = selected.value;
      try {
        await window.aaaat.candidatures.setFieldValue({
          candidatureId,
          fieldId: field.definition.id,
          value,
        });
        saved += 1;
        markAiTaskFieldApplied(taskKey, field.definition.id);
      } catch (caughtError) {
        failed += 1;
        recordAiTaskFieldIssue(taskKey, {
          kind: "invalid",
          fieldId: field.definition.id,
          fieldLabel: field.definition.label,
          proposedValue: value,
          reason:
            caughtError instanceof Error
              ? caughtError.message
              : "AAAAT could not retain this AI proposal.",
        });
      }
    }

    try {
      if (saved > 0) onAccepted();
      if (failed > 0) {
        setSaveError(`${saved} field${saved === 1 ? "" : "s"} kept · ${failed} need${failed === 1 ? "s" : ""} review. The other AI results were preserved.`);
      } else {
        onDismiss();
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleProposal = (index: number) => {
    setExcludedProposalIndexes((excluded) =>
      excluded.includes(index)
        ? excluded.filter((excludedIndex) => excludedIndex !== index)
        : [...excluded, index],
    );
  };

  if (connection === undefined) {
    return (
      <section className="job-extraction-panel" aria-label="Saved candidature extraction">
        <p role="status">Checking whether AI is ready…</p>
        <button type="button" className="secondary-button" onClick={onDismiss}>Keep without AI</button>
      </section>
    );
  }

  if (connection === null) {
    return (
      <section className="job-extraction-panel" aria-label="Saved candidature extraction">
        <div>
          <p className="eyebrow">Source saved</p>
          <h2>AI is not ready for this action yet</h2>
          <p>The Source is already retained. Open AI settings to check the connection, or continue without AI.</p>
        </div>
        <div className="form-actions">
          <button type="button" className="compact-secondary" onClick={() => openSettingsFor("ai", "candidatures")}>
            Open AI settings
          </button>
          <button type="button" className="secondary-button" onClick={onDismiss}>
            Keep without AI
          </button>
        </div>
      </section>
    );
  }

  const localConnection = isLocalConnection(connection.endpoint);

  return (
    <section className="job-extraction-panel" aria-label="Saved candidature extraction">
      {proposal === null ? (
        <>
          <div>
            <p className="eyebrow">Source saved</p>
            <h2>Ask AI to find useful information?</h2>
            <p>
              The original Source is already retained. AI can suggest candidature information now, or you can keep working without it.
            </p>
          </div>
          <div className="ai-disclosure" aria-label="Extraction disclosure">
            <p><strong>Connection:</strong> {connection.name}</p>
            <p><strong>Connection type:</strong> {localConnection ? "Local on this computer" : "Remote HTTPS"}</p>
            <p>
              {localConnection
                ? "AAAAT will send this saved Source through the selected local connection."
                : "AAAAT will send this saved Source through the selected remote connection."}
              {" "}Nothing changes unless you choose to keep a suggestion.
            </p>
            <details open>
              <summary>Source material to be sent</summary>
              <dl>
                <div><dt>Title</dt><dd>{source.sourceTitle || "Not provided"}</dd></div>
                <div><dt>Link</dt><dd>{source.sourceUrl || "Not provided"}</dd></div>
                <div><dt>Text</dt><dd><pre>{source.sourceText}</pre></dd></div>
              </dl>
            </details>
            {task?.status === "queued" ? (
              <p role="status" className="ai-task-state">Queued. You can leave this panel; AAAAT will keep the request running.</p>
            ) : task?.status === "working" ? (
              <p role="status" className="ai-task-state">{task.detail ?? "Working…"}</p>
            ) : task?.status === "failed" ? (
              <div className="ai-task-failure" role="alert">
                <strong>AI could not finish this request</strong>
                <p>{task.error}</p>
              </div>
            ) : null}
            <div className="form-actions">
              <button type="button" onClick={requestProposal} disabled={taskActive}>
                {taskActive ? "AI request running…" : task?.status === "failed" ? "Retry AI request" : "Ask AI to find information"}
              </button>
              <button type="button" className="secondary-button" onClick={onDismiss}>
                Keep without AI
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="extraction-proposals">
          <h3>Suggested information</h3>
          {proposal.proposals.length === 0 ? (
            <p>AI did not find usable information. Your saved Source has not changed.</p>
          ) : (
            <fieldset>
              <legend>Select only the information you want to keep</legend>
              {proposal.proposals.map((item, index) => (
                <label key={`${item.fieldId}-${index}`} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={!excludedProposalIndexes.includes(index)}
                    onChange={() => toggleProposal(index)}
                  />
                  {proposalLabel(item, fields)}
                </label>
              ))}
            </fieldset>
          )}
          {proposal.issues.length > 0 ? (
            <div className="candidature-field-ai-error" role="status">
              <strong>{proposal.issues.length} AI suggestion{proposal.issues.length === 1 ? "" : "s"} need review</strong>
              {proposal.issues.map((issue, index) => (
                <p key={`${issue.fieldId ?? issue.fieldLabel ?? "proposal"}-${index}`}>
                  <strong>{issue.fieldLabel ?? "Unknown information"}:</strong> {issueValue(issue.proposedValue)} · {issue.reason}
                </p>
              ))}
            </div>
          ) : null}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => void acceptSelected()}
              disabled={saving || proposal.proposals.length === excludedProposalIndexes.length}
            >
              {saving ? "Keeping information…" : "Keep selected information"}
            </button>
            <button type="button" className="secondary-button" onClick={onDismiss} disabled={saving}>
              Dismiss suggestions
            </button>
          </div>
        </div>
      )}

      {saveError !== null ? <div className="inline-error" role="status"><p>{saveError}</p></div> : null}
    </section>
  );
}
