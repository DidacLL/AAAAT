import { useEffect, useState } from "react";

import type { SetupEnvironmentSnapshot } from "../shared/setup-environment-contracts";

export interface WorkspaceRailStatusProjection {
  readonly data: "Demo" | "Local";
  readonly ai: "Off" | "Ready" | "Needs attention";
  readonly pdf: "Ready" | "Unavailable";
}

export function deriveWorkspaceRailStatus(
  demo: boolean,
  environment: SetupEnvironmentSnapshot | null,
  attentionConnectionName: string | null = null,
): WorkspaceRailStatusProjection {
  const data = demo ? "Demo" : "Local";
  if (!environment) return { data, ai: "Needs attention", pdf: "Unavailable" };

  let ai: WorkspaceRailStatusProjection["ai"];
  if (!environment.ai.configurationReadable) {
    ai = "Needs attention";
  } else if (environment.ai.connectionCount === 0) {
    ai = "Off";
  } else {
    const usableRoutes = environment.ai.operations.filter(
      (operation) => operation.available && operation.connectionName !== null,
    );
    const reliableRoute = attentionConnectionName
      ? usableRoutes.some((operation) => operation.connectionName !== attentionConnectionName)
      : usableRoutes.length > 0;
    ai = reliableRoute ? "Ready" : "Needs attention";
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

  const status = deriveWorkspaceRailStatus(demo, environment, attentionConnectionName);
  return (
    <div className="rail-status" aria-label="Environment status">
      <span><i aria-hidden="true" />Data: <strong>{status.data}</strong></span>
      <span><i aria-hidden="true" />AI: <strong>{status.ai}</strong></span>
      <span><i aria-hidden="true" />PDF: <strong>{status.pdf}</strong></span>
    </div>
  );
}
