import { useEffect, useLayoutEffect, useState } from "react";

import type { SetupEnvironmentSnapshot } from "../shared/setup-environment-contracts";
import {
  clearAiReachabilityEvidence,
  useAiReachabilityEvidence,
} from "./ai-reachability-store";

export interface WorkspaceRailStatusProjection {
  readonly data: "Demo" | "Local";
  readonly ai: "Off" | "Ready" | "Needs attention";
  readonly pdf: "Ready" | "Unavailable";
}

// eslint-disable-next-line react-refresh/only-export-components
export function deriveWorkspaceRailStatus(
  demo: boolean,
  environment: SetupEnvironmentSnapshot | null,
  attentionConnectionName: string | null = null,
  reachableConnectionNames: ReadonlySet<string> = new Set(),
): WorkspaceRailStatusProjection {
  void attentionConnectionName;
  const data = demo ? "Demo" : "Local";
  if (!environment) return { data, ai: "Needs attention", pdf: "Unavailable" };

  let ai: WorkspaceRailStatusProjection["ai"];
  if (!environment.ai.configurationReadable) {
    ai = "Needs attention";
  } else if (environment.ai.connectionCount === 0) {
    ai = "Off";
  } else {
    const currentlyReachableRoute = environment.ai.operations.some(
      (operation) =>
        operation.available &&
        operation.connectionName !== null &&
        reachableConnectionNames.has(operation.connectionName),
    );
    ai = currentlyReachableRoute ? "Ready" : "Needs attention";
  }

  return {
    data,
    ai,
    pdf: environment.tex.documentRenderingReady ? "Ready" : "Unavailable",
  };
}

export function WorkspaceRailStatus({
  demo,
  refreshRevision,
  attentionConnectionName,
}: {
  readonly demo: boolean;
  readonly refreshRevision: number;
  readonly attentionConnectionName: string | null;
}) {
  const [environment, setEnvironment] = useState<SetupEnvironmentSnapshot | null>(null);
  const reachableConnectionNames = useAiReachabilityEvidence();

  useLayoutEffect(() => {
    clearAiReachabilityEvidence();
  }, []);

  useEffect(() => {
    let active = true;
    void window.aaaat.setupEnvironment.current()
      .then((snapshot) => {
        if (active) setEnvironment(snapshot);
      })
      .catch(() => {
        if (active) setEnvironment(null);
      });
    return () => {
      active = false;
    };
  }, [refreshRevision]);

  const status = deriveWorkspaceRailStatus(
    demo,
    environment,
    attentionConnectionName,
    reachableConnectionNames,
  );
  return (
    <div className="rail-status" aria-label="Environment status">
      <span><i aria-hidden="true" />Data: <strong>{status.data}</strong></span>
      <span><i aria-hidden="true" />AI: <strong>{status.ai}</strong></span>
      <span><i aria-hidden="true" />PDF: <strong>{status.pdf}</strong></span>
    </div>
  );
}
