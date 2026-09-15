import { useEffect, useMemo, useState } from "react";

import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import { AiConnectionValidationPanel } from "./AiConnectionValidationPanel";
import { clearAiTask } from "./ai-task-store";

interface Draft {
  readonly name: string;
  readonly endpoint: string;
  readonly model: string;
}

type AiSettingsView = "all" | "connections" | "portability";

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
  view = "all",
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly view?: AiSettingsView;
}) {
  const [connections, setConnections] = useState<NamedAiConnection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(view === "all");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [portabilityBusy, setPortabilityBusy] = useState<"export" | "import" | null>(null);
  const [portabilityStatus, setPortabilityStatus] = useState<string | null>(null);

  const editing = useMemo(
    () => connections.find((connection) => connection.id === editingId) ?? null,
    [connections, editingId],
  );
  const baseline = editing ? editable(editing) : emptyDraft;
  const dirty = formOpen && JSON.stringify(draft) !== JSON.stringify(baseline);
  const defaultConnection = connections.find((connection) => connection.isDefault) ?? null;
  const showConnections = view !== "portability";
  const showPortability = view !== "connections";

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
    setFormOpen(true);
  };

  const beginEdit = (connection: NamedAiConnection) => {
    if (connection.id === editingId && formOpen) return;
    if (!confirmDiscard()) return;
    setEditingId(connection.id);
    setDraft(editable(connection));
    setFormOpen(true);
  };

  const closeForm = () => {
    if (!confirmDiscard()) return;
    setEditingId(null);
    setDraft(emptyDraft);
    setFormOpen(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setPortabilityStatus(null);
    try {
      const previous = editingId
        ? connections.find((connection) => connection.id === editingId) ?? null
        : null;
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
        const capabilityBoundaryChanged =
          previous !== null &&
          (previous.endpoint !== savedConnection.endpoint || previous.model !== savedConnection.model);
        if (capabilityBoundaryChanged) clearAiTask(`ai-validation:${savedConnection.id}`);
        setEditingId(savedConnection.id);
        setDraft(editable(savedConnection));
      }
      if (view === "connections") setFormOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "AAAAT could not save this AI connection.",
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
    if (!window.confirm(`Remove AI connection “${connection.name}”?`)) return;
    setError(null);
    setPortabilityStatus(null);
    try {
      const next = await window.aaaat.aiConnections.remove(connection.id);
      clearAiTask(`ai-validation:${connection.id}`);
      setConnections(next);
      if (connection.id === editingId) {
        setEditingId(null);
        setDraft(emptyDraft);
        if (view === "connections") setFormOpen(false);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not remove this AI connection.");
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
        "Import portable AI setup? This replaces all current AI connections and clears operation validations and operation defaults. You will need to validate AI capabilities again on this computer.",
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
        for (const connection of connections) clearAiTask(`ai-validation:${connection.id}`);
        setConnections(result.connections);
        setEditingId(null);
        setDraft(emptyDraft);
        setFormOpen(view === "all");
        setPortabilityStatus(
          "Portable AI setup imported. Validate AI capabilities on this computer before using AI assistance.",
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
      {showConnections ? (
        <div className="profile-column">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Optional assistance</p>
              <h2>AI connections</h2>
            </div>
            <span>Optional</span>
          </div>
          <p>
            Connect a local or remote OpenAI-compatible model when you want AI assistance. AAAAT works
            fully without AI. Connection checks use synthetic test data, not your candidature or
            professional information. Slow local models may take minutes; the check stays visible while
            you continue working. HTTP is accepted only for a loopback endpoint. Remote endpoints must
            use HTTPS and handle authentication outside AAAAT.
          </p>
          {error ? <p className="error-message" role="alert">{error}</p> : null}

          {formOpen ? (
            <form
              className="editor-card"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="section-heading wide-field">
                <div><h3>{editing ? "Edit connection" : "Add connection"}</h3></div>
                {view === "connections" ? (
                  <button type="button" className="compact-secondary" onClick={closeForm}>Cancel</button>
                ) : null}
              </div>
              <label>
                Connection name
                <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Local model" />
              </label>
              <label>
                Model
                <input value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="model-name" />
              </label>
              <label className="wide-field">
                Connection address
                <input
                  value={draft.endpoint}
                  onChange={(event) => setDraft({ ...draft, endpoint: event.target.value })}
                  placeholder="http://localhost:11434/v1 or https://provider.example/v1"
                />
              </label>
              <div className="form-actions wide-field">
                <button className="compact-primary" type="submit" disabled={saving}>{saving ? "Saving…" : editing ? "Save connection" : "Add connection"}</button>
                {editing && view === "all" ? <button type="button" className="compact-secondary" onClick={beginNew}>Add another</button> : null}
              </div>
            </form>
          ) : (
            <button className="compact-primary" type="button" onClick={beginNew}>Add connection</button>
          )}
        </div>
      ) : null}

      {showConnections ? (
        <div className="profile-column">
          <div className="section-heading">
            <div><p className="eyebrow">Connections</p><h2>Configured connections</h2></div>
            <span>{connections.length}/16</span>
          </div>

          {connections.length === 0 ? (
            <p>No AI connections are configured yet. Manual product operation is complete without one.</p>
          ) : (
            <div className="document-list">
              {connections.map((connection) => (
                <article key={connection.id} className="document-card">
                  <div>
                    <h3>{connection.name}</h3>
                    <p><code>{connection.model}</code> · <code>{connection.endpoint}</code></p>
                    {connection.isDefault ? <p><strong>General default connection</strong></p> : null}
                  </div>
                  <div className="button-row">
                    {!connection.isDefault ? <button type="button" className="compact-secondary" onClick={() => void setDefault(connection)} aria-label={`Use ${connection.name} as the general default`}>General default</button> : null}
                    <button type="button" className="compact-secondary" onClick={() => beginEdit(connection)} aria-label={`Edit ${connection.name}`}>Edit</button>
                    <button type="button" className="compact-secondary" onClick={() => void remove(connection)} aria-label={`Remove ${connection.name}`}>Remove</button>
                  </div>
                  <AiConnectionValidationPanel connection={connection} onConnections={setConnections} />
                </article>
              ))}
            </div>
          )}

          {connections.length > 0 && !defaultConnection ? <p className="error-message">No general default AI connection is selected. Choose one unless every AI action has its own selected connection.</p> : null}
          <p className="compact-help">One visible check runs the remaining supported AI actions in sequence. Each action is still checked separately, and you can keep using AAAAT while it runs.</p>
        </div>
      ) : null}

      {showPortability ? (
        <div className="profile-column">
          <div className="section-heading"><div><p className="eyebrow">Configuration portability</p><h2>Portable AI setup</h2></div></div>
          {view === "portability" && error ? <p className="error-message" role="alert">{error}</p> : null}
          <p>Export or import connection names, endpoints, models and the general default. This is configuration portability, not a workspace backup; local IDs and capability validation are excluded.</p>
          <div className="button-row">
            <button type="button" className="compact-secondary" disabled={portabilityBusy !== null} onClick={() => void exportPortable()}>{portabilityBusy === "export" ? "Exporting…" : "Export AI setup"}</button>
            <button type="button" className="compact-secondary" disabled={portabilityBusy !== null} onClick={() => void importPortable()}>{portabilityBusy === "import" ? "Importing…" : "Import AI setup"}</button>
          </div>
          {portabilityStatus ? <p role="status">{portabilityStatus}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
