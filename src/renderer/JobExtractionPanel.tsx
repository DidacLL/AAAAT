import { useState } from "react";

import type {
  JobExtractionRequest,
  JobExtractionResult,
} from "../shared/ai-contracts";
import type { CandidatureInput } from "../shared/contracts";

interface Props {
  readonly onCreate: (input: CandidatureInput) => Promise<boolean>;
}

const emptyRequest: JobExtractionRequest = {
  source: "",
  sourceUrl: "",
  sourceText: "",
};

function candidatureInput(
  request: JobExtractionRequest,
  proposal: JobExtractionResult,
): CandidatureInput {
  return {
    company: proposal.company,
    role: proposal.role,
    location: proposal.location,
    workMode: proposal.workMode,
    salaryText: proposal.salaryText,
    source: request.source,
    sourceUrl: request.sourceUrl,
    sourceText: request.sourceText,
    status: "saved",
    applicationDate: "",
    nextAction: "",
    nextActionDate: "",
    notes: "",
  };
}

export function JobExtractionPanel({ onCreate }: Props) {
  const [request, setRequest] = useState<JobExtractionRequest>(emptyRequest);
  const [proposal, setProposal] = useState<JobExtractionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceChanged = (next: JobExtractionRequest) => {
    setRequest(next);
    setProposal(null);
  };

  const extract = async () => {
    setBusy(true);
    setError(null);
    try {
      setProposal(await window.aaaat.ai.extractJob(request));
    } catch (reason) {
      setProposal(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not extract this job source.",
      );
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!proposal) return;
    setBusy(true);
    setError(null);
    try {
      const created = await onCreate(candidatureInput(request, proposal));
      if (created) {
        setRequest(emptyRequest);
        setProposal(null);
      }
    } catch {
      setError("AAAAT could not create the extracted candidature.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="selected-concept-definition" aria-label="Job extraction">
      <div>
        <p className="eyebrow">Optional local AI</p>
        <h3>Extract a pasted job</h3>
        <p>
          Paste source material you already have. AAAAT sends only this source to the configured
          local model and creates nothing until you approve the proposal.
        </p>
      </div>

      <div className="candidature-fields">
        <label>
          Source
          <input
            value={request.source}
            disabled={busy}
            onChange={(event) => sourceChanged({ ...request, source: event.target.value })}
            placeholder="Job board or company site"
          />
        </label>
        <label>
          Source URL
          <input
            value={request.sourceUrl}
            disabled={busy}
            onChange={(event) => sourceChanged({ ...request, sourceUrl: event.target.value })}
            placeholder="Optional reference URL"
          />
        </label>
        <label className="wide-field">
          Job source text
          <textarea
            rows={8}
            value={request.sourceText}
            disabled={busy}
            onChange={(event) => sourceChanged({ ...request, sourceText: event.target.value })}
          />
        </label>
      </div>

      <button
        type="button"
        disabled={busy || request.sourceText.trim().length === 0}
        onClick={() => void extract()}
      >
        {busy && !proposal ? "Extracting…" : "Extract job details"}
      </button>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {proposal ? (
        <section className="selected-concept-definition" aria-label="Job extraction proposal">
          <h4>Review extracted details</h4>
          <dl className="focus-facts">
            <div><dt>Company</dt><dd>{proposal.company || "Not found"}</dd></div>
            <div><dt>Role</dt><dd>{proposal.role || "Not found"}</dd></div>
            <div><dt>Location</dt><dd>{proposal.location || "Not found"}</dd></div>
            <div><dt>Work mode</dt><dd>{proposal.workMode || "Not found"}</dd></div>
            <div><dt>Salary</dt><dd>{proposal.salaryText || "Not found"}</dd></div>
          </dl>
          <p>Status will start as Saved. Dates, next action, and notes remain empty.</p>
          <button type="button" disabled={busy} onClick={() => void create()}>
            {busy ? "Creating…" : "Create candidature from proposal"}
          </button>
        </section>
      ) : null}
    </section>
  );
}
