import { useEffect, useMemo, useState, type FormEvent } from "react";

import type {
  DocumentEngine,
  DocumentKind,
  DocumentRecord,
  ProfileItem,
  ProfileItemContentPatch,
  ProfileSnapshot,
} from "../shared/contracts";
import "./documents.css";

const engines: readonly DocumentEngine[] = ["pdflatex", "lualatex", "xelatex"];

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function paragraphs(value: string): string[] {
  return value
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function orderedBaseItems(document: DocumentRecord, items: readonly ProfileItem[]): ProfileItem[] {
  const baseRank = new Map(items.map((item, index) => [item.id, index]));
  const rules = new Map(document.rules.map((rule) => [rule.itemId, rule]));
  return [...items].sort((left, right) => {
    const leftRank = rules.get(left.id)?.orderRank ?? baseRank.get(left.id) ?? 0;
    const rightRank = rules.get(right.id)?.orderRank ?? baseRank.get(right.id) ?? 0;
    return leftRank - rightRank;
  });
}

export function DocumentsWorkspace() {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseItems, setBaseItems] = useState<ProfileItem[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newKind, setNewKind] = useState<DocumentKind>("cv");
  const [newTitle, setNewTitle] = useState("");
  const [newVariantId, setNewVariantId] = useState("");

  const selected = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? null,
    [documents, selectedId],
  );
  const orderedItems = useMemo(
    () => (selected ? orderedBaseItems(selected, baseItems) : []),
    [baseItems, selected],
  );

  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [engine, setEngine] = useState<DocumentEngine>("pdflatex");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [closing, setClosing] = useState("");

  const fillEditor = (document: DocumentRecord) => {
    setTitle(document.title);
    setLanguage(document.language ?? "");
    setEngine(document.engine);
    setRecipient(document.recipient ?? "");
    setSubject(document.subject ?? "");
    setBody(document.bodyParagraphs.join("\n\n"));
    setClosing(document.closing ?? "");
  };

  const refreshResolved = async (document: DocumentRecord) => {
    const [variant, resolved] = await Promise.all([
      window.aaaat.profile.resolveVariant(document.variantId),
      window.aaaat.documents.resolve(document.id),
    ]);
    setBaseItems(variant.items);
    setResolvedCount(resolved.items.length);
  };

  const acceptDocument = async (document: DocumentRecord) => {
    setDocuments((current) => {
      const found = current.some((item) => item.id === document.id);
      return found
        ? current.map((item) => (item.id === document.id ? document : item))
        : [...current, document];
    });
    setSelectedId(document.id);
    fillEditor(document);
    await refreshResolved(document);
  };

  useEffect(() => {
    let active = true;
    void Promise.all([window.aaaat.profile.current(), window.aaaat.documents.list()])
      .then(async ([currentProfile, currentDocuments]) => {
        if (!active) return;
        setProfile(currentProfile);
        setDocuments(currentDocuments);
        setNewVariantId(currentProfile.variants[0]?.id ?? "");
        const first = currentDocuments[0] ?? null;
        if (first) {
          setSelectedId(first.id);
          fillEditor(first);
          await refreshResolved(first);
        }
      })
      .catch(() => {
        if (active) setError("AAAAT could not load documents.");
      });
    return () => {
      active = false;
    };
  }, []);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (!newVariantId) return;
    setError(null);
    setNotice(null);
    try {
      const created = await window.aaaat.documents.create({
        kind: newKind,
        title: newTitle.trim(),
        variantId: newVariantId,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      setNewTitle("");
      await acceptDocument(created);
    } catch {
      setError("Check the document title and selected profile variant.");
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      await acceptDocument(
        await window.aaaat.documents.update({
          id: selected.id,
          title: title.trim(),
          language: optional(language),
          engine,
          recipient: optional(recipient),
          subject: optional(subject),
          bodyParagraphs: paragraphs(body),
          closing: optional(closing),
        }),
      );
      setNotice("Structured document content saved.");
    } catch {
      setError("Check the document fields and try again.");
    }
  };

  const select = async (document: DocumentRecord) => {
    setSelectedId(document.id);
    fillEditor(document);
    setError(null);
    setNotice(null);
    try {
      await refreshResolved(document);
    } catch {
      setError("AAAAT could not resolve this document.");
    }
  };

  const remove = async () => {
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      const next = await window.aaaat.documents.remove(selected.id);
      setDocuments(next);
      const first = next[0] ?? null;
      setSelectedId(first?.id ?? null);
      setBaseItems([]);
      setResolvedCount(0);
      if (first) {
        fillEditor(first);
        await refreshResolved(first);
      }
    } catch {
      setError("AAAAT could not remove that document.");
    }
  };

  const render = async () => {
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      const rendered = await window.aaaat.documents.render(selected.id);
      await acceptDocument(rendered);
      setNotice(`Rendered PDF: ${rendered.artifactPath}`);
    } catch {
      setError("Rendering failed. Install a compatible TeX distribution with latexmk and the selected engine.");
    }
  };

  const exportProject = async () => {
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      const result = await window.aaaat.documents.exportProject(selected.id);
      if (result) setNotice(`Portable project exported: ${result.exportedPath}`);
    } catch {
      setError("AAAAT could not export the document project to that folder.");
    }
  };

  const regenerate = async () => {
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      const regenerated = await window.aaaat.documents.regenerate(selected.id);
      await acceptDocument(regenerated);
      setNotice("Managed source regenerated from structured content.");
    } catch {
      setError("AAAAT could not regenerate the managed document source.");
    }
  };

  const applyItem = async (event: FormEvent<HTMLFormElement>, item: ProfileItem) => {
    event.preventDefault();
    if (!selected) return;
    const data = new FormData(event.currentTarget);
    const included = data.get("included") === "on";
    const overrideTitle = String(data.get("overrideTitle") ?? "").trim();
    const overrideDescription = String(data.get("overrideDescription") ?? "").trim();
    const existing = selected.rules.find((rule) => rule.itemId === item.id);
    const patch: Record<string, string> = { ...(existing?.contentPatch ?? {}) };
    if (overrideTitle) patch.title = overrideTitle;
    else delete patch.title;
    if (overrideDescription) patch.description = overrideDescription;
    else delete patch.description;
    setError(null);
    try {
      await acceptDocument(
        await window.aaaat.documents.configureItem({
          documentId: selected.id,
          itemId: item.id,
          included,
          contentPatch:
            Object.keys(patch).length === 0 ? null : (patch as ProfileItemContentPatch),
        }),
      );
    } catch {
      setError("AAAAT could not apply that document-specific item rule.");
    }
  };

  const moveItem = async (itemId: string, offset: -1 | 1) => {
    if (!selected) return;
    const ids = orderedItems.map((item) => item.id);
    const index = ids.indexOf(itemId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= ids.length) return;
    const first = ids[index];
    const second = ids[target];
    if (!first || !second) return;
    ids[index] = second;
    ids[target] = first;
    setError(null);
    try {
      await acceptDocument(
        await window.aaaat.documents.reorder({ documentId: selected.id, itemIds: ids }),
      );
    } catch {
      setError("AAAAT could not reorder this document.");
    }
  };

  if (!profile) {
    return <section className="documents-workspace"><p>{error ?? "Loading documents..."}</p></section>;
  }

  return (
    <section className="documents-workspace" aria-label="Documents">
      <div className="documents-sidebar">
        <div className="section-heading">
          <div><p className="eyebrow">VCVGenerator</p><h2>Documents</h2></div>
          <span>{documents.length}</span>
        </div>

        {profile.variants.length === 0 ? (
          <p>Create a focused profile variant before creating a document.</p>
        ) : (
          <form className="document-create" onSubmit={(event) => void create(event)}>
            <label>Type<select value={newKind} onChange={(event) => setNewKind(event.target.value as DocumentKind)}><option value="cv">CV</option><option value="cover_letter">Cover letter</option></select></label>
            <label>Title<input required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /></label>
            <label>Profile variant<select value={newVariantId} onChange={(event) => setNewVariantId(event.target.value)}>{profile.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>
            <button className="compact-primary" type="submit">Create document</button>
          </form>
        )}

        <div className="document-list">
          {documents.map((document) => (
            <button className={document.id === selectedId ? "active-document" : ""} type="button" key={document.id} onClick={() => void select(document)}>
              <strong>{document.title}</strong><span>{document.kind === "cv" ? "CV" : "Cover letter"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="document-editor">
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        {notice ? <p className="document-notice" role="status">{notice}</p> : null}
        {!selected ? (
          <div className="document-empty"><h2>Create a manual CV or cover letter.</h2><p>Select a focused profile variant, then specialize the document without changing your profile.</p></div>
        ) : (
          <>
            <div className="section-heading"><div><p className="eyebrow">{selected.mode === "managed" ? "Managed source" : "Manual TeX mode"}</p><h2>{selected.title}</h2></div><span>{resolvedCount} selected items</span></div>
            {selected.mode === "manual" ? (
              <div className="manual-source-warning"><p>Direct TeX edits were detected. AAAAT will preserve them and will not silently regenerate the source.</p><button type="button" onClick={() => void regenerate()}>Replace manual source from structured data</button></div>
            ) : null}

            <form className="document-fields" onSubmit={(event) => void save(event)}>
              <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>Language<input value={language} onChange={(event) => setLanguage(event.target.value)} /></label>
              <label>TeX engine<select value={engine} onChange={(event) => setEngine(event.target.value as DocumentEngine)}>{engines.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
              {selected.kind === "cover_letter" ? (
                <>
                  <label>Recipient<input value={recipient} onChange={(event) => setRecipient(event.target.value)} /></label>
                  <label className="wide-field">Subject<input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
                  <label className="wide-field">Body paragraphs<textarea rows={8} value={body} onChange={(event) => setBody(event.target.value)} /></label>
                  <label className="wide-field">Closing<input value={closing} onChange={(event) => setClosing(event.target.value)} /></label>
                </>
              ) : null}
              <div className="document-actions wide-field">
                <button className="compact-primary" type="submit">Save structured content</button>
                <button type="button" onClick={() => void render()}>Render PDF</button>
                <button type="button" onClick={() => void exportProject()}>Export portable project</button>
                <button type="button" onClick={() => void remove()}>Remove document</button>
              </div>
            </form>

            <div className="document-paths">
              <p><span>Source</span><code>{selected.sourcePath}</code></p>
              <p><span>PDF</span><code>{selected.artifactPath}</code></p>
            </div>

            <div className="document-items">
              <div className="section-heading"><div><p className="eyebrow">Document-specific</p><h3>Selection and overrides</h3></div></div>
              {orderedItems.map((item, index) => {
                const rule = selected.rules.find((candidate) => candidate.itemId === item.id);
                return (
                  <form className="document-item" key={item.id} onSubmit={(event) => void applyItem(event, item)}>
                    <div><span className="item-kind">{item.kind}</span><strong>{item.title}</strong></div>
                    <label className="include-control"><input name="included" type="checkbox" defaultChecked={!rule?.excluded} /> Include</label>
                    <label>Override title<input name="overrideTitle" defaultValue={rule?.contentPatch?.title ?? ""} /></label>
                    <label className="wide-field">Override description<textarea name="overrideDescription" defaultValue={rule?.contentPatch?.description ?? ""} /></label>
                    <div className="document-item-actions wide-field">
                      <button type="submit">Apply item rule</button>
                      <button type="button" disabled={index === 0} onClick={() => void moveItem(item.id, -1)}>Up</button>
                      <button type="button" disabled={index === orderedItems.length - 1} onClick={() => void moveItem(item.id, 1)}>Down</button>
                    </div>
                  </form>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
