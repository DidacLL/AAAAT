import { useEffect, useState } from "react";

import type { DocumentRecord } from "../shared/contracts";
import type { CvContentAccess } from "../shared/cv-content-access-contracts";

export function CvExternalContentAccessPanel({
  document,
  disabled,
  onError,
  onNotice,
}: {
  readonly document: DocumentRecord;
  readonly disabled: boolean;
  readonly onError: (message: string | null) => void;
  readonly onNotice: (message: string | null) => void;
}) {
  const [access, setAccess] = useState<CvContentAccess | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void window.aaaat.cvContentAccess
      .current(document.id)
      .then((current) => {
        if (active) setAccess(current);
      })
      .catch(() => {
        if (active) onError("AAAAT could not load the external CV content permission.");
      });
    return () => {
      active = false;
    };
  }, [document.id, onError]);

  const update = async (allowed: boolean) => {
    if (
      allowed &&
      !window.confirm(
        "Allow the configured external assistant host to read this CV's effective resolved content? This shares the CV content, not only its AI-visible tags and notes. Selecting this CV replaces any previously shared CV.",
      )
    ) {
      return;
    }
    setSaving(true);
    onError(null);
    onNotice(null);
    try {
      const saved = await window.aaaat.cvContentAccess.update({ documentId: document.id, allowed });
      setAccess(saved);
      onNotice(
        allowed
          ? "This CV is now the one CV available to the external content-read operation."
          : "External content access for this CV was revoked.",
      );
    } catch {
      onError("AAAAT could not change the external CV content permission.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="manual-source-warning" aria-label="External CV content access">
      <h3>External CV content access</h3>
      <p>
        This is broader than the AI-visible description. When allowed, the configured external host can
        read this CV&apos;s effective included and overridden profile-item content through one bounded
        read-only operation. AAAAT does not expose the document title, local IDs, file paths, raw TeX,
        candidature history, or other documents.
      </p>
      {access ? (
        <div className="document-actions">
          <button
            className={access.allowed ? undefined : "compact-primary"}
            type="button"
            disabled={disabled || saving}
            onClick={() => void update(!access.allowed)}
          >
            {saving
              ? "Saving…"
              : access.allowed
                ? "Revoke external CV content access"
                : "Allow external assistants to read this CV content"}
          </button>
          <span>{access.allowed ? "Content access allowed for this CV." : "Content access not allowed."}</span>
        </div>
      ) : (
        <p>Loading external CV content permission…</p>
      )}
    </section>
  );
}
