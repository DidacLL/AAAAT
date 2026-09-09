import { useEffect, useMemo, useState } from "react";

import type { CandidatureFieldConfiguration, CandidatureRuntimeValue, CandidatureSource } from "../shared/contracts";
import { isAiOperationUnavailable } from "./ai-route-status";
import { useContextualHandoffs } from "./contextual-handoffs";

interface Props {
  readonly candidatureId: string;
  readonly field: CandidatureFieldConfiguration;
  readonly onAccept: (value: CandidatureRuntimeValue) => Promise<void>;
  readonly onClose: () => void;
}

export function HistoricalFieldDiscoveryPanel({
  candidatureId,
  field,
  onAccept,
  onClose,
}: Props) {
  const { openSettingsFor } = useContextualHandoffs();
  const [sources, setSources] = useState<CandidatureSource[] | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures
      .listSources(candidatureId)
      .then((retainedSources) => {
        if (!active) return;
        setSources(retainedSources);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load retained Sources for discovery.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  const selectedSources = useMemo(
    () => sources?.filter((source) => selectedSourceIds.includes(source.id)) ?? [],
    [selectedSourceIds, sources],
  );

  const toggleSource = (sourceId: string, checked: boolean) => {
    setSelectedSourceIds((current) =>
      checked
        ? [...current.filter((id) => id !== sourceId), sourceId]
        : current.filter((id) => id !== sourceId),
    );
  };

  const discover = async () => {
    if (selectedSourceIds.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.aaaat.ai.discoverField({
        candidatureId,
        fieldId: field.definition.id,
        sourceIds: selectedSourceIds,
      });
      if (!result.proposal) {
        window.alert("The configured AI did not find a supported value in the selected Sources.");
        onClose();
        return;
      }
      const replacement = result.existingValuePresent
        ? `Replace the existing ${field.definition.label} value with the reviewed AI proposal?`
        : `Accept the reviewed AI proposal for ${field.definition.label}?`;
      if (window.confirm(`${replacement}\n\n${JSON.stringify(result.proposal.value)}`)) {
        await onAccept(result.proposal.value);
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not discover this value.");
      if (await isAiOperationUnavailable("historical_field_discovery")) {
        openSettingsFor("ai", "candidatures");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ai-disclosure" role="dialog" aria-label="Historical Source discovery">
      <div>
        <p className="eyebrow">Optional AI assistance</p>
        <h4>Discover {field.definition.label} from Sources</h4>
        <p>Select one or more retained Sources. AAAAT sends only the Sources you select here.</p>
      </div>

      {sources === null ? (
        <p>Loading retained Sources…</p>
      ) : sources.length === 0 ? (
        <p>Retain a Source before asking AI to rediscover information.</p>
      ) : (
        <fieldset>
          <legend>Sources to use</legend>
          {sources.map((source) => (
            <label key={source.id} className="checkbox-row">
              <input
                type="checkbox"
                checked={selectedSourceIds.includes(source.id)}
                disabled={busy}
                onChange={(event) => toggleSource(source.id, event.target.checked)}
              />
              {source.title || source.kind.replaceAll("_", " ")}
            </label>
          ))}
        </fieldset>
      )}

      {selectedSources.length > 0 ? (
        <details open>
          <summary>Selected Source material to be disclosed</summary>
          {selectedSources.map((source) => (
            <article key={source.id}>
              <h5>{source.title || "Untitled Source"}</h5>
              {source.url ? <p>{source.url}</p> : null}
              {source.sourceText ? <pre>{source.sourceText}</pre> : <p>No retained text.</p>}
            </article>
          ))}
        </details>
      ) : null}

      <div className="form-actions">
        <button
          type="button"
          disabled={busy || selectedSourceIds.length === 0}
          onClick={() => void discover()}
        >
          {busy ? "Discovering…" : "Send selected Sources to AI"}
        </button>
        <button type="button" className="secondary-button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
      </div>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </section>
  );
}
