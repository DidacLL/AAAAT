import { useEffect, useMemo, useState } from "react";

import type { CandidatureRecord, DocumentRecord } from "../shared/contracts";
import { useContextualHandoffs } from "./contextual-handoffs";

export function CombinedDocumentExportPanel({
  documents,
  disabled,
  onError,
  onNotice,
}: {
  readonly documents: readonly DocumentRecord[];
  readonly disabled: boolean;
  readonly onError: (message: string | null) => void;
  readonly onNotice: (message: string | null) => void;
}) {
  const { documentHandoff } = useContextualHandoffs();
  const candidatureId = documentHandoff?.candidatureId ?? null;
  const [candidatureState, setCandidatureState] = useState<{
    readonly candidatureId: string;
    readonly record: CandidatureRecord | null;
  } | null>(null);
  const candidature =
    candidatureId && candidatureState?.candidatureId === candidatureId
      ? candidatureState.record
      : null;
  const cvs = useMemo(
    () => documents.filter((document) => document.kind === "cv"),
    [documents],
  );
  const coverLetters = useMemo(
    () => documents.filter((document) => document.kind === "cover_letter"),
    [documents],
  );
  const [cvDocumentId, setCvDocumentId] = useState("");
  const [coverLetterDocumentId, setCoverLetterDocumentId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [retaining, setRetaining] = useState(false);
  const selectedCvDocumentId = cvs.some((document) => document.id === cvDocumentId)
    ? cvDocumentId
    : (cvs[0]?.id ?? "");
  const selectedCoverLetterDocumentId = coverLetters.some(
    (document) => document.id === coverLetterDocumentId,
  )
    ? coverLetterDocumentId
    : (coverLetters[0]?.id ?? "");
  const canRetain = Boolean(
    candidature &&
      selectedCvDocumentId &&
      selectedCoverLetterDocumentId &&
      candidature.documentIds.includes(selectedCvDocumentId) &&
      candidature.documentIds.includes(selectedCoverLetterDocumentId),
  );

  useEffect(() => {
    if (!candidatureId) return;
    let active = true;
    void window.aaaat.candidatures
      .list()
      .then((records) => {
        if (!active) return;
        setCandidatureState({
          candidatureId,
          record: records.find((record) => record.id === candidatureId) ?? null,
        });
      })
      .catch(() => {
        if (active) onError("AAAAT could not load candidature context for combined application material.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId, documents.length, onError]);

  const exportPacket = async () => {
    if (!selectedCvDocumentId || !selectedCoverLetterDocumentId) return;
    if (disabled) {
      onError("Save structured content before exporting a combined application packet.");
      return;
    }
    setExporting(true);
    onError(null);
    onNotice(null);
    try {
      const result = await window.aaaat.combinedDocuments.exportPacket({
        cvDocumentId: selectedCvDocumentId,
        coverLetterDocumentId: selectedCoverLetterDocumentId,
      });
      if (result) onNotice(`Combined application packet exported: ${result.exportedPath}`);
    } catch {
      onError("AAAAT could not export the combined CV and cover-letter packet.");
    } finally {
      setExporting(false);
    }
  };

  const retainPacket = async () => {
    if (!candidature || !selectedCvDocumentId || !selectedCoverLetterDocumentId) return;
    if (disabled) {
      onError("Save document changes before retaining combined application material.");
      return;
    }
    if (!canRetain) {
      onError("Associate both working documents with this candidature before retaining the combined packet.");
      return;
    }
    setRetaining(true);
    onError(null);
    onNotice(null);
    try {
      const artifact = await window.aaaat.artifacts.captureCombined({
        candidatureId: candidature.id,
        cvDocumentId: selectedCvDocumentId,
        coverLetterDocumentId: selectedCoverLetterDocumentId,
      });
      onNotice(`Retained combined application artifact: ${artifact.artifactPath}`);
    } catch (reason) {
      onError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not retain the combined application artifact.",
      );
    } finally {
      setRetaining(false);
    }
  };

  return (
    <section className="manual-source-warning" aria-label="Combined CV and cover letter">
      <h3>Combined CV + cover letter</h3>
      {cvs.length === 0 || coverLetters.length === 0 ? (
        <p>Create at least one CV and one cover letter to export a combined application packet.</p>
      ) : (
        <>
          <label>
            Combined CV
            <select
              value={selectedCvDocumentId}
              onChange={(event) => setCvDocumentId(event.target.value)}
            >
              {cvs.map((document) => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>
          </label>
          <label>
            Combined cover letter
            <select
              value={selectedCoverLetterDocumentId}
              onChange={(event) => setCoverLetterDocumentId(event.target.value)}
            >
              {coverLetters.map((document) => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>
          </label>
          <div className="button-row">
            <button type="button" disabled={disabled || exporting} onClick={() => void exportPacket()}>
              {exporting ? "Exporting…" : "Export combined packet"}
            </button>
            {candidature ? (
              <button
                type="button"
                disabled={disabled || retaining || !canRetain}
                onClick={() => void retainPacket()}
              >
                {retaining ? "Retaining…" : "Retain combined application artifact"}
              </button>
            ) : null}
          </div>
          {candidature && !canRetain ? (
            <p>Associate both selected working documents with this candidature before retaining the combined packet.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
