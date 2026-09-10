import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

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
import { CvExternalContentAccessPanel } from "./CvExternalContentAccessPanel";
import { DocumentAiAssistance } from "./DocumentAiAssistance";
import { useContextualHandoffs } from "./contextual-handoffs";
import "./documents.css";

type DocumentView = "content" | "professional-information" | "output";

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
  const {
    documentHandoff,
    openProfessionalInformationItem,
    openSettingsFor,
    returnToCandidature,
  } = useContextualHandoffs();
  const initialRequestedDocumentId = useRef(documentHandoff?.documentId);
  const [profile, setProfile] = useState<ProfileSnapshot | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [candidatures, setCandidatures] = useState<CandidatureRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [baseItems, setBaseItems] = useState<ProfileItem[]>([]);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [renderSettingsSuggested, setRenderSettingsSuggested] = useState(false);
  const [artifacts, setArtifacts] = useState<ApplicationArtifactRecord[]>([]);
  const [capturingArtifact, setCapturingArtifact] = useState(false);
  const [descriptorDirty, setDescriptorDirty] = useState(false);
  const [assistanceDirty, setAssistanceDirty] = useState(false);
  const [documentView, setDocumentView] = useState<DocumentView>("content");
  const [compactDocumentOpen, setCompactDocumentOpen] = useState(false);
  const [renderedResultId, setRenderedResultId] = useState<string | null>(null);

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
  const contextCandidature = useMemo(
    () =>
      documentHandoff?.candidatureId
        ? candidatures.find((candidature) => candidature.id === documentHandoff.candidatureId) ?? null
        : null,
    [candidatures, documentHandoff],
  );
  const canCaptureArtifact = Boolean(
    selected && contextCandidature?.documentIds.includes(selected.id),
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
  const newDocumentDirty = newKind !== "cv" || newTitle.length > 0 || newVariantId !== "";

  useEffect(() => {
    onDirtyChange?.(editorDirty || newDocumentDirty || descriptorDirty || assistanceDirty);
    return () => onDirtyChange?.(false);
  }, [assistanceDirty, descriptorDirty, editorDirty, newDocumentDirty, onDirtyChange]);

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

        const requestedId = initialRequestedDocumentId.current;
        const requested = requestedId
          ? currentDocuments.find((document) => document.id === requestedId) ?? null
          : null;
        const first = requested ?? currentDocuments[0] ?? null;
        if (first) {
          setSelectedId(first.id);
          fillEditor(first);
          await refreshResolved(first);
          if (requested) setCompactDocumentOpen(true);
        }
      })
      .catch(() => {
        if (active) setError("AAAAT could not load CVs and letters.");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const requestedId = documentHandoff?.documentId;
    if (!requestedId || requestedId === selectedId) return;
    let active = true;
    void window.aaaat.documents
      .list()
      .then(async (currentDocuments) => {
        if (!active) return;
        const requested = currentDocuments.find((document) => document.id === requestedId);
        if (!requested) {
          setError("That linked CV or letter is no longer available.");
          return;
        }
        setDocuments(currentDocuments);
        setSelectedId(requested.id);
        setAssistanceDirty(false);
        fillEditor(requested);
        setDocumentView("content");
        setCompactDocumentOpen(true);
        setError(null);
        setNotice(null);
        await refreshResolved(requested);
      })
      .catch(() => {
        if (active) setError("AAAAT could not open that linked CV or letter.");
      });
    return () => {
      active = false;
    };
  }, [documentHandoff?.documentId, selectedId]);

  useEffect(() => {
    const candidatureId = documentHandoff?.candidatureId;
    if (!candidatureId) return;
    let active = true;
    void window.aaaat.artifacts
      .list(candidatureId)
      .then((retained) => {
        if (active) setArtifacts(retained);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load retained application artifacts.");
      });
    return () => {
      active = false;
    };
  }, [documentHandoff?.candidatureId]);

  const create = async (event: FormEvent) => {
    event.preventDefault();
    if (
      (editorDirty || descriptorDirty || assistanceDirty) &&
      !window.confirm("Discard unsaved document edits and create a new document?")
    ) {
      return;
    }
    setError(null);
    setNotice(null);
    setRenderSettingsSuggested(false);
    try {
      const created = await window.aaaat.documents.create({
        kind: newKind,
        title: newTitle.trim(),
        variantId: newVariantId || null,
        engine: "pdflatex",
        bodyParagraphs: [],
      });
      if (contextCandidature) {
        const linked = await window.aaaat.candidatures.setDocuments({
          candidatureId: contextCandidature.id,
          documentIds: [...new Set([...contextCandidature.documentIds, created.id])],
        });
        setCandidatures((current) =>
          current.map((candidate) => (candidate.id === linked.id ? linked : candidate)),
        );
      }
      setNewTitle("");
      setAssistanceDirty(false);
      await acceptSavedDocument(created);
      setDocumentView("content");
      setCompactDocumentOpen(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Check the document title and professional information.",
      );
    }
  };

  const persistCurrentDocument = async (): Promise<DocumentRecord | null> => {
    if (!selected) return null;
    const saved = await window.aaaat.documents.update({
      id: selected.id,
      title: title.trim(),
      language: optional(language),
      engine: "pdflatex",
      recipient: optional(recipient),
      subject: optional(subject),
      bodyParagraphs: paragraphs(body),
      closing: optional(closing),
    });
    await acceptSavedDocument(saved);
    return saved;
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      await persistCurrentDocument();
      setNotice("Document changes saved.");
    } catch {
      setError("Check the document fields and try again.");
    }
  };

  const prepareCurrentDocumentForAi = async (): Promise<DocumentRecord | null> => {
    if (!selected) return null;
    if (!editorDirty) return selected;
    if (!window.confirm("Save current document changes before using AI assistance?")) return null;
    setError(null);
    setNotice(null);
    try {
      const saved = await persistCurrentDocument();
      if (saved) setNotice("Document changes saved before AI assistance.");
      return saved;
    } catch {
      setError("AAAAT could not save the current document for AI assistance.");
      return null;
    }
  };

  const select = async (document: DocumentRecord) => {
    if (document.id === selectedId) {
      setCompactDocumentOpen(true);
      return;
    }
    if (
      (editorDirty || descriptorDirty || assistanceDirty) &&
      !window.confirm("Discard unsaved document edits and switch documents?")
    ) {
      return;
    }
    setSelectedId(document.id);
    setAssistanceDirty(false);
    fillEditor(document);
    setDocumentView("content");
    setCompactDocumentOpen(true);
    setError(null);
    setNotice(null);
    setRenderSettingsSuggested(false);
    try {
      await refreshResolved(document);
    } catch {
      setError("AAAAT could not resolve this document.");
    }
  };

  const remove = async () => {
    if (!selected) return;
    const confirmed = window.confirm(
      editorDirty || descriptorDirty || assistanceDirty
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
      setAssistanceDirty(false);
      setBaseItems([]);
      setResolvedCount(0);
      setDocumentView("content");
      setCompactDocumentOpen(false);
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
      setError("Save document changes before rendering.");
      return;
    }
    setError(null);
    setNotice(null);
    setRenderSettingsSuggested(false);
    try {
      const rendered = await window.aaaat.documents.render(selected.id);
      await acceptAdjacentDocument(rendered);
      setRenderedResultId(rendered.id);
      setNotice("PDF rendered successfully. Open the result below.");
    } catch {
      setError("Rendering failed. Check Document rendering in Settings for local TeX status and setup guidance.");
      setRenderSettingsSuggested(true);
    }
  };

  const openRenderedOutput = async () => {
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      await window.aaaat.documentOutput.open(selected.id);
      setNotice("Opened the rendered PDF.");
    } catch {
      setError("AAAAT could not open the rendered PDF. Render this document again and try opening the result.");
    }
  };

  const exportProject = async () => {
    if (!selected) return;
    if (editorDirty) {
      setError("Save document changes before exporting the portable project.");
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
      setError("Save document changes before replacing generated source.");
      return;
    }
    setError(null);
    setNotice(null);
    try {
      const regenerated = await window.aaaat.documents.regenerate(selected.id);
      await acceptAdjacentDocument(regenerated);
      setNotice("Generated data refreshed from the current document information.");
    } catch {
      setError("AAAAT could not regenerate the managed document source.");
    }
  };

  const captureArtifact = async () => {
    if (!selected || !contextCandidature || !canCaptureArtifact) return;
    if (editorDirty) {
      setError("Save document changes before retaining an application artifact.");
      return;
    }
    setCapturingArtifact(true);
    setError(null);
    setNotice(null);
    try {
      const captured = await window.aaaat.artifacts.capture({
        candidatureId: contextCandidature.id,
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
      setError("AAAAT could not apply that document-specific change.");
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
    return (
      <section className="documents-workspace" aria-label="CVs & letters">
        <p>{error ?? "Loading CVs and letters..."}</p>
      </section>
    );
  }

  const selectedVariation = selected?.variantId
    ? profile.variants.find((variant) => variant.id === selected.variantId)?.name ?? "Saved variation"
    : null;

  return (
    <section
      className={`documents-workspace${compactDocumentOpen && selected ? " compact-document-detail" : ""}`}
      aria-label="CVs & letters"
    >
      <div className="documents-sidebar">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Working documents</p>
            <h2>CVs & letters</h2>
          </div>
          <span>{documents.length}</span>
        </div>

        <form className="document-create" onSubmit={(event) => void create(event)}>
          {contextCandidature ? (
            <p className="wide-field document-notice">New work will be associated with {contextCandidature.label}.</p>
          ) : null}
          <label>
            Type
            <select
              value={newKind}
              onChange={(event) => setNewKind(event.target.value as DocumentKind)}
            >
              <option value="cv">CV</option>
              <option value="cover_letter">Cover letter</option>
            </select>
          </label>
          <label>
            Title
            <input required value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
          </label>
          <label>
            Professional information
            <select value={newVariantId} onChange={(event) => setNewVariantId(event.target.value)}>
              <option value="">Default professional information</option>
              {profile.variants.length > 0 ? (
                <optgroup label="Saved variations">
                  {profile.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>{variant.name}</option>
                  ))}
                </optgroup>
              ) : null}
            </select>
          </label>
          <button className="compact-primary" type="submit">
            {newKind === "cv" ? "Create CV" : "Create cover letter"}
          </button>
        </form>

        <div className="document-list" aria-label="Working CVs and letters">
          {documents.length === 0 ? <p>No CVs or letters yet.</p> : null}
          {documents.map((document) => (
            <button
              className={document.id === selectedId ? "active-document" : ""}
              type="button"
              key={document.id}
              onClick={() => void select(document)}
            >
              <strong>{document.title}</strong>
              <span>{document.kind === "cv" ? "CV" : "Cover letter"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="document-editor">
        {contextCandidature ? (
          <div className="contextual-return-bar" role="status">
            <span>For: {contextCandidature.label}</span>
            <button className="compact-secondary" type="button" onClick={returnToCandidature}>
              Return to {contextCandidature.label}
            </button>
          </div>
        ) : null}
        {selected ? (
          <button
            className="compact-document-back"
            type="button"
            onClick={() => setCompactDocumentOpen(false)}
          >
            Back to CVs & letters
          </button>
        ) : null}
        {error ? (
          <div>
            <p className="error-message" role="alert">{error}</p>
            {renderSettingsSuggested ? (
              <button className="compact-secondary" type="button" onClick={() => openSettingsFor("rendering", "documents")}>
                Open Document rendering settings
              </button>
            ) : null}
          </div>
        ) : null}
        {notice ? <p className="document-notice" role="status">{notice}</p> : null}

        {!selected ? (
          <div className="document-empty">
            <h2>Create a CV or cover letter.</h2>
            <p>
              Start with your default professional information or an optional saved variation. AI and local rendering are not required to create or edit a document.
            </p>
          </div>
        ) : (
          <>
            <div className="section-heading document-context-heading">
              <div>
                <p className="eyebrow">{selected.kind === "cv" ? "CV" : "Cover letter"}</p>
                <h2>{selected.title}</h2>
              </div>
              <span>{editorDirty || descriptorDirty || assistanceDirty ? "Unsaved changes" : "Working document"}</span>
            </div>

            <div className="document-local-nav" role="tablist" aria-label="Document work">
              {([
                ["content", "Content"],
                ["professional-information", "Professional information"],
                ["output", "Output"],
              ] as const).map(([view, label]) => (
                <button
                  key={view}
                  type="button"
                  role="tab"
                  aria-selected={documentView === view}
                  className={documentView === view ? "active-document-view" : ""}
                  onClick={() => setDocumentView(view)}
                >
                  {label}
                </button>
              ))}
            </div>

            <section
              className="document-local-panel"
              role="tabpanel"
              aria-label="Document content"
              hidden={documentView !== "content"}
            >
              {editorDirty ? (
                <p className="document-notice">
                  Unsaved document changes stay local. Save before rendering, exporting, or retaining application material.
                </p>
              ) : null}
              {selected.mode === "manual" ? (
                <div className="manual-source-warning">
                  <p>
                    Direct source edits were detected. AAAAT will preserve them and will not silently replace the source.
                  </p>
                </div>
              ) : null}

              <form className="document-fields" onSubmit={(event) => void save(event)}>
                <label>
                  Title
                  <input required value={title} onChange={(event) => setTitle(event.target.value)} />
                </label>
                <label>
                  Language
                  <input value={language} onChange={(event) => setLanguage(event.target.value)} />
                </label>
                {selected.kind === "cover_letter" ? (
                  <>
                    <label>
                      Recipient
                      <input value={recipient} onChange={(event) => setRecipient(event.target.value)} />
                    </label>
                    <label className="wide-field">
                      Subject
                      <input value={subject} onChange={(event) => setSubject(event.target.value)} />
                    </label>
                    <label className="wide-field">
                      Body paragraphs
                      <textarea rows={8} value={body} onChange={(event) => setBody(event.target.value)} />
                    </label>
                    <label className="wide-field">
                      Closing
                      <input value={closing} onChange={(event) => setClosing(event.target.value)} />
                    </label>
                  </>
                ) : null}
                <div className="document-actions wide-field">
                  <button className="compact-primary" type="submit">Save changes</button>
                </div>
              </form>

              <DocumentAiAssistance
                key={`${selected.id}:${contextCandidature?.id ?? "standalone"}`}
                document={selected}
                candidatures={candidatures}
                contextCandidature={contextCandidature}
                profileItems={profile.items}
                documentDirty={editorDirty}
                onPrepareCurrentDocument={prepareCurrentDocumentForAi}
                onDiscardCurrentDocumentEdits={() => fillEditor(selected)}
                onDocumentApplied={acceptSavedDocument}
                onDirtyChange={setAssistanceDirty}
              />
            </section>

            <section
              className="document-local-panel"
              role="tabpanel"
              aria-label="Professional information in this document"
              hidden={documentView !== "professional-information"}
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Reusable source</p>
                  <h3>Professional information</h3>
                </div>
                <span>{resolvedCount} included</span>
              </div>
              <p className="document-section-intro">
                Using {selectedVariation ? `saved variation “${selectedVariation}”` : "default professional information"}. Changes below apply only to this document.
              </p>
              <div className="document-items">
                {orderedItems.length === 0 ? (
                  <p>No reusable professional information is available yet. The document remains editable.</p>
                ) : null}
                {orderedItems.map((item, index) => {
                  const rule = selected.rules.find((candidate) => candidate.itemId === item.id);
                  const formKey = `${selected.id}:${item.id}:${JSON.stringify(rule ?? null)}`;
                  return (
                    <form
                      className="document-item"
                      key={formKey}
                      onSubmit={(event) => void applyItem(event, item)}
                    >
                      <div>
                        <span className="item-kind">{item.kind}</span>
                        <strong>{item.title}</strong>
                        <button
                          type="button"
                          className="compact-secondary"
                          onClick={() => openProfessionalInformationItem(selected.id, item.id)}
                        >
                          Edit reusable source
                        </button>
                      </div>
                      <label className="include-control">
                        <input name="included" type="checkbox" defaultChecked={!rule?.excluded} /> Included
                      </label>
                      <label>
                        Change title for this document
                        <input name="overrideTitle" defaultValue={rule?.contentPatch?.title ?? ""} />
                      </label>
                      <label className="wide-field">
                        Change description for this document
                        <textarea
                          name="overrideDescription"
                          defaultValue={rule?.contentPatch?.description ?? ""}
                        />
                      </label>
                      <div className="document-item-actions wide-field">
                        <button type="submit">Apply changes</button>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => void moveItem(item.id, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          disabled={index === orderedItems.length - 1}
                          onClick={() => void moveItem(item.id, 1)}
                        >
                          Down
                        </button>
                      </div>
                    </form>
                  );
                })}
              </div>
            </section>

            <section
              className="document-local-panel"
              role="tabpanel"
              aria-label="Document output"
              hidden={documentView !== "output"}
            >
              {editorDirty ? (
                <p className="document-notice">
                  Save document changes before rendering or exporting. Your last rendered PDF remains separate from unsaved edits.
                </p>
              ) : null}

              <section className="document-result-card" aria-label="Rendered PDF result">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Result</p>
                    <h3>PDF output</h3>
                  </div>
                  <span>{renderedResultId === selected.id ? "Ready" : "Not rendered this session"}</span>
                </div>
                <p className="document-section-intro">
                  Render the saved working document, then open the resulting PDF directly.
                </p>
                <div className="document-actions document-output-actions">
                  <button className="compact-primary" type="button" disabled={editorDirty} onClick={() => void render()}>
                    Render PDF
                  </button>
                  {renderedResultId === selected.id ? (
                    <button type="button" onClick={() => void openRenderedOutput()}>Open PDF</button>
                  ) : null}
                  <button type="button" disabled={editorDirty} onClick={() => void exportProject()}>
                    Export portable project
                  </button>
                </div>
                {renderedResultId === selected.id ? (
                  <p className="document-result-ready">The current rendered PDF is ready to open.</p>
                ) : null}
              </section>

              <details className="document-advanced" open={selected.mode === "manual"}>
                <summary>Source & advanced ownership</summary>
                {selected.mode === "manual" ? (
                  <div className="manual-source-warning">
                    <p>
                      Direct source edits are preserved. Replacing them from structured information is deliberate and may overwrite those edits.
                    </p>
                    <button type="button" disabled={editorDirty} onClick={() => void regenerate()}>
                      Replace manual source from structured data
                    </button>
                  </div>
                ) : null}
                <div className="document-paths">
                  <p><span>Source</span><code>{selected.sourcePath}</code></p>
                  <p><span>PDF</span><code>{selected.artifactPath}</code></p>
                </div>
                <div className="document-actions document-advanced-actions">
                  <button type="button" onClick={() => void remove()}>Remove document</button>
                </div>
              </details>

              {selected.kind === "cv" ? (
                <details className="document-advanced">
                  <summary>External assistant privacy & integration</summary>
                  <CvAssistantDescriptorPanel
                    key={`descriptor:${selected.id}`}
                    document={selected}
                    onDirtyChange={setDescriptorDirty}
                    onError={setError}
                    onNotice={setNotice}
                  />
                  <CvExternalContentAccessPanel
                    key={`content-access:${selected.id}`}
                    document={selected}
                    disabled={editorDirty}
                    onError={setError}
                    onNotice={setNotice}
                  />
                </details>
              ) : null}
            </section>
          </>
        )}

        <div
          className="document-output-support"
          hidden={selected ? documentView !== "output" : false}
        >
          <details className="document-advanced">
            <summary>Combined CV + cover letter</summary>
            <CombinedDocumentExportPanel
              documents={documents}
              disabled={editorDirty}
              onError={setError}
              onNotice={setNotice}
            />
          </details>

          {contextCandidature ? (
            <details className="document-advanced">
              <summary>Application artifact for {contextCandidature.label}</summary>
              <section className="manual-source-warning" aria-label="Retained application artifacts">
                <h3>Retained application artifacts</h3>
                <p>
                  Preserve an exact snapshot only when this material is actually used for {contextCandidature.label}.
                </p>
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
                  <p>
                    Select a working document to retain another snapshot. Existing retained artifacts remain available here.
                  </p>
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
              </section>
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
