import {
  providerJobExtractionRequestSchema,
  type AiConnectionStatus,
  type JobExtractionRequest,
  type ProviderJobExtractionRequest,
} from "../shared/ai-contracts";
import type { AiStructuredOutputMode } from "../shared/ai-diagnostics";
import {
  partialJobExtractionResultSchema,
  type JobExtractionExchange,
  type JobExtractionProposalIssue,
  type PartialJobExtractionResult,
} from "../shared/ai-proposal-outcomes";
import {
  candidatureRuntimeValueSchema,
  type CandidatureFieldConfiguration,
  type CandidatureRuntimeValue,
} from "../shared/contracts";
import { compactSourceText } from "../shared/source-text";
import { requireAiProviderConnectionForOperation } from "./ai-connection-service";
import { AiProviderError } from "./ai-provider";
import { createWorkspaceAiProvider } from "./ai-prompt-service";
import {
  listCandidatureFields,
  validateCandidatureFieldValueInDatabase,
} from "./candidature-field-service";
import { withWorkspaceDatabase } from "./workspace";

interface DiscoveryWireRequest {
  readonly request: ProviderJobExtractionRequest;
  readonly fieldIds: ReadonlyMap<string, string>;
  readonly fieldLabels: ReadonlyMap<string, string>;
  readonly choiceIds: ReadonlyMap<string, ReadonlyMap<string, string>>;
}

interface CapturedExchange {
  readonly requestBody: string;
  readonly responseBody: string;
}

function discoveryWireRequest(
  request: JobExtractionRequest,
  fields: readonly CandidatureFieldConfiguration[],
): DiscoveryWireRequest {
  const fieldIds = new Map<string, string>();
  const fieldLabels = new Map<string, string>();
  const choiceIds = new Map<string, ReadonlyMap<string, string>>();
  const providerFields = fields.map((field, index) => {
    const fieldRef = `aaaat_f${index + 1}`;
    fieldIds.set(fieldRef, field.definition.id);
    fieldLabels.set(fieldRef, field.definition.label);
    const choices = new Map<string, string>();
    const providerChoices = field.definition.choices.map((choice, choiceIndex) => {
      const choiceRef = `${fieldRef}_c${choiceIndex + 1}`;
      choices.set(choiceRef, choice.id);
      return { choiceRef, label: choice.label };
    });
    choiceIds.set(fieldRef, choices);
    return {
      fieldRef,
      label: field.definition.label,
      description: field.definition.description,
      valueType: field.definition.valueType,
      cardinality: field.definition.cardinality,
      choices: providerChoices,
    };
  });
  return {
    request: providerJobExtractionRequestSchema.parse({
      ...request,
      sourceText: compactSourceText(request.sourceText),
      fields: providerFields,
    }),
    fieldIds,
    fieldLabels,
    choiceIds,
  };
}

function capturingFetch(
  signal: AbortSignal | undefined,
): { readonly fetchImpl: typeof fetch; readonly snapshot: () => CapturedExchange } {
  let requestBody = "";
  let responseBody = "";
  const fetchImpl: typeof fetch = async (input, init) => {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError");
    }
    if (typeof init?.body === "string") requestBody = init.body;
    const response = await fetch(input, init);
    try { responseBody = await response.clone().text(); } catch { responseBody = ""; }
    return response;
  };
  return { fetchImpl, snapshot: () => ({ requestBody, responseBody }) };
}

function modelContent(rawEnvelope: string): string {
  if (!rawEnvelope) return "";
  try {
    const parsed = JSON.parse(rawEnvelope) as { choices?: Array<{ message?: { content?: unknown } }> };
    const content = parsed.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : rawEnvelope;
  } catch { return rawEnvelope; }
}

function endpointForInspection(endpoint: string): string {
  const url = new URL(endpoint);
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
}

function capturedExchange(
  connection: AiConnectionStatus,
  captured: CapturedExchange,
  providerValidationError: string,
  fallbackRawModelResponse = "",
): JobExtractionExchange | undefined {
  if (!captured.requestBody && !fallbackRawModelResponse) return undefined;
  let systemInstruction = "";
  let userPayload = "";
  let structuredOutputMode: AiStructuredOutputMode = "plain_json_fallback";
  try {
    const request = JSON.parse(captured.requestBody) as {
      response_format?: unknown;
      messages?: Array<{ role?: unknown; content?: unknown }>;
    };
    structuredOutputMode = request.response_format ? "json_schema" : "plain_json_fallback";
    systemInstruction = String(request.messages?.find((message) => message.role === "system")?.content ?? "");
    userPayload = String(request.messages?.find((message) => message.role === "user")?.content ?? "");
  } catch {
    // Provider failures retain their normal diagnostic.
  }
  return {
    operation: "job_extraction",
    endpoint: endpointForInspection(connection.endpoint),
    model: connection.model,
    systemInstruction,
    userPayload,
    rawModelResponse: fallbackRawModelResponse || modelContent(captured.responseBody),
    structuredOutputMode,
    providerValidationError,
  };
}

