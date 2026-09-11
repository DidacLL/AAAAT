import { useState } from "react";

import type {
  CandidatureActivityKind,
  CandidatureActivityRecord,
} from "../shared/candidature-activity-contracts";

interface Props {
  readonly candidatureId: string;
}

const labels: Readonly<Record<CandidatureActivityKind, string>> = {
  created: "Candidature created",
  updated: "Candidature updated",
  source_added: "Source added",
  source_updated: "Source updated",
  source_removed: "Source removed",
  information_set: "Information saved",
  information_cleared: "Information cleared",
  documents_updated: "Application document associations changed",
  concepts_updated: "Concept associations changed",
  artifact_retained: "Application artifact retained",
  external_research_allowed: "External opportunity research access allowed",
  external_research_revoked: "External opportunity research access revoked",
  changed: "Candidature changed",
};

function displayedTime(occurredAt: string): string {
  const parsed = new Date(occurredAt);
  return Number.isNaN(parsed.getTime()) ? occurredAt : parsed.toLocaleString();
}

export function CandidatureActivityPanel({ candidatureId }: Props) {
  const [activity, setActivity] = useState<CandidatureActivityRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (loading || activity !== null) return;
    setLoading(true);
    setError(null);
    try {
      setActivity(await window.aaaat.candidatureActivity.list(candidatureId));
    } catch {
      setError("AAAAT could not load candidature Activity.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <details
      className="focus-secondary-actions"
      onToggle={(event) => {
        if (event.currentTarget.open) void load();
      }}
    >
      <summary>Activity</summary>
      <div className="focus-secondary-content" aria-label="Candidature Activity">
        {loading ? <p className="compact-help">Loading Activity…</p> : null}
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        {!loading && !error && activity?.length === 0 ? (
          <p className="compact-empty">No retained Activity yet.</p>
        ) : null}
        {activity && activity.length > 0 ? (
          <ol className="candidature-activity-list">
            {activity.map((entry, index) => (
              <li key={`${entry.occurredAt}-${entry.kind}-${index}`}>
                <strong>{labels[entry.kind]}</strong>
                <time dateTime={entry.occurredAt}>{displayedTime(entry.occurredAt)}</time>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </details>
  );
}
