import type { ApplicationArtifactRecord } from "../shared/artifact-contracts";
import type { CandidatureRecord, DocumentRecord } from "../shared/contracts";

export function ApplicationArtifactsPanel({
  candidature,
  documents,
  selectedDocument,
  artifacts,
  capturing,
  disabled,
  canCapture,
  onCapture,
}: {
  readonly candidature: CandidatureRecord;
  readonly documents: readonly DocumentRecord[];
  readonly selectedDocument: DocumentRecord | null;
  readonly artifacts: readonly ApplicationArtifactRecord[];
  readonly capturing: boolean;
  readonly disabled: boolean;
  readonly canCapture: boolean;
  readonly onCapture: () => void;
}) {
  return (
    <section className="manual-source-warning" aria-label="Saved application PDFs">
      <h3>Saved application PDFs</h3>
      <p>Keep an exact PDF snapshot when a document is actually used for {candidature.label}.</p>
      {selectedDocument ? (
        canCapture ? (
          <button type="button" disabled={disabled || capturing} onClick={onCapture}>
            {capturing ? "Saving…" : "Save application PDF"}
          </button>
        ) : (
          <p>Link the selected document to this application before saving a PDF.</p>
        )
      ) : (
        <p>Select a document to save another PDF.</p>
      )}
      {artifacts.length === 0 ? (
        <p>No saved application PDFs yet.</p>
      ) : (
        <div className="document-paths">
          {artifacts.map((artifact) => {
            const primaryDocumentId =
              artifact.kind === "cv"
                ? artifact.cvDocumentId
                : artifact.kind === "cover_letter"
                  ? artifact.coverLetterDocumentId
                  : artifact.cvDocumentId;
            const source = documents.find((document) => document.id === primaryDocumentId);
            return (
              <article key={artifact.id}>
                <strong>{artifact.title || source?.title || "Application PDF"}</strong>
                <p>{new Date(artifact.capturedAt).toLocaleString()}</p>
                <p><span>Saved source</span><code>{artifact.sourcePath}</code></p>
                <p><span>Saved PDF</span><code>{artifact.artifactPath}</code></p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
