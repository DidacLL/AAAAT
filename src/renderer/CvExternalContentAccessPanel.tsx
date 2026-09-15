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
        if (active) onError("AAAAT could not load this document's external assistant access.");
      });
    return () => {
      active = false;
    };
  }, [document.id, onError]);

  const updateContent = async (allowed: boolean) => {
    if (
      allowed &&
      !window.confirm(
        "Allow the configured external assistant to use this CV content? Only this CV becomes available, and choosing it replaces any previously shared CV.",
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
          ? "External assistant access is allowed for this CV."
          : "External assistant access for this CV was revoked.",
      );
    } catch {
      onError("AAAAT could not change external assistant access for this CV.");
    } finally {
      setSaving(false);
    }
  };

  const updateRender = async (allowed: boolean) => {
    if (
      allowed &&
      !window.confirm(
        "Allow the configured external assistant to request AAAAT's normal local PDF render for this CV?",
      )
    ) {
      return;
    }
    setSaving(true);
    onError(null);
    onNotice(null);
    try {
      const saved = await window.aaaat.cvContentAccess.updateRender({
        documentId: document.id,
        allowed,
      });
      setAccess(saved);
      onNotice(allowed ? "External PDF rendering is allowed for this CV." : "External PDF rendering was revoked.");
    } catch {
      onError("AAAAT could not change external PDF rendering access.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="external-assistant-access-controls" aria-label="External assistant access">
      <h3>External assistant access</h3>
      <p className="document-section-intro">
        Keep this off unless you want the configured external assistant to use the content of this CV.
      </p>
      {access ? (
        <>
          <label className="external-assistant-primary-toggle">
            <input
              type="checkbox"
              checked={access.allowed}
              disabled={disabled || saving}
              onChange={(event) => void updateContent(event.target.checked)}
            />
            Allow external assistant to use this CV
          </label>
          <span className="compact-help">
            {access.allowed ? "This CV is available to the configured external assistant." : "CV content is not shared."}
          </span>

          {access.allowed ? (
            <details className="external-assistant-advanced">
              <summary>Advanced authorization</summary>
              <label>
                <input
                  type="checkbox"
                  checked={access.renderAllowed}
                  disabled={disabled || saving}
                  onChange={(event) => void updateRender(event.target.checked)}
                />
                Allow external assistant to request local PDF rendering
              </label>
              <p className="compact-help">
                Rendering still runs through AAAAT's normal local document service and does not grant filesystem access.
              </p>
            </details>
          ) : null}
        </>
      ) : (
        <p>Loading external assistant access…</p>
      )}
    </section>
  );
}
