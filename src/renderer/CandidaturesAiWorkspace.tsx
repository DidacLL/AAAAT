import { useEffect, useState } from "react";

import type { CandidatureInput } from "../shared/contracts";
import { CandidatureComparisonPanel } from "./CandidatureComparisonPanel";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import "./candidature-capture.css";
import { JobExtractionPanel } from "./JobExtractionPanel";

export function CandidaturesAiWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [candidatureDirty, setCandidatureDirty] = useState(false);
  const [extractionDirty, setExtractionDirty] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureTitle, setCaptureTitle] = useState("");
  const [captureUrl, setCaptureUrl] = useState("");
  const [captureText, setCaptureText] = useState("");
  const [captureSaving, setCaptureSaving] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const captureDirty =
    captureOpen &&
    (captureTitle.length > 0 || captureUrl.length > 0 || captureText.length > 0);
  const canSaveCapture = captureUrl.trim().length > 0 || captureText.trim().length > 0;

  useEffect(() => {
    onDirtyChange?.(candidatureDirty || extractionDirty || captureDirty);
    return () => onDirtyChange?.(false);
  }, [candidatureDirty, captureDirty, extractionDirty, onDirtyChange]);

  const resetCapture = () => {
    setCaptureOpen(false);
    setCaptureTitle("");
    setCaptureUrl("");
    setCaptureText("");
    setCaptureError(null);
  };

  const cancelCapture = () => {
    if (captureDirty && !window.confirm("Discard this unsaved candidature capture?")) return;
    resetCapture();
  };

  const saveCapture = async () => {
    if (!canSaveCapture || captureSaving) return;
    if (
      candidatureDirty &&
      !window.confirm("Discard unsaved candidature edits and save this new candidature?")
    ) {
      return;
    }

    setCaptureSaving(true);
    setCaptureError(null);
    const url = captureUrl.trim();
    const sourceText = captureText.trim();
    try {
      await window.aaaat.candidatures.create({
        source: {
          kind: url && !sourceText ? "link" : "other",
          title: captureTitle.trim(),
          url,
          sourceText,
        },
        values: [],
      });
      resetCapture();
      setRevision((current) => current + 1);
    } catch (reason) {
      setCaptureError(
        reason instanceof Error ? reason.message : "AAAAT could not save this candidature.",
      );
    } finally {
      setCaptureSaving(false);
    }
  };

  const createFromProposal = async (input: CandidatureInput): Promise<boolean> => {
    const proceed = window.confirm(
      "Create this candidature and reload the candidature workspace? Unsaved candidature edits or association changes will be discarded.",
    );
    if (!proceed) return false;
    await window.aaaat.candidatures.create(input);
    setRevision((current) => current + 1);
    return true;
  };

  return (
    <div className="candidature-capture-owner">
      {captureOpen ? (
        <section className="candidature-capture-panel" aria-label="New candidature capture">
          <div>
            <p className="eyebrow">New candidature</p>
            <h2>Paste or add whatever you have.</h2>
            <p>
              A recruiter message, raw offer, or URL is enough. You can add structured information later.
            </p>
          </div>
          <div className="candidature-capture-fields">
            <label>
              Short title <span>optional</span>
              <input
                value={captureTitle}
                maxLength={200}
                disabled={captureSaving}
                onChange={(event) => setCaptureTitle(event.target.value)}
                placeholder="Recruiter message"
              />
            </label>
            <label>
              URL
              <input
                type="url"
                value={captureUrl}
                maxLength={2048}
                disabled={captureSaving}
                onChange={(event) => setCaptureUrl(event.target.value)}
                placeholder="https://…"
              />
            </label>
            <label className="candidature-capture-material">
              What you have
              <textarea
                rows={8}
                value={captureText}
                maxLength={50000}
                disabled={captureSaving}
                onChange={(event) => setCaptureText(event.target.value)}
                placeholder="Paste the recruiter message, job offer, application text, or other material here."
              />
            </label>
          </div>
          <div className="button-row">
            <button
              type="button"
              disabled={!canSaveCapture || captureSaving}
              onClick={() => void saveCapture()}
            >
              {captureSaving ? "Saving…" : "Save candidature"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={captureSaving}
              onClick={cancelCapture}
            >
              Cancel
            </button>
          </div>
          {captureError ? <p className="error-message" role="alert">{captureError}</p> : null}
        </section>
      ) : (
        <div className="candidature-capture-action">
          <button
            type="button"
            data-testid="new-candidature-capture"
            onClick={() => setCaptureOpen(true)}
          >
            New candidature
          </button>
        </div>
      )}

      <CandidaturesWorkspace key={revision} onDirtyChange={setCandidatureDirty} />
      <details className="optional-ai-extraction">
        <summary>Optional AI candidature comparison</summary>
        <CandidatureComparisonPanel />
      </details>
      <details className="optional-ai-extraction">
        <summary>Optional AI job extraction</summary>
        <JobExtractionPanel onCreate={createFromProposal} onDirtyChange={setExtractionDirty} />
      </details>
    </div>
  );
}