import { useState } from "react";

import type { JobExtractionResult } from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import { clearAiTask, markAiTaskFieldHandled, useAiTask } from "./ai-task-store";

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
  const [accepting, setAccepting] = useState(false);
  const enabled = new Set(fields.filter((field) => field.definition.enabled).map((field) => field.definition.id));
  const retained = new Set(candidature.values.map((value) => value.fieldId));
  const proposals = (task?.result?.proposals ?? []).filter(
    (proposal) =>
      enabled.has(proposal.fieldId) && !(task?.handledFieldIds ?? []).includes(proposal.fieldId),
  );
  const safeMissing = proposals.filter((proposal) => !retained.has(proposal.fieldId));

  const retry = () => {
    clearAiTask(taskId);
    onRetry();
  };

  const acceptAll = async () => {
    if (safeMissing.length === 0) return;
    setAccepting(true);
    try {
      for (const proposal of safeMissing) {
        await onSaveValue(proposal.fieldId, proposal.value);
        markAiTaskFieldHandled(taskId, proposal.fieldId);
      }
    } finally {
      setAccepting(false);
    }
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
  if (task.status === "failed") {
    return (
      <div className="candidature-bulk-ai-review candidature-field-ai-error" role="alert">
        <span>{task.error ?? "AI could not fill missing information."}</span>
        <button type="button" className="compact-secondary" onClick={retry}>Retry</button>
      </div>
    );
  }
  if (proposals.length === 0) {
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
      <span>
        {proposals.length} AI proposal{proposals.length === 1 ? "" : "s"} ready in the fields below.
      </span>
      {safeMissing.length > 0 ? (
        <button type="button" disabled={accepting} onClick={() => void acceptAll()}>
          {accepting ? "Accepting…" : safeMissing.length === proposals.length ? "Accept all" : "Accept all still-missing"}
        </button>
      ) : null}
    </div>
  );
}
