import { useEffect, useState } from "react";

import type { JobExtractionRequest } from "../shared/ai-contracts";
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
  const [captureText, setCaptureText] = useState("");
  const [captureSaving, setCaptureSaving] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [savedSource, setSavedSource] = useState<{
    candidatureId: string;
    source: JobExtractionRequest;
  } | null>(null);

  const captureDirty = captureOpen && captureText.length > 0;
  const canSaveCapture = captureText.trim().length > 0;

  useEffect(() => {
    onDirtyChange?.(candidatureDirty || extractionDirty || captureDirty);
    return () => onDirtyChange?.(false);
  }, [candidatureDirty, captureDirty, extractionDirty, onDirtyChange]);

  const resetCapture = () => {
    setCaptureOpen(false);
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
    const sourceText = captureText.trim();
    try {
      const created = await window.aaaat.candidatures.create({
        source: {
          kind: "other",
          title: "",
          url: "",
          sourceText,
        },
        values: [],
      });
      resetCapture();
      setSavedSource({
        candidatureId: created.id,
        source: {
          sourceTitle: "",
          sourceUrl: "",
          sourceText,
        },
      });
      setRevision((current) => current + 1);
    } catch (reason) {
      setCaptureError(
        reason instanceof Error ? reason.message : "AAAAT could not save this candidature.",
      );
    } finally {
      setCaptureSaving(false);
    }
  };

  return (
    <div className={captureOpen ? "candidature-capture-owner candidature-capture-active" : "candidature-capture-owner"}>
      {captureOpen ? (
        <section className="candidature-capture-panel" aria-label="New candidature capture">
          <div>
            <p className="eyebrow">New candidature</p>
            <h2>Paste whatever you have.</h2>
            <p>Raw offer text, a recruiter message, a URL, fragments, or notes are enough.</p>
          </div>
          <label className="candidature-capture-material">
            Candidature material
            <textarea
              autoFocus
              rows={10}
              value={captureText}
              maxLength={50000}
              disabled={captureSaving}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Paste the material here. You can structure or enrich it later."
            />
          </label>
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
            onClick={() => {
              setSavedSource(null);
              setCaptureOpen(true);
            }}
          >
            New candidature
          </button>
        </div>
      )}

      <CandidaturesWorkspace key={revision} onDirtyChange={setCandidatureDirty} />

      {savedSource !== null ? (
        <JobExtractionPanel
          candidatureId={savedSource.candidatureId}
          source={savedSource.source}
          onAccepted={() => setRevision((current) => current + 1)}
          onDismiss={() => setSavedSource(null)}
          onDirtyChange={setExtractionDirty}
        />
      ) : null}
    </div>
  );
}
