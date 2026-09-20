import { useEffect, useLayoutEffect, useState } from "react";

import type { SetupEnvironmentSnapshot } from "../shared/setup-environment-contracts";
import {
  clearAiReachabilityEvidence,
  recordAiReachabilityEvidence,
  useAiReachabilityEvidence,
} from "./ai-reachability-store";

export interface WorkspaceRailStatusProjection {
  readonly data: "Demo" | "Local";
  readonly ai: "Off" | "Checking" | "Ready" | "Needs attention";
  readonly pdf: "Ready" | "Unavailable";
}

function routedConnectionNames(environment: SetupEnvironmentSnapshot | null): ReadonlySet<string> {
  return new Set(
    environment?.ai.operations.flatMap((operation) =>
      operation.available && operation.connectionName ? [operation.connectionName] : [],
    ) ?? [],
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function deriveWorkspaceRailStatus(
  demo: boolean,
  environment: SetupEnvironmentSnapshot | null,
  attentionConnectionName: string | null = null,
  reachableConnectionNames: ReadonlySet<string> = new Set(),
  checking = false,
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
    const routeNames = routedConnectionNames(environment);
    if (checking && routeNames.size > 0) {
      ai = "Checking";
    } else {
      const currentlyReachableRoute = [...routeNames].some((name) =>
        reachableConnectionNames.has(name),
      );
      ai = currentlyReachableRoute ? "Ready" : "Needs attention";
    }
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
  const [checkingAi, setCheckingAi] = useState(false);
  const reachableConnectionNames = useAiReachabilityEvidence();

  useLayoutEffect(() => {
    clearAiReachabilityEvidence();
  }, []);

  const probeRoutes = async (snapshot: SetupEnvironmentSnapshot) => {
    const probe = window.aaaat.aiConnections?.probe;
    const routeNames = routedConnectionNames(snapshot);
    if (!probe || routeNames.size === 0) return;

    const connections = await window.aaaat.aiConnections.list();
    const targets = connections.filter((connection) => routeNames.has(connection.name));
    if (targets.length === 0) return;

    setCheckingAi(true);
    for (const connection of targets) recordAiReachabilityEvidence(connection.name, false);
    try {
      await Promise.all(
        targets.map(async (connection) => {
          const reachable = await probe(connection.id);
          recordAiReachabilityEvidence(connection.name, reachable);
        }),
      );
    } finally {
      setCheckingAi(false);
    }
  };

  useEffect(() => {
    let active = true;
    void window.aaaat.setupEnvironment.current()
      .then(async (snapshot) => {
        if (!active) return;
        setEnvironment(snapshot);
        await probeRoutes(snapshot);
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
    checkingAi,
  );
  const canRetryAi =
    environment !== null &&
    routedConnectionNames(environment).size > 0 &&
    window.aaaat.aiConnections?.probe !== undefined;

  return (
    <div className="rail-status" aria-label="Environment status">
      <span><i aria-hidden="true" />Data: <strong>{status.data}</strong></span>
      <span><i aria-hidden="true" />AI: <strong>{status.ai}</strong></span>
      <span><i aria-hidden="true" />PDF: <strong>{status.pdf}</strong></span>
      {canRetryAi ? (
        <button
          type="button"
          className="compact-secondary"
          disabled={checkingAi}
          onClick={() => {
            if (environment) void probeRoutes(environment);
          }}
        >
          {checkingAi ? "Checking AI…" : status.ai === "Ready" ? "Test AI" : "Retry AI"}
        </button>
      ) : null}
    </div>
  );
}
