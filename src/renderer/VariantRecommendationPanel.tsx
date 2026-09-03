import { useState } from "react";

import type { VariantRecommendationResult } from "../shared/ai-contracts";
import type { CandidatureRecord } from "../shared/contracts";

interface Props { readonly record: CandidatureRecord; }

export function VariantRecommendationPanel({ record }: Props) {
  const [result, setResult] = useState<VariantRecommendationResult | null>(null);
  const [variantName, setVariantName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recommend = async () => {
    setBusy(true);
    setError(null);
    try {
      const [recommendation, profile] = await Promise.all([
        window.aaaat.ai.recommendVariant({ candidatureId: record.id }),
        window.aaaat.profile.current(),
      ]);
      setResult(recommendation);
      setVariantName(
        profile.variants.find((variant) => variant.id === recommendation.variantId)?.name ??
          "Existing profile variant",
      );
    } catch (reason) {
      setResult(null);
      setVariantName("");
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not recommend a profile variant.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="selected-concept-definition" aria-label="AI profile variant recommendation">
      <p className="eyebrow">Optional local AI</p>
      <h4>Profile variant recommendation</h4>
      <p>
        Choose among variants you already created using only this saved opportunity and variant
        names, focus, tags, and preferred language. This does not change your profile.
      </p>
      <button type="button" disabled={busy} onClick={() => void recommend()}>
        {busy ? "Recommending…" : "Recommend existing variant"}
      </button>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {result ? (
        <div>
          <p><strong>{variantName}</strong></p>
          <p>{result.rationale}</p>
        </div>
      ) : null}
    </section>
  );
}
