import { useState } from "react";
import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import { recordAiReachabilityEvidence } from "./ai-reachability-store";

interface Props {
  readonly connection: NamedAiConnection;
  readonly onValidationState?: (connectionName: string, needsAttention: boolean) => void;
}

export function AiConnectionValidationPanel({ connection, onValidationState }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const check = async () => {
    setBusy(true); setMessage(null);
    try {
      const probe = window.aaaat.aiConnections.probe;
      if (!probe) throw new Error("Connection checking is available in the desktop app.");
      const reachable = await probe(connection.id);
      recordAiReachabilityEvidence(connection.name, reachable);
      onValidationState?.(connection.name, !reachable);
      setMessage(reachable ? "Connected" : "Could not reach this service.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Could not reach this service.");
    } finally { setBusy(false); }
  };
  return <div className="ai-connection-validation">
    <button type="button" className="compact-secondary" disabled={busy} onClick={() => void check()}>{busy ? "Checking…" : "Check connection"}</button>
    {message ? <span role="status">{message}</span> : null}
  </div>;
}
