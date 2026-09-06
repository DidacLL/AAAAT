import { useEffect, useMemo, useState } from "react";

import type {
  CandidatureComparisonPreview,
  CandidatureComparisonResult,
} from "../shared/candidature-comparison-contracts";
import type { CandidatureRecord, CandidatureRuntimeValue } from "../shared/contracts";

function valueText(value: CandidatureRuntimeValue): string {
  return Array.isArray(value) ? value.map(String).join(", ") : String(value);
}

export function CandidatureComparisonPanel() {
  const [candidatures, setCandidatures] = useState<CandidatureRecord[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<CandidatureComparisonPreview | null>(null);
  const [result, setResult] = useState<CandidatureComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.candidatures
      .list()
      .then((records) => {
        if (active) setCandidatures(records);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidatures for comparison.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const labels = useMemo(
    () => new Map(candidatures.map((candidature) => [candidature.id, candidature.label])),
    [candidatures],
  );

  const changeSelection = (candidatureId: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (!checked) return current.filter((id) => id !== candidatureId);
      if (current.includes(candidatureId) || current.length >= 5) return current;
      return [...current, candidatureId];
    });
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const requestPreview = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      setPreview(
        await window.aaaat.candidatureComparison.preview({ candidatureIds: selectedIds }),
      );
    } catch (reason) {
      setPreview(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not preview this candidature comparison.",
      );
    } finally {
      setRunning(false);
    }
  };

  const runComparison = async () => {
    if (!preview) return;
    setRunning(true);
    setError(null);
    try {
      setResult(
        await window.aaaat.candidatureComparison.run({ candidatureIds: selectedIds }),
      );
    } catch (reason) {
      setResult(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not compare the selected candidatures.",
      );
    } finally {
      setRunning(false);
    }
  };

  if (loading) return <p>Loading candidatures for comparison…</p>;

  return (
    <section className="profile-workspace" aria-label="AI candidature comparison">
      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Optional AI</p>
            <h2>Compare selected candidatures</h2>
          </div>
        </div>
        <p>
          Select 2–5 candidatures. Preview first to see the exact field values that AAAAT will
          disclose. Sources, profile data, documents, ToDos and candidature history are not part of
          this operation.
        </p>
        {candidatures.length === 0 ? (
          <p>Create at least two candidatures before requesting a comparison.</p>
        ) : (
          <div className="document-list">
            {candidatures.map((candidature) => {
              const checked = selectedIds.includes(candidature.id);
              return (
                <label key={candidature.id} className="document-card">
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selectedIds.length >= 5}
                    onChange={(event) => changeSelection(candidature.id, event.target.checked)}
                  />
                  <span>
                    {candidature.label}
                    {candidature.archived ? " · archived" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        )}
        <p>{selectedIds.length} selected.</p>
        <button
          type="button"
          className="compact-secondary"
          disabled={running || selectedIds.length < 2 || selectedIds.length > 5}
          onClick={() => void requestPreview()}
        >
          {running ? "Working…" : "Preview disclosure"}
        </button>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </div>

      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Disclosure</p>
            <h2>Provider context</h2>
          </div>
        </div>
        {preview ? (
          <>
            <p>
              Connection: <strong>{preview.connection.name}</strong>. Local candidature labels below
              identify your selection; the provider receives only the generic provider label and the
              listed AI-visible information.
            </p>
            <div className="document-list">
              {preview.entries.map((entry) => (
                <article className="document-card" key={entry.candidatureId}>
                  <div>
                    <h3>{entry.localLabel}</h3>
                    <p>Provider label: {entry.providerLabel}</p>
                    {entry.information.length === 0 ? (
                      <p>No stored fields are AI-visible for this candidature.</p>
                    ) : (
                      <ul>
                        {entry.information.map((information, index) => (
                          <li key={`${information.label}-${index}`}>
                            <strong>{information.label}:</strong> {valueText(information.value)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </article>
              ))}
            </div>
            <button
              type="button"
              className="primary-action"
              disabled={running}
              onClick={() => void runComparison()}
            >
              {running ? "Comparing…" : "Compare these candidatures"}
            </button>
          </>
        ) : (
          <p>Preview disclosure before running the comparison.</p>
        )}
      </div>

      {result ? (
        <div className="profile-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Comparison</p>
              <h2>Read-only considerations</h2>
            </div>
          </div>
          <p>AAAAT does not rank these opportunities or choose one for you.</p>
          <div className="document-list">
            {result.analyses.map((analysis) => (
              <article className="document-card" key={analysis.candidatureId}>
                <div>
                  <h3>{labels.get(analysis.candidatureId) ?? "Selected candidature"}</h3>
                  <h4>Strengths</h4>
                  {analysis.strengths.length ? (
                    <ul>{analysis.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : <p>None returned.</p>}
                  <h4>Concerns</h4>
                  {analysis.concerns.length ? (
                    <ul>{analysis.concerns.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : <p>None returned.</p>}
                  <h4>Questions</h4>
                  {analysis.questions.length ? (
                    <ul>{analysis.questions.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : <p>None returned.</p>}
                </div>
              </article>
            ))}
          </div>
          <h3>Cross-cutting considerations</h3>
          {result.considerations.length ? (
            <ul>{result.considerations.map((item) => <li key={item}>{item}</li>)}</ul>
          ) : <p>None returned.</p>}
        </div>
      ) : null}
    </section>
  );
}
