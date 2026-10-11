import { useEffect, useState } from "react";
import type { DocumentCollections, CoverLetterRecord, WorkingCvRecord } from "../shared/document-domain-contracts";
import { candidatureRecognitionProjection } from "./candidature-projections";
import { rememberDocumentDraft } from "./document-drafts";
import { useShellActions } from "./shell-actions";
import "./documents.css";

const emptyCollections: DocumentCollections = { templates: [], workingCvs: [], renderedCvs: [], letters: [], renderedLetters: [], applicationPackets: [] };
function uniqueTitle(base: string, titles: readonly string[]): string {
  const used = new Set(titles.map((title) => title.trim().toLocaleLowerCase()));
  if (!used.has(base.toLocaleLowerCase())) return base;
  let index = 2;
  while (used.has(`${base} ${index}`.toLocaleLowerCase())) index += 1;
  return `${base} ${index}`;
}

export function DocumentsStartWorkspace({ onOpenDocument, onDirtyChange }: {
  readonly onOpenDocument: (documentId: string) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [collections, setCollections] = useState<DocumentCollections>(emptyCollections);
  const [applicationLabels, setApplicationLabels] = useState<Record<string, string>>({});
  const [creation, setCreation] = useState<"cv" | "letter" | null>(null);
  const [title, setTitle] = useState("");
  const [source, setSource] = useState("profile");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    onDirtyChange?.(Boolean(creation && title.trim()));
    return () => onDirtyChange?.(false);
  }, [creation, title, onDirtyChange]);
  useEffect(() => {
    let active = true;
    void Promise.all([window.aaaat.documentDomain.collections(), window.aaaat.candidatures.list(), window.aaaat.candidatures.listFields()])
      .then(([documents, applications, fields]) => {
        if (!active) return;
        setCollections(documents);
        setApplicationLabels(Object.fromEntries(applications.map((application) => {
          const projection = candidatureRecognitionProjection(application, fields);
          return [application.id, projection.primaryCues.map((cue) => cue.value).join(" · ") || projection.retainedSourceCue?.value || "Application"];
        })));
      }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : "Documents could not be loaded."); });
    return () => { active = false; };
  }, []);
  const start = (kind: "cv" | "letter") => { setCreation(kind); setTitle(""); setError(null); };
  const openNew = async () => {
    if (!creation || busy) return;
    setBusy(true); setError(null);
    try {
      const draft = creation === "cv"
        ? await window.aaaat.documentDomain.previewWorkingCv({
          title: title.trim() || uniqueTitle("CV", collections.workingCvs.map((document) => document.title)),
          candidatureId: null,
          source: source.startsWith("template:") ? { kind: "template", templateId: source.slice(9) } : { kind: source === "blank" ? "blank" : "profile" },
        })
        : await window.aaaat.documentDomain.previewLetter({
          title: title.trim() || uniqueTitle("Cover letter", collections.letters.map((document) => document.title)),
          candidatureId: null, bodyParagraphs: [],
        });
      rememberDocumentDraft(draft);
      setCreation(null); setTitle(""); onDirtyChange?.(false); onOpenDocument(draft.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The document could not be opened."); }
    finally { setBusy(false); }
  };
  useShellActions({
    title: creation ? creation === "cv" ? "New CV" : "New cover letter" : "Documents",
    actions: creation ? [
      { id: "document-create-cancel", label: "Cancel", onClick: () => { setCreation(null); setTitle(""); onDirtyChange?.(false); } },
      { id: "document-create-open", label: "Open", onClick: () => { void openNew(); }, disabled: busy, primary: true },
    ] : [
      { id: "document-new-cv", label: "New CV", onClick: () => start("cv"), primary: true },
      { id: "document-new-letter", label: "New letter", onClick: () => start("letter") },
    ],
  });
  const rename = async (document: WorkingCvRecord | CoverLetterRecord) => {
    const proposed = window.prompt("Document name", document.title)?.trim();
    if (!proposed || proposed === document.title) return;
    setError(null);
    try {
      if ("sections" in document) await window.aaaat.documentDomain.updateWorkingCv({ id: document.id, title: proposed, language: document.language, sections: document.sections, pdfMetadata: document.pdfMetadata, parserSummary: document.parserSummary });
      else await window.aaaat.documentDomain.updateLetter({ id: document.id, title: proposed, language: document.language, sender: document.sender, recipient: document.recipient, subject: document.subject, bodyParagraphs: document.bodyParagraphs, closing: document.closing });
      setCollections(await window.aaaat.documentDomain.collections());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The document could not be renamed."); }
  };
  const remove = async (document: WorkingCvRecord | CoverLetterRecord) => {
    if (!window.confirm(`Delete "${document.title}"? Generated PDFs are kept.`)) return;
    setError(null);
    try { setCollections("sections" in document ? await window.aaaat.documentDomain.removeWorkingCv(document.id) : await window.aaaat.documentDomain.removeLetter(document.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "The document could not be deleted."); }
  };
  const editRenderedCopy = async (rendered: DocumentCollections["renderedCvs"][number]) => {
    setError(null);
    try {
      const preview = await window.aaaat.documentDomain.previewWorkingCv({
        title: uniqueTitle(`${rendered.title} copy`, collections.workingCvs.map((document) => document.title)),
        candidatureId: rendered.candidatureId, source: { kind: "blank" },
      });
      const draft = { ...preview, ...rendered.snapshot, id: preview.id, title: preview.title, createdAt: preview.createdAt, updatedAt: preview.updatedAt };
      rememberDocumentDraft(draft);
      onOpenDocument(draft.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The editable copy could not be opened."); }
  };
  const documents = [...collections.workingCvs, ...collections.letters].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const association = (candidatureId: string | null) => candidatureId ? applicationLabels[candidatureId] || "Application" : "Standalone";
  return <section className="document-library" aria-label="Documents">
    {error ? <p className="error-message" role="alert">{error}</p> : null}
    {creation ? <div className="document-new-form">
      <label>Name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder={creation === "cv" ? "CV" : "Cover letter"} /></label>
      {creation === "cv" ? <label>Start from<select value={source} onChange={(event) => setSource(event.target.value)}>
        <option value="profile">My information</option><option value="blank">Blank page</option>
        {collections.templates.map((template) => <option key={template.id} value={`template:${template.id}`}>{template.name}</option>)}
      </select></label> : null}
    </div> : <>
      {documents.length === 0 ? <p className="compact-empty">Create a CV or letter to start writing.</p> : <div className="document-list">
        {documents.map((document) => <article className="document-list-row" key={document.id}>
          <button type="button" className="document-list-open" onClick={() => onOpenDocument(document.id)}>
            <span className="item-kind">{"sections" in document ? "CV" : "Letter"}</span>
            <strong>{document.title}</strong><small>{association(document.candidatureId)}</small>
          </button>
          <div><button type="button" onClick={() => { void rename(document); }}>Rename</button><button type="button" onClick={() => { void remove(document); }}>Delete</button></div>
        </article>)}
      </div>}
      <details className="document-library-disclosure"><summary>CV templates · {collections.templates.length}</summary>
        {collections.templates.map((template) => <article className="document-list-row" key={template.id}>
          <strong>{template.name}</strong>
          <button type="button" onClick={() => { setSource(`template:${template.id}`); setTitle(template.name); setCreation("cv"); }}>Use template</button>
        </article>)}
      </details>
      <details className="document-library-disclosure"><summary>Generated PDFs · {collections.renderedCvs.length + collections.renderedLetters.length + collections.applicationPackets.length}</summary>
        {collections.renderedCvs.map((document) => <article className="document-list-row" key={document.id}>
          <button type="button" className="document-list-open" onClick={() => { void window.aaaat.documentDomain.openRenderedCv(document.id); }}><span className="item-kind">CV PDF</span><strong>{document.title}</strong><small>{association(document.candidatureId)}</small></button>
          <button type="button" onClick={() => { void window.aaaat.documentDomain.exportRenderedCv(document.id); }}>Export</button>
          <button type="button" onClick={() => { void editRenderedCopy(document); }}>Edit a copy</button>
        </article>)}
        {collections.renderedLetters.map((document) => <article className="document-list-row" key={document.id}>
          <button type="button" className="document-list-open" onClick={() => { void window.aaaat.documentDomain.openRenderedLetter(document.id); }}><span className="item-kind">Letter PDF</span><strong>{document.title}</strong><small>{association(document.candidatureId)}</small></button>
          <button type="button" onClick={() => { void window.aaaat.documentDomain.exportRenderedLetter(document.id); }}>Export</button>
        </article>)}
        {collections.applicationPackets.map((document) => <article className="document-list-row" key={document.id}>
          <button type="button" className="document-list-open" onClick={() => { void window.aaaat.documentDomain.openPacket(document.id); }}><span className="item-kind">Application PDF</span><strong>{document.title}</strong><small>{association(document.candidatureId)}</small></button>
          <button type="button" onClick={() => { void window.aaaat.documentDomain.exportPacket(document.id); }}>Export</button>
        </article>)}
      </details>
    </>}
  </section>;
}
