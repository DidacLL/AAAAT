import { useEffect, useState } from "react";

import type { DocumentCollections } from "../shared/document-domain-contracts";

const emptyCollections: DocumentCollections = {
  templates: [],
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};

function nextCvTitle(collections: DocumentCollections): string {
  const used = new Set(
    collections.workingCvs.map((document) => document.title.trim().toLocaleLowerCase()),
  );
  if (!used.has("cv")) return "CV";
  let index = 2;
  while (used.has(`cv ${String(index)}`)) index += 1;
  return `CV ${String(index)}`;
}

export function DocumentsStartWorkspace({
  onOpenDocument,
  onDirtyChange,
}: {
  readonly onOpenDocument: (documentId: string) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [collections, setCollections] = useState<DocumentCollections>(emptyCollections);
  const [cvTitle, setCvTitle] = useState("");
  const [cvSource, setCvSource] = useState("profile");
  const [creating, setCreating] = useState<"cv" | "letter" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const dirty = cvTitle.trim().length > 0 || cvSource !== "profile";

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let active = true;
    void window.aaaat.documentDomain.collections()
      .then((current) => { if (active) setCollections(current); })
      .catch(() => { if (active) setError("AAAAT could not load your documents."); });
    return () => { active = false; };
  }, []);

  const createCv = async () => {
    if (creating) return;
    setCreating("cv");
    setError(null);
    try {
      const templateId = cvSource.startsWith("template:")
        ? cvSource.slice("template:".length)
        : null;
      const source = templateId
        ? { kind: "template" as const, templateId }
        : cvSource === "blank"
          ? { kind: "blank" as const }
          : { kind: "profile" as const };
      const created = await window.aaaat.documentDomain.createWorkingCv({
        title: cvTitle.trim() || nextCvTitle(collections),
        candidatureId: null,
        source,
      });
      setCvTitle("");
      setCvSource("profile");
      onOpenDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create the CV.");
    } finally {
      setCreating(null);
    }
  };

  const createLetter = async () => {
    if (creating) return;
    setCreating("letter");
    setError(null);
    try {
      const created = await window.aaaat.documentDomain.createLetter({
        candidatureId: null,
        title: "Cover letter",
        bodyParagraphs: [],
      });
      onOpenDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create the cover letter.");
    } finally {
      setCreating(null);
    }
  };

  const openTemplate = async (templateId: string, name: string) => {
    if (creating) return;
    setCreating("cv");
    setError(null);
    try {
      const created = await window.aaaat.documentDomain.createWorkingCv({
        title: name,
        candidatureId: null,
        source: { kind: "template", templateId },
      });
      onOpenDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not use that template.");
    } finally {
      setCreating(null);
    }
  };

  const renameTemplate = async (templateId: string) => {
    const template = collections.templates.find((candidate) => candidate.id === templateId);
    if (!template) return;
    const proposed = window.prompt("Template name", template.name)?.trim();
    if (!proposed || proposed === template.name) return;
    try {
      setCollections(await window.aaaat.documentDomain.updateTemplate({
        id: template.id,
        name: proposed,
        language: template.language,
        pdfMetadata: template.pdfMetadata,
        parserSummary: template.parserSummary,
        sections: template.sections,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not rename this template.");
    }
  };

  const duplicateRendered = async (renderedCvId: string) => {
    if (creating) return;
    setCreating("cv");
    setError(null);
    try {
      const editable = await window.aaaat.documentDomain.duplicateRenderedCv(renderedCvId);
      onOpenDocument(editable.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not make an editable copy.");
    } finally {
      setCreating(null);
    }
  };

  const editableDocuments = [
    ...collections.workingCvs.map((document) => ({
      id: document.id,
      kind: "CV" as const,
      title: document.title,
      applicationOwned: Boolean(document.candidatureId),
      updatedAt: document.updatedAt,
    })),
    ...collections.letters.map((document) => ({
      id: document.id,
      kind: "Cover letter" as const,
      title: document.title,
      applicationOwned: Boolean(document.candidatureId),
      updatedAt: document.updatedAt,
    })),
  ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

  const generatedCount =
    collections.renderedCvs.length +
    collections.renderedLetters.length +
    collections.applicationPackets.length;

  return (
    <section className="document-intent-home document-hub" aria-label="Documents">
      <header className="document-console-heading document-hub-heading">
        <div>
          <p className="eyebrow">Documents</p>
          <h1>Write first. Produce PDFs when you need them.</h1>
          <p>CVs and cover letters stay editable. Generated files are kept separately.</p>
        </div>
      </header>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <section className="document-hub-create" aria-label="Create a document">
        <article className="document-create-card">
          <div>
            <span className="item-kind">CV</span>
            <h2>Start a CV</h2>
            <p>Begin from My information, a reusable template, or a blank page.</p>
          </div>
          <div className="document-create-card-controls">
            <label>
              Start from
              <select value={cvSource} onChange={(event) => setCvSource(event.target.value)}>
                <option value="profile">My information</option>
                <option value="blank">Blank CV</option>
                {collections.templates.map((template) => (
                  <option key={template.id} value={`template:${template.id}`}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <details>
              <summary>Name it now</summary>
              <label>
                CV name
                <input
                  value={cvTitle}
                  onChange={(event) => setCvTitle(event.target.value)}
                  placeholder={nextCvTitle(collections)}
                />
              </label>
            </details>
            <button type="button" disabled={creating !== null} onClick={() => void createCv()}>
              {creating === "cv" ? "Opening…" : "Create CV"}
            </button>
          </div>
        </article>

        <article className="document-create-card">
          <div>
            <span className="item-kind">Cover letter</span>
            <h2>Write a cover letter</h2>
            <p>Open a clean letter page. You can write yourself or ask AI for a draft inside the editor.</p>
          </div>
          <div className="document-create-card-controls">
            <button type="button" disabled={creating !== null} onClick={() => void createLetter()}>
              {creating === "letter" ? "Opening…" : "Create cover letter"}
            </button>
          </div>
        </article>
      </section>

      <section className="document-hub-continue" aria-label="Editable documents">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Continue editing</p>
            <h2>Your documents</h2>
          </div>
          <span>{editableDocuments.length}</span>
        </div>
        {editableDocuments.length === 0 ? (
          <p className="document-intent-empty">No editable documents yet.</p>
        ) : (
          <div className="working-cv-document-grid document-editable-grid">
            {editableDocuments.map((document) => (
              <button
                type="button"
                className="working-cv-document-card"
                key={document.id}
                onClick={() => onOpenDocument(document.id)}
              >
                <span className="item-kind">{document.kind}</span>
                <strong>{document.title}</strong>
                <small>{document.applicationOwned ? "For an application" : "Standalone"}</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="document-hub-secondary">
        <details className="document-library-disclosure">
          <summary>CV templates <span>{collections.templates.length}</span></summary>
          {collections.templates.length === 0 ? (
            <p className="document-intent-empty">No templates yet.</p>
          ) : (
            <div className="document-intent-list">
              {collections.templates.map((template) => (
                <article key={template.id} className="document-intent-row">
                  <button
                    type="button"
                    disabled={creating !== null}
                    onClick={() => void openTemplate(template.id, template.name)}
                  >
                    <span className="item-kind">Template</span>
                    <strong>{template.name}</strong>
                    <small>Start a new CV</small>
                  </button>
                  <button
                    type="button"
                    className="compact-secondary"
                    onClick={() => void renameTemplate(template.id)}
                  >
                    Rename
                  </button>
                </article>
              ))}
            </div>
          )}
        </details>

        <details className="document-library-disclosure">
          <summary>Generated files <span>{generatedCount}</span></summary>
          {generatedCount === 0 ? (
            <p className="document-intent-empty">No generated PDFs yet.</p>
          ) : (
            <div className="document-intent-list">
              {collections.renderedCvs.map((document) => (
                <article key={document.id} className="document-intent-row">
                  <button
                    type="button"
                    onClick={() => void window.aaaat.documentDomain.openRenderedCv(document.id)}
                  >
                    <span className="item-kind">CV PDF</span>
                    <strong>{document.title}</strong>
                    <small>Open PDF</small>
                  </button>
                  <button
                    type="button"
                    className="compact-secondary"
                    disabled={creating !== null}
                    onClick={() => void duplicateRendered(document.id)}
                  >
                    Edit a copy
                  </button>
                </article>
              ))}
              {collections.renderedLetters.map((document) => (
                <article key={document.id} className="document-intent-row">
                  <button
                    type="button"
                    onClick={() => void window.aaaat.documentDomain.openRenderedLetter(document.id)}
                  >
                    <span className="item-kind">Letter PDF</span>
                    <strong>{document.title}</strong>
                    <small>Open PDF</small>
                  </button>
                </article>
              ))}
              {collections.applicationPackets.map((document) => (
                <article key={document.id} className="document-intent-row">
                  <button
                    type="button"
                    onClick={() => void window.aaaat.documentDomain.openPacket(document.id)}
                  >
                    <span className="item-kind">Application PDF</span>
                    <strong>{document.title}</strong>
                    <small>Open PDF</small>
                  </button>
                </article>
              ))}
            </div>
          )}
        </details>
      </div>
    </section>
  );
}
