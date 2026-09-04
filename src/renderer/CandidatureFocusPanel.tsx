import { useEffect, useState } from "react";

import type {
  CareerContext,
  CandidatureRecord,
  CandidatureWorkingBrief,
  ConceptRecord,
  DocumentRecord,
} from "../shared/contracts";

export type FocusDestination = "opportunity" | "evaluation" | "recruiter";

interface Props {
  readonly record: CandidatureRecord;
  readonly concepts: readonly ConceptRecord[];
  readonly documents: readonly DocumentRecord[];
  readonly selectedConceptId: string | null;
  readonly onSelectConcept: (conceptId: string) => void;
  readonly onNavigate: (destination: FocusDestination) => void;
}

function nonEmpty(...values: readonly (string | undefined)[]): string[] {
  return values.map((value) => value?.trim() ?? "").filter((value) => value.length > 0);
}

export function CandidatureFocusPanel({
  record,
  concepts,
  documents,
  selectedConceptId,
  onSelectConcept,
  onNavigate,
}: Props) {
  const [brief, setBrief] = useState<CandidatureWorkingBrief | null>(null);
  const [careerContext, setCareerContext] = useState<CareerContext | null>(null);
  const [contextError, setContextError] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.currentWorkingBrief(record.id),
      window.aaaat.careerContext.current(),
    ])
      .then(([nextBrief, nextCareerContext]) => {
        if (!active) return;
        setBrief(nextBrief);
        setCareerContext(nextCareerContext);
      })
      .catch(() => {
        if (active) setContextError(true);
      });
    return () => {
      active = false;
    };
  }, [record.id]);

  const associatedConcepts = concepts.filter((concept) =>
    record.conceptIds.includes(concept.id),
  );
  const associatedDocuments = documents.filter((document) =>
    record.documentIds.includes(document.id),
  );
  const selectedConcept =
    associatedConcepts.find((concept) => concept.id === selectedConceptId) ??
    associatedConcepts[0] ??
    null;

  const risks = nonEmpty(brief?.gapsRisksConstraints, careerContext?.constraints);
  const context = nonEmpty(
    brief?.companyRoleContext,
    brief?.currentStrategy,
    careerContext?.careerDirection,
    careerContext?.targetRoles,
    careerContext?.targetMarketsLocations,
  );
  const processFacts = [
    record.status,
    record.priority ? `${record.priority} priority` : "",
    record.location,
    record.workMode,
  ].filter(Boolean);

  return (
    <section className="focus-panel" aria-label="Recruiter call focus">
      <div className="focus-heading">
        <div>
          <p className="eyebrow">Focus</p>
          <h3>{record.company || "Unknown company"} — {record.role || "Unspecified role"}</h3>
        </div>
        <span className="focus-status">{processFacts.join(" · ")}</span>
      </div>

      {record.nextAction ? (
        <section className="focus-next-action" aria-label="Next action">
          <span>Next</span>
          <strong>{record.nextAction}</strong>
          {record.nextActionDate ? <time>{record.nextActionDate}</time> : null}
        </section>
      ) : (
        <button type="button" className="focus-add-action" onClick={() => onNavigate("opportunity")}>
          Add next action
        </button>
      )}

      {brief?.pitch ? (
        <section className="focus-priority-block focus-pitch">
          <h4>Pitch</h4>
          <p>{brief.pitch}</p>
        </section>
      ) : (
        <button type="button" className="focus-add-action" onClick={() => onNavigate("recruiter")}>
          Add pitch
        </button>
      )}

      <div className="focus-grid">
        {brief?.strengthsEvidence ? (
          <section className="focus-block">
            <h4>Evidence to mention</h4>
            <p>{brief.strengthsEvidence}</p>
          </section>
        ) : (
          <button type="button" className="focus-add-card" onClick={() => onNavigate("evaluation")}>
            Add evidence
          </button>
        )}

        {risks.length > 0 ? (
          <section className="focus-block">
            <h4>Risks &amp; constraints</h4>
            {risks.map((value) => <p key={value}>{value}</p>)}
          </section>
        ) : null}

        {brief?.questions ? (
          <section className="focus-block">
            <h4>Questions to ask</h4>
            <p>{brief.questions}</p>
          </section>
        ) : (
          <button type="button" className="focus-add-card" onClick={() => onNavigate("recruiter")}>
            Add questions
          </button>
        )}

        {context.length > 0 ? (
          <section className="focus-block">
            <h4>Context &amp; strategy</h4>
            {context.map((value) => <p key={value}>{value}</p>)}
          </section>
        ) : null}

        {brief?.fitSuitability ? (
          <section className="focus-block">
            <h4>Fit</h4>
            <p>{brief.fitSuitability}</p>
          </section>
        ) : null}

        {brief?.recruiterPreparation ? (
          <section className="focus-block">
            <h4>Recruiter reminders</h4>
            <p>{brief.recruiterPreparation}</p>
          </section>
        ) : null}

        {record.notes ? (
          <section className="focus-block">
            <h4>Notes</h4>
            <p>{record.notes}</p>
          </section>
        ) : null}
      </div>

      {associatedConcepts.length > 0 ? (
        <section className="focus-concepts">
          <h4>Concepts &amp; keywords</h4>
          <div className="concept-chip-row">
            {associatedConcepts.map((concept) => (
              <button
                type="button"
                key={concept.id}
                className={concept.id === selectedConcept?.id ? "concept-chip selected-concept-chip" : "concept-chip"}
                onClick={() => onSelectConcept(concept.id)}
              >
                {concept.name}
              </button>
            ))}
          </div>
          {selectedConcept ? (
            <article className="selected-concept-definition">
              <strong>{selectedConcept.name}</strong>
              {selectedConcept.definition ? <p>{selectedConcept.definition}</p> : null}
              {selectedConcept.aliases.length > 0 ? (
                <p><strong>Aliases:</strong> {selectedConcept.aliases.join(", ")}</p>
              ) : null}
            </article>
          ) : null}
        </section>
      ) : null}

      {associatedDocuments.length > 0 ? (
        <section className="focus-documents">
          <h4>Application material</h4>
          <ul>
            {associatedDocuments.map((document) => (
              <li key={document.id}>{document.title} · {document.kind === "cv" ? "CV" : "cover letter"}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {contextError ? (
        <p className="compact-warning">Some reusable context could not be loaded. Opportunity data remains available.</p>
      ) : null}
    </section>
  );
}
