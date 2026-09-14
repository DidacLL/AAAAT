import { useEffect, useRef, useState } from "react";

import type { PartialJobExtractionResult } from "../shared/ai-proposal-outcomes";
import {
  candidatureRuntimeValueSchema,
  type CandidatureFieldConfiguration,
  type CandidatureRuntimeValue,
} from "../shared/contracts";
import {
  clearAiTask,
  markAiTaskFieldApplied,
  markAiTaskFieldHandled,
  recordAiTaskFieldIssue,
  resolveAiTaskFieldIssue,
  type AiTaskSnapshot,
  useAiTasks,
} from "./ai-task-store";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";

interface Props {
  readonly candidatureId: string;
  readonly field: CandidatureFieldConfiguration;
  readonly currentValue?: CandidatureRuntimeValue;
  readonly onSaveValue: (value: CandidatureRuntimeValue) => Promise<void>;
  readonly onRetry: () => void;
}

function extractionResult(task: AiTaskSnapshot): PartialJobExtractionResult | null {
  if (!task.result || typeof task.result !== "object" || !("proposals" in task.result)) return null;
  const result = task.result as PartialJobExtractionResult;
  return Array.isArray(result.proposals)
    ? { proposals: result.proposals, newFields: result.newFields ?? [], issues: result.issues ?? [], ...(result.exchange ? { exchange: result.exchange } : {}) }
    : null;
}

function inScope(task: AiTaskSnapshot, fieldId: string): boolean {
  return !task.scopeFieldIds || task.scopeFieldIds.includes(fieldId);
}

function proposalFor(task: AiTaskSnapshot, fieldId: string) {
  if (!inScope(task, fieldId)) return null;
  return extractionResult(task)?.proposals.find((proposal) => proposal.fieldId === fieldId) ?? null;
}

function issueFor(task: AiTaskSnapshot, fieldId: string) {
  if (!inScope(task, fieldId)) return null;
  return extractionResult(task)?.issues.find((issue) => issue.fieldId === fieldId) ?? null;
}

