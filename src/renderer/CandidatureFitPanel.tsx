import { useEffect, useState } from "react";

import type {
  FitAssessmentPreview,
  FitAssessmentResult,
  PrivacyMode,
} from "../shared/ai-contracts";
import type { CandidatureRecord } from "../shared/contracts";

interface Props {
  readonly record: CandidatureRecord;
}

export function CandidatureFitPanel({ record }: Props) {
  const [identityPrivacy, setIdentityPrivacy] = useState<PrivacyMode>("token");
  const [contactPrivacy, setContactPrivacy] = useState<PrivacyMode>("token");
  const [preview, setPreview] = useState<FitAssessmentPreview | null>(null);
  const [result, setResult] = useState<FitAssessmentResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(null);
    setResult(null);
    setError(null);
  }, [record.id]);

  const request = { candidatureId: record.id, identityPrivacy, contactPrivacy } as const;

  const privacyChanged = (field: "identity" | "contact", value: PrivacyMode) => {
    if (field === "identity") setIdentityPrivacy(value);
    else setContactPrivacy(value);
    setPreview(null);
    setResult(null);
  };

  const buildPreview = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setPreview(await window.aaaat.ai.previewFit(request));
    } catch (reason) {
      setPreview(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not prepare the AI fit assessment.",
      );
    } finally {
      setBusy(false);
    }
  };

  const assess = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await window.aaaat.ai.assessFit(request));
    } catch (reason) {
      setResult(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not complete the AI fit assessment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="focus-concepts" aria-label="AI fit assessment">
      <div>
        <p className="eyebrow">Optional local AI</p>
        <h4>Fit assessment</h4>
        <p>
          AAAAT builds a read-only context from the saved candidature snapshot and your profile.
          Unsaved candidature edits are not included. The operation does not mutate candidature,
          profile, or document data.
        </p>
      </div>

      <div className="candidature-filters">
        <label>
          Identity fields
          <select
            value={identityPrivacy}
            disabled={busy}
            onChange={(event) => privacyChanged("identity", event.target.value as PrivacyMode)}
          >
            <option value="token">Replace with local tokens</option>
            <option value="omit">Omit</option>
            <option value="expose">Expose</option>
          </select>
        </label>
        <label>
          Contact fields
          <select
            value={contactPrivacy}
            disabled={busy}
            onChange={(event) => privacyChanged("contact", event.target.value as PrivacyMode)}
          >
            <option value="token">Replace with local tokens</option>
            <option value="omit">Omit</option>
            <option value="expose">Expose</option>
          </select>
        </label>
      </div>

      <button type="button" disabled={busy} onClick={() => void buildPreview()}>
        {busy && !preview ? "Preparing…" : "Preview AI context"}
      </button>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      {preview ? (
        <section className="selected-concept-definition">
          <h4>Projected context</h4>
          <p>
            Local provider: {preview.connection.name} · {preview.connection.model} ·{" "}
            <code>{preview.connection.endpoint}</code>
          </p>
          <pre>{JSON.stringify(preview.projectedContext, null, 2)}</pre>
          <button type="button" disabled={busy} onClick={() => void assess()}>
            {busy ? "Assessing…" : "Run local fit assessment"}
          </button>
        </section>
      ) : null}

      {result ? (
        <article className="selected-concept-definition" aria-label="Fit assessment result">
          <h4>{result.fit} fit</h4>
          <p>{result.summary}</p>
          <h4>Strengths</h4>
          <ul>{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Gaps or risks</h4>
          <ul>{result.gaps.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Suggested focus</h4>
          <ul>{result.focus.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      ) : null}
    </section>
  );
}
