import { useEffect, useState } from "react";

import type { CandidatureOpportunityResearchAccess } from "../shared/candidature-opportunity-research-access-contracts";

export function CandidatureOpportunityResearchAccessPanel({
  candidatureId,
  contextDirty,
}: {
  readonly candidatureId: string;
  readonly contextDirty: boolean;
}) {
  const [access, setAccess] = useState<CandidatureOpportunityResearchAccess | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatureOpportunityResearchAccess
      .current(candidatureId)
      .then((current) => {
        if (active) setAccess(current);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load the external opportunity-research access state.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  useEffect(() => {
    if (!contextDirty || !access?.allowed) return;
    let active = true;
    void window.aaaat.candidatureOpportunityResearchAccess
      .update({ candidatureId, allowed: false })
      .then((saved) => {
        if (!active) return;
        setAccess(saved);
        setMessage(
          "External opportunity-research access was revoked because the task context has unsaved edits.",
        );
      })
      .catch(() => {
        if (active) {
          setError("AAAAT could not revoke external opportunity-research access after edits changed.");
        }
      });
    return () => {
      active = false;
    };
  }, [access?.allowed, candidatureId, contextDirty]);

  const update = async (allowed: boolean) => {
    if (allowed && contextDirty) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await window.aaaat.candidatureOpportunityResearchAccess.update({
        candidatureId,
        allowed,
      });
      setAccess(saved);
      setMessage(
        allowed
          ? "This candidature is available to the bounded external opportunity-research task. Selecting another candidature for this task will replace it."
          : "External opportunity-research access for this candidature was revoked.",
      );
    } catch {
      setError("AAAAT could not change external opportunity-research access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="manual-source-warning" aria-label="External opportunity research">
      <h3>External opportunity research</h3>
      <p>
        Use this candidature in your configured external AI through a bounded task. AAAAT shares only
        retained information from this candidature that is allowed for AI context, using local
        placeholders where configured. It does not expose Sources, other candidatures, your professional
        history, Career preferences, documents, local IDs, or workspace paths through this task.
      </p>
      <p>
        The external AI host remains outside AAAAT&apos;s local renderer boundary. Returned research or
        conversation material can be retained only through the task&apos;s Source-only operation.
      </p>
      {contextDirty ? (
        <p className="compact-help">
          Finish or discard unsaved candidature-information/privacy edits before enabling this task, so
          the external assistant cannot receive older saved context while newer edits are visible.
        </p>
      ) : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      {access ? (
        <button
          type="button"
          className={access.allowed ? undefined : "compact-secondary"}
          disabled={saving || (!access.allowed && contextDirty)}
          onClick={() => void update(!access.allowed)}
        >
          {saving
            ? "Saving…"
            : access.allowed
              ? "Revoke external opportunity research"
              : "Allow external opportunity research for this candidature"}
        </button>
      ) : (
        <p>Loading external task access…</p>
      )}
    </section>
  );
}
