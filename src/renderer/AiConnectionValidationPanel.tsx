import { useEffect, useMemo, useState } from "react";

import {
  aiOperationLabels,
  aiOperations,
  type AiOperation,
  type NamedAiConnection,
} from "../shared/ai-connection-contracts";
import type { AiExchangeDiagnostic } from "../shared/ai-diagnostics";
import { AiExchangeInspector } from "./AiExchangeInspector";
import { aiTaskFailure, startAiTask, useAiTask } from "./ai-task-store";

interface Props {
  readonly connection: NamedAiConnection;
  readonly onConnections: (connections: NamedAiConnection[]) => void;
}

interface ValidationFailure {
  readonly operation: AiOperation;
  readonly message: string;
  readonly exchange?: AiExchangeDiagnostic;
}

interface ValidationResult {
  readonly connections: NamedAiConnection[];
  readonly failures: readonly ValidationFailure[];
}

function taskKey(connectionId: string): string {
  return `ai-validation:${connectionId}`;
}

function capabilityFailureLabel(failure: ValidationFailure): string {
  switch (failure.exchange?.failureKind) {
    case "operation_incompatible":
    case "model_response_invalid_json":
    case "operation_contract_invalid":
      return "Incompatible · failed validation";
    case "connection_unreachable":
      return "Failed · connection unreachable";
    case "provider_http_failure":
      return "Failed · provider HTTP";
    case "provider_envelope_invalid":
      return "Failed · provider response";
    default:
      return "Failed validation";
  }
}

export function AiConnectionValidationPanel({ connection, onConnections }: Props) {
  const task = useAiTask<ValidationResult>(taskKey(connection.id));
  const [routingBusy, setRoutingBusy] = useState<AiOperation | null>(null);
  const active = task?.status === "queued" || task?.status === "working";
  const allValidated = aiOperations.every((operation) =>
    connection.validatedOperations.includes(operation),
  );
  const failures = task?.result?.failures ?? [];
  const failuresByOperation = useMemo(
    () => new Map(failures.map((failure) => [failure.operation, failure])),
    [failures],
  );

  useEffect(() => {
    if (task?.status === "completed" && task.result) onConnections(task.result.connections);
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
    startAiTask<ValidationResult>(
      taskKey(connection.id),
      async (updateDetail) => {
        let connections = await window.aaaat.aiConnections.list();
        let current = connections.find((candidate) => candidate.id === connection.id);
        if (!current) throw new Error("The AI connection no longer exists.");
        const nextFailures: ValidationFailure[] = [];

        for (const operation of aiOperations) {
          if (current.validatedOperations.includes(operation)) continue;
          updateDetail(
            `Validating ${aiOperationLabels[operation]}. Slow local models can take several minutes; you can keep using AAAAT while this runs.`,
          );
          try {
            connections = await window.aaaat.aiConnections.validateOperation({
              connectionId: connection.id,
              operation,
            });
            current = connections.find((candidate) => candidate.id === connection.id);
            if (!current) throw new Error("The AI connection no longer exists.");
          } catch (reason) {
            const failure = aiTaskFailure(reason);
            nextFailures.push({
              operation,
              message: failure.message,
              ...(failure.exchange ? { exchange: failure.exchange } : {}),
            });
            connections = await window.aaaat.aiConnections.list();
            current = connections.find((candidate) => candidate.id === connection.id);
            if (!current) throw new Error("The AI connection no longer exists.");
          }
        }
        return { connections, failures: nextFailures };
      },
      `Validate ${connection.name}`,
      (result) =>
        result.failures.length > 0
          ? `Validation completed · ${result.failures.length} capability${result.failures.length === 1 ? "" : "ies"} need attention`
          : "Validation completed",
    );
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
  const hasUnreachableFailure = failures.some(
    (failure) => failure.exchange?.failureKind === "connection_unreachable",
  );
  const hasProviderFailure = failures.some(
    (failure) =>
      failure.exchange?.failureKind === "provider_http_failure" ||
      failure.exchange?.failureKind === "provider_envelope_invalid",
  );
  const health = active
    ? "Checking"
    : hasUnreachableFailure
      ? "Unreachable / timed out"
      : validatedCount > 0 || failures.length > 0
        ? hasProviderFailure
          ? "Connected · provider response needs attention"
          : "Connected"
        : "Configured · not checked";

  return (
    <section className="ai-validation-card" aria-label={`AI readiness for ${connection.name}`}>
      <div className="ai-readiness-line">
        <strong>Connection</strong>
        <span>{health}</span>
      </div>
      <div className="ai-readiness-line">
        <strong>Capabilities</strong>
        <span>{validatedCount}/{aiOperations.length} ready</span>
      </div>

      {task?.status === "queued" ? (
        <p role="status" className="ai-task-state">Queued. AAAAT will keep this AI task running if you leave Settings.</p>
      ) : task?.status === "working" ? (
        <p role="status" className="ai-task-state">{task.detail ?? "Working…"}</p>
      ) : task?.status === "completed" ? (
        <p role="status" className="ai-task-state">{task.detail ?? "Validation completed."}</p>
      ) : task?.status === "failed" ? (
        <div className="ai-task-failure" role="alert">
          <strong>Validation stopped</strong>
          <p>{task.error}</p>
          {task.exchange ? <AiExchangeInspector exchange={task.exchange} /> : null}
        </div>
      ) : null}

      {!allValidated ? (
        <button type="button" disabled={active} onClick={validate}>
          {active
            ? "Validation running…"
            : failures.length > 0
              ? "Retry failed validation"
              : validatedCount > 0
                ? "Continue validation"
                : "Validate AI capabilities"}
        </button>
      ) : (
        <p className="compact-help"><strong>AI ready.</strong> All bounded AAAAT AI capabilities have been validated for this connection.</p>
      )}

      <div className="ai-capability-list" aria-label={`Capabilities for ${connection.name}`}>
        {aiOperations.map((operation) => {
          const validated = connection.validatedOperations.includes(operation);
          const operationDefault = connection.defaultForOperations.includes(operation);
          const failure = failuresByOperation.get(operation);
          return (
            <div key={operation} className="ai-capability-entry">
              <div className="ai-readiness-line">
                <span>{aiOperationLabels[operation]}</span>
                <span>
                  {validated
                    ? operationDefault
                      ? "Ready · selected"
                      : "Ready"
                    : failure
                      ? capabilityFailureLabel(failure)
                      : "Not yet validated"}
                </span>
              </div>
              {failure ? (
                <div className="ai-task-failure" role="alert">
                  <p>{failure.message}</p>
                  {failure.exchange ? <AiExchangeInspector exchange={failure.exchange} /> : null}
                </div>
              ) : null}
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
