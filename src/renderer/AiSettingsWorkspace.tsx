import { useCallback, useEffect, useMemo, useState } from "react";

import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import { AiConnectionValidationPanel } from "./AiConnectionValidationPanel";
import { AiPromptTransparencyPanel } from "./AiPromptTransparencyPanel";
import { clearAiReachabilityEvidence, recordAiReachabilityEvidence } from "./ai-reachability-store";
import { clearAiTask } from "./ai-task-store";

interface Draft {
  readonly name: string;
  readonly endpoint: string;
  readonly model: string;
}

type AiSettingsView = "all" | "connections" | "portability";

const emptyDraft: Draft = {
  name: "",
  endpoint: "",
  model: "",
};

function addressIssue(value: string): string | null {
  if (!value.trim()) return "Enter the model server address.";
  if (!/^https?:\/\//i.test(value.trim())) return "Start the address with http:// or https://.";
  try {
    const address = new URL(value.trim());
    if (!address.hostname) return "Enter a complete server address.";
    if (address.username || address.password || address.search || address.hash) return "Use a plain server address without a password, query or fragment.";
    if (address.protocol === "http:" && !["localhost", "127.0.0.1", "[::1]"].includes(address.hostname)) return "Remote model servers need an https:// address.";
  } catch {
    return "This is not a valid server address. Check spelling and punctuation.";
  }
  return null;
}

function editable(connection: NamedAiConnection): Draft {
  return {
    name: connection.name,
    endpoint: connection.endpoint,
    model: connection.model,
  };
}

export function AiSettingsWorkspace({
  onDirtyChange,
  onEnvironmentChange,
  onValidationState,
  view = "all",
  initialFormOpen,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onEnvironmentChange?: () => void;
  readonly onValidationState?: (connectionName: string, needsAttention: boolean) => void;
  readonly view?: AiSettingsView;
  readonly initialFormOpen?: boolean;
}) {
  const [connections, setConnections] = useState<NamedAiConnection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(initialFormOpen ?? view === "all");
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [portabilityBusy, setPortabilityBusy] = useState<"export" | "import" | null>(null);
  const [portabilityStatus, setPortabilityStatus] = useState<string | null>(null);
  const [promptDirty, setPromptDirty] = useState(false);

  const editing = useMemo(
    () => connections.find((connection) => connection.id === editingId) ?? null,
    [connections, editingId],
  );
  const baseline = editing ? editable(editing) : emptyDraft;
  const connectionDirty = formOpen && JSON.stringify(draft) !== JSON.stringify(baseline);
  const dirty = connectionDirty || promptDirty;
  const defaultConnection = connections.find((connection) => connection.isDefault) ?? null;
  const showConnections = view !== "portability";
  const showPortability = view !== "connections";

  const acceptConnections = useCallback((next: NamedAiConnection[]) => {
    setConnections(next);
    onEnvironmentChange?.();
  }, [onEnvironmentChange]);

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
    !connectionDirty || window.confirm("Discard unsaved AI connection edits?");

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
    const issue = addressIssue(draft.endpoint);
    if (issue) { setAddressError(issue); return; }
    setSaving(true);
    setError(null);
    setAddressError(null);
    setSaveNotice(null);
    setPortabilityStatus(null);
    clearAiReachabilityEvidence();
    try {
      const previous = editingId
        ? connections.find((connection) => connection.id === editingId) ?? null
        : null;
      const saved = await window.aaaat.aiConnections.save({
        ...(editingId ? { id: editingId } : {}),
        ...draft,
      });
      acceptConnections(saved);
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
        const probe = window.aaaat.aiConnections?.probe;
        if (probe && (!previous || capabilityBoundaryChanged)) {
          void probe(savedConnection.id)
            .then((reachable) => {
              recordAiReachabilityEvidence(savedConnection.name, reachable);
              onValidationState?.(savedConnection.name, !reachable);
            })
            .catch(() => {
              recordAiReachabilityEvidence(savedConnection.name, false);
              onValidationState?.(savedConnection.name, true);
            });
        }
      }
      setEditingId(null);
      setDraft(emptyDraft);
      setFormOpen(false);
      setSaveNotice("Connection saved. AAAAT is checking reachability in the background. Capability checks remain explicit below.");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "AAAAT could not save this AI connection.";
      if (/endpoint|address|url|https?|loopback/i.test(message)) setAddressError(message);
      else setError(message);
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (connection: NamedAiConnection) => {
    setError(null);
    setPortabilityStatus(null);
    try {
      acceptConnections(await window.aaaat.aiConnections.setDefault(connection.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "AAAAT could not change the default AI connection.");
    }
  };

  const remove = async (connection: NamedAiConnection) => {
    if (!window.confirm(`Remove AI connection “${connection.name}”?`)) return;
    setError(null);
    setPortabilityStatus(null);
    clearAiReachabilityEvidence();
    try {
      const next = await window.aaaat.aiConnections.remove(connection.id);
      clearAiTask(`ai-validation:${connection.id}`);
      acceptConnections(next);
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
    clearAiReachabilityEvidence();
    try {
      const result = await window.aaaat.aiConnections.importPortable();
      if (result.status === "imported") {
        for (const connection of connections) clearAiTask(`ai-validation:${connection.id}`);
        acceptConnections(result.connections);
        setEditingId(null);
        setDraft(emptyDraft);
        setFormOpen(initialFormOpen ?? view === "all");
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
    <div className="profile-workspace">
      {showConnections ? (
        <div className="profile-column">
          {view === "all" ? <div className="section-heading"><div><h2>AI connections</h2></div></div> : null}
          <p>Connect a model server for help with offers, CVs and letters. AI is optional.</p>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
          {saveNotice ? <p className="document-notice" role="status">{saveNotice}</p> : null}

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
                {(view === "connections" || initialFormOpen === false) ? (
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
                Model server address
                <input
                  value={draft.endpoint}
                  aria-invalid={Boolean(addressError)}
                  aria-describedby={addressError ? "ai-address-error" : undefined}
                  onChange={(event) => { setDraft({ ...draft, endpoint: event.target.value }); setAddressError(null); setSaveNotice(null); }}
                  onBlur={() => { if (draft.endpoint.trim()) setAddressError(addressIssue(draft.endpoint)); }}
                  placeholder="http://localhost:11434/v1 or https://provider.example/v1"
                />
              </label>
              {addressError ? <small id="ai-address-error" className="error-message wide-field" role="alert">{addressError}</small> : null}
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
            <div><h2>Saved connections</h2></div>
            <span>{connections.length}/16</span>
          </div>

          {connections.length === 0 ? (
            <p>No saved connections.</p>
          ) : (
            <div className="document-list">
              {connections.map((connection) => (
                <article key={connection.id} className="document-card">
                  <div>
                    <h3>{connection.name}</h3>
                    <p>Model: {connection.model} · Address: <code>{connection.endpoint}</code></p>
                    {connection.isDefault ? <p><strong>General default connection</strong></p> : null}
                  </div>
                  <div className="button-row">
                    {!connection.isDefault ? <button type="button" className="compact-secondary" onClick={() => void setDefault(connection)} aria-label={`Use ${connection.name} as the general default`}>General default</button> : null}
                    <button type="button" className="compact-secondary" onClick={() => beginEdit(connection)} aria-label={`Edit ${connection.name}`}>Edit</button>
                    <button type="button" className="compact-secondary" onClick={() => void remove(connection)} aria-label={`Remove ${connection.name}`}>Remove</button>
                  </div>
                  <AiConnectionValidationPanel
                    connection={connection}
                    onConnections={acceptConnections}
                    onValidationState={onValidationState}
                  />
                </article>
              ))}
            </div>
          )}

          {connections.length > 0 && !defaultConnection ? <p className="error-message">No general default AI connection is selected. Choose one unless every AI action has its own selected connection.</p> : null}
          <p className="compact-help">One visible check runs the remaining supported AI actions in sequence. Each action is still checked separately, and you can keep using AAAAT while it runs.</p>
        </div>
      ) : null}

      {showConnections ? <AiPromptTransparencyPanel onDirtyChange={setPromptDirty} /> : null}

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
    </div>
  );
}
