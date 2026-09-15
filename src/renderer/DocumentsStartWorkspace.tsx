import { useEffect, useMemo, useState } from "react";

import type { DocumentKind, DocumentRecord, ProfileSnapshot } from "../shared/contracts";

function nextTitle(kind: DocumentKind, documents: readonly DocumentRecord[]): string {
  const base = kind === "cv" ? "CV" : "Cover letter";
  const used = new Set(documents.map((document) => document.title.trim().toLocaleLowerCase()));
  if (!used.has(base.toLocaleLowerCase())) return base;
  for (let index = 2; index < 100; index += 1) {
    const candidate = `${base} ${String(index)}`;
    if (!used.has(candidate.toLocaleLowerCase())) return candidate;
  }
  return `${base} ${String(documents.length + 1)}`;
}

export function DocumentsStartWorkspace({
  onOpenDocument,
}: {
  readonly onOpenDocument: (documentId: string) => void;
}) {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [title, setTitle] = useState("");
  const [variantId, setVariantId] = useState("");
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([window.aaaat.profile.current(), window.aaaat.documents.list()])
      .then(([currentProfile, currentDocuments]) => {
        if (!active) return;
        setProfile(currentProfile);
        setDocuments(currentDocuments);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load your documents.");
      });
    return () => {
      active = false;
    };
  }, []);

  const sortedDocuments = useMemo(
    () => [...documents].sort((left, right) => left.title.localeCompare(right.title)),
    [documents],
  );

  const create = async (kind: DocumentKind) => {
    if (busy || !profile) return;
    setBusy(kind);
    setError(null);
    try {
      const created = await window.aaaat.documents.create({
        kind,
        title: title.trim() || nextTitle(kind, documents),
        variantId: variantId || null,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      setDocuments((current) => [...current, created]);
      setTitle("");
      setVariantId("");
      onOpenDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create that document.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="document-intent-home" aria-label="CV and cover-letter work">
      <header className="document-intent-heading">
        <p className="eyebrow">Document bench</p>
        <h1>What are you making?</h1>
        <p>
          Start with the document. AAAAT uses your reusable professional information underneath; document-specific
          selection, source ownership and assistant controls stay with the document when you need them.
        </p>
      </header>

      <div className="document-intent-actions" aria-label="Create a document">
        <button type="button" disabled={!profile || busy !== null} onClick={() => void create("cv")}>
          <strong>{busy === "cv" ? "Creating CV…" : "New CV"}</strong>
          <span>Build or tailor a CV from the professional information you choose to use.</span>
        </button>
        <button type="button" disabled={!profile || busy !== null} onClick={() => void create("cover_letter")}>
          <strong>{busy === "cover_letter" ? "Creating cover letter…" : "New cover letter"}</strong>
          <span>Write a standalone letter now; a job offer is optional.</span>
        </button>
      </div>

      {profile ? (
        <details className="document-start-options">
          <summary>Creation options</summary>
          <div className="document-start-options-grid">
            <label>
              Document title <small>Optional</small>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="AAAAT will choose a simple title" />
            </label>
            {profile.variants.length > 0 ? (
              <label>
                Saved variation <small>Optional</small>
                <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
                  <option value="">Use My information directly</option>
                  {profile.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>{variant.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </details>
      ) : null}

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <section className="document-intent-existing" aria-label="Continue a document">
        <div className="section-heading">
          <div>
            <p className="eyebrow">On the bench</p>
            <h2>Continue a document</h2>
          </div>
          <span>{documents.length}</span>
        </div>
        {documents.length === 0 ? (
          <p className="document-intent-empty">No documents yet. Start with a CV or cover letter above.</p>
        ) : (
          <div className="document-intent-list">
            {sortedDocuments.map((document) => (
              <button type="button" key={document.id} onClick={() => onOpenDocument(document.id)}>
                <span className="item-kind">{document.kind === "cv" ? "CV" : "Cover letter"}</span>
                <strong>{document.title}</strong>
                <small>Open document</small>
              </button>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
