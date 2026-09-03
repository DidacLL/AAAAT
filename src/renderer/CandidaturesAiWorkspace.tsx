import { useState } from "react";

import type { CandidatureInput } from "../shared/contracts";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import { JobExtractionPanel } from "./JobExtractionPanel";

export function CandidaturesAiWorkspace() {
  const [revision, setRevision] = useState(0);

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
      <JobExtractionPanel onCreate={createFromProposal} />
      <CandidaturesWorkspace key={revision} />
    </>
  );
}
