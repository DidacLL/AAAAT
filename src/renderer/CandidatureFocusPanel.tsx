import type {
  CandidatureFieldConfiguration,
  CandidatureFieldPreferences,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
  TagRecord,
} from "../shared/contracts";
import type {
  CoverLetterRecord,
  WorkingCvRecord,
} from "../shared/document-domain-contracts";
import { readableSourceText } from "../shared/source-text";
import { CandidatureFieldAiState } from "./CandidatureFieldAiState";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";
import { candidatureRecognitionCues } from "./candidature-projections";

interface Props {
  readonly record: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly tags: readonly TagRecord[];
  readonly selectedTagId: string | null;
  readonly sources: readonly CandidatureSource[];
  readonly workingCvs: readonly WorkingCvRecord[];
  readonly letters: readonly CoverLetterRecord[];
  readonly documentBusy: "cv" | "cover_letter" | null;
  readonly onSelectTag: (tagId: string) => void;
  readonly onOpenDocument: (documentId: string) => void;
  readonly onCreateDocument: (kind: "cv" | "cover_letter") => void;
  readonly onSaveValue: (fieldId: string, value: CandidatureRuntimeValue) => Promise<void>;
  readonly onClearValue: (fieldId: string) => Promise<void>;
  readonly onDiscoverValue: (fieldId: string) => void;
  readonly onUpdatePreferences: (field: CandidatureFieldConfiguration, patch: Partial<CandidatureFieldPreferences>) => Promise<void>;
  readonly onDirtyChange: (fieldId: string, dirty: boolean) => void;
}

export function CandidatureFocusPanel({
  record, fields, tags, selectedTagId, sources, workingCvs, letters, documentBusy,
  onSelectTag, onOpenDocument, onCreateDocument, onSaveValue, onClearValue,
  onDiscoverValue, onUpdatePreferences, onDirtyChange,
}: Props) {
  const values = new Map(record.values.map((value) => [value.fieldId, value.value]));
  const notesField = fields.find((field) => field.definition.systemKey === "candidature.notes") ?? null;
  const notesValue = notesField ? values.get(notesField.definition.id) : undefined;
  const focusFields = fields
    .filter((field) => field.definition.systemKey !== "candidature.notes" && field.preferences.focusVisible && values.has(field.definition.id))
    .sort((left, right) => (left.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER) - (right.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER) || left.definition.label.localeCompare(right.definition.label));
  const associatedTags = tags.filter((tag) => record.tagIds.includes(tag.id));
  const selectedTag = associatedTags.find((tag) => tag.id === selectedTagId) ?? associatedTags[0] ?? null;
  const source = sources.find((candidate) => candidate.kind === "job_posting") ?? sources[0] ?? null;
  const sourceBody = source ? readableSourceText(source.sourceText) : "";
  const linkedCv = workingCvs.find((document) => document.candidatureId === record.id) ?? null;
  const linkedLetter = letters.find((document) => document.candidatureId === record.id) ?? null;

  return (
    <section className="focus-panel" aria-label="Selected candidature Focus">
      <div className="focus-heading">
        <div><p className="eyebrow">Application focus</p><h2>{record.label}</h2></div>
        <div className="focus-document-actions" aria-label="Application documents">
          <button type="button" disabled={documentBusy !== null} onClick={() => linkedCv ? onOpenDocument(linkedCv.id) : onCreateDocument("cv")}>
            {linkedCv ? "Open CV" : documentBusy === "cv" ? "Creating CV…" : "Create CV"}
          </button>
          <button type="button" disabled={documentBusy !== null} onClick={() => linkedLetter ? onOpenDocument(linkedLetter.id) : onCreateDocument("cover_letter")}>
            {linkedLetter ? "Open cover letter" : documentBusy === "cover_letter" ? "Creating letter…" : "Create cover letter"}
          </button>
        </div>
      </div>
      <div className="focus-dossier-layout">
        <div className="focus-main-column">
          {focusFields.length > 0 ? <div className="focus-grid">{focusFields.map((field) => {
            const value = values.get(field.definition.id); if (value === undefined) return null;
            return <section key={field.definition.id} className={`focus-block focus-${field.preferences.focusProminence}`}><h3>{field.definition.label}</h3><CandidatureFieldValueEditor field={field} value={value} showFieldControls={false} onSave={(nextValue) => onSaveValue(field.definition.id, nextValue)} onClear={() => onClearValue(field.definition.id)} onDiscover={() => onDiscoverValue(field.definition.id)} onUpdatePreferences={(patch) => onUpdatePreferences(field, patch)} onDirtyChange={(dirty) => onDirtyChange(field.definition.id, dirty)} /><CandidatureFieldAiState candidatureId={record.id} field={field} currentValue={value} onSaveValue={(nextValue) => onSaveValue(field.definition.id, nextValue)} onRetry={() => onDiscoverValue(field.definition.id)} /></section>;
          })}</div> : <div className="focus-sparse-source">{candidatureRecognitionCues(record, fields, 1).map((cue) => <p key={cue.label}><strong>{cue.label}</strong> · {cue.value}</p>)}{candidatureRecognitionCues(record, fields, 1).length === 0 ? <p>No focus details saved.</p> : null}</div>}
          <article className="focus-offer" aria-label="Offer"><div><p className="eyebrow">Offer</p><h3>{source?.title || "Application material"}</h3></div>{sourceBody ? <p>{sourceBody}</p> : <p className="compact-empty">No offer text is saved for this application.</p>}</article>
        </div>
        <aside className="focus-side-column">
          {notesField ? <section className="focus-notes" aria-label="Notes"><h3>My notes</h3><CandidatureFieldValueEditor field={notesField} value={notesValue} showFieldControls={false} onSave={(nextValue) => onSaveValue(notesField.definition.id, nextValue)} onClear={() => onClearValue(notesField.definition.id)} onUpdatePreferences={(patch) => onUpdatePreferences(notesField, patch)} onDirtyChange={(dirty) => onDirtyChange(notesField.definition.id, dirty)} /></section> : null}
          {associatedTags.length > 0 ? <section className="focus-tags" aria-label="Tags"><h3>Tags</h3><div className="tag-chip-row">{associatedTags.map((tag) => <button type="button" key={tag.id} className={tag.id === selectedTag?.id ? "tag-chip selected-tag-chip" : "tag-chip"} onClick={() => onSelectTag(tag.id)}>{tag.name}</button>)}</div>{selectedTag ? <article className="selected-tag-definition"><strong>{selectedTag.name}</strong>{selectedTag.definition ? <p>{selectedTag.definition}</p> : null}{selectedTag.aliases.length > 0 ? <p><strong>Aliases:</strong> {selectedTag.aliases.join(", ")}</p> : null}{selectedTag.notes ? <p><strong>Notes:</strong> {selectedTag.notes}</p> : null}</article> : null}</section> : null}
        </aside>
      </div>
    </section>
  );
}
