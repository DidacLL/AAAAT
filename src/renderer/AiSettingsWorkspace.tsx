import { useEffect, useMemo, useState } from "react";

import {
  aiOperationLabels,
  aiOperations,
  type AiOperation,
  type NamedAiConnection,
} from "../shared/ai-connection-contracts";

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

function editable(connection: NamedAiConnection): Draft {
  return {
    name: connection.name,
    endpoint: connection.endpoint,
    model: connection.model,
  };
}

export function AiSettingsWorkspace({
  onDirtyChange,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
}) {
  const [connections, setConnections] = useState<NamedAiConnection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyOperation, setBusyOperation] = useState<string | null>(null);
  const [portabilityBusy, setPortabilityBusy] = useState<"export" | "import" | null>(null);
  const [portabilityStatus, setPortabilityStatus] = useState<string | null>(null);

  const editing = useMemo(
    () => connections.find((connection) => connection.id === editingId) ?? null,
    [connections, editingId],
  );
  const baseline = editing ? editable(editing) : emptyDraft;
  const dirty = JSON.stringify(draft) !== JSON.stringify(baseline);
  const defaultConnection = connections.find((connection) => connection.isDefault) ?? null;

  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    let active = true;
    void window.aaaat.aiConnections
      .list()
      .then((saved) => {
        if (active) setConnections(saved);
      })
      .catch(() => {
        if (active) setError("AAAAT could not read the AI connection settings.");
      });
    return () => {
      active = false;
    };
  }, []);

  const confirmDiscard = () =>
    !dirty || window.confirm("Discard unsaved AI connection edits?");

  const beginNew = () => {
    if (!confirmDiscard()) return;
    setEditingId(null);
    setDraft(emptyDraft);
  };

  const beginEdit = (connection: NamedAiConnection) => {
    if (connection.id === editingId) return;
    if (!confirmDiscard()) return;
    setEditingId(connection.id);
    setDraft(editable(connection));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setPortabilityStatus(null);
    try {
      const saved = await window.aaaat.aiConnections.save({
        ...(editingId ? { id: editingId } : {}),
        ...draft,
      });
      setConnections(saved);
      const savedConnection = editingId
        ? saved.find((connection) => connection.id === editingId)
        : saved.find(
            (connection) => connection.name.toLocaleLowerCase() === draft.name.trim().toLocaleLowerCase(),
          );
      if (savedConnection) {
        setEditingId(savedConnection.id);
        setDraft(editable(savedConnection));
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not save this local AI connection.",
      );
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (connection: NamedAiConnection) => {
    setError(null);
    setPortabilityStatus(null);
    try {
      setConnections(await window.aaaat.aiConnections.setDefault(connection.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not change the default AI connection.");
    }
  };

  const remove = async (connection: NamedAiConnection) => {
    if (!window.confirm(`Remove local AI connection “${connection.name}”?`)) return;
    setError(null);
    setPortabilityStatus(null);
    try {
      const next = await window.aaaat.aiConnections.remove(connection.id);
      setConnections(next);
      if (connection.id === editingId) {
        setEditingId(null);
        setDraft(emptyDraft);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not remove this AI connection.");
    }
  };

  const validateOperation = async (connection: NamedAiConnection, operation: AiOperation) => {
    const busyKey = `validate:${connection.id}:${operation}`;
    setBusyOperation(busyKey);
    setError(null);
    setPortabilityStatus(null);
    try {
      setConnections(
        await window.aaaat.aiConnections.validateOperation({ connectionId: connection.id, operation }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `AAAAT could not validate ${aiOperationLabels[operation]}.`,
      );
    } finally {
      setBusyOperation(null);
    }
  };

  const setOperationDefault = async (connection: NamedAiConnection, operation: AiOperation) => {
    const busyKey = `default:${connection.id}:${operation}`;
    setBusyOperation(busyKey);
    setError(null);
    setPortabilityStatus(null);
    try {
      setConnections(
        await window.aaaat.aiConnections.setOperationDefault({ connectionId: connection.id, operation }),
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : `AAAAT could not change the default for ${aiOperationLabels[operation]}.`,
      );
    } finally {
      setBusyOperation(null);
    }
  };

  const exportPortable = async () => {
    setPortabilityBusy("export");
    setError(null);
    setPortabilityStatus(null);
    try {
      const result = await window.aaaat.aiConnections.exportPortable();
      if (result === "exported") {
        setPortabilityStatus("Portable AI setup exported without local IDs or validation state.");
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not export the portable AI setup.");
    } finally {
      setPortabilityBusy(null);
    }
  };

  const importPortable = async () => {
    if (!confirmDiscard()) return;
    if (
      !window.confirm(
        "Import portable AI setup? This replaces all current local AI connections and clears operation validations and operation defaults. You will need to validate operations again on this computer.",
      )
    ) {
      return;
    }
    setPortabilityBusy("import");
    setError(null);
    setPortabilityStatus(null);
    try {
      const result = await window.aaaat.aiConnections.importPortable();
      if (result.status === "imported") {
        setConnections(result.connections);
        setEditingId(null);
        setDraft(emptyDraft);
        setPortabilityStatus(
          "Portable AI setup imported. Validate operations again on this computer before using AI assistance.",
        );
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not import the portable AI setup.");
    } finally {
      setPortabilityBusy(null);
    }
  };

  return (
    <section className="profile-workspace" aria-label="AI settings">
      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Optional intelligence</p>
            <h2>{editing ? "Edit local AI connection" : "Add local AI connection"}</h2>
          </div>
          <span>Optional</span>
        </div>

        <p>
          Keep several named local OpenAI-compatible endpoints. Validate only the operations you
          intend to use; capability checks use synthetic AAAAT data, not your candidature or profile.
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
              {saving ? "Saving…" : editing ? "Save connection" : "Add connection"}
            </button>
            {editing ? (
              <button type="button" className="compact-secondary" onClick={beginNew}>
                Add another
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="profile-column">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Connection boundary</p>
            <h2>Configured local connections</h2>
          </div>
          <span>{connections.length}/16</span>
        </div>

        <div className="button-row">
          <button
            type="button"
            className="compact-secondary"
            disabled={portabilityBusy !== null}
            onClick={() => void exportPortable()}
          >
            {portabilityBusy === "export" ? "Exporting…" : "Export AI setup"}
          </button>
          <button
            type="button"
            className="compact-secondary"
            disabled={portabilityBusy !== null}
            onClick={() => void importPortable()}
          >
            {portabilityBusy === "import" ? "Importing…" : "Import AI setup"}
          </button>
        </div>
        <p>
          Portable AI setup contains connection names, local endpoints, models, and the general
          default only. It excludes local IDs and capability validation. Import replaces the current
          connection setup and requires operation validation again on this computer.
        </p>
        {portabilityStatus ? <p role="status">{portabilityStatus}</p> : null}

        {connections.length === 0 ? (
          <p>No local AI connections are configured yet.</p>
        ) : (
          <div className="document-list">
            {connections.map((connection) => (
              <article key={connection.id} className="document-card">
                <div>
                  <h3>{connection.name}</h3>
                  <p>
                    <code>{connection.model}</code> · <code>{connection.endpoint}</code>
                  </p>
                  {connection.isDefault ? <p><strong>General default connection</strong></p> : null}
                </div>
                <div className="button-row">
                  {!connection.isDefault ? (
                    <button
                      type="button"
                      className="compact-secondary"
                      onClick={() => void setDefault(connection)}
                      aria-label={`Use ${connection.name} as the general default`}
                    >
                      General default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="compact-secondary"
                    onClick={() => beginEdit(connection)}
                    aria-label={`Edit ${connection.name}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="compact-secondary"
                    onClick={() => void remove(connection)}
                    aria-label={`Remove ${connection.name}`}
                  >
                    Remove
                  </button>
                </div>
                <div className="wide-field">
                  <p><strong>Validated operations</strong></p>
                  {aiOperations.map((operation) => {
                    const validated = connection.validatedOperations.includes(operation);
                    const operationDefault = connection.defaultForOperations.includes(operation);
                    const validateKey = `validate:${connection.id}:${operation}`;
                    const defaultKey = `default:${connection.id}:${operation}`;
                    return (
                      <div key={operation} className="button-row">
                        <span>
                          {aiOperationLabels[operation]}: {validated ? "validated" : "not validated"}
                          {operationDefault ? " · operation default" : ""}
                        </span>
                        {!validated ? (
                          <button
                            type="button"
                            className="compact-secondary"
                            disabled={busyOperation !== null}
                            onClick={() => void validateOperation(connection, operation)}
                            aria-label={`Validate ${connection.name} for ${aiOperationLabels[operation]}`}
                          >
                            {busyOperation === validateKey ? "Validating…" : "Validate"}
                          </button>
                        ) : !operationDefault ? (
                          <button
                            type="button"
                            className="compact-secondary"
                            disabled={busyOperation !== null}
                            onClick={() => void setOperationDefault(connection, operation)}
                            aria-label={`Use ${connection.name} for ${aiOperationLabels[operation]}`}
                          >
                            {busyOperation === defaultKey ? "Saving…" : "Use for operation"}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            ))}
          </div>
        )}

        {connections.length > 0 && !defaultConnection ? (
          <p className="error-message">
            No general default AI connection is selected. An operation still works when it has an
            explicit validated operation default.
          </p>
        ) : null}
        <p>
          An operation uses its explicit operation default first. The general default is used only
          when it has been validated for that operation. AAAAT never falls back to another
          connection automatically, and validation is not a quality benchmark.
        </p>
      </div>
    </section>
  );
}
