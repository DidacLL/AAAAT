import { useEffect, useState, type FormEvent } from "react";

import type { DocumentRecord } from "../shared/contracts";
import { maybeStartApplicationDocumentPreparation } from "./application-document-preparation";
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
    const createdDocuments: DocumentRecord[] = [];

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
        createdDocuments.push(
          await window.aaaat.documents.create({
            kind: "cv",
            title: "Application CV",
            variantId: null,
            engine: "pdflatex",
            bodyParagraphs: [],
          }),
        );
      }

      if (includeCoverLetter) {
        createdDocuments.push(
          await window.aaaat.documents.create({
            kind: "cover_letter",
            title: "Application cover letter",
            variantId: null,
            engine: "pdflatex",
            bodyParagraphs: [],
          }),
        );
      }

      const documentIds = createdDocuments.map((document) => document.id);
      await window.aaaat.candidatures.setDocuments({
        candidatureId: candidature.id,
        documentIds,
      });

      await maybeStartApplicationDocumentPreparation({
        candidatureId: candidature.id,
        sourceText,
        documents: createdDocuments,
      }).catch(() => false);

      setOfferText("");
      onDirtyChange?.(false);
      openDocumentFromCandidature(candidature.id, documentIds[0]);
    } catch (reason) {
      if (candidatureId && createdDocuments.length > 0) {
        await window.aaaat.candidatures
          .setDocuments({
            candidatureId,
            documentIds: createdDocuments.map((document) => document.id),
          })
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
          Paste the offer once. AAAAT retains the original Source, creates the application context,
          and opens the document work directly. You do not need to name or file an application first.
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
            <span>
              <strong>Tailored CV</strong>
              <small>Use the strongest relevant evidence from your saved professional information.</small>
            </span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={includeCoverLetter}
              disabled={busy}
              onChange={(event) => setIncludeCoverLetter(event.target.checked)}
            />
            <span>
              <strong>Cover letter</strong>
              <small>Start with a useful draft grounded in the offer and your retained evidence.</small>
            </span>
          </label>
        </fieldset>

        <div className="job-offer-start-actions">
          <button
            className="primary-action"
            type="submit"
            disabled={busy || offerText.trim().length === 0 || (!includeCv && !includeCoverLetter)}
          >
            {busy ? "Creating application documents…" : "Start application documents"}
          </button>
          <p>
            If validated AI routes are available, AAAAT starts the slow preparation in the background automatically.
            Without AI, both documents still open as ordinary editable local work.
          </p>
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </form>
    </section>
  );
}
