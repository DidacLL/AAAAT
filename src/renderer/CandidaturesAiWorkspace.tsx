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
          title="Fill fields directly"
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
            <h2>Paste raw material</h2>
            <p>Paste an offer, recruiter message, copied page or notes. Keeping the Source is already enough.</p>
          </div>
          <label className="candidature-capture-material">
            Raw material
            <textarea
              autoFocus
              rows={12}
              value={captureText}
              maxLength={50000}
              disabled={captureSaving}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Paste whatever you have. AAAAT will retain it as the original Source."
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              disabled={!canSaveCapture || captureSaving}
              onClick={() => void saveCapture()}
            >
              {captureSaving ? "Saving…" : "Save Source"}
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
            title="Fill candidature yourself"
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
            <p className="eyebrow">Source saved</p>
            <h2>Continue now, or leave it here</h2>
            <p>The original material is retained. AI and manual filling are optional peer continuations.</p>
          </div>
          <pre className="post-paste-source-preview">{savedSource.source.sourceText}</pre>
          <div className="post-paste-actions" aria-label="Continue from saved Source">
            <button
              type="button"
              disabled={aiExtractionAvailable !== true}
              onClick={() => setPostPasteMode("ai")}
            >
              Send to AI
            </button>
            <button type="button" onClick={() => setPostPasteMode("manual")}>
              Fill candidature yourself
            </button>
          </div>
          {aiExtractionAvailable === false ? (
            <p className="compact-help">AI extraction is not configured. Manual entry remains complete.</p>
          ) : aiExtractionAvailable === null ? (
            <p className="compact-help">Checking AI availability…</p>
          ) : null}
          <button type="button" className="compact-secondary post-paste-done" onClick={finishPostPaste}>
            Done for now
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="candidature-capture-owner">
      <div className="candidature-capture-actions" aria-label="Create candidature">
        <div className="candidature-new-intro">
          <span className="candidature-new-label">New candidature</span>
          <span>Start with what you already have.</span>
        </div>
        <button
          className="candidature-entry-path"
          type="button"
          aria-label="Fill fields directly"
          onClick={() => openCreation("manual")}
        >
          <strong>Fill fields directly</strong>
          <span>Enter the useful details you already know.</span>
        </button>
        <button
          className="candidature-entry-path"
          type="button"
          aria-label="Paste raw material"
          onClick={() => openCreation("raw")}
        >
          <strong>Paste raw material</strong>
          <span>Keep an offer, message, copied page or notes first.</span>
        </button>
      </div>

      <CandidaturesWorkspace key={revision} onDirtyChange={setCandidatureDirty} />
    </div>
  );
}
