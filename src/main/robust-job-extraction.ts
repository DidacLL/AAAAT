import { randomUUID } from "node:crypto";

import {
  aiConnectionStatusSchema,
  jobExtractionNewFieldSchema,
  providerJobExtractionRequestSchema,
  type AiConnectionStatus,
  type JobExtractionNewField,
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
import { requireAiConnectionForOperation } from "./ai-connection-service";
import { AiProviderError, createOpenAiCompatibleProvider } from "./ai-provider";
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

function operationScope(): string {
  return `aaaat_discovery_${randomUUID()}`;
}

function discoveryWireRequest(
  request: JobExtractionRequest,
  fields: readonly CandidatureFieldConfiguration[],
): DiscoveryWireRequest {
  const scope = operationScope();
  const fieldIds = new Map<string, string>();
  const fieldLabels = new Map<string, string>();
  const choiceIds = new Map<string, ReadonlyMap<string, string>>();
  const providerFields = fields.map((field, index) => {
    const fieldRef = `${scope}_${index + 1}`;
    fieldIds.set(fieldRef, field.definition.id);
    fieldLabels.set(fieldRef, field.definition.label);
    const choices = new Map<string, string>();
    const providerChoices = field.definition.choices.map((choice, choiceIndex) => {
      const choiceRef = `${fieldRef}_${choiceIndex + 1}`;
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
    request: providerJobExtractionRequestSchema.parse({ ...request, fields: providerFields }),
    fieldIds,
    fieldLabels,
    choiceIds,
  };
}

function scalarJsonSchema(
  field: ProviderJobExtractionRequest["fields"][number],
): Record<string, unknown> {
  switch (field.valueType) {
    case "text":
      return { type: "string", maxLength: 5000 };
    case "long_text":
      return { type: "string", maxLength: 50000 };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "date":
      return { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" };
    case "url":
      return { type: "string", maxLength: 2048 };
    case "choice":
      return { type: "string", enum: field.choices.map((choice) => choice.choiceRef) };
  }
}

function proposalJsonSchema(
  field: ProviderJobExtractionRequest["fields"][number],
): Record<string, unknown> {
  const scalar = scalarJsonSchema(field);
  return {
    type: "object",
    additionalProperties: false,
    required: ["fieldRef", "value"],
    properties: {
      fieldRef: { const: field.fieldRef },
      value:
        field.cardinality === "many"
          ? { type: "array", maxItems: 64, items: scalar }
          : scalar,
    },
  };
}

function strengthenStructuredSchema(
  body: Record<string, unknown>,
  request: ProviderJobExtractionRequest,
): void {
  const responseFormat = body.response_format;
  if (!responseFormat || typeof responseFormat !== "object") return;
  const jsonSchema = (responseFormat as { json_schema?: unknown }).json_schema;
  if (!jsonSchema || typeof jsonSchema !== "object") return;
  const schema = (jsonSchema as { schema?: unknown }).schema;
  if (!schema || typeof schema !== "object") return;
  const properties = (schema as { properties?: unknown }).properties;
  if (!properties || typeof properties !== "object") return;
  const proposals = (properties as { proposals?: unknown }).proposals;
  if (!proposals || typeof proposals !== "object") return;

  const alternatives = request.fields.map(proposalJsonSchema);
  (proposals as { items?: unknown }).items =
    alternatives.length === 1 ? alternatives[0] : { anyOf: alternatives };
}

function capturingFetch(
  request: ProviderJobExtractionRequest,
  signal: AbortSignal | undefined,
): { readonly fetchImpl: typeof fetch; readonly snapshot: () => CapturedExchange } {
  let requestBody = "";
  let responseBody = "";
  const fetchImpl: typeof fetch = async (input, init) => {
    if (signal?.aborted) {
      throw signal.reason instanceof Error ? signal.reason : new DOMException("Aborted", "AbortError");
    }
    let nextInit = init;
    if (typeof init?.body === "string") {
      requestBody = init.body;
      try {
        const parsed = JSON.parse(init.body) as Record<string, unknown>;
        strengthenStructuredSchema(parsed, request);
        requestBody = JSON.stringify(parsed);
        nextInit = { ...init, body: requestBody };
      } catch {
        nextInit = init;
      }
    }
    const response = await fetch(input, nextInit);
    try {
      responseBody = await response.clone().text();
    } catch {
      responseBody = "";
    }
    return response;
  };
  return {
    fetchImpl,
    snapshot: () => ({ requestBody, responseBody }),
  };
}

function modelContent(rawEnvelope: string): string {
  if (!rawEnvelope) return "";
  try {
    const parsed = JSON.parse(rawEnvelope) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = parsed.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : rawEnvelope;
  } catch {
    return rawEnvelope;
  }
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
    systemInstruction = String(
      request.messages?.find((message) => message.role === "system")?.content ?? "",
    );
    userPayload = String(
      request.messages?.find((message) => message.role === "user")?.content ?? "",
    );
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

function looseEnvelope(value: unknown): { proposals: unknown[]; newFields: unknown[] } | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { proposals?: unknown; newFields?: unknown };
  if (!Array.isArray(candidate.proposals)) return null;
  if (candidate.newFields !== undefined && !Array.isArray(candidate.newFields)) return null;
  return {
    proposals: candidate.proposals.slice(0, 32),
    newFields: (candidate.newFields ?? []).slice(0, 8),
  };
}

function parseRecoverableModelResult(
  raw: string,
): { proposals: unknown[]; newFields: unknown[] } | null {
  try {
    return looseEnvelope(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function proposedValue(raw: unknown): unknown {
  if (raw && typeof raw === "object" && "value" in raw) {
    return (raw as { value?: unknown }).value;
  }
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
  if (field.definition.cardinality === "many") {
    return { value: Array.isArray(raw) ? raw : [raw] };
  }
  if (!Array.isArray(raw)) return { value: raw };
  if (raw.length === 1) return { value: raw[0] };
  return {
    reason:
      raw.length === 0
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
  const resolve = (candidate: unknown): string | null =>
    typeof candidate === "string" && choices?.has(candidate)
      ? (choices.get(candidate) ?? null)
      : null;
  if (Array.isArray(raw)) {
    const resolved = raw.map(resolve);
    if (resolved.some((value) => value === null)) {
      return {
        reason: `${field.definition.label} used a choice that was not offered to the model.`,
      };
    }
    return { value: resolved as string[] };
  }
  const resolved = resolve(raw);
  return resolved === null
    ? { reason: `${field.definition.label} used a choice that was not offered to the model.` }
    : { value: resolved };
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
      issues.push(
        issue(
          "stale",
          null,
          null,
          rawProposal,
          "AI returned a proposal without a field reference.",
        ),
      );
      continue;
    }
    const candidate = rawProposal as { fieldRef?: unknown; value?: unknown };
    const fieldRef = typeof candidate.fieldRef === "string" ? candidate.fieldRef : "";
    if (!fieldRef || !wire.fieldIds.has(fieldRef)) {
      issues.push(
        issue(
          "stale",
          null,
          null,
          proposedValue(rawProposal),
          "AI referred to information that was not part of this request.",
        ),
      );
      continue;
    }
    const fieldId = wire.fieldIds.get(fieldRef) ?? "";
    const field = byId.get(fieldId);
    const label = field?.definition.label ?? wire.fieldLabels.get(fieldRef) ?? null;
    if (seenRefs.has(fieldRef)) {
      issues.push(
        issue(
          "invalid",
          fieldId || null,
          label,
          candidate.value,
          "AI proposed this information more than once.",
        ),
      );
      continue;
    }
    seenRefs.add(fieldRef);
    if (!field || !field.definition.enabled) {
      issues.push(
        issue(
          "stale",
          fieldId || null,
          label,
          candidate.value,
          "This information definition changed or is no longer available.",
        ),
      );
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
      issues.push(
        issue(
          "invalid",
          fieldId,
          label,
          candidate.value,
          `${field.definition.label} has an incompatible value structure.`,
        ),
      );
      continue;
    }
    try {
      const normalized = withWorkspaceDatabase(rootPath, (database) =>
        validateCandidatureFieldValueInDatabase(database, fieldId, runtime.data),
      );
      if (normalized === null) {
        issues.push(
          issue(
            "invalid",
            fieldId,
            label,
            candidate.value,
            `${field.definition.label} did not contain a usable value.`,
          ),
        );
        continue;
      }
      proposals.push({ fieldId, value: normalized });
    } catch (reason) {
      issues.push(
        issue(
          "invalid",
          fieldId,
          label,
          candidate.value,
          reason instanceof Error
            ? reason.message
            : `${field.definition.label} is incompatible with the AI proposal.`,
        ),
      );
    }
  }
  return { proposals, issues };
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validNewScalar(field: JobExtractionNewField, value: unknown): boolean {
  switch (field.valueType) {
    case "text":
      return typeof value === "string" && value.trim().length > 0 && value.length <= 5000;
    case "long_text":
      return typeof value === "string" && value.trim().length > 0 && value.length <= 50000;
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "date":
      return typeof value === "string" && validDate(value);
    case "url":
      if (typeof value !== "string" || value.length > 2048 || !value.trim()) return false;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    case "choice":
      return (
        typeof value === "string" &&
        field.choices.some(
          (choice) => choice.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
        )
      );
  }
}

function normalizeNewField(
  rawField: unknown,
): {
  readonly field?: JobExtractionNewField;
  readonly reason?: string;
  readonly label: string | null;
} {
  const parsed = jobExtractionNewFieldSchema.safeParse(rawField);
  const label =
    rawField &&
    typeof rawField === "object" &&
    typeof (rawField as { label?: unknown }).label === "string"
      ? String((rawField as { label: string }).label).trim().slice(0, 120) || null
      : null;
  if (!parsed.success) {
    return {
      label,
      reason:
        "AI proposed a new information definition that does not satisfy AAAAT's field contract.",
    };
  }
  const field = parsed.data;
  let normalized: unknown = field.value;
  if (field.cardinality === "many" && !Array.isArray(normalized)) normalized = [normalized];
  if (field.cardinality === "one" && Array.isArray(normalized)) {
    if (normalized.length !== 1) {
      return {
        label: field.label,
        reason:
          normalized.length === 0
            ? `${field.label} needs one value, but AI proposed an empty list.`
            : `${field.label} accepts one value, but AI proposed ${normalized.length}.`,
      };
    }
    normalized = normalized[0];
  }
  const values = Array.isArray(normalized) ? normalized : [normalized];
  if (values.length === 0 || values.some((value) => !validNewScalar(field, value))) {
    return {
      label: field.label,
      reason: `${field.label} has a value incompatible with its proposed type.`,
    };
  }
  if (new Set(values.map((value) => JSON.stringify(value))).size !== values.length) {
    return {
      label: field.label,
      reason: `${field.label} contains duplicate proposed values.`,
    };
  }
  return {
    field: { ...field, value: normalized as CandidatureRuntimeValue },
    label: field.label,
  };
}

function validateNewFields(
  rawFields: readonly unknown[],
  existingFields: readonly CandidatureFieldConfiguration[],
): {
  readonly fields: JobExtractionNewField[];
  readonly issues: JobExtractionProposalIssue[];
} {
  const fields: JobExtractionNewField[] = [];
  const issues: JobExtractionProposalIssue[] = [];
  const labels = new Set(
    existingFields.map((field) => field.definition.label.trim().toLocaleLowerCase()),
  );
  for (const rawField of rawFields) {
    const normalized = normalizeNewField(rawField);
    if (!normalized.field) {
      issues.push(
        issue(
          "new_field_invalid",
          null,
          normalized.label,
          proposedValue(rawField),
          normalized.reason ?? "AAAAT could not use this proposed information definition.",
        ),
      );
      continue;
    }
    const key = normalized.field.label.trim().toLocaleLowerCase();
    if (labels.has(key)) {
      issues.push(
        issue(
          "new_field_invalid",
          null,
          normalized.field.label,
          normalized.field.value,
          "AI proposed a new information definition that duplicates existing information.",
        ),
      );
      continue;
    }
    labels.add(key);
    fields.push(normalized.field);
  }
  return { fields, issues };
}

export async function extractJobWithPartialOutcomes(
  rootPath: string,
  request: JobExtractionRequest,
  signal?: AbortSignal,
  targetFieldIds?: readonly string[],
): Promise<PartialJobExtractionResult> {
  const connection = aiConnectionStatusSchema.parse(
    requireAiConnectionForOperation(rootPath, "job_extraction"),
  );
  const targetSet = targetFieldIds ? new Set(targetFieldIds) : null;
  const fields = listCandidatureFields(rootPath).filter(
    (field) =>
      field.definition.enabled &&
      field.preferences.aiDiscovery &&
      (!targetSet || targetSet.has(field.definition.id)),
  );
  if (fields.length === 0) {
    throw new Error(
      targetSet
        ? "The requested candidature information is no longer available for AI discovery."
        : "Enable AI discovery for at least one candidature field first.",
    );
  }
  const wire = discoveryWireRequest(request, fields);
  const capture = capturingFetch(wire.request, signal);
  const provider = createOpenAiCompatibleProvider(capture.fetchImpl);

  let rawResult: unknown;
  let providerValidationError = "";
  let fallbackRawModelResponse = "";
  try {
    rawResult = await provider.extractJob(connection, wire.request, signal);
  } catch (reason) {
    if (
      !(reason instanceof AiProviderError) ||
      reason.diagnostic?.failureKind !== "operation_contract_invalid"
    ) {
      throw reason;
    }
    fallbackRawModelResponse = reason.diagnostic.rawModelResponse;
    providerValidationError = reason.diagnostic.validationError;
    const recoverable = parseRecoverableModelResult(reason.diagnostic.rawModelResponse);
    if (!recoverable) throw reason;
    rawResult = recoverable;
  }

  const envelope = looseEnvelope(rawResult);
  if (!envelope) {
    throw new Error("The configured provider returned an invalid job extraction result envelope.");
  }
  const existing = validateExistingProposals(rootPath, wire, envelope.proposals);
  const discovered = validateNewFields(envelope.newFields, listCandidatureFields(rootPath));
  const exchange = capturedExchange(
    connection,
    capture.snapshot(),
    providerValidationError,
    fallbackRawModelResponse,
  );

  return partialJobExtractionResultSchema.parse({
    proposals: existing.proposals,
    newFields: discovered.fields,
    issues: [...existing.issues, ...discovered.issues],
    ...(exchange ? { exchange } : {}),
  });
}
