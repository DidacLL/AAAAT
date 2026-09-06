import { useEffect, useMemo, useState } from "react";

import type { DocumentRecord } from "../shared/contracts";

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

  useEffect(() => {
    setCvDocumentId((current) =>
      cvs.some((document) => document.id === current) ? current : (cvs[0]?.id ?? ""),
    );
    setCoverLetterDocumentId((current) =>
      coverLetters.some((document) => document.id === current)
        ? current
        : (coverLetters[0]?.id ?? ""),
    );
  }, [coverLetters, cvs]);

  const exportPacket = async () => {
    if (!cvDocumentId || !coverLetterDocumentId) return;
    if (disabled) {
      onError("Save structured content before exporting a combined application packet.");
      return;
    }
    setExporting(true);
    onError(null);
    onNotice(null);
    try {
      const result = await window.aaaat.combinedDocuments.exportPacket({
        cvDocumentId,
        coverLetterDocumentId,
      });
      if (result) onNotice(`Combined application packet exported: ${result.exportedPath}`);
    } catch {
      onError("AAAAT could not export the combined CV and cover-letter packet.");
    } finally {
      setExporting(false);
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
            <select value={cvDocumentId} onChange={(event) => setCvDocumentId(event.target.value)}>
              {cvs.map((document) => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>
          </label>
          <label>
            Combined cover letter
            <select
              value={coverLetterDocumentId}
              onChange={(event) => setCoverLetterDocumentId(event.target.value)}
            >
              {coverLetters.map((document) => (
                <option key={document.id} value={document.id}>{document.title}</option>
              ))}
            </select>
          </label>
          <button type="button" disabled={disabled || exporting} onClick={() => void exportPacket()}>
            {exporting ? "Exporting…" : "Export combined packet"}
          </button>
        </>
      )}
    </section>
  );
}
