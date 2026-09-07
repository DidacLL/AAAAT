import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { ApplicationArtifactRecord } from "../shared/artifact-contracts";
import type {
  CandidatureRecord,
  DocumentKind,
  DocumentRecord,
  ProfileItem,
  ProfileItemContentPatch,
  ProfileSnapshot,
} from "../shared/contracts";
import { CombinedDocumentExportPanel } from "./CombinedDocumentExportPanel";
import { CvAssistantDescriptorPanel } from "./CvAssistantDescriptorPanel";
import "./documents.css";

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

export function DocumentsWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [candidatures, setCandidatures] = useState<CandidatureRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseItems, setBaseItems] = useState<ProfileItem[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [artifactCandidatureId, setArtifactCandidatureId] = useState("");
  const [artifacts, setArtifacts] = useState<ApplicationArtifactRecord[]>([]);
  const [capturingArtifact, setCapturingArtifact] = useState(false);
  const [descriptorDirty, setDescriptorDirty] = useState(false);

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
  const artifactCandidature = useMemo(
    () => candidatures.find((candidature) => candidature.id === artifactCandidatureId) ?? null,
    [artifactCandidatureId, candidatures],
  );
  const canCaptureArtifact = Boolean(
    selected && artifactCandidature?.documentIds.includes(selected.id),
  );

  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState("");
  const [recipient, setRecipient] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [closing, setClosing] = useState("");

  const fillEditor = (document: DocumentRecord) => {
    setTitle(document.title);
    setLanguage(document.language ?? "");
    setRecipient(document.recipient ?? "");
    setSubject(document.subject ?? "");
    setBody(document.bodyParagraphs.join("\n\n"));
    setClosing(document.closing ?? "");
  };

  const editorDirty = selected
    ? title !== selected.title ||
      language !== (selected.language ?? "") ||
      recipient !== (selected.recipient ?? "") ||
      subject !== (selected.subject ?? "") ||
      body !== selected.bodyParagraphs.join("\n\n") ||
      closing !== (selected.closing ?? "")
    : false;
  const newDocumentDirty =
    newKind !== "cv" ||
    newTitle.length > 0 ||
    newVariantId !== "";

  useEffect(() => {
    onDirtyChange?.(editorDirty || newDocumentDirty || descriptorDirty);
    return () => onDirtyChange?.(false);
  }, [descriptorDirty, editorDirty, newDocumentDirty, onDirtyChange]);

  const refreshResolved = async (document: DocumentRecord) => {
    const [basis, resolved] = await Promise.all([
      document.variantId === null
        ? window.aaaat.profile.current()
        : window.aaaat.profile.resolveVariant(document.variantId),
      window.aaaat.documents.resolve(document.id),
    ]);
    setBaseItems(basis.items);
    setResolvedCount(resolved.items.length);
  };

  const storeDocument = (document: DocumentRecord) => {
    setDocuments((current) => {
      const found = current.some((item) => item.id === document.id);
      return found
        ? current.map((item) => (item.id === document.id ? document : item))
        : [...current, document];
    });
  };

  const acceptSavedDocument = async (document: DocumentRecord) => {
    storeDocument(document);
    setSelectedId(document.id);
    fillEditor(document);
    await refreshResolved(document);
  };

  const acceptAdjacentDocument = async (document: DocumentRecord) => {
    storeDocument(document);
    await refreshResolved(document);
  };

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.profile.current(),
      window.aaaat.documents.list(),
      window.aaaat.candidatures.list(),
    ])
      .then(async ([currentProfile, currentDocuments, currentCandidatures]) => {
        if (!active) return;
        setProfile(currentProfile);
        setDocuments(currentDocuments);
        setCandidatures(currentCandidatures);
        setNewVariantId("");

        const firstCandidature = currentCandidatures[0] ?? null;
        setArtifactCandidatureId(firstCandidature?.id ?? "");
        if (firstCandidature) {
          const retained = await window.aaaat.artifacts.list(firstCandidature.id);
          if (active) setArtifacts(retained);
        }

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
    if (
      (editorDirty || descriptorDirty) &&
      !window.confirm("Discard unsaved document edits and create a new document?")
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const created = await window.aaaat.documents.create({
        kind: newKind,
        title: newTitle.trim(),
        variantId: newVariantId || null,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      setNewTitle("");
      await acceptSavedDocument(created);
    } catch {
      setError("Check the document title and profile basis.");
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      await acceptSavedDocument(
        await window.aaaat.documents.update({
          id: selected.id,
          title: title.trim(),
          language: optional(language),
          engine: "pdflatex",
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
    if (document.id === selectedId) return;
    if (
      (editorDirty || descriptorDirty) &&
      !window.confirm("Discard unsaved document edits and switch documents?")
    ) {
      return;
    }
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
    const confirmed = window.confirm(
      editorDirty || descriptorDirty
        ? "Remove this document and discard its unsaved edits?"
        : "Remove this document?",
    );
    if (!confirmed) return;
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
    if (editorDirty) {
      setError("Save structured content before rendering the persisted document.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const rendered = await window.aaaat.documents.render(selected.id);
      await acceptAdjacentDocument(rendered);
      setNotice(`Rendered PDF: ${rendered.artifactPath}`);
    } catch {
      setError("Rendering failed. Install a compatible TeX distribution with latexmk and pdfLaTeX.");
    }
  };

  const exportProject = async () => {
    if (!selected) return;
    if (editorDirty) {
      setError("Save structured content before exporting the persisted document.");
      return;
    }
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
    if (editorDirty) {
      setError("Save structured content before regenerating managed source.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const regenerated = await window.aaaat.documents.regenerate(selected.id);
      await acceptAdjacentDocument(regenerated);
      setNotice("Managed source regenerated from structured content.");
    } catch {
      setError("AAAAT could not regenerate the managed document source.");
    }
  };

  const chooseArtifactCandidature = async (candidatureId: string) => {
    setArtifactCandidatureId(candidatureId);
    setError(null);
    try {
      setArtifacts(candidatureId ? await window.aaaat.artifacts.list(candidatureId) : []);
    } catch {
      setError("AAAAT could not load retained application artifacts.");
    }
  };

  const captureArtifact = async () => {
    if (!selected || !artifactCandidatureId || !canCaptureArtifact) return;
    if (editorDirty) {
      setError("Save structured content before retaining an application artifact.");
      return;
    }
    setCapturingArtifact(true);
    setError(null);
    setNotice(null);
    try {
      const captured = await window.aaaat.artifacts.capture({
        candidatureId: artifactCandidatureId,
        documentId: selected.id,
      });
      setArtifacts((current) => [captured, ...current.filter((artifact) => artifact.id !== captured.id)]);
      setNotice(`Retained application artifact: ${captured.artifactPath}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not retain this application artifact.",
      );
    } finally {
      setCapturingArtifact(false);
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
      await acceptAdjacentDocument(
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
      await acceptAdjacentDocument(
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

        <form className="document-create" onSubmit={(event) => void create(event)}>
          <label>Type<select value={newKind} onChange={(event) => setNewKind(event.target.value as DocumentKind)}><option value="cv">CV</option><option value="cover_letter">Cover letter</option></select></label>
          <label>Title<input required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} /></label>
          <label>Profile basis<select value={newVariantId} onChange={(event) => setNewVariantId(event.target.value)}><option value="">Canonical profile</option>{profile.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select></label>
          <button className="compact-primary" type="submit">Create document</button>
        </form>

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
          <div className="document-empty"><h2>Create a manual CV or cover letter.</h2><p>Start from your canonical profile, optionally apply a focused variant, then specialize the document without changing your profile.</p></div>
        ) : (
          <>
            <div className="section-heading"><div><p className="eyebrow">{selected.mode === "managed" ? "Managed source" : "Manual TeX mode"}</p><h2>{selected.title}</h2></div><span>{resolvedCount} selected items</span></div>
            {editorDirty ? <p className="document-notice">Unsaved structured edits are local. Save before rendering, exporting, or retaining application material.</p> : null}
            {selected.mode === "manual" ? (
              <div className="manual-source-warning"><p>Direct TeX edits were detected. AAAAT will preserve them and will not silently regenerate the source.</p><button type="button" disabled={editorDirty} onClick={() => void regenerate()}>Replace manual source from structured data</button></div>
            ) : null}

            <form className="document-fields" onSubmit={(event) => void save(event)}>
              <label>Title<input required value={title} onChange={(event) => setTitle(event.target.value)} /></label>
              <label>Language<input value={language} onChange={(event) => setLanguage(event.target.value)} /></label>
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
                <button type="button" disabled={editorDirty} onClick={() => void render()}>Render PDF</button>
                <button type="button" disabled={editorDirty} onClick={() => void exportProject()}>Export portable project</button>
                <button type="button" onClick={() => void remove()}>Remove document</button>
              </div>
            </form>

            {selected.kind === "cv" ? (
              <CvAssistantDescriptorPanel
                key={selected.id}
                document={selected}
                onDirtyChange={setDescriptorDirty}
                onError={setError}
                onNotice={setNotice}
              />
            ) : null}

            <div className="document-paths">
              <p><span>Source</span><code>{selected.sourcePath}</code></p>
              <p><span>PDF</span><code>{selected.artifactPath}</code></p>
            </div>

            <div className="document-items">
              <div className="section-heading"><div><p className="eyebrow">Document-specific</p><h3>Selection and overrides</h3></div></div>
              {orderedItems.map((item, index) => {
                const rule = selected.rules.find((candidate) => candidate.itemId === item.id);
                const formKey = `${selected.id}:${item.id}:${JSON.stringify(rule ?? null)}`;
                return (
                  <form className="document-item" key={formKey} onSubmit={(event) => void applyItem(event, item)}>
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

        <CombinedDocumentExportPanel
          documents={documents}
          disabled={editorDirty}
          onError={setError}
          onNotice={setNotice}
        />

        <section className="manual-source-warning" aria-label="Retained application artifacts">
          <h3>Retained application artifacts</h3>
          {candidatures.length === 0 ? (
            <p>Create a candidature before retaining application material.</p>
          ) : (
            <>
              <label>
                Candidature
                <select
                  value={artifactCandidatureId}
                  onChange={(event) => void chooseArtifactCandidature(event.target.value)}
                >
                  {candidatures.map((candidature) => (
                    <option key={candidature.id} value={candidature.id}>{candidature.label}</option>
                  ))}
                </select>
              </label>
              {selected ? (
                canCaptureArtifact ? (
                  <button
                    type="button"
                    disabled={editorDirty || capturingArtifact}
                    onClick={() => void captureArtifact()}
                  >
                    {capturingArtifact ? "Retaining…" : "Retain application artifact"}
                  </button>
                ) : (
                  <p>Associate the selected working document with this candidature before retaining it.</p>
                )
              ) : (
                <p>Select a working document to retain another snapshot. Existing retained artifacts remain available here.</p>
              )}
              {artifacts.length === 0 ? (
                <p>No retained application artifacts for this candidature.</p>
              ) : (
                <div className="document-paths">
                  {artifacts.map((artifact) => (
                    <article key={artifact.id}>
                      <strong>{artifact.title}</strong>
                      <p>{new Date(artifact.capturedAt).toLocaleString()}</p>
                      <p><span>Retained source</span><code>{artifact.sourcePath}</code></p>
                      <p><span>Retained PDF</span><code>{artifact.artifactPath}</code></p>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  );
}
