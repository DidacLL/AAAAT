import { useEffect, useState } from "react";

import type { CandidatureWorkingBrief } from "../shared/contracts";

export type BriefSection = "evaluation" | "recruiter";

function emptyBrief(candidatureId: string): CandidatureWorkingBrief {
  return {
    candidatureId,
    fitSuitability: "",
    strengthsEvidence: "",
    gapsRisksConstraints: "",
    currentStrategy: "",
    companyRoleContext: "",
    pitch: "",
    questions: "",
    recruiterPreparation: "",
  };
}

export function CandidatureWorkingBriefPanel({
  candidatureId,
  section,
  onDirtyChange,
}: {
  candidatureId: string;
  section: BriefSection;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [brief, setBrief] = useState<CandidatureWorkingBrief>(() => emptyBrief(candidatureId));
  const [savedBrief, setSavedBrief] = useState<CandidatureWorkingBrief>(() => emptyBrief(candidatureId));
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(brief) !== JSON.stringify(savedBrief);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let active = true;
    setError(null);
    void window.aaaat.candidatures
      .currentWorkingBrief(candidatureId)
      .then((next) => {
        if (!active) return;
        setBrief(next);
        setSavedBrief(next);
      })
      .catch(() => {
        if (active) setError("AAAAT could not load the working brief.");
      });
    return () => {
      active = false;
      onDirtyChange?.(false);
    };
  }, [candidatureId, onDirtyChange, section]);

  const save = async () => {
    setError(null);
    try {
      const next = await window.aaaat.candidatures.updateWorkingBrief(brief);
      setBrief(next);
      setSavedBrief(next);
    } catch {
      setError("AAAAT could not save the working brief.");
    }
  };

  return (
    <section
      className="candidature-working-brief section-surface"
      aria-label={section === "evaluation" ? "Evaluation and strategy" : "Recruiter preparation"}
    >
      <div>
        <p className="eyebrow">Current understanding</p>
        <h3>{section === "evaluation" ? "Evaluation & strategy" : "Recruiter preparation"}</h3>
        <p>
          {section === "evaluation"
            ? "Capture only the fit, evidence, risks, strategy, and context useful now."
            : "Prepare the short pitch, questions, and reminders for a recruiter conversation."}
        </p>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className="candidature-fields working-brief-fields">
        {section === "evaluation" ? (
          <>
            <label className="wide-field">
              Fit / suitability
              <textarea rows={4} value={brief.fitSuitability} onChange={(event) => setBrief({ ...brief, fitSuitability: event.target.value })} />
            </label>
            <label className="wide-field">
              Strengths / evidence
              <textarea rows={4} value={brief.strengthsEvidence} onChange={(event) => setBrief({ ...brief, strengthsEvidence: event.target.value })} />
            </label>
            <label className="wide-field">
              Gaps / risks / constraints
              <textarea rows={4} value={brief.gapsRisksConstraints} onChange={(event) => setBrief({ ...brief, gapsRisksConstraints: event.target.value })} />
            </label>
            <label className="wide-field">
              Current strategy
              <textarea rows={4} value={brief.currentStrategy} onChange={(event) => setBrief({ ...brief, currentStrategy: event.target.value })} />
            </label>
            <label className="wide-field">
              Company / role context
              <textarea rows={4} value={brief.companyRoleContext} onChange={(event) => setBrief({ ...brief, companyRoleContext: event.target.value })} />
            </label>
          </>
        ) : (
          <>
            <label className="wide-field">
              Pitch
              <textarea rows={4} value={brief.pitch} onChange={(event) => setBrief({ ...brief, pitch: event.target.value })} />
            </label>
            <label className="wide-field">
              Questions to ask
              <textarea rows={4} value={brief.questions} onChange={(event) => setBrief({ ...brief, questions: event.target.value })} />
            </label>
            <label className="wide-field">
              Recruiter-call preparation
              <textarea rows={5} value={brief.recruiterPreparation} onChange={(event) => setBrief({ ...brief, recruiterPreparation: event.target.value })} />
            </label>
          </>
        )}
      </div>
      <button type="button" className="primary-action" disabled={!dirty} onClick={() => void save()}>
        Save {section === "evaluation" ? "evaluation & strategy" : "recruiter preparation"}
      </button>
    </section>
  );
}
