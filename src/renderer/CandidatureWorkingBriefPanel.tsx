import { useEffect, useState } from "react";

import type { CandidatureWorkingBrief } from "../shared/contracts";

type BriefGroup = "evaluation" | "recruiter";

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

export function CandidatureWorkingBriefPanel({ candidatureId }: { candidatureId: string }) {
  const [brief, setBrief] = useState<CandidatureWorkingBrief>(() => emptyBrief(candidatureId));
  const [savedBrief, setSavedBrief] = useState<CandidatureWorkingBrief>(() => emptyBrief(candidatureId));
  const [group, setGroup] = useState<BriefGroup>("evaluation");
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(brief) !== JSON.stringify(savedBrief);

  useEffect(() => {
    let active = true;
    setError(null);
    void window.aaaat.candidatures
      .currentWorkingBrief(candidatureId)
      .then((next) => {
        if (!active) return;
        setBrief(next);
        setSavedBrief(next);
        setGroup("evaluation");
      })
      .catch(() => {
        if (active) setError("AAAAT could not load the working brief.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  const chooseGroup = (next: BriefGroup) => {
    if (next === group) return;
    if (dirty && !window.confirm("Discard unsaved working-brief edits?")) return;
    setBrief(savedBrief);
    setGroup(next);
  };

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
    <section className="candidature-working-brief" aria-label="Working brief">
      <div>
        <p className="eyebrow">Current understanding</p>
        <h3>Working brief</h3>
        <p>Keep only what is useful now; every field may remain empty.</p>
      </div>
      <div className="section-switcher" aria-label="Working brief section">
        <button
          type="button"
          className={group === "evaluation" ? "selected-section" : "compact-secondary"}
          onClick={() => chooseGroup("evaluation")}
        >
          Evaluation &amp; strategy
        </button>
        <button
          type="button"
          className={group === "recruiter" ? "selected-section" : "compact-secondary"}
          onClick={() => chooseGroup("recruiter")}
        >
          Recruiter preparation
        </button>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className="candidature-fields working-brief-fields">
        {group === "evaluation" ? (
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
              Questions
              <textarea rows={4} value={brief.questions} onChange={(event) => setBrief({ ...brief, questions: event.target.value })} />
            </label>
            <label className="wide-field">
              Recruiter preparation
              <textarea rows={5} value={brief.recruiterPreparation} onChange={(event) => setBrief({ ...brief, recruiterPreparation: event.target.value })} />
            </label>
          </>
        )}
      </div>
      <button type="button" className="primary-action" disabled={!dirty} onClick={() => void save()}>
        Save working brief
      </button>
    </section>
  );
}
