import { useEffect, useMemo, useState } from "react";

import type { CoverLetterDraft, CvTailoringResult } from "../shared/ai-contracts";
import type { CandidatureRecord, DocumentRecord, ProfileItem } from "../shared/contracts";
import { isAiOperationUnavailable } from "./ai-route-status";
import { useContextualHandoffs } from "./contextual-handoffs";

function documentSignature(document: DocumentRecord): string {
  return JSON.stringify(document);
}

export function DocumentAiAssistance({
  document,
  candidatures,
  contextCandidature,
  profileItems,
  documentDirty,
  onPrepareCurrentDocument,
  onDiscardCurrentDocumentEdits,
  onDocumentApplied,
  onDirtyChange,
}: {
  readonly document: DocumentRecord;
  readonly candidatures: readonly CandidatureRecord[];
  readonly contextCandidature: CandidatureRecord | null;
  readonly profileItems: readonly ProfileItem[];
  readonly documentDirty: boolean;
  readonly onPrepareCurrentDocument: () => Promise<DocumentRecord | null>;
  readonly onDiscardCurrentDocumentEdits: () => void;
  readonly onDocumentApplied: (document: DocumentRecord) => Promise<void>;
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const { openSettingsFor, settingsHandoff } = useContextualHandoffs();
  const operation = document.kind === "cv" ? "cv_tailoring" : "cover_letter_draft";
  const [routeAvailable, setRouteAvailable] = useState<boolean | null>(null);
  const [standaloneCandidatureId, setStandaloneCandidatureId] = useState("");
  const [cvResult, setCvResult] = useState<CvTailoringResult | null>(null);
  const [coverDraft, setCoverDraft] = useState<CoverLetterDraft | null>(null);
  const [coverDraftBaseline, setCoverDraftBaseline] = useState<CoverLetterDraft | null>(null);
  const [proposalDocumentSignature, setProposalDocumentSignature] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [aiSettingsSuggested, setAiSettingsSuggested] = useState(false);

  const activeCandidatures = useMemo(
    () => candidatures.filter((candidature) => !candidature.archived),
    [candidatures],
  );
  const selectedCandidature = useMemo(
    () =>
      contextCandidature ??
      activeCandidatures.find((candidature) => candidature.id === standaloneCandidatureId) ??
      null,
    [activeCandidatures, contextCandidature, standaloneCandidatureId],
  );
  const itemById = useMemo(
    () => new Map(profileItems.map((item) => [item.id, item])),
    [profileItems],
  );

  const coverDraftDirty =
    coverDraft !== null &&
    coverDraftBaseline !== null &&
    JSON.stringify(coverDraft) !== JSON.stringify(coverDraftBaseline);
  const proposalStale =
    proposalDocumentSignature !== null &&
    proposalDocumentSignature !== documentSignature(document);

  useEffect(() => {
    onDirtyChange?.(coverDraftDirty);
    return () => onDirtyChange?.(false);
  }, [coverDraftDirty, onDirtyChange]);

  useEffect(() => {
    let active = true;
    setRouteAvailable(null);
    void (async () => {
      try {
        const environment = await window.aaaat.setupEnvironment.current();
        const available =
          environment.ai.operations.find((status) => status.operation === operation)?.available === true;
        if (active) setRouteAvailable(available);
      } catch {
        if (active) setRouteAvailable(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [operation, settingsHandoff]);

  const confirmDraftDiscard = () =>
    !coverDraftDirty || window.confirm("Discard unsaved AI cover-letter draft edits?");

  const clearProposal = () => {
    setCvResult(null);
    setCoverDraft(null);
    setCoverDraftBaseline(null);
    setProposalDocumentSignature(null);
    setError(null);
    setNotice(null);
    setAiSettingsSuggested(false);
  };

  const chooseStandaloneCandidature = (candidatureId: string) => {
    if (candidatureId === standaloneCandidatureId) return;
    if (!confirmDraftDiscard()) return;
    setStandaloneCandidatureId(candidatureId);
    clearProposal();
  };

  const tailorCv = async () => {
    if (!selectedCandidature) return;
    const prepared = await onPrepareCurrentDocument();
    if (!prepared) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCvResult(null);
    setProposalDocumentSignature(null);
    setAiSettingsSuggested(false);
    try {
      const result = await window.aaaat.ai.tailorCv({
        candidatureId: selectedCandidature.id,
        documentId: prepared.id,
      });
      setCvResult(result);
      setProposalDocumentSignature(documentSignature(prepared));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not tailor this CV.");
      setAiSettingsSuggested(await isAiOperationUnavailable("cv_tailoring"));
    } finally {
      setBusy(false);
    }
  };

  const draftCoverLetter = async () => {
    if (!selectedCandidature || !confirmDraftDiscard()) return;
    const prepared = await onPrepareCurrentDocument();
    if (!prepared) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCoverDraft(null);
    setCoverDraftBaseline(null);
    setProposalDocumentSignature(null);
    setAiSettingsSuggested(false);
    try {
      const drafted = await window.aaaat.ai.draftCoverLetter({
        candidatureId: selectedCandidature.id,
        documentId: prepared.id,
      });
      setCoverDraft(drafted);
      setCoverDraftBaseline(drafted);
      setProposalDocumentSignature(documentSignature(prepared));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "AAAAT could not draft this cover letter.",
      );
      setAiSettingsSuggested(await isAiOperationUnavailable("cover_letter_draft"));
    } finally {
      setBusy(false);
    }
  };

  const applyCoverDraft = async () => {
    if (!coverDraft || document.kind !== "cover_letter" || proposalStale) return;
    if (
      documentDirty &&
      !window.confirm(
        "Discard current unsaved document edits and apply this AI draft? Cancel to keep editing.",
      )
    ) {
      return;
    }
    if (documentDirty) onDiscardCurrentDocumentEdits();

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await window.aaaat.documents.update({
        id: document.id,
        title: document.title,
        language: document.language,
        engine: document.engine,
        recipient: coverDraft.recipient || undefined,
        subject: coverDraft.subject || undefined,
        bodyParagraphs: coverDraft.bodyParagraphs,
        closing: coverDraft.closing || undefined,
      });
      await onDocumentApplied(saved);
      setCoverDraftBaseline(coverDraft);
      setProposalDocumentSignature(documentSignature(saved));
      setNotice(
        saved.mode === "manual"
          ? "Structured cover-letter fields updated. Existing manual TeX source remains protected."
          : "Cover-letter draft applied to the current document.",
      );
    } catch {
      setError("AAAAT could not apply the edited cover-letter draft.");
    } finally {
      setBusy(false);
    }
  };

  if (
    routeAvailable !== true ||
    (!contextCandidature && activeCandidatures.length === 0)
  ) {
    return null;
  }

  return (
    <details className="document-advanced" aria-label="AI assistance for current document">
      <summary>AI assistance</summary>
      <section className="selected-concept-definition">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Optional AI · current document</p>
            <h3>{document.kind === "cv" ? "CV recommendations" : "Cover-letter draft"}</h3>
          </div>
          <span>Proposal-first</span>
        </div>

        {contextCandidature ? (
          <p className="document-notice" role="status">
            Using candidature: {contextCandidature.label}
          </p>
        ) : (
          <div className="editor-card">
            <label>
              Candidature for this assistance
              <select
                value={standaloneCandidatureId}
                onChange={(event) => chooseStandaloneCandidature(event.target.value)}
              >
                <option value="">Choose candidature</option>
                {activeCandidatures.map((candidature) => (
                  <option key={candidature.id} value={candidature.id}>{candidature.label}</option>
                ))}
              </select>
            </label>
            <p>
              This candidature is used only as assistance context. It does not associate the current
              document with that candidature.
            </p>
          </div>
        )}

        <p>
          Assistance uses retained candidature fields allowed by their AI-context preferences and
          permitted professional information. Retained Sources are excluded. Identity and contact
          information keep their existing privacy controls.
        </p>

        {error ? (
          <div>
            <p className="error-message" role="alert">{error}</p>
            {aiSettingsSuggested ? (
              <button
                className="compact-secondary"
                type="button"
                onClick={() => openSettingsFor("ai", "documents")}
              >
                Open AI connections settings
              </button>
            ) : null}
          </div>
        ) : null}
        {notice ? <p className="document-notice" role="status">{notice}</p> : null}
        {proposalStale || (documentDirty && (cvResult || coverDraft)) ? (
          <p className="document-notice">
            The current document changed after this proposal was prepared. Save the document and
            request fresh assistance before relying on or applying the proposal.
          </p>
        ) : null}

        {document.kind === "cv" ? (
          <>
            <p>
              Recommendations reference existing professional information only. Nothing is changed
              automatically; use the normal document controls to accept or reject suggestions.
            </p>
            <button
              type="button"
              disabled={busy || !selectedCandidature}
              onClick={() => void tailorCv()}
            >
              {busy ? "Generating…" : "Recommend CV evidence"}
            </button>
            {cvResult ? (
              <ol>
                {cvResult.recommendations.map((recommendation) => {
                  const item = itemById.get(recommendation.itemId);
                  return (
                    <li key={recommendation.itemId}>
                      <strong>{item?.title ?? recommendation.itemId}</strong>
                      {item ? ` · ${item.kind}` : ""}
                      <p>{recommendation.rationale}</p>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </>
        ) : (
          <>
            <p>
              Generate a structured draft, edit it here, then deliberately apply it to this cover
              letter. Applying does not replace protected manual TeX source.
            </p>
            <button
              type="button"
              disabled={busy || !selectedCandidature}
              onClick={() => void draftCoverLetter()}
            >
              {busy ? "Drafting…" : "Draft cover letter"}
            </button>
            {coverDraft ? (
              <div className="document-fields">
                <label>
                  Draft recipient
                  <input
                    value={coverDraft.recipient}
                    onChange={(event) => setCoverDraft({ ...coverDraft, recipient: event.target.value })}
                  />
                </label>
                <label className="wide-field">
                  Draft subject
                  <input
                    value={coverDraft.subject}
                    onChange={(event) => setCoverDraft({ ...coverDraft, subject: event.target.value })}
                  />
                </label>
                <label className="wide-field">
                  Draft body paragraphs
                  <textarea
                    rows={8}
                    value={coverDraft.bodyParagraphs.join("\n\n")}
                    onChange={(event) => setCoverDraft({
                      ...coverDraft,
                      bodyParagraphs: event.target.value
                        .split(/\n\s*\n/)
                        .map((part) => part.trim())
                        .filter(Boolean),
                    })}
                  />
                </label>
                <label className="wide-field">
                  Draft closing
                  <input
                    value={coverDraft.closing}
                    onChange={(event) => setCoverDraft({ ...coverDraft, closing: event.target.value })}
                  />
                </label>
                <button
                  className="compact-primary"
                  type="button"
                  disabled={busy || coverDraft.bodyParagraphs.length === 0 || proposalStale}
                  onClick={() => void applyCoverDraft()}
                >
                  Apply edited draft to current document
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </details>
  );
}
