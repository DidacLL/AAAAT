import { useEffect, useState } from "react";

import type { AiPromptDisclosure } from "../shared/ai-prompt-contracts";

export function AiPromptTransparencyPanel({ onDirtyChange }: { readonly onDirtyChange?: (dirty: boolean) => void }) {
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
        setDrafts(Object.fromEntries(next.map((item) => [item.operation, item.instruction])));
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
    setDrafts(Object.fromEntries(next.map((item) => [item.operation, item.instruction])));
  };
  const dirty = items.some((item) => (drafts[item.operation] ?? "") !== item.instruction);

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  if (!promptApi) return null;

  return (
    <section className="profile-column ai-prompt-transparency" aria-label="AI instructions">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Behavior</p>
          <h2>AI instructions</h2>
        </div>
      </div>
      <p className="compact-help">
        Edit the instruction AAAAT sends for each AI action. Changing it can reduce result quality or make responses fail validation; AAAAT still validates returned data locally. Reset restores the shipped default.
      </p>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      <div className="document-list">
        {items.map((item) => (
          <article className="document-card" key={item.operation}>
            <h3>{item.label}</h3>
            <p><strong>Context sent:</strong> {item.contextSummary}</p>
            <p><strong>Expected response:</strong> {item.responseExpectation}</p>
            <label>
              Instruction
              <textarea
                value={drafts[item.operation] ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [item.operation]: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Instruction sent to the model for this AI action."
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
                      instruction: drafts[item.operation] ?? "",
                    })
                    .then(apply)
                    .catch((reason) =>
                      setError(
                        reason instanceof Error
                          ? reason.message
                          : "AAAAT could not save the AI instruction.",
                      ),
                    )
                    .finally(() => setBusy(null));
                }}
              >
                Save instruction
              </button>
              <button
                type="button"
                className="compact-secondary"
                disabled={busy === item.operation || item.isDefault}
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
                          : "AAAAT could not reset the AI instruction.",
                      ),
                    )
                    .finally(() => setBusy(null));
                }}
              >
                Reset to default
              </button>
            </div>
                        <details>
              <summary>Shipped default</summary>
              <pre className="ai-effective-instruction">{item.defaultInstruction}</pre>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
