import { useEffect, useState } from "react";

import {
  aiOperationLabels,
  aiOperations,
  type AiOperation,
  type NamedAiConnection,
} from "../shared/ai-connection-contracts";
import { startAiTask, useAiTask } from "./ai-task-store";

interface Props {
  readonly connection: NamedAiConnection;
  readonly onConnections: (connections: NamedAiConnection[]) => void;
}

function taskKey(connectionId: string): string {
  return `ai-validation:${connectionId}`;
}

export function AiConnectionValidationPanel({ connection, onConnections }: Props) {
  const task = useAiTask<NamedAiConnection[]>(taskKey(connection.id));
  const [routingBusy, setRoutingBusy] = useState<AiOperation | null>(null);
  const active = task?.status === "queued" || task?.status === "working";
  const allValidated = aiOperations.every((operation) =>
    connection.validatedOperations.includes(operation),
  );

  useEffect(() => {
    if (task?.status === "completed" && task.result) onConnections(task.result);
    if (task?.status !== "failed") return;
    let mounted = true;
    void window.aaaat.aiConnections.list().then((connections) => {
      if (mounted) onConnections(connections);
    });
    return () => {
      mounted = false;
    };
  }, [onConnections, task?.result, task?.status]);

  const validate = () => {
    startAiTask<NamedAiConnection[]>(taskKey(connection.id), async (updateDetail) => {
      let connections = await window.aaaat.aiConnections.list();
      let current = connections.find((candidate) => candidate.id === connection.id);
      if (!current) throw new Error("The AI connection no longer exists.");

      for (const operation of aiOperations) {
        if (current.validatedOperations.includes(operation)) continue;
        updateDetail(
          `Validating ${aiOperationLabels[operation]}. Slow local models can take several minutes; you can keep using AAAAT while this runs.`,
        );
        connections = await window.aaaat.aiConnections.validateOperation({
          connectionId: connection.id,
          operation,
        });
        current = connections.find((candidate) => candidate.id === connection.id);
        if (!current) throw new Error("The AI connection no longer exists.");
      }
      return connections;
    });
  };

  const setOperationDefault = async (operation: AiOperation) => {
    setRoutingBusy(operation);
    try {
      onConnections(
        await window.aaaat.aiConnections.setOperationDefault({
          connectionId: connection.id,
          operation,
        }),
      );
    } finally {
      setRoutingBusy(null);
    }
  };

  const validatedCount = connection.validatedOperations.length;
  const health = active
    ? "Working"
    : task?.status === "failed"
      ? "Needs attention"
      : validatedCount > 0
        ? "Reachable"
        : "Configured · not checked";

  return (
    <section className="ai-validation-card" aria-label={`AI readiness for ${connection.name}`}>
      <div className="ai-readiness-line">
        <strong>Connection</strong>
        <span>{health}</span>
      </div>
      <div className="ai-readiness-line">
        <strong>Capabilities</strong>
        <span>{validatedCount}/{aiOperations.length} validated</span>
      </div>

      {task?.status === "queued" ? (
        <p role="status" className="ai-task-state">Queued. AAAAT will keep this AI task running if you leave Settings.</p>
      ) : task?.status === "working" ? (
        <p role="status" className="ai-task-state">{task.detail ?? "Working…"}</p>
      ) : task?.status === "completed" ? (
        <p role="status" className="ai-task-state">Validation completed. Available AI actions are usable immediately.</p>
      ) : task?.status === "failed" ? (
        <div className="ai-task-failure" role="alert">
          <strong>Validation stopped</strong>
          <p>{task.error}</p>
        </div>
      ) : null}

      {!allValidated ? (
        <button type="button" disabled={active} onClick={validate}>
          {active ? "Validation running…" : task?.status === "failed" ? "Retry validation" : validatedCount > 0 ? "Continue validation" : "Validate AI capabilities"}
        </button>
      ) : (
        <p className="compact-help"><strong>AI ready.</strong> All bounded AAAAT AI capabilities have been validated for this connection.</p>
      )}

      <div className="ai-capability-list" aria-label={`Capabilities for ${connection.name}`}>
        {aiOperations.map((operation) => {
          const validated = connection.validatedOperations.includes(operation);
          const operationDefault = connection.defaultForOperations.includes(operation);
          return (
            <div key={operation} className="ai-readiness-line">
              <span>{aiOperationLabels[operation]}</span>
              <span>{validated ? (operationDefault ? "Ready · selected" : "Validated") : "Not yet validated"}</span>
            </div>
          );
        })}
      </div>

      {connection.validatedOperations.some(
        (operation) => !connection.defaultForOperations.includes(operation),
      ) ? (
        <details className="ai-routing-details">
          <summary>Choose a different connection for a capability</summary>
          <p className="compact-help">Optional. Validation is separate from routing; the first validated route is selected automatically when none exists.</p>
          {connection.validatedOperations.map((operation) =>
            connection.defaultForOperations.includes(operation) ? null : (
              <button
                key={operation}
                type="button"
                className="compact-secondary"
                disabled={routingBusy !== null || active}
                onClick={() => void setOperationDefault(operation)}
              >
                {routingBusy === operation ? "Saving…" : `Use for ${aiOperationLabels[operation]}`}
              </button>
            ),
          )}
        </details>
      ) : null}
    </section>
  );
}
