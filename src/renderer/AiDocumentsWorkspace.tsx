import { useEffect, useMemo, useState } from "react";

import type { CoverLetterDraft, CvTailoringResult } from "../shared/ai-contracts";
import type { CandidatureRecord, DocumentRecord, ProfileItem } from "../shared/contracts";

function candidatureLabel(record: CandidatureRecord): string {
  return `${record.company || "Unknown company"} — ${record.role || "Unspecified role"}`;
}

export function AiDocumentsWorkspace() {
  const [candidatures, setCandidatures] = useState<CandidatureRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [profileItems, setProfileItems] = useState<ProfileItem[]>([]);
  const [candidatureId, setCandidatureId] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [cvResult, setCvResult] = useState<CvTailoringResult | null>(null);
  const [coverDraft, setCoverDraft] = useState<CoverLetterDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.list(),
      window.aaaat.documents.list(),
      window.aaaat.profile.current(),
    ])
      .then(([nextCandidatures, nextDocuments, profile]) => {
        if (!active) return;
        setCandidatures(nextCandidatures.filter((item) => !item.archived));
        setDocuments(nextDocuments);
        setProfileItems(profile.items);
        setCandidatureId(nextCandidatures.find((item) => !item.archived)?.id ?? "");
        setDocumentId(nextDocuments[0]?.id ?? "");
      })
      .catch(() => {
        if (active) setError("AAAAT could not load AI document assistance.");
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === documentId) ?? null,
    [documents, documentId],
  );
  const selectedCandidature = useMemo(
    () => candidatures.find((record) => record.id === candidatureId) ?? null,
    [candidatures, candidatureId],
  );
  const itemById = useMemo(
    () => new Map(profileItems.map((item) => [item.id, item])),
    [profileItems],
  );

  const resetProposal = (nextDocumentId: string) => {
    setDocumentId(nextDocumentId);
    setCvResult(null);
    setCoverDraft(null);
    setError(null);
    setNotice(null);
  };

  const tailorCv = async () => {
    if (!selectedDocument || !selectedCandidature) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCvResult(null);
    try {
      setCvResult(
        await window.aaaat.ai.tailorCv({
          candidatureId: selectedCandidature.id,
          documentId: selectedDocument.id,
        }),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not tailor this CV.");
    } finally {
      setBusy(false);
    }
  };

  const draftCoverLetter = async () => {
    if (!selectedDocument || !selectedCandidature) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    setCoverDraft(null);
    try {
      setCoverDraft(
        await window.aaaat.ai.draftCoverLetter({
          candidatureId: selectedCandidature.id,
          documentId: selectedDocument.id,
        }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "AAAAT could not draft this cover letter.",
      );
    } finally {
      setBusy(false);
    }
  };

  const applyCoverDraft = async () => {
    if (!selectedDocument || !coverDraft || selectedDocument.kind !== "cover_letter") return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const saved = await window.aaaat.documents.update({
        id: selectedDocument.id,
        title: selectedDocument.title,
        language: selectedDocument.language,
        engine: selectedDocument.engine,
        recipient: coverDraft.recipient || undefined,
        subject: coverDraft.subject || undefined,
        bodyParagraphs: coverDraft.bodyParagraphs,
        closing: coverDraft.closing || undefined,
      });
      setDocuments((current) =>
        current.map((document) => (document.id === saved.id ? saved : document)),
      );
      setNotice(
        saved.mode === "manual"
          ? "Structured cover-letter fields updated. Existing manual TeX source remains protected."
          : "Cover-letter draft applied to structured document fields.",
      );
    } catch {
      setError("AAAAT could not apply the edited cover-letter draft.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="profile-workspace" aria-label="AI document assistance">
      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Optional AI</p>
            <h2>Document assistance</h2>
          </div>
          <span>Proposal-first</span>
        </div>
        <p>
          Choose a saved candidature and an existing document. AI receives only saved opportunity
          context and non-sensitive career evidence. Identity and contact items are omitted.
        </p>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
        {notice ? <p className="document-notice" role="status">{notice}</p> : null}

        <div className="editor-card">
          <label>
            Candidature
            <select
              value={candidatureId}
              onChange={(event) => {
                setCandidatureId(event.target.value);
                setCvResult(null);
                setCoverDraft(null);
              }}
            >
              {candidatures.map((record) => (
                <option key={record.id} value={record.id}>{candidatureLabel(record)}</option>
              ))}
            </select>
          </label>
          <label>
            Document
            <select value={documentId} onChange={(event) => resetProposal(event.target.value)}>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title} · {document.kind === "cv" ? "CV" : "Cover letter"}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!selectedCandidature ? <p>Create or save a candidature first.</p> : null}
        {!selectedDocument ? <p>Create a CV or cover-letter document first.</p> : null}

        {selectedDocument?.kind === "cv" ? (
          <section className="selected-concept-definition">
            <h3>CV tailoring proposal</h3>
            <p>
              Recommendations reference existing profile items only. Nothing is changed
              automatically; use the normal Documents controls to accept or reject the suggestions.
            </p>
            <button type="button" disabled={busy} onClick={() => void tailorCv()}>
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
          </section>
        ) : null}

        {selectedDocument?.kind === "cover_letter" ? (
          <section className="selected-concept-definition">
            <h3>Cover-letter draft</h3>
            <p>
              Generate a structured draft, edit it here, then explicitly apply it. Applying updates
              structured fields through the existing document service and does not silently replace
              manual TeX source.
            </p>
            <button type="button" disabled={busy} onClick={() => void draftCoverLetter()}>
              {busy ? "Drafting…" : "Draft cover letter"}
            </button>
            {coverDraft ? (
              <div className="document-fields">
                <label>
                  Recipient
                  <input
                    value={coverDraft.recipient}
                    onChange={(event) => setCoverDraft({ ...coverDraft, recipient: event.target.value })}
                  />
                </label>
                <label className="wide-field">
                  Subject
                  <input
                    value={coverDraft.subject}
                    onChange={(event) => setCoverDraft({ ...coverDraft, subject: event.target.value })}
                  />
                </label>
                <label className="wide-field">
                  Body paragraphs
                  <textarea
                    rows={10}
                    value={coverDraft.bodyParagraphs.join("\n\n")}
                    onChange={(event) =>
                      setCoverDraft({
                        ...coverDraft,
                        bodyParagraphs: event.target.value
                          .split(/\n\s*\n/)
                          .map((part) => part.trim())
                          .filter(Boolean),
                      })
                    }
                  />
                </label>
                <label className="wide-field">
                  Closing
                  <input
                    value={coverDraft.closing}
                    onChange={(event) => setCoverDraft({ ...coverDraft, closing: event.target.value })}
                  />
                </label>
                <button
                  className="compact-primary"
                  type="button"
                  disabled={busy || coverDraft.bodyParagraphs.length === 0}
                  onClick={() => void applyCoverDraft()}
                >
                  Apply edited draft to structured document
                </button>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}
