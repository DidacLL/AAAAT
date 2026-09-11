import { useEffect, useMemo, useState } from "react";

import type { ApplicationArtifactRecord } from "../shared/artifact-contracts";
import type { CandidatureRecord, DocumentRecord } from "../shared/contracts";
import { useContextualHandoffs } from "./contextual-handoffs";

function documentKind(document: DocumentRecord): string {
  return document.kind === "cv" ? "CV" : "Cover letter";
}

function artifactKind(artifact: ApplicationArtifactRecord): string {
  switch (artifact.kind) {
    case "cv":
      return "CV";
    case "cover_letter":
      return "Cover letter";
    case "combined":
      return "combined CV + cover letter";
  }
}

function RetainedArtifactProjection({
  candidatureId,
  hasAssociatedDocuments,
}: {
  readonly candidatureId: string;
  readonly hasAssociatedDocuments: boolean;
}) {
  const [artifacts, setArtifacts] = useState<ApplicationArtifactRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.artifacts
      .list(candidatureId)
      .then((nextArtifacts) => {
        if (!active) return;
        setArtifacts(nextArtifacts);
        setLoadError(null);
        setLoaded(true);
      })
      .catch(() => {
        if (!active) return;
        setArtifacts([]);
        setLoadError("AAAAT could not load retained application artifacts.");
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  const openArtifact = async (artifactId: string) => {
    setOpenError(null);
    try {
      await window.aaaat.artifacts.open(artifactId);
    } catch (reason) {
      setOpenError(
        reason instanceof Error ? reason.message : "AAAAT could not open the retained application PDF.",
      );
    }
  };

  return (
    <>
      {loaded && !hasAssociatedDocuments && artifacts.length === 0 && !loadError ? (
        <p className="compact-empty">
          No application material belongs to this candidature yet. Create a CV or cover letter, or
          associate an existing working document if useful.
        </p>
      ) : null}
      {loadError ? <p className="error-message" role="alert">{loadError}</p> : null}
      {openError ? <p className="error-message" role="alert">{openError}</p> : null}
      {artifacts.length > 0 ? (
        <section aria-label="Retained application artifacts">
          <h4>Retained exact artifacts</h4>
          <div className="document-association-list">
            {artifacts.map((artifact) => (
              <article className="retained-information-card" key={artifact.id}>
                <div>
                  <p className="eyebrow">Retained exact {artifactKind(artifact)} artifact</p>
                  <h4>{artifact.title}</h4>
                  <p>Captured {new Date(artifact.capturedAt).toLocaleString()}</p>
                </div>
                <button
                  type="button"
                  className="compact-secondary"
                  onClick={() => void openArtifact(artifact.id)}
                >
                  Open retained PDF
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

export function CandidatureApplicationMaterialPanel({
  candidature,
  documents,
  selectedDocumentIds,
  documentSelectionDirty,
  onDocumentSelectionChange,
  onSaveDocuments,
  onOpenDocument,
}: {
  readonly candidature: CandidatureRecord;
  readonly documents: readonly DocumentRecord[];
  readonly selectedDocumentIds: readonly string[];
  readonly documentSelectionDirty: boolean;
  readonly onDocumentSelectionChange: (documentIds: string[]) => void;
  readonly onSaveDocuments: () => void;
  readonly onOpenDocument: (documentId?: string) => void;
}) {
  const { documentHandoff } = useContextualHandoffs();
  const contextualDocumentActive = documentHandoff?.candidatureId === candidature.id;
  const associatedDocuments = useMemo(
    () =>
      candidature.documentIds
        .map((documentId) => documents.find((document) => document.id === documentId))
        .filter((document): document is DocumentRecord => document !== undefined),
    [candidature.documentIds, documents],
  );
  const artifactProjectionKey = `${candidature.id}:${contextualDocumentActive ? "handoff" : "candidature"}`;

  return (
    <section className="candidature-documents section-surface" aria-label="Application material">
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">Application material</p>
          <h3>Application material</h3>
          <p>Working documents and retained exact material that belong to this candidature.</p>
        </div>
        <button type="button" onClick={() => onOpenDocument()}>
          Create CV or letter for this candidature
        </button>
      </div>

      {associatedDocuments.length > 0 ? (
        <section aria-label="Working application documents">
          <h4>Working documents</h4>
          <div className="document-association-list">
            {associatedDocuments.map((document) => (
              <article className="retained-information-card" key={document.id}>
                <div>
                  <p className="eyebrow">Working {documentKind(document)}</p>
                  <h4>{document.title}</h4>
                  <p>This is a mutable working document, not a retained exact application artifact.</p>
                </div>
                <button
                  type="button"
                  className="compact-secondary"
                  onClick={() => onOpenDocument(document.id)}
                >
                  Open in CVs &amp; letters
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <RetainedArtifactProjection
        key={artifactProjectionKey}
        candidatureId={candidature.id}
        hasAssociatedDocuments={associatedDocuments.length > 0}
      />

      <details className="application-material-associations">
        <summary>Manage existing document associations</summary>
        <p className="compact-help">
          Associate or remove mutable working documents without changing retained exact artifacts.
        </p>
        {documents.length === 0 ? (
          <p className="compact-empty">No existing CVs or cover letters are available to associate.</p>
        ) : (
          <div className="document-association-list">
            {documents.map((document) => (
              <label key={document.id}>
                <input
                  type="checkbox"
                  checked={selectedDocumentIds.includes(document.id)}
                  onChange={(event) =>
                    onDocumentSelectionChange(
                      event.target.checked
                        ? [...selectedDocumentIds.filter((id) => id !== document.id), document.id]
                        : selectedDocumentIds.filter((id) => id !== document.id),
                    )
                  }
                />
                {document.title} ({document.kind === "cv" ? "CV" : "cover letter"})
              </label>
            ))}
          </div>
        )}
        <button type="button" disabled={!documentSelectionDirty} onClick={onSaveDocuments}>
          Save document associations
        </button>
      </details>
    </section>
  );
}
