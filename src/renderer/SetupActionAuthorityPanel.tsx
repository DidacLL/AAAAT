import { useEffect, useState } from "react";

import type { SetupAssistantAccess } from "../shared/setup-assistant-contracts";
import { SetupActionAuthority } from "./SetupEnvironmentPanel";

export function SetupActionAuthorityPanel() {
  const [access, setAccess] = useState<SetupAssistantAccess | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void window.aaaat.setupAssistant.access()
      .then((next) => {
        if (active) setAccess(next);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "AAAAT could not read external setup authority.");
      });
    return () => {
      active = false;
    };
  }, []);

  const updateAccess = async (next: SetupAssistantAccess) => {
    setSaving(true);
    setError(null);
    try {
      setAccess(await window.aaaat.setupAssistant.updateAccess(next));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not change external setup authority.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {access ? (
        <SetupActionAuthority
          access={access}
          saving={saving}
          onChange={(next) => void updateAccess(next)}
        />
      ) : error ? null : <p>Reading setup-action authorization…</p>}
      {error ? <p className="error-message" role="alert">{error}</p> : null}
    </>
  );
}
