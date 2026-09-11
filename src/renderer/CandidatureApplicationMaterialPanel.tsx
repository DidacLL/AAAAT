import { useEffect, useMemo, useState } from "react";

import type { ApplicationArtifactRecord } from "../shared/artifact-contracts";
import type { CandidatureRecord, DocumentRecord } from "../shared/contracts";

function documentKind(document: DocumentRecord): string {
  return document.kind === "cv" ? "CV" : "Cover letter";
}

function artifactKind(artifact: ApplicationArtifactRecord): string {
  return artifact.kind === "cv" ? "CV" : "Cover letter";
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
  const [artifactState, setArtifactState] = useState<{
    readonly candidatureId: string;
    readonly artifacts: ApplicationArtifactRecord[];
    readonly error: string | null;
    readonly loaded: boolean;
  }>(() => ({ candidatureId: candidature.id, artifacts: [], error: null, loaded: false }));
  const [artifactOpenFailure, setArtifactOpenFailure] = useState<{
    readonly candidatureId: string;
    readonly error: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.artifacts
      .list(candidature.id)
      .then((artifacts) => {
        if (active) {
          setArtifactState({ candidatureId: candidature.id, artifacts, error: null, loaded: true });
        }
      })
      .catch(() => {
        if (!active) return;
        setArtifactState({
          candidatureId: candidature.id,
          artifacts: [],
          error: "AAAAT could not load retained application artifacts.",
          loaded: true,
        });
      });
    return () => {
      active = false;
    };
  }, [candidature.id, documents]);

  const currentArtifactState =
    artifactState.candidatureId === candidature.id
      ? artifactState
      : { candidatureId: candidature.id, artifacts: [], error: null, loaded: false };
  const artifactOpenError =
    artifactOpenFailure?.candidatureId === candidature.id ? artifactOpenFailure.error : null;
  const associatedDocuments = useMemo(
    () =>
      candidature.documentIds
        .map((documentId) => documents.find((document) => document.id === documentId))
        .filter((document): document is DocumentRecord => document !== undefined),
    [candidature.documentIds, documents],
  );
  const hasMaterial = associatedDocuments.length > 0 || currentArtifactState.artifacts.length > 0;

  const openArtifact = async (artifactId: string) => {
    setArtifactOpenFailure(null);
    try {
      await window.aaaat.artifacts.open(artifactId);
    } catch (reason) {
      setArtifactOpenFailure({
        candidatureId: candidature.id,
        error:
          reason instanceof Error ? reason.message : "AAAAT could not open the retained application PDF.",
      });
    }
  };

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

      {currentArtifactState.loaded && !hasMaterial && !currentArtifactState.error ? (
        <p className="compact-empty">
          No application material belongs to this candidature yet. Create a CV or cover letter, or
          associate an existing working document if useful.
        </p>
      ) : null}

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

      {currentArtifactState.error ? (
        <p className="error-message" role="alert">{currentArtifactState.error}</p>
      ) : null}
      {artifactOpenError ? <p className="error-message" role="alert">{artifactOpenError}</p> : null}
      {currentArtifactState.artifacts.length > 0 ? (
        <section aria-label="Retained application artifacts">
          <h4>Retained exact artifacts</h4>
          <div className="document-association-list">
            {currentArtifactState.artifacts.map((artifact) => (
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
