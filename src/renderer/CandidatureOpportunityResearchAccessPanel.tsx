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
  const [portableBusy, setPortableBusy] = useState<"export" | "import" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    let active = true;
    void api
      .current(candidatureId)
      .then((current) => {
        if (active) setAccess(current);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load external AI access for this application.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  useEffect(() => {
    if (!contextDirty || !access?.allowed) return;
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    let active = true;
    void api
      .update({ candidatureId, allowed: false })
      .then((saved) => {
        if (!active) return;
        setAccess(saved);
        setMessage("External AI access was turned off because this application has unsaved edits.");
      })
      .catch(() => {
        if (active) {
          setError("AAAAT could not turn off external AI access after the application changed.");
        }
      });
    return () => {
      active = false;
    };
  }, [access?.allowed, candidatureId, contextDirty]);

  const update = async (allowed: boolean) => {
    if (allowed && contextDirty) return;
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const saved = await api.update({ candidatureId, allowed });
      setAccess(saved);
      setMessage(
        allowed
          ? "External AI can now work with this application. Choosing another application will switch the selection."
          : "External AI access is off for this application.",
      );
    } catch {
      setError("AAAAT could not change external AI access for this application.");
    } finally {
      setSaving(false);
    }
  };

  const exportTask = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !access?.allowed) return;
    setPortableBusy("export");
    setMessage(null);
    setError(null);
    try {
      const result = await api.exportTask();
      if (result === "exported") {
        setMessage("Task exported. Give the file to the AI you want to work with.");
      }
    } catch {
      setError("AAAAT could not export the task.");
    } finally {
      setPortableBusy(null);
    }
  };

  const importResult = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !access?.allowed) return;
    setPortableBusy("import");
    setMessage(null);
    setError(null);
    try {
      const result = await api.importResult();
      if (result === "imported") {
        setMessage("Result saved as a Source on this application.");
      }
    } catch {
      setError("AAAAT could not import the result.");
    } finally {
      setPortableBusy(null);
    }
  };

  const busy = saving || portableBusy !== null;

  return (
    <section className="manual-source-warning" aria-label="External opportunity research">
      <h3>External opportunity research</h3>
      <p>
        Let another AI work with this application. It can use the application fields you allow for AI
        and save returned research as a Source.
      </p>
      {access?.allowed ? (
        <p className="compact-help">
          Use a connected local AI directly, or export a task file for an AI running elsewhere and import
          its returned Markdown or text result here.
        </p>
      ) : null}
      {contextDirty ? (
        <p className="compact-help">
          Save or discard your application edits before enabling external AI.
        </p>
      ) : null}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      {access ? (
        <div className="button-row">
          <button
            type="button"
            className={access.allowed ? undefined : "compact-secondary"}
            disabled={busy || (!access.allowed && contextDirty)}
            onClick={() => void update(!access.allowed)}
          >
            {saving
              ? "Saving…"
              : access.allowed
                ? "Stop external AI access"
                : "Use this application with external AI"}
          </button>
          {access.allowed ? (
            <>
              <button
                type="button"
                className="compact-secondary"
                disabled={busy}
                onClick={() => void exportTask()}
              >
                {portableBusy === "export" ? "Exporting…" : "Export task…"}
              </button>
              <button
                type="button"
                className="compact-secondary"
                disabled={busy}
                onClick={() => void importResult()}
              >
                {portableBusy === "import" ? "Importing…" : "Import result…"}
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <p>Loading external AI access…</p>
      )}
    </section>
  );
}
