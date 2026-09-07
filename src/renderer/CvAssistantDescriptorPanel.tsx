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
        if (active) onError("AAAAT could not load the AI-visible CV description.");
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
      onNotice("AI-visible CV description saved.");
    } catch {
      onError("Check the AI-visible CV tags and notes and try again.");
    }
  };

  return (
    <section className="manual-source-warning" aria-label="AI-visible CV description">
      <h3>AI-visible CV description</h3>
      <p>
        External assistants can read only these tags and notes through the bounded CV-description
        operation. This description does not share the CV title, document content, local IDs, or file
        paths.
      </p>
      {descriptor ? (
        <form className="document-fields" onSubmit={(event) => void save(event)}>
          <label className="wide-field">
            AI-visible tags
            <input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="platform, backend, leadership"
            />
          </label>
          <label className="wide-field">
            AI-visible notes
            <textarea
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What this CV is intended to emphasize or where it is strongest."
            />
          </label>
          {dirty ? <p className="document-notice wide-field">Unsaved AI-visible description.</p> : null}
          <div className="document-actions wide-field">
            <button className="compact-primary" type="submit" disabled={!dirty}>
              Save AI-visible description
            </button>
          </div>
        </form>
      ) : (
        <p>Loading AI-visible CV description…</p>
      )}
    </section>
  );
}
