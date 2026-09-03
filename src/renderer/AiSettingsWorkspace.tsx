import { useEffect, useState } from "react";

import type { AiConnectionStatus } from "../shared/ai-contracts";

interface Draft {
  readonly name: string;
  readonly endpoint: string;
  readonly model: string;
}

const emptyDraft: Draft = {
  name: "",
  endpoint: "http://localhost:11434/v1",
  model: "",
};

function editable(status: AiConnectionStatus): Draft {
  return {
    name: status.name,
    endpoint: status.endpoint,
    model: status.model,
  };
}

export function AiSettingsWorkspace() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [status, setStatus] = useState<AiConnectionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void window.aaaat.ai
      .connection()
      .then((connection) => {
        if (!active) return;
        setStatus(connection);
        if (connection) setDraft(editable(connection));
      })
      .catch(() => {
        if (active) setError("AAAAT could not read the AI connection settings.");
      });
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await window.aaaat.ai.saveConnection(draft);
      setStatus(saved);
      setDraft(editable(saved));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not save the local AI connection.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-workspace" aria-label="AI settings">
      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">M3 connection</p>
            <h2>Local AI</h2>
          </div>
          <span>Optional</span>
        </div>

        <p>
          Connect AAAAT to a local OpenAI-compatible model endpoint. This first path is keyless,
          loopback-only, and keeps manual AAAAT fully usable without AI.
        </p>
        {error ? <p className="error-message" role="alert">{error}</p> : null}

        <form
          className="editor-card"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            Connection name
            <input
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Local model"
            />
          </label>
          <label>
            Model
            <input
              value={draft.model}
              onChange={(event) => setDraft({ ...draft, model: event.target.value })}
              placeholder="model-name"
            />
          </label>
          <label className="wide-field">
            Local provider base URL
            <input
              value={draft.endpoint}
              onChange={(event) => setDraft({ ...draft, endpoint: event.target.value })}
              placeholder="http://localhost:11434/v1"
            />
          </label>
          <div className="form-actions wide-field">
            <button className="compact-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save local connection"}
            </button>
          </div>
        </form>
      </div>

      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Connection boundary</p>
            <h2>Local only</h2>
          </div>
        </div>
        {status ? (
          <p>
            <strong>{status.name}</strong> uses <code>{status.endpoint}</code> with model{" "}
            <code>{status.model}</code>.
          </p>
        ) : (
          <p>No local AI connection is configured yet.</p>
        )}
        <p>
          Only loopback endpoints are accepted in this slice. Remote authentication and API-key
          setup are intentionally not part of the first user path.
        </p>
      </div>
    </section>
  );
}
