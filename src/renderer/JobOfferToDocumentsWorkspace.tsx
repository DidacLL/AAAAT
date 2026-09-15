import { useEffect, useState, type FormEvent } from "react";

import { useContextualHandoffs } from "./contextual-handoffs";

export function JobOfferToDocumentsWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { openDocumentFromCandidature } = useContextualHandoffs();
  const [offerText, setOfferText] = useState("");
  const [includeCv, setIncludeCv] = useState(true);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty = offerText.length > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  const start = async (event: FormEvent) => {
    event.preventDefault();
    const sourceText = offerText.trim();
    if (!sourceText || (!includeCv && !includeCoverLetter) || busy) return;

    setBusy(true);
    setError(null);
    let candidatureId: string | null = null;
    const documentIds: string[] = [];

    try {
      const candidature = await window.aaaat.candidatures.create({
        source: {
          kind: "job_posting",
          title: "",
          url: "",
          sourceText,
        },
        values: [],
      });
      candidatureId = candidature.id;

      if (includeCv) {
        const cv = await window.aaaat.documents.create({
          kind: "cv",
          title: "Application CV",
          variantId: null,
          engine: "pdflatex",
          bodyParagraphs: [],
        });
        documentIds.push(cv.id);
      }

      if (includeCoverLetter) {
        const letter = await window.aaaat.documents.create({
          kind: "cover_letter",
          title: "Application cover letter",
          variantId: null,
          engine: "pdflatex",
          bodyParagraphs: [],
        });
        documentIds.push(letter.id);
      }

      await window.aaaat.candidatures.setDocuments({
        candidatureId: candidature.id,
        documentIds,
      });

      setOfferText("");
      onDirtyChange?.(false);
      openDocumentFromCandidature(candidature.id, documentIds[0]);
    } catch (reason) {
      if (candidatureId && documentIds.length > 0) {
        await window.aaaat.candidatures
          .setDocuments({ candidatureId, documentIds })
          .catch(() => undefined);
      }
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not start document work from this offer.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="job-offer-start" aria-label="Start from a job offer">
      <div className="job-offer-dossier-heading">
        <p className="eyebrow">Application desk</p>
        <h1>Turn a job offer into application documents.</h1>
        <p>
          Paste the offer once. AAAAT keeps the original Source, creates the underlying application context,
          and opens the CV or cover letter work directly. You do not need to name or file a candidature first.
        </p>
      </div>

      <form className="job-offer-dossier" onSubmit={(event) => void start(event)}>
        <label className="job-offer-paper">
          <span>Job offer</span>
          <textarea
            autoFocus
            rows={16}
            maxLength={50000}
            value={offerText}
            disabled={busy}
            onChange={(event) => setOfferText(event.target.value)}
            placeholder="Paste the job posting, recruiter message, copied page or useful fragments here…"
          />
        </label>

        <fieldset className="job-offer-output-choice">
          <legend>What do you want to make?</legend>
          <label>
            <input
              type="checkbox"
              checked={includeCv}
              disabled={busy}
              onChange={(event) => setIncludeCv(event.target.checked)}
            />
            <span><strong>Tailored CV</strong><small>Use your professional information in this offer context.</small></span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeCoverLetter}
              disabled={busy}
              onChange={(event) => setIncludeCoverLetter(event.target.checked)}
            />
            <span><strong>Cover letter</strong><small>Draft and refine a letter beside the retained offer.</small></span>
          </label>
        </fieldset>

        <div className="job-offer-start-actions">
          <button
            className="primary-action"
            type="submit"
            disabled={busy || offerText.trim().length === 0 || (!includeCv && !includeCoverLetter)}
          >
            {busy ? "Preparing application work…" : "Start application documents"}
          </button>
          <p>AI is optional. The offer and document project stay editable and locally owned.</p>
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
