import { useEffect, useState } from "react";

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
  tags_updated: "Tag associations changed",
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatureActivity
      .list(candidatureId)
      .then((next) => {
        if (active) setActivity(next);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidature Activity.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  return (
    <div className="focus-secondary-content" aria-label="Candidature Activity">
      {!activity && !error ? <p className="compact-help">Loading Activity…</p> : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {!error && activity?.length === 0 ? (
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
  );
}
