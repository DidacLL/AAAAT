import { useEffect, useState } from "react";
import type { JobExtractionRequest, JobExtractionResult } from "../shared/ai-contracts";
import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";

interface JobExtractionPanelProps {
  candidatureId: string;
  source: JobExtractionRequest;
  onAccepted: () => void;
  onDismiss: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function extractionConnection(connections: NamedAiConnection[]) {
  const configuredDefault = connections.find(
    (connection) =>
      connection.defaultForOperations.includes("job_extraction") &&
      connection.validatedOperations.includes("job_extraction"),
  );

  return (
    configuredDefault ??
    connections.find((connection) => connection.validatedOperations.includes("job_extraction")) ??
    null
  );
}

function proposalLabel(
  proposal: JobExtractionResult["proposals"][number],
  fields: CandidatureFieldConfiguration[],
) {
  const fieldLabel =
    fields.find((field) => field.definition.id === proposal.fieldId)?.definition.label ??
    "Information";
  const value = Array.isArray(proposal.value) ? proposal.value.join(", ") : proposal.value;
  return value === "" ? fieldLabel : `${fieldLabel}: ${value}`;
}

export function JobExtractionPanel({
  candidatureId,
  source,
  onAccepted,
  onDismiss,
  onDirtyChange,
}: JobExtractionPanelProps) {
  const [connection, setConnection] = useState<NamedAiConnection | null | undefined>(undefined);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [proposal, setProposal] = useState<JobExtractionResult | null>(null);
  const [selectedProposalIndexes, setSelectedProposalIndexes] = useState<number[]>([]);
  const [disclosureOpen, setDisclosureOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      window.aaaat.aiConnections.list(),
      window.aaaat.candidatures.listFields(),
    ])
      .then(([connections, configuredFields]) => {
        if (!active) {
          return;
        }

        setConnection(extractionConnection(connections));
        setFields(configuredFields);
      })
      .catch(() => {
        if (active) {
          setConnection(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    onDirtyChange?.(disclosureOpen || proposal !== null);
  }, [disclosureOpen, onDirtyChange, proposal]);

  if (source.sourceText.trim() === "" || connection === undefined || connection === null) {
    return null;
  }

  const requestProposal = async () => {
    setIsWorking(true);
    setError(null);

    try {
      const result = await window.aaaat.ai.extractJob(source);
      setProposal(result);
      setSelectedProposalIndexes(result.proposals.map((_, index) => index));
      setDisclosureOpen(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "AAAAT could not review this Source with AI.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const acceptSelected = async () => {
    if (proposal === null) {
      return;
    }

    setIsWorking(true);
    setError(null);

    try {
      await Promise.all(
        selectedProposalIndexes.map(async (index) => {
          const selected = proposal.proposals[index];
          if (selected === undefined) {
            return;
          }

          const field = fields.find((candidate) => candidate.id === selected.fieldId);
          if (field === undefined) {
            return;
          }

          const value: CandidatureRuntimeValue = {
            fieldId: field.id,
            value: selected.value,
          };
          await window.aaaat.candidatures.setFieldValue(candidatureId, value);
        }),
      );
      onAccepted();
      onDismiss();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "AAAAT could not retain the selected information.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const toggleProposal = (index: number) => {
    setSelectedProposalIndexes((selected) =>
      selected.includes(index)
        ? selected.filter((selectedIndex) => selectedIndex !== index)
        : [...selected, index],
    );
  };

  return (
    <section className="job-extraction-panel" aria-label="Source information assistance">
      <div>
        <p className="eyebrow">Optional AI assistance</p>
        <h2>Review source with AI</h2>
        <p>
          Your Source is already saved. AI can propose individual items of information for
          your review; nothing changes unless you select and retain a proposal.
        </p>
      </div>

      {proposal === null ? (
        <>
          <button type="button" className="secondary-button" onClick={() => setDisclosureOpen(true)}>
            Review source with AI
          </button>
          {disclosureOpen ? (
            <div className="ai-disclosure" role="dialog" aria-label="AI source disclosure">
              <p>
                <strong>AI provider:</strong> {connection.name}
              </p>
              <p>
                AAAAT will send exactly this saved Source material to the selected endpoint. It
                remains your choice whether to continue.
              </p>
              <details open>
                <summary>Source material to be disclosed</summary>
                <dl>
                  <div>
                    <dt>Title</dt>
                    <dd>{source.sourceTitle || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Link</dt>
                    <dd>{source.sourceUrl || "Not provided"}</dd>
                  </div>
                  <div>
                    <dt>Text</dt>
                    <dd>
                      <pre>{source.sourceText}</pre>
                    </dd>
                  </div>
                </dl>
              </details>
              <div className="form-actions">
                <button type="button" onClick={() => void requestProposal()} disabled={isWorking}>
                  {isWorking ? "Reviewing source…" : "Send selected Source to AI"}
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDisclosureOpen(false)}
                  disabled={isWorking}
                >
                  Keep without AI
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="extraction-proposals">
          <h3>Proposed information</h3>
          {proposal.proposals.length === 0 ? (
            <p>No information was proposed. Your saved Source has not changed.</p>
          ) : (
            <fieldset>
              <legend>Select only the information you want to retain</legend>
              {proposal.proposals.map((item, index) => (
                <label key={`${item.fieldId}-${index}`} className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={selectedProposalIndexes.includes(index)}
                    onChange={() => toggleProposal(index)}
                  />
                  {proposalLabel(item, fields)}
                </label>
              ))}
            </fieldset>
          )}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => void acceptSelected()}
              disabled={isWorking || selectedProposalIndexes.length === 0}
            >
              {isWorking ? "Keeping information…" : "Keep selected information"}
            </button>
            <button type="button" className="secondary-button" onClick={onDismiss} disabled={isWorking}>
              Dismiss proposals
            </button>
          </div>
        </div>
      )}

      {error !== null ? (
        <div className="inline-error" role="alert">
          <p>{error}</p>
          <a href="#settings">Review AI settings</a>
        </div>
      ) : null}
    </section>
  );
}
