import { useEffect, useState } from "react";
import type { JobExtractionRequest, JobExtractionResult } from "../shared/ai-contracts";
import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import { useContextualHandoffs } from "./contextual-handoffs";

interface JobExtractionPanelProps {
  candidatureId: string;
  source: JobExtractionRequest;
  onAccepted: () => void;
  onDismiss: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

function extractionConnection(connections: NamedAiConnection[]) {
  const operationDefault = connections.find(
    (connection) =>
      connection.defaultForOperations.includes("job_extraction") &&
      connection.validatedOperations.includes("job_extraction"),
  );
  if (operationDefault) return operationDefault;

  return (
    connections.find(
      (connection) =>
        connection.isDefault && connection.validatedOperations.includes("job_extraction"),
    ) ?? null
  );
}

function isLocalConnection(endpoint: string): boolean {
  const hostname = new URL(endpoint).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
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
  const { openSettingsFor } = useContextualHandoffs();
  const [connection, setConnection] = useState<NamedAiConnection | null | undefined>(undefined);
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [proposal, setProposal] = useState<JobExtractionResult | null>(null);
  const [selectedProposalIndexes, setSelectedProposalIndexes] = useState<number[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void Promise.all([
      window.aaaat.aiConnections.list(),
      window.aaaat.candidatures.listFields(),
    ])
      .then(([connections, configuredFields]) => {
        if (!active) return;
        setConnection(extractionConnection(connections));
        setFields(configuredFields);
      })
      .catch(() => {
        if (active) setConnection(null);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    onDirtyChange?.(proposal !== null);
    return () => onDirtyChange?.(false);
  }, [onDirtyChange, proposal]);

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
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "AAAAT could not extract information from this Source.",
      );
    } finally {
      setIsWorking(false);
    }
  };

  const acceptSelected = async () => {
    if (proposal === null) return;

    setIsWorking(true);
    setError(null);

    try {
      await Promise.all(
        selectedProposalIndexes.map(async (index) => {
          const selected = proposal.proposals[index];
          if (selected === undefined) return;

          const field = fields.find(
            (candidate) => candidate.definition.id === selected.fieldId,
          );
          if (field === undefined) return;

          const value: CandidatureRuntimeValue = selected.value;
          await window.aaaat.candidatures.setFieldValue({
            candidatureId,
            fieldId: field.definition.id,
            value,
          });
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

  const localConnection = isLocalConnection(connection.endpoint);

  return (
    <section className="job-extraction-panel" aria-label="Saved candidature extraction">
      {proposal === null ? (
        <>
          <div>
            <p className="eyebrow">Candidature saved</p>
            <h2>Extract useful information?</h2>
            <p>
              The original Source is already retained. AAAAT can use your configured extraction connection to suggest ordinary candidature information now, or you can keep working without AI.
            </p>
          </div>
          <div className="ai-disclosure" aria-label="Extraction disclosure">
            <p><strong>Connection:</strong> {connection.name}</p>
            <p><strong>Connection type:</strong> {localConnection ? "Local on this computer" : "Remote HTTPS"}</p>
            <p>
              {localConnection
                ? "AAAAT will send this saved Source material through the selected local connection."
                : "AAAAT will send this saved Source material through the selected remote connection."}
              {" "}No candidature information changes unless you retain a proposal.
            </p>
            <details open>
              <summary>Source material to be disclosed</summary>
              <dl>
                <div><dt>Title</dt><dd>{source.sourceTitle || "Not provided"}</dd></div>
                <div><dt>Link</dt><dd>{source.sourceUrl || "Not provided"}</dd></div>
                <div><dt>Text</dt><dd><pre>{source.sourceText}</pre></dd></div>
              </dl>
            </details>
            <div className="form-actions">
              <button type="button" onClick={() => void requestProposal()} disabled={isWorking}>
                {isWorking ? "Extracting information…" : "Extract useful information"}
              </button>
              <button type="button" className="secondary-button" onClick={onDismiss} disabled={isWorking}>
                Keep without AI
              </button>
            </div>
          </div>
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
          <button
            className="compact-secondary"
            type="button"
            onClick={() => openSettingsFor("ai", "candidatures")}
          >
            Open AI connections settings
          </button>
        </div>
      ) : null}
    </section>
  );
}
