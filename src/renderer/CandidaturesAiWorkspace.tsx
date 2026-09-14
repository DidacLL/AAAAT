import { useEffect, useState } from "react";

import type { JobExtractionRequest } from "../shared/ai-contracts";
import { CandidatureManualEntryPanel } from "./CandidatureManualEntryPanel";
import { CandidaturesWorkspace } from "./CandidaturesWorkspace";
import "./candidature-capture.css";
import { JobExtractionPanel } from "./JobExtractionPanel";

type CreationMode = "idle" | "raw" | "manual";
type PostPasteMode = "choose" | "ai" | "manual";

export function CandidaturesAiWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [revision, setRevision] = useState(0);
  const [candidatureDirty, setCandidatureDirty] = useState(false);
  const [extractionDirty, setExtractionDirty] = useState(false);
  const [manualEntryDirty, setManualEntryDirty] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>("idle");
  const [captureText, setCaptureText] = useState("");
  const [captureSaving, setCaptureSaving] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [savedSource, setSavedSource] = useState<{
    candidatureId: string;
    source: JobExtractionRequest;
  } | null>(null);
  const [postPasteMode, setPostPasteMode] = useState<PostPasteMode>("choose");
  const [aiExtractionAvailable, setAiExtractionAvailable] = useState<boolean | null>(null);

  const captureDirty = creationMode === "raw" && captureText.length > 0;
  const canSaveCapture = captureText.trim().length > 0;

  useEffect(() => {
    onDirtyChange?.(
      candidatureDirty || extractionDirty || manualEntryDirty || captureDirty,
    );
    return () => onDirtyChange?.(false);
  }, [candidatureDirty, captureDirty, extractionDirty, manualEntryDirty, onDirtyChange]);

  useEffect(() => {
    if (!savedSource) return;
    let active = true;
    void window.aaaat.aiConnections
      .list()
      .then((connections) => {
        if (!active) return;
        setAiExtractionAvailable(
          connections.some(
            (connection) =>
              connection.validatedOperations.includes("job_extraction") &&
              (connection.defaultForOperations.includes("job_extraction") || connection.isDefault),
          ),
        );
      })
      .catch(() => {
        if (active) setAiExtractionAvailable(false);
      });
    return () => {
      active = false;
    };
  }, [savedSource]);

  const resetRawCapture = () => {
    setCreationMode("idle");
    setCaptureText("");
    setCaptureError(null);
  };

  const cancelRawCapture = () => {
    if (captureDirty && !window.confirm("Discard this unsaved candidature capture?")) return;
    resetRawCapture();
  };

  const openCreation = (mode: Exclude<CreationMode, "idle">) => {
    if (
      candidatureDirty &&
      !window.confirm("Discard unsaved candidature edits and start a new candidature?")
    ) {
      return;
    }
    setSavedSource(null);
    setAiExtractionAvailable(null);
    setPostPasteMode("choose");
    setCreationMode(mode);
    setCaptureError(null);
  };

  const saveCapture = async () => {
    if (!canSaveCapture || captureSaving) return;

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
      setCaptureText("");
      setCreationMode("idle");
      setAiExtractionAvailable(null);
      setSavedSource({
        candidatureId: created.id,
        source: {
          sourceTitle: "",
          sourceUrl: "",
          sourceText,
        },
      });
      setPostPasteMode("choose");
      setRevision((current) => current + 1);
    } catch (reason) {
      setCaptureError(
        reason instanceof Error ? reason.message : "AAAAT could not save this candidature.",
      );
    } finally {
      setCaptureSaving(false);
    }
  };

  const finishPostPaste = () => {
    setSavedSource(null);
    setAiExtractionAvailable(null);
    setPostPasteMode("choose");
    setExtractionDirty(false);
    setManualEntryDirty(false);
    setRevision((current) => current + 1);
  };

  if (creationMode === "manual") {
    return (
      <div className="candidature-capture-owner candidature-capture-active">
        <CandidatureManualEntryPanel
          title="Enter candidature details"
          onDone={() => {
            setCreationMode("idle");
            setManualEntryDirty(false);
            setRevision((current) => current + 1);
          }}
          onChanged={() => setRevision((current) => current + 1)}
          onDirtyChange={setManualEntryDirty}
        />
      </div>
    );
  }

  if (creationMode === "raw") {
    return (
      <div className="candidature-capture-owner candidature-capture-active">
        <section className="candidature-capture-panel" aria-label="New candidature raw capture">
          <div>
            <p className="eyebrow">New candidature</p>
            <h2>Paste an offer, message or notes</h2>
            <p>Paste whatever you have. Saving it is enough; you can add details later.</p>
          </div>
          <label className="candidature-capture-material">
            Pasted material
            <textarea
              autoFocus
              rows={12}
              value={captureText}
              maxLength={50000}
              disabled={captureSaving}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Paste the offer, recruiter message, copied page or notes here."
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
              onClick={cancelRawCapture}
            >
              Cancel
            </button>
          </div>
          {captureError ? <p className="error-message" role="alert">{captureError}</p> : null}
        </section>
      </div>
    );
  }

  if (savedSource) {
    if (postPasteMode === "manual") {
      return (
        <div className="candidature-capture-owner candidature-capture-active">
          <CandidatureManualEntryPanel
            candidatureId={savedSource.candidatureId}
            sourceText={savedSource.source.sourceText}
            title="Add details from the pasted text"
            onDone={finishPostPaste}
            onChanged={() => setRevision((current) => current + 1)}
            onDirtyChange={setManualEntryDirty}
          />
        </div>
      );
    }

    if (postPasteMode === "ai") {
      return (
        <div className="candidature-capture-owner candidature-capture-active">
          <div className="candidature-context-actions">
            <button type="button" className="compact-secondary" onClick={() => setPostPasteMode("choose")}>
              Back
            </button>
          </div>
          <JobExtractionPanel
            candidatureId={savedSource.candidatureId}
            source={savedSource.source}
            onAccepted={() => setRevision((current) => current + 1)}
            onDismiss={() => setPostPasteMode("choose")}
            onDirtyChange={setExtractionDirty}
          />
        </div>
      );
    }

    return (
      <div className="candidature-capture-owner candidature-capture-active">
        <section className="post-paste-choice" aria-label="Raw candidature saved">
          <div>
            <p className="eyebrow">Saved</p>
            <h2>Add details now?</h2>
            <p>Your pasted material is already kept. You can also return to candidatures now.</p>
          </div>
          <pre className="post-paste-source-preview">{savedSource.source.sourceText}</pre>
          <div className="post-paste-actions">
            <button
              type="button"
              disabled={aiExtractionAvailable !== true}
              onClick={() => setPostPasteMode("ai")}
            >
              Send to AI
            </button>
            <button type="button" onClick={() => setPostPasteMode("manual")}>
              Add details myself
            </button>
          </div>
          {aiExtractionAvailable === false ? (
            <p className="compact-help">AI extraction is not configured. Manual entry remains available.</p>
          ) : aiExtractionAvailable === null ? (
            <p className="compact-help">Checking AI availability…</p>
          ) : null}
          <button type="button" className="compact-secondary" onClick={finishPostPaste}>
            Back to candidatures
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="candidature-capture-owner">
      <div className="candidature-capture-actions" aria-label="Create candidature">
        <span className="candidature-new-label">New candidature</span>
        <button type="button" onClick={() => openCreation("manual")}>
          Enter details
        </button>
        <button type="button" onClick={() => openCreation("raw")}>
          Paste text
        </button>
      </div>

      <CandidaturesWorkspace key={revision} onDirtyChange={setCandidatureDirty} />
    </div>
  );
}
