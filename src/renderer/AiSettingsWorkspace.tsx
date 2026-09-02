import { useEffect, useState } from "react";

import type {
  AiConnectionClassification,
  AiConnectionStatus,
} from "../shared/ai-contracts";

interface Draft {
  readonly name: string;
  readonly endpoint: string;
  readonly model: string;
  readonly classification: AiConnectionClassification;
}

const emptyDraft: Draft = {
  name: "",
  endpoint: "",
  model: "",
  classification: "local",
};

function editable(status: AiConnectionStatus): Draft {
  return {
    name: status.name,
    endpoint: status.endpoint,
    model: status.model,
    classification: status.classification,
  };
}

export function AiSettingsWorkspace() {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [apiKey, setApiKey] = useState("");
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
      const saved = await window.aaaat.ai.saveConnection({
        ...draft,
        ...(apiKey ? { apiKey } : {}),
      });
      setStatus(saved);
      setDraft(editable(saved));
      setApiKey("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not save the AI connection.",
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
            <h2>AI provider</h2>
          </div>
          <span>Optional</span>
        </div>

        <p>
          Configure one OpenAI-compatible model endpoint. Manual AAAAT remains fully usable
          without this connection.
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
            Classification
            <select
              value={draft.classification}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  classification: event.target.value as AiConnectionClassification,
                })
              }
            >
              <option value="local">Local</option>
              <option value="remote">Remote</option>
              <option value="unknown">Unknown</option>
            </select>
          </label>
          <label className="wide-field">
            Provider base URL
            <input
              value={draft.endpoint}
              onChange={(event) => setDraft({ ...draft, endpoint: event.target.value })}
              placeholder="http://localhost:11434/v1"
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
          <label>
            API key
            <input
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={status?.hasCredential ? "Stored securely — leave blank to keep" : "Optional"}
            />
          </label>
          <div className="form-actions wide-field">
            <button className="compact-primary" type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save connection"}
            </button>
          </div>
        </form>
      </div>

      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Credential boundary</p>
            <h2>Storage status</h2>
          </div>
        </div>
        {status ? (
          <>
            <p>
              <strong>{status.name}</strong> is configured as {status.classification} using{" "}
              <code>{status.endpoint}</code>.
            </p>
            <p>
              Credential: {status.hasCredential ? "stored encrypted" : "not stored"}. Secure OS
              storage is {status.secureStorageAvailable ? "available" : "unavailable"}.
            </p>
            {!status.secureStorageAvailable ? (
              <p className="error-message">
                AAAAT will not persist a new API key while secure OS storage is unavailable.
              </p>
            ) : null}
          </>
        ) : (
          <p>No AI connection is configured yet.</p>
        )}
        <p>
          Remote and unknown connections require HTTPS. A connection marked local is restricted
          to the loopback interface.
        </p>
      </div>
    </section>
  );
}
