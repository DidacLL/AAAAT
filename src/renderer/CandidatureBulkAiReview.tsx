import { useEffect, useRef } from "react";

import type { PartialJobExtractionResult } from "../shared/ai-proposal-outcomes";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import {
  clearAiTask,
  markAiTaskFieldApplied,
  recordAiTaskFieldIssue,
  useAiTask,
} from "./ai-task-store";

interface Props {
  readonly candidature: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly onSaveValue: (fieldId: string, value: CandidatureRuntimeValue) => Promise<void>;
  readonly onRetry: () => void;
}

function pendingProposals(
  task: ReturnType<typeof useAiTask<PartialJobExtractionResult>>,
  candidature: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
) {
  if (!task) return { safeMissing: [], conflicts: [] };
  const enabled = new Set(
    fields.filter((field) => field.definition.enabled).map((field) => field.definition.id),
  );
  const scoped = task.scopeFieldIds ? new Set(task.scopeFieldIds) : null;
  const retained = new Set(candidature.values.map((value) => value.fieldId));
  const proposals = (task.result?.proposals ?? []).filter(
    (proposal) =>
      enabled.has(proposal.fieldId) &&
      (!scoped || scoped.has(proposal.fieldId)) &&
      !(task.handledFieldIds ?? []).includes(proposal.fieldId),
  );
  return {
    safeMissing: proposals.filter((proposal) => !retained.has(proposal.fieldId)),
    conflicts: proposals.filter((proposal) => retained.has(proposal.fieldId)),
  };
}

export function CandidatureBulkAiReview({
  candidature,
  fields,
  onSaveValue,
  onRetry,
}: Props) {
  const taskId = `candidature-inference:${candidature.id}:missing`;
  const task = useAiTask<PartialJobExtractionResult>(taskId);
  const applyingFieldIds = useRef(new Set<string>());
  const { safeMissing, conflicts } = pendingProposals(task, candidature, fields);
  const appliedCount = task?.appliedFieldIds?.length ?? 0;
  const issues = task?.result?.issues ?? [];
  const needsReview = conflicts.length + issues.length;
  const unplacedIssues = issues.filter((issue) => issue.fieldId === null);

  useEffect(() => {
    if (task?.status !== "completed") return;
    const { safeMissing: currentMissing } = pendingProposals(task, candidature, fields);
    if (currentMissing.length === 0) return;
    for (const proposal of currentMissing) {
      if (applyingFieldIds.current.has(proposal.fieldId)) continue;
      applyingFieldIds.current.add(proposal.fieldId);
      const field = fields.find((candidate) => candidate.definition.id === proposal.fieldId);
      void onSaveValue(proposal.fieldId, proposal.value)
        .then(() => {
          markAiTaskFieldApplied(taskId, proposal.fieldId);
        })
        .catch((reason: unknown) => {
          recordAiTaskFieldIssue(taskId, {
            kind: "invalid",
            fieldId: proposal.fieldId,
            fieldLabel: field?.definition.label ?? "Information",
            proposedValue: proposal.value,
            reason:
              reason instanceof Error
                ? reason.message
                : "AAAAT could not retain this AI proposal.",
          });
        })
        .finally(() => {
          applyingFieldIds.current.delete(proposal.fieldId);
        });
    }
  }, [candidature, fields, onSaveValue, task, taskId]);

  const retry = () => {
    applyingFieldIds.current.clear();
    clearAiTask(taskId);
    onRetry();
  };

  if (!task) return null;
  if (task.status === "queued" || task.status === "working") {
    return (
      <div className="candidature-bulk-ai-review" role="status">
        <span className="candidature-state-lamp candidature-state-lamp-working" aria-hidden="true" />
        <span>{task.status === "queued" ? "AI queued" : task.detail ?? "AI working…"}</span>
      </div>
    );
  }
  if (task.status === "cancelled") return null;
  if (task.status === "failed") {
    return (
      <div className="candidature-bulk-ai-review candidature-field-ai-error" role="alert">
        <span>{task.error ?? "AI could not fill missing information."}</span>
        <button type="button" className="compact-secondary" onClick={retry}>Retry</button>
      </div>
    );
  }
  if (safeMissing.length > 0) {
    return (
      <div className="candidature-bulk-ai-review" role="status">
        <span className="candidature-state-lamp candidature-state-lamp-working" aria-hidden="true" />
        <span>Saving {safeMissing.length} AI-filled value{safeMissing.length === 1 ? "" : "s"}…</span>
      </div>
    );
  }
  if (needsReview > 0) {
    return (
      <div className="candidature-bulk-ai-review" role="status">
        <span className="candidature-state-lamp candidature-state-lamp-proposal" aria-hidden="true" />
        <span>
          {appliedCount > 0 ? `${appliedCount} fields filled · ` : ""}
          {needsReview} need{needsReview === 1 ? "s" : ""} review
        </span>
        {unplacedIssues.length > 0 ? (
          <span className="compact-help">
            {unplacedIssues.map((issue) => issue.reason).join(" ")}
          </span>
        ) : null}
      </div>
    );
  }
  if (appliedCount > 0) {
    return (
      <div className="candidature-bulk-ai-review" role="status">
        <span className="candidature-state-lamp candidature-state-lamp-proposal" aria-hidden="true" />
        <span>{appliedCount} field{appliedCount === 1 ? "" : "s"} filled</span>
      </div>
    );
  }
  const reviewed = (task.handledFieldIds ?? []).length > 0;
  return reviewed ? null : (
    <div className="candidature-bulk-ai-review" role="status">
      <span>AI finished but did not find usable missing information.</span>
      <button type="button" className="compact-secondary" onClick={retry}>Try again</button>
    </div>
  );
}
