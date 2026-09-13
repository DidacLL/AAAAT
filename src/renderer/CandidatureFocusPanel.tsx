import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  TagRecord,
} from "../shared/contracts";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";

interface Props {
  readonly record: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly tags: readonly TagRecord[];
  readonly selectedTagId: string | null;
  readonly onSelectTag: (tagId: string) => void;
  readonly onSaveValue: (fieldId: string, value: CandidatureRuntimeValue) => Promise<void>;
  readonly onClearValue: (fieldId: string) => Promise<void>;
  readonly onDiscoverValue: (fieldId: string) => void;
  readonly onDirtyChange: (fieldId: string, dirty: boolean) => void;
}

export function CandidatureFocusPanel({
  record,
  fields,
  tags,
  selectedTagId,
  onSelectTag,
  onSaveValue,
  onClearValue,
  onDiscoverValue,
  onDirtyChange,
}: Props) {
  const values = new Map(record.values.map((value) => [value.fieldId, value.value]));
  const focusFields = fields
    .filter((field) => field.preferences.focusVisible && values.has(field.definition.id))
    .sort((left, right) => {
      const leftOrder = left.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.preferences.focusOrder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder || left.definition.label.localeCompare(right.definition.label);
    });

  const associatedTags = tags.filter((tag) => record.tagIds.includes(tag.id));
  const selectedTag = associatedTags.find((tag) => tag.id === selectedTagId) ?? associatedTags[0] ?? null;

  return (
    <section className="focus-panel" aria-label="Selected candidature Focus">
      <div className="focus-heading">
        <div>
          <p className="eyebrow">Focus</p>
          <h2>{record.label}</h2>
          <p>Only the information you chose for rapid recall.</p>
        </div>
      </div>

      {focusFields.length > 0 ? (
        <div className="focus-grid">
          {focusFields.map((field) => {
            const value = values.get(field.definition.id);
            if (value === undefined) return null;
            return (
              <section
                key={field.definition.id}
                className={`focus-block focus-${field.preferences.focusProminence}`}
              >
                <h3>{field.definition.label}</h3>
                <CandidatureFieldValueEditor
                  field={field}
                  value={value}
                  onSave={(nextValue) => onSaveValue(field.definition.id, nextValue)}
                  onClear={() => onClearValue(field.definition.id)}
                  onDiscover={() => onDiscoverValue(field.definition.id)}
                  onDirtyChange={(dirty) => onDirtyChange(field.definition.id, dirty)}
                />
              </section>
            );
          })}
        </div>
      ) : (
        <p className="compact-empty">
          No retained information is currently selected for Focus. Use complete candidature editing to add information or adjust Focus visibility.
        </p>
      )}

      {associatedTags.length > 0 ? (
        <section className="focus-tags" aria-label="Tags">
          <h3>Tags</h3>
          <div className="tag-chip-row">
            {associatedTags.map((tag) => (
              <button
                type="button"
                key={tag.id}
                className={tag.id === selectedTag?.id ? "tag-chip selected-tag-chip" : "tag-chip"}
                onClick={() => onSelectTag(tag.id)}
              >
                {tag.name}
              </button>
            ))}
          </div>
          {selectedTag ? (
            <article className="selected-tag-definition">
              <strong>{selectedTag.name}</strong>
              {selectedTag.definition ? <p>{selectedTag.definition}</p> : null}
              {selectedTag.aliases.length > 0 ? (
                <p><strong>Aliases:</strong> {selectedTag.aliases.join(", ")}</p>
              ) : null}
              {selectedTag.notes ? <p><strong>Notes:</strong> {selectedTag.notes}</p> : null}
            </article>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
