import { aiOperationLabels } from "../shared/ai-connection-contracts";
import type { AiExchangeDiagnostic } from "../shared/ai-diagnostics";
import type { InspectableAiExchange } from "../shared/ai-proposal-outcomes";
import "./ai-exchange-inspector.css";

interface Props {
  readonly exchange: InspectableAiExchange;
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
      return "Response does not satisfy the AAAAT operation contract";
    case "operation_incompatible":
      return "Operation incompatible with this model";
  }
}

export function AiExchangeInspector({ exchange }: Props) {
  const failed = "failureKind" in exchange;
  const validationDetail = failed ? exchange.validationError : exchange.providerValidationError;
  return (
    <details className="ai-exchange-inspector">
      <summary>Inspect AI exchange</summary>
      <div className="ai-exchange-inspector-body">
        <p><strong>Operation:</strong> {aiOperationLabels[exchange.operation]}</p>
        {failed ? <p><strong>Failure:</strong> {failureLabel(exchange.failureKind)}</p> : null}
        <p><strong>Model:</strong> {exchange.model}</p>
        <p><strong>Endpoint:</strong> {exchange.endpoint}</p>
        <p><strong>Response mode:</strong> {exchange.structuredOutputMode === "json_schema" ? "JSON schema constrained" : exchange.structuredOutputMode === "plain_json_fallback" ? "Plain JSON fallback" : "Plain text"}</p>
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
        {validationDetail ? (
          <label>
            <strong>{failed ? "Why AAAAT rejected it" : "Provider contract detail"}</strong>
            <pre>{validationDetail}</pre>
          </label>
        ) : null}
      </div>
    </details>
  );
}
