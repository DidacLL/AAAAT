import { useEffect, useState } from "react";

import type { CandidatureInput } from "../shared/contracts";
import { CandidatureComparisonPanel } from "./CandidatureComparisonPanel";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import { JobExtractionPanel } from "./JobExtractionPanel";

export function CandidaturesAiWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [candidatureDirty, setCandidatureDirty] = useState(false);
  const [extractionDirty, setExtractionDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(candidatureDirty || extractionDirty);
    return () => onDirtyChange?.(false);
  }, [candidatureDirty, extractionDirty, onDirtyChange]);

  const createFromProposal = async (input: CandidatureInput): Promise<boolean> => {
    const proceed = window.confirm(
      "Create this candidature and reload the candidature workspace? Unsaved candidature edits or association changes will be discarded.",
    );
    if (!proceed) return false;
    await window.aaaat.candidatures.create(input);
    setRevision((current) => current + 1);
    return true;
  };

  return (
    <>
      <CandidaturesWorkspace key={revision} onDirtyChange={setCandidatureDirty} />
      <details className="optional-ai-extraction">
        <summary>Optional AI candidature comparison</summary>
        <CandidatureComparisonPanel />
      </details>
      <details className="optional-ai-extraction">
        <summary>Optional AI job extraction</summary>
        <JobExtractionPanel onCreate={createFromProposal} onDirtyChange={setExtractionDirty} />
      </details>
    </>
  );
}