interface LooseEnvelope {
  readonly proposals: unknown[];
}

function looseEnvelope(value: unknown): LooseEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { proposals?: unknown };
  if (!Array.isArray(candidate.proposals)) return null;
  return { proposals: candidate.proposals.slice(0, 64) };
}

function recoverableJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const firstLineEnd = text.indexOf("\n");
    const lastFence = text.lastIndexOf("```");
    if (firstLineEnd >= 0 && lastFence > firstLineEnd) {
      text = text.slice(firstLineEnd + 1, lastFence).trim();
    }
  }
  const firstObject = text.indexOf("{");
  const lastObject = text.lastIndexOf("}");
  if (firstObject >= 0 && lastObject > firstObject) return text.slice(firstObject, lastObject + 1);
  const firstArray = text.indexOf("[");
  const lastArray = text.lastIndexOf("]");
  if (firstArray >= 0 && lastArray > firstArray) return text.slice(firstArray, lastArray + 1);
  return text;
}

function parseRecoverableModelResult(raw: string): LooseEnvelope | null {
  try {
    const parsed = JSON.parse(recoverableJsonText(raw)) as unknown;
    if (Array.isArray(parsed)) return { proposals: parsed.slice(0, 64) };
    return looseEnvelope(parsed);
  } catch {
    return null;
  }
}

function proposedValue(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "value" in raw) return (raw as { value?: unknown }).value;
  return raw;
}

function issue(
  kind: JobExtractionProposalIssue["kind"],
  fieldId: string | null,
  fieldLabel: string | null,
  value: unknown,
  reason: string,
): JobExtractionProposalIssue {
  return { kind, fieldId, fieldLabel, proposedValue: value, reason };
}

function normalizeCardinality(
  field: CandidatureFieldConfiguration,
  raw: unknown,
): { readonly value?: unknown; readonly reason?: string } {
  if (field.definition.cardinality === "many") return { value: Array.isArray(raw) ? raw : [raw] };
  if (!Array.isArray(raw)) return { value: raw };
  if (raw.length === 1) return { value: raw[0] };
  return {
    reason: raw.length === 0
      ? `${field.definition.label} needs one value, but AI proposed an empty list.`
      : `${field.definition.label} accepts one value, but AI proposed ${raw.length}.`,
  };
}

function localChoiceValue(
  field: CandidatureFieldConfiguration,
  fieldRef: string,
  raw: unknown,
  choiceIds: ReadonlyMap<string, ReadonlyMap<string, string>>,
): { readonly value?: unknown; readonly reason?: string } {
  if (field.definition.valueType !== "choice") return { value: raw };
  const choices = choiceIds.get(fieldRef);
  const resolve = (candidate: unknown): string | null => {
    if (typeof candidate !== "string") return null;
    if (choices?.has(candidate)) return choices.get(candidate) ?? null;
    const byLabel = field.definition.choices.find(
      (choice) => choice.label.trim().toLocaleLowerCase() === candidate.trim().toLocaleLowerCase(),
    );
    return byLabel?.id ?? null;
  };
  if (Array.isArray(raw)) {
    const resolved = raw.map(resolve);
    if (resolved.some((value) => value === null)) {
      return { reason: `${field.definition.label} used a choice that was not offered to the model.` };
    }
    return { value: resolved as string[] };
  }
  const resolved = resolve(raw);
  return resolved === null
    ? { reason: `${field.definition.label} used a choice that was not offered to the model.` }
    : { value: resolved };
}

function fieldReference(wire: DiscoveryWireRequest, raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (wire.fieldIds.has(raw)) return raw;
  const normalized = raw.trim().toLocaleLowerCase();
  for (const [fieldRef, label] of wire.fieldLabels) {
    if (label.trim().toLocaleLowerCase() === normalized) return fieldRef;
  }
  return null;
}

