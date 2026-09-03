import type {
  CandidatureRecord,
  ConceptRecord,
  DocumentRecord,
} from "../shared/contracts";
import { CandidatureFitPanel } from "./CandidatureFitPanel";
import { VariantRecommendationPanel } from "./VariantRecommendationPanel";

interface Props {
  readonly record: CandidatureRecord;
  readonly concepts: readonly ConceptRecord[];
  readonly documents: readonly DocumentRecord[];
  readonly selectedConceptId: string | null;
  readonly onSelectConcept: (conceptId: string) => void;
}

export function CandidatureFocusPanel({ record, concepts, documents, selectedConceptId, onSelectConcept }: Props) {
  const associatedConcepts = concepts.filter((concept) => record.conceptIds.includes(concept.id));
  const associatedDocuments = documents.filter((document) => record.documentIds.includes(document.id));
  const selectedConcept = associatedConcepts.find((concept) => concept.id === selectedConceptId) ?? associatedConcepts[0] ?? null;

  return (
    <section className="focus-panel" aria-label="Recruiter call focus">
      <div className="focus-heading">
        <div><p className="eyebrow">Recruiter call focus</p><h3>{record.company || "Unknown company"} — {record.role || "Unspecified role"}</h3></div>
        <span className="focus-status">{record.status}{record.archived ? " · archived" : ""}</span>
      </div>
      <dl className="focus-facts">
        <div><dt>Location</dt><dd>{record.location || "Unknown"}</dd></div>
        <div><dt>Work mode</dt><dd>{record.workMode || "Unknown"}</dd></div>
        <div><dt>Next action</dt><dd>{record.nextAction || "None recorded"}</dd></div>
        <div><dt>Next action date</dt><dd>{record.nextActionDate || "Not set"}</dd></div>
      </dl>
      <div className="focus-context">
        <section><h4>Notes</h4><p>{record.notes || "No notes recorded."}</p></section>
        <section><h4>Source context</h4><p>{record.sourceText || record.source || "No source material recorded."}</p></section>
      </div>
      <section className="focus-documents">
        <h4>Associated documents</h4>
        {associatedDocuments.length === 0 ? <p>No CV or cover-letter document associated yet.</p> : <ul>{associatedDocuments.map((document) => <li key={document.id}>{document.title}</li>)}</ul>}
      </section>
      <section className="focus-concepts">
        <h4>Shared concepts</h4>
        {associatedConcepts.length === 0 ? <p>No concepts associated yet.</p> : (
          <div className="concept-chip-row">{associatedConcepts.map((concept) => (
            <button type="button" key={concept.id} className={concept.id === selectedConcept?.id ? "concept-chip selected-concept-chip" : "concept-chip"} onClick={() => onSelectConcept(concept.id)}>{concept.name}</button>
          ))}</div>
        )}
        {selectedConcept ? <article className="selected-concept-definition"><h4>{selectedConcept.name}</h4><p>{selectedConcept.definition || "No definition recorded."}</p>{selectedConcept.aliases.length > 0 ? <p><strong>Aliases:</strong> {selectedConcept.aliases.join(", ")}</p> : null}</article> : null}
      </section>
      <CandidatureFitPanel key={`fit-${record.id}`} record={record} />
      <VariantRecommendationPanel key={`variant-${record.id}`} record={record} />
    </section>
  );
}
