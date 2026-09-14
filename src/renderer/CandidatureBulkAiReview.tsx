import { useEffect, useMemo, useRef } from "react";

import type { JobExtractionResult } from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import {
  clearAiTask,
  markAiTaskFieldApplied,
  useAiTask,
} from "./ai-task-store";

interface Props {
  readonly candidature: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly onSaveValue: (fieldId: string, value: CandidatureRuntimeValue) => Promise<void>;
  readonly onRetry: () => void;
}

export function CandidatureBulkAiReview({
  candidature,
  fields,
  onSaveValue,
  onRetry,
}: Props) {
  const taskId = `candidature-inference:${candidature.id}:missing`;
  const task = useAiTask<JobExtractionResult>(taskId);
  const applyingFieldIds = useRef(new Set<string>());
  const enabled = useMemo(
    () => new Set(fields.filter((field) => field.definition.enabled).map((field) => field.definition.id)),
    [fields],
  );
  const scoped = task?.scopeFieldIds ? new Set(task.scopeFieldIds) : null;
  const retained = useMemo(
    () => new Set(candidature.values.map((value) => value.fieldId)),
    [candidature.values],
  );
  const proposals = useMemo(
    () => (task?.result?.proposals ?? []).filter(
      (proposal) =>
        enabled.has(proposal.fieldId) &&
        (!scoped || scoped.has(proposal.fieldId)) &&
        !(task?.handledFieldIds ?? []).includes(proposal.fieldId),
    ),
    [enabled, scoped, task?.handledFieldIds, task?.result?.proposals],
  );
  const safeMissing = useMemo(
    () => proposals.filter((proposal) => !retained.has(proposal.fieldId)),
    [proposals, retained],
  );
  const conflicts = proposals.filter((proposal) => retained.has(proposal.fieldId));
  const appliedCount = task?.appliedFieldIds?.length ?? 0;

  useEffect(() => {
    if (task?.status !== "completed" || safeMissing.length === 0) return;
    let active = true;
    for (const proposal of safeMissing) {
      if (applyingFieldIds.current.has(proposal.fieldId)) continue;
      applyingFieldIds.current.add(proposal.fieldId);
      void onSaveValue(proposal.fieldId, proposal.value)
        .then(() => {
          if (active) markAiTaskFieldApplied(taskId, proposal.fieldId);
        })
        .finally(() => {
          applyingFieldIds.current.delete(proposal.fieldId);
        });
    }
    return () => {
      active = false;
    };
  }, [onSaveValue, safeMissing, task?.status, taskId]);

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
  if (proposals.length === 0) {
    if (appliedCount > 0) {
      return (
        <div className="candidature-bulk-ai-review" role="status">
          <span className="candidature-state-lamp candidature-state-lamp-proposal" aria-hidden="true" />
          <span>AI filled {appliedCount} missing field{appliedCount === 1 ? "" : "s"}. New values are marked below.</span>
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

  return (
    <div className="candidature-bulk-ai-review" role="status">
      <span className="candidature-state-lamp candidature-state-lamp-proposal" aria-hidden="true" />
      <span>{conflicts.length} AI suggestion{conflicts.length === 1 ? "" : "s"} need review because a value already exists.</span>
    </div>
  );
}
