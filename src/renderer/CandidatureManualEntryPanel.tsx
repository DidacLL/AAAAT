import { useEffect, useMemo, useState } from "react";

import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
} from "../shared/contracts";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";

interface Props {
  readonly candidatureId?: string;
  readonly sourceText?: string;
  readonly title: string;
  readonly onDone: () => void;
  readonly onChanged: () => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
}

export function CandidatureManualEntryPanel({
  candidatureId,
  sourceText,
  title,
  onDone,
  onChanged,
  onDirtyChange,
}: Props) {
  const [fields, setFields] = useState<CandidatureFieldConfiguration[]>([]);
  const [record, setRecord] = useState<CandidatureRecord | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(candidatureId ?? null);
  const [dirtyFields, setDirtyFields] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.listFields(),
      candidatureId ? window.aaaat.candidatures.list() : Promise.resolve([]),
    ])
      .then(([nextFields, records]) => {
        if (!active) return;
        setFields(nextFields.filter((field) => field.definition.enabled));
        if (candidatureId) {
          setRecord(records.find((candidate) => candidate.id === candidatureId) ?? null);
        }
      })
      .catch(() => {
        if (active) setError("AAAAT could not load candidature information fields.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId]);

  useEffect(() => {
    onDirtyChange?.(dirtyFields.size > 0);
    return () => onDirtyChange?.(false);
  }, [dirtyFields, onDirtyChange]);

  const values = useMemo(
    () => new Map(record?.values.map((value) => [value.fieldId, value.value]) ?? []),
    [record],
  );

  const setFieldDirty = (fieldId: string, dirty: boolean) => {
    setDirtyFields((current) => {
      const next = new Set(current);
      if (dirty) next.add(fieldId);
      else next.delete(fieldId);
      return next;
    });
  };

  const saveValue = async (fieldId: string, value: CandidatureRuntimeValue) => {
    setError(null);
    try {
      let updated: CandidatureRecord;
      if (workingId) {
        updated = await window.aaaat.candidatures.setFieldValue({
          candidatureId: workingId,
          fieldId,
          value,
        });
      } else {
        updated = await window.aaaat.candidatures.create({
          values: [{ fieldId, value }],
        });
        setWorkingId(updated.id);
      }
      setRecord(updated);
      setFieldDirty(fieldId, false);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not save this information.");
      throw reason;
    }
  };

  const clearValue = async (fieldId: string) => {
    if (!workingId) {
      setFieldDirty(fieldId, false);
      return;
    }
    setError(null);
    try {
      const updated = await window.aaaat.candidatures.clearFieldValue({
        candidatureId: workingId,
        fieldId,
      });
      setRecord(updated);
      setFieldDirty(fieldId, false);
      onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not clear this information.");
      throw reason;
    }
  };

  const finish = () => {
    if (dirtyFields.size > 0 && !window.confirm("Discard unsaved field edits?")) return;
    onDone();
  };

  return (
    <section className="candidature-manual-entry" aria-label={title}>
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">New candidature</p>
          <h2>{title}</h2>
          <p>Fill only what is useful. Missing information is valid.</p>
        </div>
        <button type="button" className="compact-secondary" onClick={finish}>
          Done
        </button>
      </div>

      {error ? <p className="error-message" role="alert">{error}</p> : null}

      <div className={sourceText ? "manual-entry-layout with-source" : "manual-entry-layout"}>
        {sourceText ? (
          <section className="manual-source-pane" aria-label="Raw candidature material">
            <h3>Raw material</h3>
            <pre>{sourceText}</pre>
          </section>
        ) : null}

        <section className="manual-fields-pane" aria-label="Candidature fields">
          <h3>Candidature information</h3>
          {fields.length === 0 ? (
            <p className="compact-empty">No candidature fields are currently enabled.</p>
          ) : (
            <div className="manual-field-list">
              {fields.map((field) => (
                <article className="retained-information-card" key={field.definition.id}>
                  <div>
                    <h4>{field.definition.label}</h4>
                    {field.definition.description ? <p>{field.definition.description}</p> : null}
                  </div>
                  <CandidatureFieldValueEditor
                    field={field}
                    value={values.get(field.definition.id)}
                    onSave={(value) => saveValue(field.definition.id, value)}
                    onClear={() => clearValue(field.definition.id)}
                    onDirtyChange={(dirty) => setFieldDirty(field.definition.id, dirty)}
                  />
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
