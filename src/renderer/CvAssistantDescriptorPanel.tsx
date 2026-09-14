import { useEffect, useState, type FormEvent } from "react";

import type { DocumentRecord } from "../shared/contracts";
import type { CvDescriptor } from "../shared/cv-descriptor-contracts";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function CvAssistantDescriptorPanel({
  document,
  onDirtyChange,
  onError,
  onNotice,
}: {
  readonly document: DocumentRecord;
  readonly onDirtyChange: (dirty: boolean) => void;
  readonly onError: (message: string | null) => void;
  readonly onNotice: (message: string | null) => void;
}) {
  const [descriptor, setDescriptor] = useState<CvDescriptor | null>(null);
  const [tagsText, setTagsText] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let active = true;
    void window.aaaat.cvDescriptors
      .current(document.id)
      .then((current) => {
        if (!active) return;
        setDescriptor(current);
        setTagsText(current.tags.join(", "));
        setNotes(current.notes ?? "");
      })
      .catch(() => {
        if (active) onError("AAAAT could not load this document's assistant description.");
      });
    return () => {
      active = false;
      onDirtyChange(false);
    };
  }, [document.id, onDirtyChange, onError]);

  const dirty = descriptor
    ? tagsText !== descriptor.tags.join(", ") || notes !== (descriptor.notes ?? "")
    : false;

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    onError(null);
    onNotice(null);
    try {
      const saved = await window.aaaat.cvDescriptors.update({
        documentId: document.id,
        tags: parseTags(tagsText),
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      setDescriptor(saved);
      setTagsText(saved.tags.join(", "));
      setNotes(saved.notes ?? "");
      onNotice("Assistant description saved.");
    } catch {
      onError("Check the assistant description and try again.");
    }
  };

  return (
    <details className="external-assistant-description" aria-label="Optional assistant description">
      <summary>Optional assistant description</summary>
      <p className="document-section-intro">
        Give external assistants a short description of this CV without sharing the CV content itself.
      </p>
      {descriptor ? (
        <form className="document-fields" onSubmit={(event) => void save(event)}>
          <label className="wide-field">
            Tags
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="platform, backend, leadership"
            />
          </label>
          <label className="wide-field">
            Notes
            <textarea
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What this CV is intended to emphasize."
            />
          </label>
          {dirty ? <p className="document-notice wide-field">Unsaved assistant description.</p> : null}
          <div className="document-actions wide-field">
            <button className="compact-primary" type="submit" disabled={!dirty}>
              Save description
            </button>
          </div>
        </form>
      ) : (
        <p>Loading assistant description…</p>
      )}
    </details>
  );
}
