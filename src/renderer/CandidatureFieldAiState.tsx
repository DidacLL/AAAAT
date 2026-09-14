import { useState } from "react";

import type { JobExtractionResult } from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import {
  clearAiTask,
  markAiTaskFieldHandled,
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

function extractionResult(task: AiTaskSnapshot): JobExtractionResult | null {
  if (!task.result || typeof task.result !== "object" || !("proposals" in task.result)) return null;
  const proposals = (task.result as JobExtractionResult).proposals;
  return Array.isArray(proposals) ? { proposals } : null;
}

function proposalFor(task: AiTaskSnapshot, fieldId: string) {
  return extractionResult(task)?.proposals.find((proposal) => proposal.fieldId === fieldId) ?? null;
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
  const exactKey = `candidature-inference:${candidatureId}:${field.definition.id}`;
  const bulkKey = `candidature-inference:${candidatureId}:missing`;
  const candidates = tasks.filter((task) => task.key === exactKey || task.key === bulkKey);

  const proposalTask = candidates.find((task) => {
    const proposal = proposalFor(task, field.definition.id);
    return proposal && !(task.handledFieldIds ?? []).includes(field.definition.id);
  });
  const proposal = proposalTask ? proposalFor(proposalTask, field.definition.id) : null;
  const exactTask = candidates.find((task) => task.key === exactKey) ?? null;
  const activeTask = candidates.find(
    (task) =>
      (task.status === "queued" || task.status === "working") &&
      (task.key === exactKey || currentValue === undefined),
  );

  const accept = async (value: CandidatureRuntimeValue) => {
    if (!proposalTask) return;
    await onSaveValue(value);
    markAiTaskFieldHandled(proposalTask.key, field.definition.id);
    setEditingProposal(false);
  };

  const reject = () => {
    if (!proposalTask) return;
    markAiTaskFieldHandled(proposalTask.key, field.definition.id);
    setEditingProposal(false);
  };

  const retry = (task: AiTaskSnapshot) => {
    clearAiTask(task.key);
    onRetry();
  };

  if (proposal && proposalTask) {
    return (
      <div className="candidature-field-ai-state candidature-field-ai-proposal" role="status">
        <div className="candidature-ai-proposal-heading">
          <span className="candidature-state-lamp candidature-state-lamp-proposal" aria-hidden="true" />
          <strong>AI proposal</strong>
          <span>{currentValue === undefined ? "Not saved yet" : "Current value stays until you accept"}</span>
        </div>
        {editingProposal ? (
          <CandidatureFieldValueEditor
            field={field}
            value={proposal.value}
            initialEditing
            showFieldControls={false}
            saveLabel="Accept"
            clearLabel="Reject"
            onSave={accept}
            onClear={async () => reject()}
          />
        ) : (
          <>
            <p className="candidature-ai-proposed-value">
              {Array.isArray(proposal.value) ? proposal.value.map(String).join(", ") : String(proposal.value)}
            </p>
            <div className="button-row candidature-ai-review-actions">
              <button type="button" onClick={() => void accept(proposal.value)}>Accept</button>
              <button type="button" className="compact-secondary" onClick={() => setEditingProposal(true)}>Edit</button>
              <button type="button" className="compact-secondary" onClick={reject}>Reject</button>
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

  return null;
}
