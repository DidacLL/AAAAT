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
import { ApplicationArtifactsPanel } from "./ApplicationArtifactsPanel";
import { CombinedDocumentExportPanel } from "./CombinedDocumentExportPanel";
import { CvAssistantDescriptorPanel } from "./CvAssistantDescriptorPanel";
import { CvExternalContentAccessPanel } from "./CvExternalContentAccessPanel";
import { DocumentAiAssistance } from "./DocumentAiAssistance";
import {
  applicationPreparationTaskKey,
  type ApplicationPreparationResult,
} from "./application-document-preparation";
import { useAiTask } from "./ai-task-store";
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

function itemSummary(item: ProfileItem): string {
  return [item.subtitle, item.startDate && item.endDate ? `${item.startDate} – ${item.endDate}` : item.startDate ?? item.endDate]
    .filter(Boolean)
    .join(" · ");
}

export function DocumentWork({
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
  const [resolvedItems, setResolvedItems] = useState<ProfileItem[]>([]);
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
  const preparationTask = useAiTask<ApplicationPreparationResult>(
    contextCandidature ? applicationPreparationTaskKey(contextCandidature.id) : "application-material:none",
  );
  const preparationActive = preparationTask?.status === "queued" || preparationTask?.status === "working";
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
    setResolvedItems(resolved.items);
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
        if (active) setError("AAAAT could not load Documents.");
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
    if (preparationTask?.status !== "completed") return;
    let active = true;
    void window.aaaat.documents.list().then(async (currentDocuments) => {
      if (!active) return;
      setDocuments(currentDocuments);
      const current = selectedId
        ? currentDocuments.find((document) => document.id === selectedId) ?? null
        : null;
      if (current && !editorDirty) {
        fillEditor(current);
        await refreshResolved(current);
      }
    }).catch(() => {
      if (active) setError("Automatic preparation finished, but AAAAT could not refresh this document.");
    });
    return () => {
      active = false;
    };
  }, [preparationTask?.status]);

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
        if (active) setError("AAAAT could not load saved application PDFs.");
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
    ) return;
    setError(null);
    setNotice(null);
    setRenderSettingsSuggested(false);
    try {
      const created = await window.aaaat.documents.create({
        kind: newKind,
        title: newTitle.trim() || (newKind === "cv" ? "CV" : "Cover letter"),
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
      setNewKind("cv");
      setNewTitle("");
      setNewVariantId("");
      setAssistanceDirty(false);
      await acceptSavedDocument(created);
      setDocumentView("content");
      setCompactDocumentOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not create that document.");
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
    if (!selected || preparationActive) return;
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
    if (!selected || preparationActive) return null;
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
    ) return;
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
    if (!selected || preparationActive) return;
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
      setResolvedItems([]);
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
    if (!selected || preparationActive) return;
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

  const openSourceProject = async () => {
    if (!selected) return;
    setError(null);
    setNotice(null);
    try {
      await window.aaaat.documentOutput.openProject(selected.id);
      setNotice("Opened the live document source project.");
    } catch {
      setError("AAAAT could not open the live document source project.");
    }
  };

  const exportProject = async () => {
    if (!selected || preparationActive) return;
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
    if (!selected || preparationActive) return;
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
    if (!selected || !contextCandidature || !canCaptureArtifact || preparationActive) return;
    if (editorDirty) {
      setError("Save document changes before saving an application PDF.");
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
      setNotice(`Saved application PDF: ${captured.artifactPath}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this application PDF.");
    } finally {
      setCapturingArtifact(false);
    }
  };

  const applyItem = async (event: FormEvent<HTMLFormElement>, item: ProfileItem) => {
    event.preventDefault();
    if (!selected || preparationActive) return;
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
          contentPatch: Object.keys(patch).length === 0 ? null : (patch as ProfileItemContentPatch),
        }),
      );
    } catch {
      setError("AAAAT could not apply that document-specific change.");
    }
  };

  const moveItem = async (itemId: string, offset: -1 | 1) => {
    if (!selected || preparationActive) return;
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
      <section className="documents-workspace" aria-label="Documents">
        <p>{error ?? "Loading Documents..."}</p>
      </section>
    );
  }

  const selectedVariation = selected?.variantId
    ? profile.variants.find((variant) => variant.id === selected.variantId)?.name ?? "Saved variation"
    : null;
  const resolvedIds = new Set(resolvedItems.map((item) => item.id));
  const notUsedItems = orderedItems.filter((item) => !resolvedIds.has(item.id));

  const adjustmentForm = (item: ProfileItem, included: boolean, index: number) => {
    if (!selected) return null;
    const rule = selected.rules.find((candidate) => candidate.itemId === item.id);
    const formKey = `${selected.id}:${item.id}:${JSON.stringify(rule ?? null)}`;
    return (
      <form className="document-item-adjustment" key={formKey} onSubmit={(event) => void applyItem(event, item)}>
        <label className="include-control">
          <input name="included" type="checkbox" defaultChecked={included} disabled={preparationActive} />
          Use in this document
        </label>
        <label>
          Document-specific title
          <input name="overrideTitle" defaultValue={rule?.contentPatch?.title ?? ""} disabled={preparationActive} />
        </label>
        <label>
          Document-specific description
          <textarea name="overrideDescription" rows={4} defaultValue={rule?.contentPatch?.description ?? ""} disabled={preparationActive} />
        </label>
        <div className="document-item-actions">
          <button type="submit" disabled={preparationActive}>Apply</button>
          <button type="button" disabled={preparationActive || index === 0} onClick={() => void moveItem(item.id, -1)}>Up</button>
          <button type="button" disabled={preparationActive || index === orderedItems.length - 1} onClick={() => void moveItem(item.id, 1)}>Down</button>
          <button type="button" className="compact-secondary" onClick={() => openProfessionalInformationItem(selected.id, item.id)}>
            Edit reusable information
          </button>
        </div>
      </form>
    );
  };

  return (
    <section
      className={`documents-workspace${compactDocumentOpen && selected ? " compact-document-detail" : ""}`}
      aria-label="Documents"
    >
      <div className="documents-sidebar">
        <div className="section-heading">
          <div><p className="eyebrow">CVs &amp; letters</p><h2>Documents</h2></div>
          <span>{documents.length}</span>
        </div>

        <form className="document-create" onSubmit={(event) => void create(event)}>
          {contextCandidature ? <p className="document-notice">New work will stay with this application.</p> : null}
          <label>
            Type
            <select value={newKind} onChange={(event) => setNewKind(event.target.value as DocumentKind)}>
              <option value="cv">CV</option>
              <option value="cover_letter">Cover letter</option>
            </select>
          </label>
          <label>
            Name <small>optional</small>
            <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={newKind === "cv" ? "CV" : "Cover letter"} />
          </label>
          {profile.variants.length > 0 ? (
            <details className="document-create-options">
              <summary>Choose saved information variation</summary>
              <label>
                Information source
                <select value={newVariantId} onChange={(event) => setNewVariantId(event.target.value)}>
                  <option value="">My information</option>
                  {profile.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
                </select>
              </label>
            </details>
          ) : null}
          <button className="compact-primary" type="submit">{newKind === "cv" ? "Create CV" : "Create cover letter"}</button>
        </form>

        <div className="document-list" aria-label="Documents list">
          {documents.length === 0 ? <p>No CVs or letters yet.</p> : null}
          {documents.map((document) => (
            <button className={document.id === selectedId ? "active-document" : ""} type="button" key={document.id} onClick={() => void select(document)}>
              <strong>{document.title}</strong>
              <span>{document.kind === "cv" ? "CV" : "Cover letter"}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="document-editor">
        {contextCandidature ? (
          <div className="contextual-return-bar" role="status">
            <span>Application document · {contextCandidature.label}</span>
            <button className="compact-secondary" type="button" onClick={returnToCandidature}>Return to application</button>
          </div>
        ) : null}
        {selected ? <button className="compact-document-back" type="button" onClick={() => setCompactDocumentOpen(false)}>Back to Documents</button> : null}
        {error ? (
          <div>
            <p className="error-message" role="alert">{error}</p>
            {renderSettingsSuggested ? <button className="compact-secondary" type="button" onClick={() => openSettingsFor("rendering", "documents")}>Open Document rendering settings</button> : null}
          </div>
        ) : null}
        {notice ? <p className="document-notice" role="status">{notice}</p> : null}

        {!selected ? (
          <div className="document-empty">
            <h2>Create a CV or cover letter.</h2>
            <p>Write directly from your saved professional information. AI and PDF rendering remain optional.</p>
          </div>
        ) : (
          <>
            <div className="section-heading document-context-heading">
              <div>
                <p className="eyebrow">{selected.kind === "cv" ? "CV" : "Cover letter"}</p>
                <h2>{selected.title}</h2>
              </div>
              <span>{editorDirty || descriptorDirty || assistanceDirty ? "Unsaved changes" : "Local document"}</span>
            </div>

            {preparationActive ? (
              <section className="document-preparation-status" aria-label="Automatic application preparation" role="status">
                <strong>Preparing this application in the background</strong>
                <p>{preparationTask?.detail ?? "Reading the retained offer and your professional information…"}</p>
                <small>You can use the rest of AAAAT while this runs. This document unlocks when the bounded AI work finishes.</small>
              </section>
            ) : preparationTask?.status === "failed" ? (
              <section className="document-preparation-status preparation-failed" role="alert">
                <strong>Automatic preparation did not finish</strong>
                <p>{preparationTask.error}</p>
                <small>The retained offer and local documents are intact. Edit manually below or use AI assistance when ready.</small>
              </section>
            ) : preparationTask?.status === "completed" ? (
              <section className="document-preparation-status preparation-ready" role="status">
                <strong>Application material prepared</strong>
                <p>{preparationTask.detail ?? "The generated document state is ready to review and edit."}</p>
              </section>
            ) : contextCandidature ? (
              <p className="document-manual-ready">AI is not required here. This application document is ready for direct editing with your retained information.</p>
            ) : null}

            <div className="document-local-nav" role="tablist" aria-label="Document work">
              {([[
                "content",
                selected.kind === "cv" ? "CV content" : "Letter",
              ], ["professional-information", "My information"], ["output", "PDF"]] as const).map(([view, label]) => (
                <button key={view} type="button" role="tab" aria-selected={documentView === view} className={documentView === view ? "active-document-view" : ""} onClick={() => setDocumentView(view)}>{label}</button>
              ))}
            </div>

            <section className="document-local-panel" role="tabpanel" aria-label="Document content" hidden={documentView !== "content"}>
              {selected.mode === "manual" ? <div className="manual-source-warning"><p>Direct source edits were detected. AAAAT will preserve them and will not silently replace the source.</p></div> : null}

              {selected.kind === "cover_letter" ? (
                <form className="document-writing-sheet" onSubmit={(event) => void save(event)}>
                  <label>
                    Recipient
                    <input value={recipient} disabled={preparationActive} onChange={(event) => setRecipient(event.target.value)} />
                  </label>
                  <label>
                    Subject
                    <input value={subject} disabled={preparationActive} onChange={(event) => setSubject(event.target.value)} />
                  </label>
                  <label className="letter-body-field">
                    Letter
                    <textarea rows={15} value={body} disabled={preparationActive} onChange={(event) => setBody(event.target.value)} placeholder="Write the letter here. Separate paragraphs with a blank line." />
                  </label>
                  <label>
                    Closing
                    <input value={closing} disabled={preparationActive} onChange={(event) => setClosing(event.target.value)} />
                  </label>
                  <details className="document-advanced document-metadata">
                    <summary>Document details</summary>
                    <div className="document-fields">
                      <label>Document name<input required value={title} disabled={preparationActive} onChange={(event) => setTitle(event.target.value)} /></label>
                      <label>Language<input value={language} disabled={preparationActive} onChange={(event) => setLanguage(event.target.value)} /></label>
                    </div>
                  </details>
                  <div className="document-actions"><button className="compact-primary" type="submit" disabled={preparationActive}>Save letter</button></div>
                </form>
              ) : (
                <div className="document-cv-content">
                  <div className="document-section-heading">
                    <div><p className="eyebrow">Effective content</p><h3>What this CV currently uses</h3></div>
                    <span>{resolvedItems.length} items</span>
                  </div>
                  {preparationActive ? <p className="document-section-intro">AAAAT is selecting the strongest retained evidence for this opportunity.</p> : null}
                  {resolvedItems.length === 0 ? (
                    <p className="compact-empty">No professional information is included yet. Add reusable information in My information or include it from the next tab.</p>
                  ) : (
                    <div className="document-content-stack">
                      {resolvedItems.map((item) => (
                        <article className="document-content-block" key={item.id}>
                          <span className="item-kind">{item.kind}</span>
                          <h4>{item.title}</h4>
                          {itemSummary(item) ? <p className="document-content-meta">{itemSummary(item)}</p> : null}
                          {item.description ? <p>{item.description}</p> : null}
                        </article>
                      ))}
                    </div>
                  )}
                  <details className="document-advanced document-metadata">
                    <summary>Document details</summary>
                    <form className="document-fields" onSubmit={(event) => void save(event)}>
                      <label>Document name<input required value={title} disabled={preparationActive} onChange={(event) => setTitle(event.target.value)} /></label>
                      <label>Language<input value={language} disabled={preparationActive} onChange={(event) => setLanguage(event.target.value)} /></label>
                      <div className="document-actions wide-field"><button className="compact-primary" type="submit" disabled={preparationActive}>Save details</button></div>
                    </form>
                  </details>
                </div>
              )}

              {!preparationActive ? (
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
              ) : null}
            </section>

            <section className="document-local-panel" role="tabpanel" aria-label="My information in this document" hidden={documentView !== "professional-information"}>
              <div className="document-section-heading">
                <div><p className="eyebrow">Reusable evidence</p><h3>Information used in this document</h3></div>
                <span>{resolvedItems.length} used</span>
              </div>
              <p className="document-section-intro">Review the reusable information that actually contributes to this document. Document-only overrides stay behind each item's Adjust control.</p>

              {resolvedItems.length === 0 ? <p className="compact-empty">No saved professional information is currently used.</p> : (
                <div className="document-evidence-list">
                  {resolvedItems.map((effective) => {
                    const item = orderedItems.find((candidate) => candidate.id === effective.id) ?? effective;
                    const index = orderedItems.findIndex((candidate) => candidate.id === item.id);
                    return (
                      <article className="document-evidence-card" key={effective.id}>
                        <div className="document-evidence-copy">
                          <span className="item-kind">{effective.kind}</span>
                          <h4>{effective.title}</h4>
                          {itemSummary(effective) ? <p className="document-content-meta">{itemSummary(effective)}</p> : null}
                          {effective.description ? <p>{effective.description}</p> : null}
                        </div>
                        <details>
                          <summary>Adjust for this document</summary>
                          {adjustmentForm(item, true, Math.max(index, 0))}
                        </details>
                      </article>
                    );
                  })}
                </div>
              )}

              {notUsedItems.length > 0 ? (
                <details className="document-advanced document-unused-information">
                  <summary>Add more from My information ({notUsedItems.length})</summary>
                  <div className="document-evidence-list">
                    {notUsedItems.map((item) => {
                      const index = orderedItems.findIndex((candidate) => candidate.id === item.id);
                      return (
                        <article className="document-evidence-card muted-evidence" key={item.id}>
                          <div className="document-evidence-copy">
                            <span className="item-kind">{item.kind}</span>
                            <h4>{item.title}</h4>
                            {item.description ? <p>{item.description}</p> : null}
                          </div>
                          <details>
                            <summary>Include or adjust</summary>
                            {adjustmentForm(item, false, Math.max(index, 0))}
                          </details>
                        </article>
                      );
                    })}
                  </div>
                </details>
              ) : null}

              <details className="document-advanced">
                <summary>Information source &amp; ordering</summary>
                <p>{selectedVariation ? `This document starts from saved variation “${selectedVariation}”.` : "This document starts from My information."}</p>
                <p>Per-document inclusion, ordering and content overrides do not rewrite your reusable professional information.</p>
              </details>
            </section>

            <section className="document-local-panel" role="tabpanel" aria-label="Document output" hidden={documentView !== "output"}>
              {editorDirty ? <p className="document-notice">Save document changes before rendering or exporting. Your last rendered PDF remains separate from unsaved edits.</p> : null}
              <section className="document-result-card" aria-label="Rendered PDF result">
                <div className="section-heading">
                  <div><p className="eyebrow">Result</p><h3>PDF output</h3></div>
                  <span>{renderedResultId === selected.id ? "Ready" : "Not rendered this session"}</span>
                </div>
                <p className="document-section-intro">Render the saved document, then open the resulting PDF directly.</p>
                <div className="document-actions document-output-actions">
                  <button className="compact-primary" type="button" disabled={editorDirty || preparationActive} onClick={() => void render()}>Render PDF</button>
                  {renderedResultId === selected.id ? <button type="button" onClick={() => void openRenderedOutput()}>Open PDF</button> : null}
                  <button type="button" disabled={editorDirty || preparationActive} onClick={() => void exportProject()}>Export portable project</button>
                </div>
              </section>

              <details className="document-advanced" open={selected.mode === "manual"}>
                <summary>Source, LaTeX &amp; ownership</summary>
                {selected.mode === "manual" ? (
                  <div className="manual-source-warning">
                    <p>Direct source edits were detected. AAAAT will preserve them and will not silently replace the source.</p>
                    <button type="button" disabled={editorDirty || preparationActive} onClick={() => void regenerate()}>Replace manual source from structured data</button>
                  </div>
                ) : null}
                <div className="document-section-intro" aria-label="Live source ownership">
                  <p><code>main.tex</code> and <code>aaaat.sty</code> are user-editable and preserved. <code>data.tex</code> is generated from saved document information only on explicit regeneration.</p>
                </div>
                <div className="document-paths">
                  <p><span>Source</span><code>{selected.sourcePath}</code></p>
                  <p><span>PDF</span><code>{selected.artifactPath}</code></p>
                </div>
                <div className="document-actions document-advanced-actions">
                  <button type="button" onClick={() => void openSourceProject()}>Open source project</button>
                  <button type="button" disabled={preparationActive} onClick={() => void remove()}>Remove document</button>
                </div>
              </details>

              {selected.kind === "cv" ? (
                <details className="document-advanced">
                  <summary>External assistant access</summary>
                  <CvExternalContentAccessPanel key={`content-access:${selected.id}`} document={selected} disabled={editorDirty || preparationActive} onError={setError} onNotice={setNotice} />
                  <CvAssistantDescriptorPanel key={`descriptor:${selected.id}`} document={selected} onDirtyChange={setDescriptorDirty} onError={setError} onNotice={setNotice} />
                </details>
              ) : null}
            </section>
          </>
        )}

        <div className="document-output-support" hidden={selected ? documentView !== "output" : false}>
          <details className="document-advanced">
            <summary>Combined CV + cover letter</summary>
            <CombinedDocumentExportPanel candidature={contextCandidature} documents={documents} disabled={editorDirty || preparationActive} onError={setError} onNotice={setNotice} />
          </details>

          {contextCandidature ? (
            <details className="document-advanced">
              <summary>Saved application PDFs</summary>
              <ApplicationArtifactsPanel
                candidature={contextCandidature}
                documents={documents}
                selectedDocument={selected}
                artifacts={artifacts}
                capturing={capturingArtifact}
                disabled={editorDirty || preparationActive}
                canCapture={canCaptureArtifact}
                onCapture={() => void captureArtifact()}
              />
            </details>
          ) : null}
        </div>
      </div>
    </section>
  );
}
