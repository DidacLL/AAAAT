import { useEffect, useState } from "react";

import type {
  JobExtractionRequest,
  JobExtractionResult,
} from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureInput,
  CandidatureRuntimeValue,
} from "../shared/contracts";

interface Props {
  readonly onCreate: (input: CandidatureInput) => Promise<boolean>;
}

const emptyRequest: JobExtractionRequest = {
  sourceTitle: "",
  sourceUrl: "",
  sourceText: "",
};

function displayValue(
  field: CandidatureFieldConfiguration | undefined,
  value: CandidatureRuntimeValue,
): string {
  const displayOne = (item: string | number | boolean): string => {
    if (field?.definition.valueType === "choice" && typeof item === "string") {
      return field.definition.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    if (typeof item === "boolean") return item ? "Yes" : "No";
    return String(item);
  };
  return Array.isArray(value) ? value.map(displayOne).join(", ") : displayOne(value);
}

function candidatureInput(
  request: JobExtractionRequest,
  proposal: JobExtractionResult,
): CandidatureInput {
  return {
    source: {
      kind: "job_posting",
      title: request.sourceTitle,
      url: request.sourceUrl,
      sourceText: request.sourceText,
    },
    values: proposal.proposals,
  };
}

export function JobExtractionPanel({ onCreate }: Props) {
  const [request, setRequest] = useState<JobExtractionRequest>(emptyRequest);
  const [proposal, setProposal] = useState<JobExtractionResult | null>(null);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures
      .listFields()
      .then((next) => {
        if (active) setFields(next);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load the current candidature field catalogue.");
      });
    return () => {
      active = false;
    };
  }, []);

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
      setError(reason instanceof Error ? reason.message : "AAAAT could not analyze this Source.");
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
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create this candidature.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="selected-concept-definition" aria-label="Candidature Source discovery">
      <div>
        <p className="eyebrow">Optional local AI</p>
        <h3>Discover registered information from a Source</h3>
        <p>
          AAAAT asks only for fields currently enabled for AI discovery. The model cannot add field
          definitions, and nothing is retained until you accept the proposal.
        </p>
      </div>

      <div className="candidature-fields">
        <label>
          Source title
          <input
            value={request.sourceTitle}
            disabled={busy}
            onChange={(event) => sourceChanged({ ...request, sourceTitle: event.target.value })}
            placeholder="Company site or offer title"
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
          Source text
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
        {busy && !proposal ? "Discovering…" : "Discover configured fields"}
      </button>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {proposal ? (
        <section className="selected-concept-definition" aria-label="Candidature discovery proposal">
          <h4>Review discovered information</h4>
          {proposal.proposals.length === 0 ? (
            <p>No configured discovery field was supported by this Source.</p>
          ) : (
            <dl className="focus-facts">
              {proposal.proposals.map((item) => {
                const field = fields.find((candidate) => candidate.definition.id === item.fieldId);
                return (
                  <div key={item.fieldId}>
                    <dt>{field?.definition.label ?? item.fieldId}</dt>
                    <dd>{displayValue(field, item.value)}</dd>
                  </div>
                );
              })}
            </dl>
          )}
          <p>The raw Source is retained independently. No lifecycle or preparation values are created.</p>
          <button type="button" disabled={busy} onClick={() => void create()}>
            {busy ? "Creating…" : "Create candidature and accept proposal"}
          </button>
        </section>
      ) : null}
    </section>
  );
}