function validateExistingProposals(
  rootPath: string,
  wire: DiscoveryWireRequest,
  rawProposals: readonly unknown[],
): {
  readonly proposals: Array<{ fieldId: string; value: CandidatureRuntimeValue }>;
  readonly issues: JobExtractionProposalIssue[];
} {
  const currentFields = listCandidatureFields(rootPath);
  const byId = new Map(currentFields.map((field) => [field.definition.id, field]));
  const proposals: Array<{ fieldId: string; value: CandidatureRuntimeValue }> = [];
  const issues: JobExtractionProposalIssue[] = [];
  const seenRefs = new Set<string>();

  for (const rawProposal of rawProposals) {
    if (!rawProposal || typeof rawProposal !== "object") {
      issues.push(issue("stale", null, null, rawProposal, "AI returned a proposal without a field reference."));
      continue;
    }
    const candidate = rawProposal as { fieldRef?: unknown; value?: unknown };
    const fieldRef = fieldReference(wire, candidate.fieldRef);
    if (!fieldRef) {
      issues.push(issue("stale", null, null, proposedValue(rawProposal), "AI referred to information that was not part of this request."));
      continue;
    }
    const fieldId = wire.fieldIds.get(fieldRef) ?? "";
    const field = byId.get(fieldId);
    const label = field?.definition.label ?? wire.fieldLabels.get(fieldRef) ?? null;
    if (seenRefs.has(fieldRef)) {
      issues.push(issue("invalid", fieldId || null, label, candidate.value, "AI proposed this information more than once."));
      continue;
    }
    seenRefs.add(fieldRef);
    if (!field || !field.definition.enabled || !field.preferences.aiUseAllowed) {
      issues.push(issue("stale", fieldId || null, label, candidate.value, "This information is no longer available to AI."));
      continue;
    }
    const choice = localChoiceValue(field, fieldRef, candidate.value, wire.choiceIds);
    if (choice.reason) {
      issues.push(issue("invalid", fieldId, label, candidate.value, choice.reason));
      continue;
    }
    const cardinality = normalizeCardinality(field, choice.value);
    if (cardinality.reason) {
      issues.push(issue("invalid", fieldId, label, candidate.value, cardinality.reason));
      continue;
    }
    const runtime = candidatureRuntimeValueSchema.safeParse(cardinality.value);
    if (!runtime.success) {
      issues.push(issue("invalid", fieldId, label, candidate.value, `${field.definition.label} has an incompatible value structure.`));
      continue;
    }
    try {
      const normalized = withWorkspaceDatabase(
        rootPath,
        (database) => validateCandidatureFieldValueInDatabase(database, fieldId, runtime.data),
      );
      if (normalized === null) {
        issues.push(issue("invalid", fieldId, label, candidate.value, `${field.definition.label} did not contain a usable value.`));
        continue;
      }
      proposals.push({ fieldId, value: normalized });
    } catch (reason) {
      issues.push(issue(
        "invalid",
        fieldId,
        label,
        candidate.value,
        reason instanceof Error ? reason.message : `${field.definition.label} is incompatible with the AI proposal.`,
      ));
    }
  }
  return { proposals, issues };
}

export async function extractJobWithPartialOutcomes(
  rootPath: string,
  request: JobExtractionRequest,
  signal?: AbortSignal,
  targetFieldIds?: readonly string[],
): Promise<PartialJobExtractionResult> {
  const connection = requireAiProviderConnectionForOperation(rootPath, "job_extraction");
  const targetSet = targetFieldIds ? new Set(targetFieldIds) : null;
  const fields = listCandidatureFields(rootPath).filter(
    (field) =>
      field.definition.enabled
      && field.preferences.aiUseAllowed
      && (!targetSet || targetSet.has(field.definition.id)),
  );
  if (targetSet && fields.length !== targetSet.size) {
    throw new Error("The requested information is no longer available for AI use.");
  }
  if (fields.length === 0) {
    throw new Error("Allow AI use for at least one application information item first.");
  }

  const wire = discoveryWireRequest(request, fields);
  const capture = capturingFetch(signal);
  const provider = createWorkspaceAiProvider(rootPath, capture.fetchImpl);

  let rawResult: unknown;
  let providerValidationError = "";
  let fallbackRawModelResponse = "";
  try {
    rawResult = await provider.extractJob(connection, wire.request, signal);
  } catch (reason) {
    if (
      !(reason instanceof AiProviderError)
      || !reason.diagnostic
      || !["operation_contract_invalid", "model_response_invalid_json"].includes(reason.diagnostic.failureKind)
    ) throw reason;
    fallbackRawModelResponse = reason.diagnostic.rawModelResponse;
    providerValidationError = reason.diagnostic.validationError;
    const recoverable = parseRecoverableModelResult(reason.diagnostic.rawModelResponse);
    if (!recoverable) throw reason;
    rawResult = recoverable;
  }

  const envelope = looseEnvelope(rawResult);
  if (!envelope) throw new Error("The configured provider returned an invalid application-information result envelope.");
  const existing = validateExistingProposals(rootPath, wire, envelope.proposals);
  const exchange = capturedExchange(
    connection,
    capture.snapshot(),
    providerValidationError,
    fallbackRawModelResponse,
  );

  return partialJobExtractionResultSchema.parse({
    proposals: existing.proposals,
    issues: existing.issues,
    ...(exchange ? { exchange } : {}),
  });
}
