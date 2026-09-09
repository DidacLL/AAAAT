import { useState } from "react";

import type {
  OpportunityReviewPreview,
  OpportunityReviewResult,
  PrivacyMode,
} from "../shared/ai-contracts";
import type { CandidatureRecord } from "../shared/contracts";
import { isAiOperationUnavailable } from "./ai-route-status";
import { useContextualHandoffs } from "./contextual-handoffs";

interface Props {
  readonly record: CandidatureRecord;
}

function isLocalConnection(endpoint: string): boolean {
  const hostname = new URL(endpoint).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

export function OpportunityReviewPanel({ record }: Props) {
  const { openSettingsFor } = useContextualHandoffs();
  const [identityPrivacy, setIdentityPrivacy] = useState<PrivacyMode>("token");
  const [contactPrivacy, setContactPrivacy] = useState<PrivacyMode>("token");
  const [preview, setPreview] = useState<OpportunityReviewPreview | null>(null);
  const [result, setResult] = useState<OpportunityReviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSettingsSuggested, setAiSettingsSuggested] = useState(false);

  const request = { candidatureId: record.id, identityPrivacy, contactPrivacy } as const;

  const privacyChanged = (field: "identity" | "contact", value: PrivacyMode) => {
    if (field === "identity") setIdentityPrivacy(value);
    else setContactPrivacy(value);
    setPreview(null);
    setResult(null);
    setAiSettingsSuggested(false);
  };

  const buildPreview = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setAiSettingsSuggested(false);
    try {
      setPreview(await window.aaaat.ai.previewOpportunityReview(request));
    } catch (reason) {
      setPreview(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not prepare the AI opportunity review.",
      );
      setAiSettingsSuggested(await isAiOperationUnavailable("opportunity_review"));
    } finally {
      setBusy(false);
    }
  };

  const assess = async () => {
    setBusy(true);
    setError(null);
    setAiSettingsSuggested(false);
    try {
      setResult(await window.aaaat.ai.reviewOpportunity(request));
    } catch (reason) {
      setResult(null);
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not complete the AI opportunity review.",
      );
      setAiSettingsSuggested(await isAiOperationUnavailable("opportunity_review"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="focus-concepts" aria-label="AI opportunity review">
      <div>
        <p className="eyebrow">Optional AI assistance</p>
        <h4>Opportunity review</h4>
        <p>
          AAAAT builds a read-only context from the saved candidature snapshot and selected
          professional information. Unsaved candidature edits are not included. The operation
          does not change candidature, professional information, or document data.
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
        {busy && !preview ? "Preparing…" : "Preview what AI will receive"}
      </button>

      {error ? (
        <div>
          <p className="error-message" role="alert">{error}</p>
          {aiSettingsSuggested ? (
            <button
              className="compact-secondary"
              type="button"
              onClick={() => openSettingsFor("ai", "candidatures")}
            >
              Open AI connections settings
            </button>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <section className="selected-concept-definition">
          <h4>Projected context</h4>
          <p>
            AI connection: {preview.connection.name} ·{" "}
            {isLocalConnection(preview.connection.endpoint) ? "local on this computer" : "remote HTTPS"}
          </p>
          <pre>{JSON.stringify(preview.projectedContext, null, 2)}</pre>
          <button type="button" disabled={busy} onClick={() => void assess()}>
            {busy ? "Reviewing…" : "Ask AI for an opportunity review"}
          </button>
        </section>
      ) : null}

      {result ? (
        <article className="selected-concept-definition" aria-label="Opportunity review result">
          <h4>Opportunity review</h4>
          <p>{result.summary}</p>
          <h4>Relevant evidence</h4>
          <ul>{result.relevantEvidence.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Uncertainties</h4>
          <ul>{result.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul>
          <h4>Questions</h4>
          <ul>{result.questions.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      ) : null}
    </section>
  );
}
