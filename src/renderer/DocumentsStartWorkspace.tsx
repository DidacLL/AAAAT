import { useEffect, useState } from "react";

import type { DocumentCollections } from "../shared/document-domain-contracts";
import { useContextualHandoffs } from "./contextual-handoffs";
import { PageToolbar } from "./PageToolbar";

const emptyCollections: DocumentCollections = {
  templates: [],
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};

export function DocumentsStartWorkspace({
  onOpenDocument,
}: {
  readonly onOpenDocument: (documentId: string) => void;
}) {
  const { openDocumentDraft } = useContextualHandoffs();
  const [collections, setCollections] = useState<DocumentCollections>(emptyCollections);
  const [cvSource, setCvSource] = useState("profile");
  const [creating, setCreating] = useState<"cv" | "letter" | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      const created = await window.aaaat.documentDomain.prepareWorkingCv({
        title: "CV",
        candidatureId: null,
        source,
      });
      setCvSource("profile");
      openDocumentDraft({ kind: "cv", document: created });
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
      const created = await window.aaaat.documentDomain.prepareLetter({
        candidatureId: null,
        title: "Cover letter",
        bodyParagraphs: [],
      });
      openDocumentDraft({ kind: "letter", document: created });
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
      const created = await window.aaaat.documentDomain.prepareWorkingCv({
        title: name,
        candidatureId: null,
        source: { kind: "template", templateId },
      });
      openDocumentDraft({ kind: "cv", document: created });
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
      const editable = await window.aaaat.documentDomain.prepareRenderedCvCopy(renderedCvId);
      openDocumentDraft({ kind: "cv", document: editable });
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
      <PageToolbar>
        <select aria-label="New CV from" value={cvSource} onChange={event => setCvSource(event.target.value)}>
          <option value="profile">My information</option><option value="blank">Blank</option>
          {collections.templates.map(template => <option key={template.id} value={"template:" + template.id}>{template.name}</option>)}
        </select>
        <button type="button" disabled={creating !== null} onClick={() => void createCv()}>New CV</button>
        <button type="button" disabled={creating !== null} onClick={() => void createLetter()}>New letter</button>
      </PageToolbar>
      <header className="document-console-heading document-hub-heading"><h1>Documents</h1></header>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <section className="document-hub-continue" aria-label="Editable documents">
        <div className="section-heading">
          <div>
            <h2>Editable</h2>
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
