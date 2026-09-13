import { useEffect, useState } from "react";

import type { JobExtractionRequest } from "../shared/ai-contracts";
import { CandidatureFieldDefinitionsPanel } from "./CandidatureFieldDefinitionsPanel";
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
  const [fieldDefinitionsDirty, setFieldDefinitionsDirty] = useState(false);
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
      candidatureDirty ||
        extractionDirty ||
        manualEntryDirty ||
        fieldDefinitionsDirty ||
        captureDirty,
    );
    return () => onDirtyChange?.(false);
  }, [
    candidatureDirty,
    captureDirty,
    extractionDirty,
    fieldDefinitionsDirty,
    manualEntryDirty,
    onDirtyChange,
  ]);

  useEffect(() => {
    if (!savedSource) {
      setAiExtractionAvailable(null);
      return;
    }
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
    if (candidatureDirty && !window.confirm("Discard unsaved candidature edits and start a new candidature?")) {
      return;
    }
    setSavedSource(null);
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
    setPostPasteMode("choose");
    setExtractionDirty(false);
    setManualEntryDirty(false);
    setRevision((current) => current + 1);
  };

  if (creationMode === "manual") {
    return (
      <div className="candidature-capture-owner candidature-capture-active">
        <CandidatureManualEntryPanel
          title="Fill candidature fields"
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
            <h2>Paste whatever you have.</h2>
            <p>Raw offer text, a recruiter message, a URL, fragments, or notes are enough.</p>
          </div>
          <label className="candidature-capture-material">
            Candidature material
            <textarea
              autoFocus
              rows={12}
              value={captureText}
              maxLength={50000}
              disabled={captureSaving}
              onChange={(event) => setCaptureText(event.target.value)}
              placeholder="Paste the material here."
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              disabled={!canSaveCapture || captureSaving}
              onClick={() => void saveCapture()}
            >
              {captureSaving ? "Saving…" : "Keep raw material"}
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
              Back to choices
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
            <p className="eyebrow">Raw material saved</p>
            <h2>How do you want to fill the candidature?</h2>
            <p>The original material is already retained. These are optional next actions.</p>
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
              Fill candidature yourself
            </button>
          </div>
          {aiExtractionAvailable === false ? (
            <p className="compact-help">No extraction-capable AI connection is configured. Manual filling remains fully available.</p>
          ) : aiExtractionAvailable === null ? (
            <p className="compact-help">Checking configured AI connections…</p>
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
      <div className="candidature-capture-actions" aria-label="New candidature options">
        <button type="button" onClick={() => openCreation("manual")}>
          New candidature — fill fields
        </button>
        <button type="button" onClick={() => openCreation("raw")}>
          New candidature — paste raw material
        </button>
      </div>

      <CandidatureFieldDefinitionsPanel
        onChanged={() => setRevision((current) => current + 1)}
        onDirtyChange={setFieldDefinitionsDirty}
      />

      <CandidaturesWorkspace key={revision} onDirtyChange={setCandidatureDirty} />
    </div>
  );
}
