import { useEffect, useMemo, useState } from "react";

import type { DocumentCollections, RenderedCvRecord } from "../shared/document-domain-contracts";

const emptyCollections: DocumentCollections = {
  templates: [], workingCvs: [], renderedCvs: [], letters: [], applicationPackets: [],
};

function nextCvTitle(collections: DocumentCollections): string {
  const used = new Set(collections.workingCvs.map((document) => document.title.trim().toLocaleLowerCase()));
  if (!used.has("cv")) return "CV";
  let index = 2;
  while (used.has(`cv ${String(index)}`)) index += 1;
  return `CV ${String(index)}`;
}

function RenderedCvInspection({
  document,
  busy,
  onDuplicate,
}: {
  readonly document: RenderedCvRecord;
  readonly busy: boolean;
  readonly onDuplicate: (id: string) => void;
}) {
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const exportProject = async () => {
    setExportMessage(null);
    try {
      const result = await window.aaaat.documentDomain.exportRenderedCv(document.id);
      setExportMessage(result ? "Portable project exported." : null);
    } catch (reason) {
      setExportMessage(reason instanceof Error ? reason.message : "AAAAT could not export this project.");
    }
  };

  return (
    <article className="section-surface rendered-cv-inspection" aria-label={`Rendered CV snapshot: ${document.title}`}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Immutable rendered snapshot</p>
          <h3>{document.title}</h3>
          <small>{document.language ? `Language: ${document.language}` : "No language set"}{document.candidatureId ? " · Application-owned" : " · Standalone"}</small>
        </div>
        <div className="button-row">
          <button type="button" className="compact-secondary" onClick={() => void window.aaaat.documentDomain.openRenderedCv(document.id)}>Open PDF</button>
          <button type="button" className="compact-secondary" disabled={busy} onClick={() => onDuplicate(document.id)}>Duplicate to edit</button>
          <button type="button" className="compact-secondary" onClick={() => void exportProject()}>Export project</button>
        </div>
      </div>
      {document.snapshot.sections.length === 0 ? <p className="compact-empty">This rendered CV was produced from a blank composition.</p> : (
        <div className="working-cv-sections">
          {document.snapshot.sections.map((section) => (
            <section key={section.id} className="working-cv-section">
              <h4>{section.name}</h4>
              {section.items.length === 0 ? <p className="compact-empty">No content in this section.</p> : section.items.map((item) => (
                <article key={item.id} className="working-cv-item">
                  <span className="item-kind">{item.content.kind}</span>
                  <strong>{item.content.title}</strong>
                  {item.content.subtitle ? <small>{item.content.subtitle}</small> : null}
                  {item.content.description ? <p>{item.content.description}</p> : null}
                </article>
              ))}
            </section>
          ))}
        </div>
      )}
      {exportMessage ? <p className="compact-note" role="status">{exportMessage}</p> : null}
    </article>
  );
}

