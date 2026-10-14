import { useCallback, useEffect, useMemo, useState } from "react";

import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import { AiConnectionValidationPanel } from "./AiConnectionValidationPanel";
import { AiPromptTransparencyPanel } from "./AiPromptTransparencyPanel";
import { LocalAiStartupPanel } from "./LocalAiStartupPanel";
import { PageToolbar } from "./PageToolbar";
import { clearAiReachabilityEvidence, recordAiReachabilityEvidence } from "./ai-reachability-store";
import { clearAiTask } from "./ai-task-store";

type CredentialIntent = "unchanged" | "replace" | "clear";

interface Draft {
  readonly name: string;
  readonly endpoint: string;
  readonly model: string;
  readonly credential: string;
  readonly credentialIntent: CredentialIntent;
}

type AiSettingsView = "all" | "connections" | "portability";

const emptyDraft: Draft = {
  name: "",
  endpoint: "",
  model: "",
  credential: "",
  credentialIntent: "unchanged",
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

function editable(
  connection: NamedAiConnection,
  credentialIntent: CredentialIntent = "unchanged",
): Draft {
  return {
    name: connection.name,
    endpoint: connection.endpoint,
    model: connection.model,
    credential: "",
    credentialIntent,
  };
}

export function AiSettingsWorkspace({
  onDirtyChange,
  onEnvironmentChange,
  onValidationState,
  view = "all",
  initialFormOpen,
  refreshRevision = 0,
}: {
  readonly onDirtyChange?: (dirty: boolean) => void;
  readonly onEnvironmentChange?: () => void;
  readonly onValidationState?: (connectionName: string, needsAttention: boolean) => void;
  readonly view?: AiSettingsView;
  readonly initialFormOpen?: boolean;
  readonly refreshRevision?: number;
}) {
  const [connections, setConnections] = useState<NamedAiConnection[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(initialFormOpen ?? false);
  const [error, setError] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [portabilityBusy, setPortabilityBusy] = useState<"export" | "import" | null>(null);
  const [portabilityStatus, setPortabilityStatus] = useState<string | null>(null);
  const [promptDirty, setPromptDirty] = useState(false);
  const [startupDirty, setStartupDirty] = useState(false);

  const editing = useMemo(
    () => connections.find((connection) => connection.id === editingId) ?? null,
    [connections, editingId],
  );
  const baseline = editing ? editable(editing) : emptyDraft;
  const connectionDirty = formOpen && JSON.stringify(draft) !== JSON.stringify(baseline);
  const dirty = connectionDirty || promptDirty || startupDirty;
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
  }, [refreshRevision]);

  const confirmDiscard = () =>
    !connectionDirty || window.confirm("Discard unsaved AI connection edits?");

  const beginNew = () => {
    if (!confirmDiscard()) return;
    setEditingId(null);
    setDraft(emptyDraft);
    setFormOpen(true);
  };

  const beginEdit = (
    connection: NamedAiConnection,
    credentialIntent: CredentialIntent = "unchanged",
  ) => {
    if (
      connection.id === editingId &&
      formOpen &&
      credentialIntent === draft.credentialIntent
    ) return;
    if (!confirmDiscard()) return;
    setEditingId(connection.id);
    setDraft(editable(connection, credentialIntent));
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
    if (editingId && draft.credentialIntent === "replace" && !draft.credential.trim()) {
      setError("Enter the replacement API key or Bearer credential, or keep the current credential.");
      return;
    }
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
      const credentialUpdate =
        editingId
          ? draft.credentialIntent === "replace"
            ? draft.credential
            : draft.credentialIntent === "clear"
              ? null
              : undefined
          : draft.credential.trim()
            ? draft.credential
            : undefined;
      const saved = await window.aaaat.aiConnections.save({
        ...(editingId ? { id: editingId } : {}),
        name: draft.name,
        endpoint: draft.endpoint,
        model: draft.model,
        ...(credentialUpdate !== undefined ? { credential: credentialUpdate } : {}),
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
        const credentialBoundaryChanged =
          previous !== null && draft.credentialIntent !== "unchanged";
        if (capabilityBoundaryChanged || credentialBoundaryChanged) {
          clearAiTask(`ai-validation:${savedConnection.id}`);
        }
        const probe = window.aaaat.aiConnections?.probe;
        if (probe && (!previous || capabilityBoundaryChanged || credentialBoundaryChanged)) {
          void probe(savedConnection.id)
            .then((reachable) => {
              recordAiReachabilityEvidence(savedConnection.name, reachable);
              onValidationState?.(savedConnection.name, !reachable);
              if (!reachable) {
                setError("Connection saved, but AAAAT could not reach this AI service.");
              }
            })
            .catch((reason: unknown) => {
              recordAiReachabilityEvidence(savedConnection.name, false);
              onValidationState?.(savedConnection.name, true);
              setError(
                reason instanceof Error
                  ? `Connection saved, but the reachability check failed: ${reason.message}`
                  : "Connection saved, but AAAAT could not reach this AI service.",
              );
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
        setFormOpen(initialFormOpen ?? false);
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
      {showConnections ? <PageToolbar>
        {formOpen ? <>
          <button type="button" disabled={saving || !connectionDirty || !draft.name.trim() || !draft.model.trim() || !draft.endpoint.trim()} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</button>
          <button type="button" disabled={saving} onClick={closeForm}>Cancel</button>
        </> : <button type="button" onClick={beginNew}>New connection</button>}
      </PageToolbar> : null}
      {showConnections ? (
        <div className="profile-column">
          {formOpen ? <div className="section-heading"><h2>{editing ? "Edit connection" : "New connection"}</h2></div> : null}
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
              <div className="wide-field">
                {editing?.hasCredential ? <strong>Saved credential</strong> : null}
                {editing?.hasCredential && draft.credentialIntent === "unchanged" ? (
                  <>
                    <p>Credential configured. The stored secret is hidden and is sent only with requests to this model server.</p>
                    <div className="button-row">
                      <button
                        type="button"
                        className="compact-secondary"
                        onClick={() => setDraft({ ...draft, credentialIntent: "replace", credential: "" })}
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        className="compact-secondary"
                        onClick={() => setDraft({ ...draft, credentialIntent: "clear", credential: "" })}
                      >
                        Clear
                      </button>
                    </div>
                  </>
                ) : editing?.hasCredential && draft.credentialIntent === "clear" ? (
                  <>
                    <p>The configured credential will be cleared when you save this connection.</p>
                    <button
                      type="button"
                      className="compact-secondary"
                      onClick={() => setDraft({ ...draft, credentialIntent: "unchanged", credential: "" })}
                    >
                      Keep credential
                    </button>
                  </>
                ) : (
                  <>
                    <label>
                      {editing?.hasCredential ? "Replacement credential" : "API key (optional)"}
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={draft.credential}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            credential: event.target.value,
                            credentialIntent: editing
                              ? event.target.value.trim()
                                ? "replace"
                                : editing.hasCredential
                                  ? "replace"
                                  : "unchanged"
                              : "unchanged",
                          })
                        }
                        placeholder="Optional API key or Bearer token"
                      />
                    </label>
                    <details><summary>About credentials</summary>
                      <p>Leave blank if your server needs no credential. AAAAT sends it only to this server and keeps the saved value hidden.</p>
                    </details>
                    {editing?.hasCredential ? (
                      <button
                        type="button"
                        className="compact-secondary"
                        onClick={() => setDraft({ ...draft, credentialIntent: "unchanged", credential: "" })}
                      >
                        Keep current credential
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            </form>
          ) : null}
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
                    <p>Authentication: {connection.hasCredential ? <strong>Credential configured</strong> : "None"}</p>
                    {connection.isDefault ? <p><strong>General default connection</strong></p> : null}
                  </div>
                  <div className="button-row">
                    {!connection.isDefault ? <button type="button" className="compact-secondary" onClick={() => void setDefault(connection)} aria-label={`Use ${connection.name} as the general default`}>General default</button> : null}
                    <button type="button" className="compact-secondary" onClick={() => beginEdit(connection)} aria-label={`Edit ${connection.name}`}>Edit</button>
                    {connection.hasCredential ? (
                      <>
                        <button type="button" className="compact-secondary" onClick={() => beginEdit(connection, "replace")}>Replace credential</button>
                        <button type="button" className="compact-secondary" onClick={() => beginEdit(connection, "clear")}>Clear credential</button>
                      </>
                    ) : null}
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
        </div>
      ) : null}

      {showConnections ? <LocalAiStartupPanel revision={refreshRevision} onDirtyChange={setStartupDirty} /> : null}
      {showConnections ? <details className="profile-column">
        <summary>AI instructions</summary>
        <AiPromptTransparencyPanel onDirtyChange={setPromptDirty} />
      </details> : null}

      {showPortability ? (
        <details className="profile-column">
          <summary>Import or export AI connections</summary>
          {view === "portability" && error ? <p className="error-message" role="alert">{error}</p> : null}
          <p>Connection names, servers, models and the default connection. Credentials are excluded.</p>
          <div className="button-row">
            <button type="button" className="compact-secondary" disabled={portabilityBusy !== null} onClick={() => void exportPortable()}>{portabilityBusy === "export" ? "Exporting…" : "Export"}</button>
            <button type="button" className="compact-secondary" disabled={portabilityBusy !== null} onClick={() => void importPortable()}>{portabilityBusy === "import" ? "Importing…" : "Import"}</button>
          </div>
          {portabilityStatus ? <p role="status">{portabilityStatus}</p> : null}
        </details>
      ) : null}
    </div>
  );
}
