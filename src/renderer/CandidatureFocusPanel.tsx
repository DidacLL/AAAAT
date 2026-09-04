import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  ConceptRecord,
  DocumentRecord,
} from "../shared/contracts";

export type FocusDestination = "information";

interface Props {
  readonly record: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly concepts: readonly ConceptRecord[];
  readonly documents: readonly DocumentRecord[];
  readonly selectedConceptId: string | null;
  readonly onSelectConcept: (conceptId: string) => void;
  readonly onNavigate: (destination: FocusDestination) => void;
}

function displayValue(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): string {
  const displayOne = (item: string | number | boolean): string => {
    if (field.definition.valueType === "choice" && typeof item === "string") {
      return field.definition.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    if (typeof item === "boolean") return item ? "Yes" : "No";
    return String(item);
  };
  return Array.isArray(value) ? value.map(displayOne).join(", ") : displayOne(value);
}

export function CandidatureFocusPanel({
  record,
  fields,
  concepts,
  documents,
  selectedConceptId,
  onSelectConcept,
  onNavigate,
}: Props) {
  const values = new Map(record.values.map((value) => [value.fieldId, value.value]));
  const focusFields = fields
    .filter(
      (field) =>
        field.preferences.focusVisible && values.has(field.definition.id),
    )
    .sort((left, right) => {
      const leftOrder = left.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.definition.label.localeCompare(right.definition.label);
    });

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

  return (
    <section className="focus-panel" aria-label="Candidature Focus">
      <div className="focus-heading">
        <div>
          <p className="eyebrow">Focus</p>
          <h3>{record.label}</h3>
          <p>Only retained information you configured for Focus appears here.</p>
        </div>
        <button
          type="button"
          className="compact-secondary"
          onClick={() => onNavigate("information")}
        >
          Configure Focus
        </button>
      </div>

      {focusFields.length === 0 ? (
        <div className="compact-empty">
          <p>No retained candidature information is currently shown in Focus.</p>
          <button type="button" onClick={() => onNavigate("information")}>
            Choose Focus information
          </button>
        </div>
      ) : (
        <div className="focus-grid">
          {focusFields.map((field) => {
            const value = values.get(field.definition.id);
            if (value === undefined) return null;
            return (
              <section
                key={field.definition.id}
                className={`focus-block focus-${field.preferences.focusProminence}`}
              >
                <h4>{field.definition.label}</h4>
                <p>{displayValue(field, value)}</p>
              </section>
            );
          })}
        </div>
      )}

      {associatedConcepts.length > 0 ? (
        <section className="focus-concepts">
          <h4>Concepts &amp; keywords</h4>
          <div className="concept-chip-row">
            {associatedConcepts.map((concept) => (
              <button
                type="button"
                key={concept.id}
                className={
                  concept.id === selectedConcept?.id
                    ? "concept-chip selected-concept-chip"
                    : "concept-chip"
                }
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
              <li key={document.id}>
                {document.title} · {document.kind === "cv" ? "CV" : "cover letter"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}
