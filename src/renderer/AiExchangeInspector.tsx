import { aiOperationLabels } from "../shared/ai-connection-contracts";
import type { AiExchangeDiagnostic } from "../shared/ai-diagnostics";
import "./ai-exchange-inspector.css";

interface Props {
  readonly exchange: AiExchangeDiagnostic;
}

function failureLabel(kind: AiExchangeDiagnostic["failureKind"]): string {
  switch (kind) {
    case "connection_unreachable":
      return "Connection unreachable";
    case "provider_http_failure":
      return "Provider HTTP failure";
    case "provider_envelope_invalid":
      return "Malformed provider response envelope";
    case "model_response_invalid_json":
      return "Model response is not valid JSON";
    case "operation_contract_invalid":
      return "JSON does not satisfy the AAAAT operation contract";
    case "operation_incompatible":
      return "Operation incompatible with this model";
  }
}

export function AiExchangeInspector({ exchange }: Props) {
  return (
    <details className="ai-exchange-inspector">
      <summary>Inspect AI exchange</summary>
      <div className="ai-exchange-inspector-body">
        <p><strong>Operation:</strong> {aiOperationLabels[exchange.operation]}</p>
        <p><strong>Failure:</strong> {failureLabel(exchange.failureKind)}</p>
        <p><strong>Model:</strong> {exchange.model}</p>
        <p><strong>Endpoint:</strong> {exchange.endpoint}</p>
        <p><strong>Structured output:</strong> {exchange.structuredOutputMode === "json_schema" ? "JSON schema constrained" : "Plain JSON fallback"}</p>
        <label>
          <strong>System instruction sent</strong>
          <pre>{exchange.systemInstruction}</pre>
        </label>
        <label>
          <strong>User/context payload sent</strong>
          <pre>{exchange.userPayload}</pre>
        </label>
        <label>
          <strong>Raw model response</strong>
          <pre>{exchange.rawModelResponse || "(No model response was received.)"}</pre>
        </label>
        <label>
          <strong>Why AAAAT rejected it</strong>
          <pre>{exchange.validationError}</pre>
        </label>
      </div>
    </details>
  );
}
