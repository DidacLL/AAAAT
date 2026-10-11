import { useCallback, useState } from "react";
import type { PartialTagInferenceResult } from "../shared/ai-proposal-outcomes";
import { CandidatureManualEntryPanel } from "./CandidatureManualEntryPanel";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import { recordCompletedAiTask } from "./ai-task-store";
import { useShellActions } from "./shell-actions";
import type { ApplicationTagContext } from "./TagVisor";
import "./candidature-capture.css";

export function CandidaturesAiWorkspace({
  initialCandidatureId, onInitialCandidatureCleared, onDirtyChange,
  onTagGlossaryChange, onTagContextChange,
}: {
  readonly initialCandidatureId?: string;
  readonly onInitialCandidatureCleared?: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onTagGlossaryChange?: () => void;
  readonly onTagContextChange?: (context: ApplicationTagContext | null) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selection, setSelection] = useState<{ candidatureId: string; task?: "ai" } | null>(
    initialCandidatureId ? { candidatureId: initialCandidatureId } : null,
  );
  const [dirty, setDirty] = useState(false);
  const reportDirty = useCallback((next: boolean) => {
    setDirty(next); onDirtyChange?.(next);
  }, [onDirtyChange]);
  const newApplication = () => {
    if (dirty && !window.confirm("Discard unsaved application edits?")) return;
    setCreating(true); reportDirty(false);
  };
  const created = (candidatureId: string, tags?: PartialTagInferenceResult) => {
    if (tags) recordCompletedAiTask(
      `candidature-inference:${candidatureId}:missing`,
      { proposals: [], issues: [], tagInference: tags }, "Extract application", "Tag suggestions ready", [],
    );
    reportDirty(false); setRevision((current) => current + 1);
    setSelection({ candidatureId, ...(tags ? { task: "ai" as const } : {}) }); setCreating(false);
  };
  useShellActions({
    title: "Applications",
    actions: [{ id: "new-application", label: "New", onClick: newApplication, primary: true }],
  });
  return (
    <div className="candidature-capture-owner">
      {creating ? (
        <CandidatureManualEntryPanel onCancel={() => { setCreating(false); reportDirty(false); }} onCreated={created} onDirtyChange={reportDirty} />
      ) : (
        <CandidaturesWorkspace
          key={revision}
          initialSelection={selection ?? undefined}
          onInitialSelectionCleared={() => { setSelection(null); onInitialCandidatureCleared?.(); }}
          onDirtyChange={reportDirty}
          onTagGlossaryChange={onTagGlossaryChange}
          onTagContextChange={onTagContextChange}
          onNewApplication={newApplication}
        />
      )}
    </div>
  );
}
