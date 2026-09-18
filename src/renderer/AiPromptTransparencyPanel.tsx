import { useEffect, useState } from "react";

import type { AiPromptDisclosure } from "../shared/ai-prompt-contracts";

export function AiPromptTransparencyPanel() {
  const [items, setItems] = useState<AiPromptDisclosure[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const promptApi = (
    window.aaaat as typeof window.aaaat & { aiPrompts?: typeof window.aaaat.aiPrompts }
  ).aiPrompts;

  useEffect(() => {
    if (!promptApi) return undefined;
    let active = true;
    void promptApi
      .list()
      .then((next) => {
        if (!active) return;
        setItems(next);
        setDrafts(Object.fromEntries(next.map((item) => [item.operation, item.userGuidance])));
      })
      .catch((reason) => {
        if (active) {
          setError(
            reason instanceof Error ? reason.message : "AAAAT could not read AI instructions.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [promptApi]);

  const apply = (next: AiPromptDisclosure[]) => {
    setItems(next);
    setDrafts(Object.fromEntries(next.map((item) => [item.operation, item.userGuidance])));
  };

  if (!promptApi) return null;

  return (
    <section className="profile-column ai-prompt-transparency" aria-label="AI guidance and prompts">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Behavior</p>
          <h2>AI guidance and prompts</h2>
        </div>
      </div>
      <p className="compact-help">
        This is the central place to see what each AI action receives and add your own guidance.
        AAAAT keeps the response contract fixed and validates returned data locally.
      </p>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <div className="document-list">
        {items.map((item) => (
          <article className="document-card" key={item.operation}>
            <h3>{item.label}</h3>
            <p><strong>Context sent:</strong> {item.contextSummary}</p>
            <p><strong>Expected response:</strong> {item.responseExpectation}</p>
            <label>
              Your guidance
              <textarea
                value={drafts[item.operation] ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [item.operation]: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Add preferences for this AI action."
              />
            </label>
            <div className="button-row">
              <button
                type="button"
                className="compact-secondary"
                disabled={busy === item.operation}
                onClick={() => {
                  setBusy(item.operation);
                  setError(null);
                  void promptApi
                    .save({
                      operation: item.operation,
                      guidance: drafts[item.operation] ?? "",
                    })
                    .then(apply)
                    .catch((reason) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "AAAAT could not save AI guidance.",
                      ),
                    )
                    .finally(() => setBusy(null));
                }}
              >
                Save guidance
              </button>
              <button
                type="button"
                className="compact-secondary"
                disabled={busy === item.operation || !item.userGuidance}
                onClick={() => {
                  setBusy(item.operation);
                  setError(null);
                  void promptApi
                    .reset(item.operation)
                    .then(apply)
                    .catch((reason) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "AAAAT could not reset AI guidance.",
                      ),
                    )
                    .finally(() => setBusy(null));
                }}
              >
                Reset to default
              </button>
            </div>
            <details>
              <summary>Effective final instruction</summary>
              <pre className="ai-effective-instruction">{item.effectiveInstruction}</pre>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
