import { useEffect, useMemo, useState } from "react";

import type { CandidatureRecord, DocumentKind, DocumentRecord, ProfileSnapshot } from "../shared/contracts";

function nextTitle(kind: DocumentKind, documents: readonly DocumentRecord[]): string {
  const base = kind === "cv" ? "CV" : "Cover letter";
  const used = new Set(documents.map((document) => document.title.trim().toLocaleLowerCase()));
  if (!used.has(base.toLocaleLowerCase())) return base;
  let index = 2;
  while (used.has(`${base} ${String(index)}`.toLocaleLowerCase())) index += 1;
  return `${base} ${String(index)}`;
}

export function DocumentsStartWorkspace({ onOpenDocument }: { readonly onOpenDocument: (documentId: string) => void }) {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [applications, setApplications] = useState<CandidatureRecord[]>([]);
  const [title, setTitle] = useState("");
  const [variantId, setVariantId] = useState("");
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([window.aaaat.profile.current(), window.aaaat.documents.list(), window.aaaat.candidatures?.list() ?? Promise.resolve([])])
      .then(([currentProfile, currentDocuments, currentApplications]) => {
        if (!active) return;
        setProfile(currentProfile);
        setDocuments(currentDocuments);
        setApplications(currentApplications);
      })
      .catch(() => { if (active) setError("AAAAT could not load your CVs."); });
    return () => { active = false; };
  }, []);

  const { cvs, standaloneLetters } = useMemo(() => {
    const linked = new Set(applications.flatMap((application) => application.documentIds));
    const byTitle = (left: DocumentRecord, right: DocumentRecord) => left.title.localeCompare(right.title);
    return {
      cvs: documents.filter((document) => document.kind === "cv").sort(byTitle),
      standaloneLetters: documents.filter((document) => document.kind === "cover_letter" && !linked.has(document.id)).sort(byTitle),
    };
  }, [applications, documents]);

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
    <section className="document-intent-home" aria-label="CV work">
      <header className="document-console-heading">
        <div><p className="eyebrow">Reusable documents</p><h1>CVs</h1></div>
        <button className="compact-primary" type="button" disabled={!profile || busy !== null} onClick={() => void create("cv")}>
          {busy === "cv" ? "Creating…" : "＋ New CV"}
        </button>
      </header>

      <details className="document-start-options">
        <summary>New CV options</summary>
        <div className="document-start-options-grid">
          <label>Title <small>Optional</small><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="CV" /></label>
          {profile && profile.variants.length > 0 ? (
            <label>Professional information <small>Optional</small>
              <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
                <option value="">Use My information</option>
                {profile.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
              </select>
            </label>
          ) : null}
        </div>
      </details>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <section className="document-intent-existing" aria-label="Reusable CVs">
        <div className="section-heading"><div><p className="eyebrow">Local collection</p><h2>Reusable CVs</h2></div><span>{cvs.length}</span></div>
        {cvs.length === 0 ? <p className="document-intent-empty">No CVs yet.</p> : (
          <div className="document-intent-list">
            {cvs.map((document) => (
              <button type="button" key={document.id} onClick={() => onOpenDocument(document.id)}>
                <span className="item-kind">CV</span><strong>{document.title}</strong><small>Open</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <details className="standalone-letter-access">
        <summary>Standalone letters</summary>
        <div className="standalone-letter-heading">
          <span>Letters for applications are kept with their application.</span>
          <button type="button" className="compact-secondary" disabled={!profile || busy !== null} onClick={() => void create("cover_letter")}>
            {busy === "cover_letter" ? "Creating…" : "New standalone letter"}
          </button>
        </div>
        {standaloneLetters.map((document) => <button type="button" className="standalone-letter-row" key={document.id} onClick={() => onOpenDocument(document.id)}>{document.title}</button>)}
      </details>
    </section>
  );
}