function displayUnknown(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (value === undefined) return "(missing)";
  if (value === null) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function CandidatureFieldAiState({
  candidatureId,
  field,
  currentValue,
  onSaveValue,
  onRetry,
}: Props) {
  const tasks = useAiTasks();
  const [editingProposal, setEditingProposal] = useState(false);
  const [editingIssue, setEditingIssue] = useState(false);
  const autoApplying = useRef(false);
  const exactKey = `candidature-inference:${candidatureId}:${field.definition.id}`;
  const bulkKey = `candidature-inference:${candidatureId}:missing`;
  const candidates = tasks.filter(
    (task) =>
      (task.key === exactKey || task.key === bulkKey) && inScope(task, field.definition.id),
  );

  const issueTask = candidates.find(
    (task) => task.status === "completed" && issueFor(task, field.definition.id),
  );
  const fieldIssue = issueTask ? issueFor(issueTask, field.definition.id) : null;
  const proposedIssueValue = fieldIssue
    ? candidatureRuntimeValueSchema.safeParse(fieldIssue.proposedValue)
    : null;
  const proposalTask = candidates.find((task) => {
    const proposal = proposalFor(task, field.definition.id);
    return proposal && !(task.handledFieldIds ?? []).includes(field.definition.id);
  });
  const proposal = proposalTask ? proposalFor(proposalTask, field.definition.id) : null;
  const exactTask = candidates.find((task) => task.key === exactKey) ?? null;
  const activeTask = candidates.find(
    (task) => task.status === "queued" || task.status === "working",
  );
  const appliedTask = candidates.find(
    (task) =>
      task.status === "completed" &&
      (task.appliedFieldIds ?? []).includes(field.definition.id),
  );

  useEffect(() => {
    if (
      !proposal ||
      !proposalTask ||
      proposalTask.key !== exactKey ||
      currentValue !== undefined ||
      autoApplying.current
    ) {
      return;
    }
    let active = true;
    autoApplying.current = true;
    void onSaveValue(proposal.value)
      .then(() => {
        if (active) markAiTaskFieldApplied(proposalTask.key, field.definition.id);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        recordAiTaskFieldIssue(proposalTask.key, {
          kind: "invalid",
          fieldId: field.definition.id,
          fieldLabel: field.definition.label,
          proposedValue: proposal.value,
          reason:
            reason instanceof Error
              ? reason.message
              : "AAAAT could not retain this AI proposal.",
        });
      })
      .finally(() => {
        autoApplying.current = false;
      });
    return () => {
      active = false;
    };
  }, [currentValue, exactKey, field.definition.id, field.definition.label, onSaveValue, proposal, proposalTask]);

  const accept = async (value: CandidatureRuntimeValue) => {
    if (!proposalTask) return;
    await onSaveValue(value);
    markAiTaskFieldApplied(proposalTask.key, field.definition.id);
    setEditingProposal(false);
  };

  const reject = () => {
    if (!proposalTask) return;
    markAiTaskFieldHandled(proposalTask.key, field.definition.id);
    setEditingProposal(false);
  };

  const acceptIssueEdit = async (value: CandidatureRuntimeValue) => {
    if (!issueTask) return;
    await onSaveValue(value);
    resolveAiTaskFieldIssue(issueTask.key, field.definition.id, true);
    setEditingIssue(false);
  };

  const dismissIssue = () => {
    if (!issueTask) return;
    resolveAiTaskFieldIssue(issueTask.key, field.definition.id, false);
    setEditingIssue(false);
  };

  const retryIssue = () => {
    if (!issueTask) return;
    resolveAiTaskFieldIssue(issueTask.key, field.definition.id, false);
    if (issueTask.key === exactKey) clearAiTask(issueTask.key);
    autoApplying.current = false;
    setEditingIssue(false);
    onRetry();
  };

  const retry = (task: AiTaskSnapshot) => {
    autoApplying.current = false;
    clearAiTask(task.key);
    onRetry();
  };

  if (fieldIssue && issueTask) {
    return (
      <div className="candidature-field-ai-state candidature-field-ai-error" role="status">
        <div className="candidature-ai-proposal-heading">
          <span className="candidature-state-lamp candidature-state-lamp-proposal" aria-hidden="true" />
          <strong>AI suggestion needs review</strong>
          <span>AAAAT kept the rest of the AI result.</span>
        </div>
        <p className="candidature-ai-proposed-value">
          <strong>AI proposed:</strong> {displayUnknown(fieldIssue.proposedValue)}
        </p>
        <p className="compact-help">{fieldIssue.reason}</p>
        {editingIssue && proposedIssueValue?.success ? (
          <CandidatureFieldValueEditor
            field={field}
            value={proposedIssueValue.data}
            initialEditing
            showFieldControls={false}
            saveLabel="Use corrected value"
            clearLabel="Dismiss"
            onSave={acceptIssueEdit}
            onClear={async () => dismissIssue()}
          />
        ) : (
          <div className="button-row candidature-ai-review-actions">
            {proposedIssueValue?.success ? (
              <button type="button" className="compact-secondary" onClick={() => setEditingIssue(true)}>
                Edit
              </button>
            ) : null}
            <button type="button" className="compact-secondary" onClick={retryIssue}>Retry this field</button>
            <button type="button" className="compact-secondary" onClick={dismissIssue}>Dismiss</button>
          </div>
        )}
      </div>
    );
  }

  if (proposal && proposalTask?.key === exactKey && currentValue === undefined) {
    return (
      <div className="candidature-field-ai-state candidature-field-ai-working" role="status">
        <span className="candidature-state-lamp candidature-state-lamp-working" aria-hidden="true" />
        <span>Saving AI-filled information…</span>
      </div>
    );
  }

  if (proposal && proposalTask) {
    return (
      <div className="candidature-field-ai-state candidature-field-ai-proposal" role="status">
        <div className="candidature-ai-proposal-heading">
          <span className="candidature-state-lamp candidature-state-lamp-proposal" aria-hidden="true" />
          <strong>AI found another value</strong>
          <span>Your saved value will not be replaced unless you choose it.</span>
        </div>
        {editingProposal ? (
          <CandidatureFieldValueEditor
            field={field}
            value={proposal.value}
            initialEditing
            showFieldControls={false}
            saveLabel="Use this value"
            clearLabel="Dismiss"
            onSave={accept}
            onClear={async () => reject()}
          />
        ) : (
          <>
            <p className="candidature-ai-proposed-value">
              {Array.isArray(proposal.value) ? proposal.value.map(String).join(", ") : String(proposal.value)}
            </p>
            <div className="button-row candidature-ai-review-actions">
              <button type="button" onClick={() => void accept(proposal.value)}>Use this value</button>
              <button type="button" className="compact-secondary" onClick={() => setEditingProposal(true)}>Edit</button>
              <button type="button" className="compact-secondary" onClick={reject}>Dismiss</button>
            </div>
          </>
        )}
      </div>
    );
  }

  if (activeTask) {
    return (
      <div className="candidature-field-ai-state candidature-field-ai-working" role="status">
        <span className="candidature-state-lamp candidature-state-lamp-working" aria-hidden="true" />
        <span>{activeTask.status === "queued" ? "AI queued" : activeTask.detail ?? "AI working…"}</span>
      </div>
    );
  }

  if (exactTask?.status === "failed") {
    return (
      <div className="candidature-field-ai-state candidature-field-ai-error" role="alert">
        <span>{exactTask.error ?? "AI could not fill this information."}</span>
        <button type="button" className="compact-secondary" onClick={() => retry(exactTask)}>Retry</button>
      </div>
    );
  }

  if (
    exactTask?.status === "completed" &&
    !(exactTask.handledFieldIds ?? []).includes(field.definition.id) &&
    !proposalFor(exactTask, field.definition.id)
  ) {
    return (
      <div className="candidature-field-ai-state candidature-field-ai-empty" role="status">
        <span>AI finished but did not find a usable value.</span>
        <button type="button" className="compact-secondary" onClick={() => retry(exactTask)}>Try again</button>
      </div>
    );
  }

  if (appliedTask && currentValue !== undefined) {
    return (
      <div className="candidature-field-ai-state candidature-field-ai-applied" role="status">
        <span className="candidature-state-lamp candidature-state-lamp-proposal" aria-hidden="true" />
        <span><strong>AI filled</strong> · New</span>
      </div>
    );
  }

  return null;
}