export function DocumentsStartWorkspace({ onOpenDocument }: { readonly onOpenDocument: (documentId: string) => void }) {
  const [collections, setCollections] = useState<DocumentCollections>(emptyCollections);
  const [title, setTitle] = useState("");
  const [sourceKey, setSourceKey] = useState("profile");
  const [inspectedRenderedId, setInspectedRenderedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.documentDomain.collections()
      .then((current) => { if (active) setCollections(current); })
      .catch(() => { if (active) setError("AAAAT could not load your document collection."); });
    return () => { active = false; };
  }, []);

  const inspectedRendered = useMemo(
    () => collections.renderedCvs.find((document) => document.id === inspectedRenderedId) ?? null,
    [collections.renderedCvs, inspectedRenderedId],
  );

  const createWorkingCv = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const templateId = sourceKey.startsWith("template:") ? sourceKey.slice("template:".length) : null;
      const source = templateId
        ? { kind: "template" as const, templateId }
        : sourceKey === "blank"
          ? { kind: "blank" as const }
          : { kind: "profile" as const };
      const created = await window.aaaat.documentDomain.createWorkingCv({
        title: title.trim() || nextCvTitle(collections),
        candidatureId: null,
        source,
      });
      setTitle("");
      onOpenDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create the Working CV.");
    } finally { setBusy(false); }
  };

  const openTemplate = async (templateId: string, name: string) => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const created = await window.aaaat.documentDomain.createWorkingCv({
        title: name,
        candidatureId: null,
        source: { kind: "template", templateId },
      });
      onOpenDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not open that template as a Working CV.");
    } finally { setBusy(false); }
  };

  const createLetter = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const created = await window.aaaat.documentDomain.createLetter({
        candidatureId: null,
        title: "Standalone cover letter",
        bodyParagraphs: [],
      });
      onOpenDocument(created.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create the cover letter.");
    } finally { setBusy(false); }
  };

  const duplicateRendered = async (renderedCvId: string) => {
    if (busy) return;
    setBusy(true); setError(null);
    try { onOpenDocument((await window.aaaat.documentDomain.duplicateRenderedCv(renderedCvId)).id); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "AAAAT could not duplicate the Rendered CV."); }
    finally { setBusy(false); }
  };

  return (
    <section className="document-intent-home" aria-label="CV and document work">
      <header className="document-console-heading">
        <div><p className="eyebrow">Local documents</p><h1>CVs / Documents</h1></div>
        <button className="compact-primary" type="button" disabled={busy} onClick={() => void createWorkingCv()}>{busy ? "Working…" : "＋ New CV"}</button>
      </header>

      <details className="document-start-options">
        <summary>New CV options</summary>
        <div className="document-start-options-grid">
          <label>Title <small>Optional</small><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="CV" /></label>
          <label>Start from<select value={sourceKey} onChange={(event) => setSourceKey(event.target.value)}><option value="profile">My information</option><option value="blank">Blank CV</option>{collections.templates.map((template) => <option key={template.id} value={`template:${template.id}`}>Template · {template.name}</option>)}</select></label>
        </div>
      </details>

      {collections.workingCvs.length > 0 ? (
        <details className="document-start-options" aria-label="Continue editing CVs">
          <summary>Continue editing ({collections.workingCvs.length})</summary>
          <div className="document-intent-list">
            {collections.workingCvs.map((document) => <button type="button" key={document.id} onClick={() => onOpenDocument(document.id)}><span className="item-kind">Working CV</span><strong>{document.title}</strong><small>{document.candidatureId ? "Application-owned" : "Standalone"}</small></button>)}
          </div>
        </details>
      ) : null}

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <section className="document-intent-existing" aria-label="CV templates">
        <div className="section-heading"><div><p className="eyebrow">Reusable composition</p><h2>Templates</h2></div><span>{collections.templates.length}</span></div>
        {collections.templates.length === 0 ? <p className="document-intent-empty">No templates yet. Save a Working CV as a template when its composition is reusable.</p> : <div className="document-intent-list">{collections.templates.map((template) => <button type="button" key={template.id} disabled={busy} onClick={() => void openTemplate(template.id, template.name)}><span className="item-kind">Template</span><strong>{template.name}</strong><small>Use as a new Working CV</small></button>)}</div>}
      </section>

      <section className="document-intent-existing" aria-label="Rendered CVs">
        <div className="section-heading"><div><p className="eyebrow">Generated snapshots</p><h2>Rendered CVs</h2></div><span>{collections.renderedCvs.length}</span></div>
        {collections.renderedCvs.length === 0 ? <p className="document-intent-empty">No rendered PDFs yet.</p> : <div className="document-intent-list">{collections.renderedCvs.map((document) => <article key={document.id} className="document-intent-row"><button type="button" onClick={() => setInspectedRenderedId((current) => current === document.id ? null : document.id)}><span className="item-kind">Rendered CV</span><strong>{document.title}</strong><small>{inspectedRenderedId === document.id ? "Hide snapshot" : "Inspect snapshot"}</small></button><button type="button" className="compact-secondary" onClick={() => void window.aaaat.documentDomain.openRenderedCv(document.id)}>Open PDF</button><button type="button" className="compact-secondary" disabled={busy} onClick={() => void duplicateRendered(document.id)}>Duplicate to edit</button></article>)}</div>}
        {inspectedRendered ? <RenderedCvInspection document={inspectedRendered} busy={busy} onDuplicate={(id) => void duplicateRendered(id)} /> : null}
      </section>

      <section className="document-intent-existing" aria-label="Letters">
        <div className="section-heading"><div><p className="eyebrow">Cover letters</p><h2>Letters</h2></div><span>{collections.letters.length}</span></div>
        <button type="button" className="compact-secondary" disabled={busy} onClick={() => void createLetter()}>New standalone letter</button>
        {collections.letters.length === 0 ? <p className="document-intent-empty">No letters yet. Application letters will appear here as well as in their application.</p> : <div className="document-intent-list">{collections.letters.map((letter) => <button type="button" key={letter.id} onClick={() => onOpenDocument(letter.id)}><span className="item-kind">Letter</span><strong>{letter.title}</strong><small>{letter.candidatureId ? "Application-owned" : "Standalone"}</small></button>)}</div>}
      </section>

      <section className="document-intent-existing" aria-label="Application packets">
        <div className="section-heading"><div><p className="eyebrow">Combined retained output</p><h2>Application packets</h2></div><span>{collections.applicationPackets.length}</span></div>
        {collections.applicationPackets.length === 0 ? <p className="document-intent-empty">No application packets yet.</p> : <div className="document-intent-list">{collections.applicationPackets.map((packet) => <button type="button" key={packet.id} onClick={() => void window.aaaat.documentDomain.openPacket(packet.id)}><span className="item-kind">Packet</span><strong>{packet.title}</strong><small>Open PDF</small></button>)}</div>}
      </section>
    </section>
  );
}
