import {
  aiConnectionStatusSchema,
  jobExtractionNewFieldSchema,
  jobExtractionNewTagSchema,
  providerJobExtractionRequestSchema,
  type AiConnectionStatus,
  type JobExtractionNewField,
  type JobExtractionNewTag,
  type JobExtractionRequest,
  type ProviderJobExtractionRequest,
} from "../shared/ai-contracts";
import type { AiStructuredOutputMode } from "../shared/ai-diagnostics";
import {
  partialJobExtractionResultSchema,
  type JobExtractionExchange,
  type JobExtractionExistingTag,
  type JobExtractionProposalIssue,
  type PartialJobExtractionResult,
} from "../shared/ai-proposal-outcomes";
import {
  candidatureRuntimeValueSchema,
  type CandidatureFieldConfiguration,
  type CandidatureRuntimeValue,
  type TagRecord,
} from "../shared/contracts";
import { compactSourceText } from "../shared/source-text";
import { requireAiConnectionForOperation } from "./ai-connection-service";
import { AiProviderError } from "./ai-provider";
import { createWorkspaceAiProvider } from "./ai-prompt-service";
import {
  listCandidatureFields,
  validateCandidatureFieldValueInDatabase,
} from "./candidature-field-service";
import { listTags } from "./tag-service";
import { withWorkspaceDatabase } from "./workspace";

interface DiscoveryWireRequest {
  readonly request: ProviderJobExtractionRequest;
  readonly fieldIds: ReadonlyMap<string, string>;
  readonly fieldLabels: ReadonlyMap<string, string>;
  readonly choiceIds: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly tagIds: ReadonlyMap<string, string>;
  readonly tagNames: ReadonlyMap<string, string>;
}

interface CapturedExchange {
  readonly requestBody: string;
  readonly responseBody: string;
}

function discoveryWireRequest(
  request: JobExtractionRequest,
  fields: readonly CandidatureFieldConfiguration[],
  tags: readonly TagRecord[],
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
  const tagIds = new Map<string, string>();
  const tagNames = new Map<string, string>();
  const providerTags = tags.slice(0, 300).map((tag, index) => {
    const tagRef = `aaaat_tag_${index + 1}`;
    tagIds.set(tagRef, tag.id);
    tagNames.set(tagRef, tag.name);
    return {
      tagRef,
      name: tag.name,
      aliases: tag.aliases.slice(0, 8),
      definition: tag.definition.slice(0, 500),
    };
  });
  return {
    request: providerJobExtractionRequestSchema.parse({
      ...request,
      sourceText: compactSourceText(request.sourceText),
      fields: providerFields,
      tags: providerTags,
    }),
    fieldIds,
    fieldLabels,
    choiceIds,
    tagIds,
    tagNames,
  };
}

function scalarJsonSchema(
  field: ProviderJobExtractionRequest["fields"][number],
): Record<string, unknown> {
  switch (field.valueType) {
    case "text": return { type: "string", maxLength: 5000 };
    case "long_text": return { type: "string", maxLength: 50000 };
    case "number": return { type: "number" };
    case "boolean": return { type: "boolean" };
    case "date": return { type: "string" };
    case "url": return { type: "string", maxLength: 2048 };
    case "choice": return { type: "string", enum: field.choices.map((choice) => choice.choiceRef) };
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
      value: field.cardinality === "many" ? { type: "array", maxItems: 64, items: scalar } : scalar,
    },
  };
}

function strengthenStructuredSchema(
  body: Record<string, unknown>,
  request: ProviderJobExtractionRequest,
): void {
  if (request.fields.length === 0) return;
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
  (proposals as { items?: unknown }).items = alternatives.length === 1 ? alternatives[0] : { anyOf: alternatives };
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
    const request = JSON.parse(captured.requestBody) as { response_format?: unknown; messages?: Array<{ role?: unknown; content?: unknown }> };
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
  proposals: unknown[];
  newFields: unknown[];
  existingTags: unknown[];
  newTags: unknown[];
}

function looseEnvelope(value: unknown): LooseEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { proposals?: unknown; newFields?: unknown; existingTags?: unknown; newTags?: unknown };
  if (!Array.isArray(candidate.proposals)) return null;
  if (candidate.newFields !== undefined && !Array.isArray(candidate.newFields)) return null;
  if (candidate.existingTags !== undefined && !Array.isArray(candidate.existingTags)) return null;
  if (candidate.newTags !== undefined && !Array.isArray(candidate.newTags)) return null;
  return {
    proposals: candidate.proposals.slice(0, 64),
    newFields: (candidate.newFields ?? []).slice(0, 8),
    existingTags: (candidate.existingTags ?? []).slice(0, 100),
    newTags: (candidate.newTags ?? []).slice(0, 30),
  };
}

function parseRecoverableModelResult(raw: string): LooseEnvelope | null {
  try { return looseEnvelope(JSON.parse(raw) as unknown); } catch { return null; }
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
  return { reason: raw.length === 0 ? `${field.definition.label} needs one value, but AI proposed an empty list.` : `${field.definition.label} accepts one value, but AI proposed ${raw.length}.` };
}

function localChoiceValue(
  field: CandidatureFieldConfiguration,
  fieldRef: string,
  raw: unknown,
  choiceIds: ReadonlyMap<string, ReadonlyMap<string, string>>,
): { readonly value?: unknown; readonly reason?: string } {
  if (field.definition.valueType !== "choice") return { value: raw };
  const choices = choiceIds.get(fieldRef);
  const resolve = (candidate: unknown): string | null => typeof candidate === "string" && choices?.has(candidate) ? (choices.get(candidate) ?? null) : null;
  if (Array.isArray(raw)) {
    const resolved = raw.map(resolve);
    if (resolved.some((value) => value === null)) return { reason: `${field.definition.label} used a choice that was not offered to the model.` };
    return { value: resolved as string[] };
  }
  const resolved = resolve(raw);
  return resolved === null ? { reason: `${field.definition.label} used a choice that was not offered to the model.` } : { value: resolved };
}

function validateExistingProposals(
  rootPath: string,
  wire: DiscoveryWireRequest,
  rawProposals: readonly unknown[],
): { readonly proposals: Array<{ fieldId: string; value: CandidatureRuntimeValue }>; readonly issues: JobExtractionProposalIssue[] } {
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
    const fieldRef = typeof candidate.fieldRef === "string" ? candidate.fieldRef : "";
    if (!fieldRef || !wire.fieldIds.has(fieldRef)) {
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
    if (choice.reason) { issues.push(issue("invalid", fieldId, label, candidate.value, choice.reason)); continue; }
    const cardinality = normalizeCardinality(field, choice.value);
    if (cardinality.reason) { issues.push(issue("invalid", fieldId, label, candidate.value, cardinality.reason)); continue; }
    const runtime = candidatureRuntimeValueSchema.safeParse(cardinality.value);
    if (!runtime.success) {
      issues.push(issue("invalid", fieldId, label, candidate.value, `${field.definition.label} has an incompatible value structure.`));
      continue;
    }
    try {
      const normalized = withWorkspaceDatabase(rootPath, (database) => validateCandidatureFieldValueInDatabase(database, fieldId, runtime.data));
      if (normalized === null) {
        issues.push(issue("invalid", fieldId, label, candidate.value, `${field.definition.label} did not contain a usable value.`));
        continue;
      }
      proposals.push({ fieldId, value: normalized });
    } catch (reason) {
      issues.push(issue("invalid", fieldId, label, candidate.value, reason instanceof Error ? reason.message : `${field.definition.label} is incompatible with the AI proposal.`));
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
    case "text": return typeof value === "string" && value.trim().length > 0 && value.length <= 5000;
    case "long_text": return typeof value === "string" && value.trim().length > 0 && value.length <= 50000;
    case "number": return typeof value === "number" && Number.isFinite(value);
    case "boolean": return typeof value === "boolean";
    case "date": return typeof value === "string" && validDate(value);
    case "url":
      if (typeof value !== "string" || value.length > 2048 || !value.trim()) return false;
      try { const url = new URL(value); return url.protocol === "http:" || url.protocol === "https:"; } catch { return false; }
    case "choice": return typeof value === "string" && field.choices.some((choice) => choice.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase());
  }
}

function normalizeNewField(rawField: unknown): { readonly field?: JobExtractionNewField; readonly reason?: string; readonly label: string | null } {
  const parsed = jobExtractionNewFieldSchema.safeParse(rawField);
  const label = rawField && typeof rawField === "object" && typeof (rawField as { label?: unknown }).label === "string"
    ? String((rawField as { label: string }).label).trim().slice(0, 120) || null : null;
  if (!parsed.success) return { label, reason: "AI proposed a new information definition that does not satisfy AAAAT's field contract." };
  const field = parsed.data;
  let normalized: unknown = field.value;
  if (field.cardinality === "many" && !Array.isArray(normalized)) normalized = [normalized];
  if (field.cardinality === "one" && Array.isArray(normalized)) {
    if (normalized.length !== 1) return { label: field.label, reason: normalized.length === 0 ? `${field.label} needs one value, but AI proposed an empty list.` : `${field.label} accepts one value, but AI proposed ${normalized.length}.` };
    normalized = normalized[0];
  }
  const values = Array.isArray(normalized) ? normalized : [normalized];
  if (values.length === 0 || values.some((value) => !validNewScalar(field, value))) return { label: field.label, reason: `${field.label} has a value incompatible with its proposed type.` };
  if (new Set(values.map((value) => JSON.stringify(value))).size !== values.length) return { label: field.label, reason: `${field.label} contains duplicate proposed values.` };
  return { field: { ...field, value: normalized as CandidatureRuntimeValue }, label: field.label };
}

const fieldAliasGroups = [
  ["language", "languages", "idioma", "idiomas", "language required", "languages required", "required language", "required languages", "language requirement", "language requirements"],
  ["organisation", "organization", "company", "employer"],
  ["role", "position", "job role", "job title", "position title"],
  ["location", "work location", "job location"],
  ["compensation", "salary", "pay", "remuneration"],
] as const;

function normalizedFieldMeaning(label: string): string {
  const normalized = label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const group of fieldAliasGroups) if (group.some((alias) => alias === normalized)) return group[0];
  return normalized;
}

function valueForExistingField(field: CandidatureFieldConfiguration, proposed: CandidatureRuntimeValue): unknown {
  if (field.definition.valueType !== "choice") return proposed;
  const mapOne = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const choice = field.definition.choices.find((candidate) => candidate.label.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase());
    return choice?.id ?? value;
  };
  return Array.isArray(proposed) ? proposed.map(mapOne) : mapOne(proposed);
}

function validateNewFields(
  rootPath: string,
  rawFields: readonly unknown[],
  existingFields: readonly CandidatureFieldConfiguration[],
): { readonly fields: JobExtractionNewField[]; readonly reused: Array<{ fieldId: string; value: CandidatureRuntimeValue }>; readonly issues: JobExtractionProposalIssue[] } {
  const fields: JobExtractionNewField[] = [];
  const reused: Array<{ fieldId: string; value: CandidatureRuntimeValue }> = [];
  const issues: JobExtractionProposalIssue[] = [];
  const meanings = new Set(existingFields.map((field) => normalizedFieldMeaning(field.definition.label)));
  for (const rawField of rawFields) {
    const normalized = normalizeNewField(rawField);
    if (!normalized.field) {
      issues.push(issue("new_field_invalid", null, normalized.label, proposedValue(rawField), normalized.reason ?? "AAAAT could not use this proposed information definition."));
      continue;
    }
    const meaning = normalizedFieldMeaning(normalized.field.label);
    const existing = existingFields.find((field) => normalizedFieldMeaning(field.definition.label) === meaning);
    if (existing) {
      if (!existing.definition.enabled || !existing.preferences.aiUseAllowed) {
        issues.push(issue("new_field_invalid", existing.definition.id, existing.definition.label, normalized.field.value, "Matching existing information is not available to AI."));
        continue;
      }
      try {
        const cardinality = normalizeCardinality(existing, valueForExistingField(existing, normalized.field.value));
        if (cardinality.reason) throw new Error(cardinality.reason);
        const runtime = candidatureRuntimeValueSchema.parse(cardinality.value);
        const value = withWorkspaceDatabase(rootPath, (database) => validateCandidatureFieldValueInDatabase(database, existing.definition.id, runtime));
        if (value === null) throw new Error(`${existing.definition.label} did not contain a usable value.`);
        reused.push({ fieldId: existing.definition.id, value });
      } catch (reason) {
        issues.push(issue("new_field_invalid", existing.definition.id, existing.definition.label, normalized.field.value, reason instanceof Error ? reason.message : "AI proposed duplicate information that could not be reused safely."));
      }
      continue;
    }
    if (meanings.has(meaning)) continue;
    meanings.add(meaning);
    fields.push(normalized.field);
  }
  return { fields, reused, issues };
}

function normalizedTagTerm(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase();
}

function validateTags(
  wire: DiscoveryWireRequest,
  rawExisting: readonly unknown[],
  rawNew: readonly unknown[],
  tags: readonly TagRecord[],
): { readonly existingTags: JobExtractionExistingTag[]; readonly newTags: JobExtractionNewTag[]; readonly issues: JobExtractionProposalIssue[] } {
  const existingTags: JobExtractionExistingTag[] = [];
  const newTags: JobExtractionNewTag[] = [];
  const issues: JobExtractionProposalIssue[] = [];
  const seenTagIds = new Set<string>();
  const terms = new Map<string, TagRecord>();
  for (const tag of tags) {
    terms.set(normalizedTagTerm(tag.name), tag);
    for (const alias of tag.aliases) terms.set(normalizedTagTerm(alias), tag);
  }

  const addExisting = (tag: TagRecord, evidence?: string) => {
    if (seenTagIds.has(tag.id)) return;
    seenTagIds.add(tag.id);
    existingTags.push({ tagId: tag.id, name: tag.name, ...(evidence ? { evidence } : {}) });
  };

  for (const raw of rawExisting) {
    if (!raw || typeof raw !== "object") {
      issues.push(issue("tag_invalid", null, null, raw, "AI returned a Tag match without a Tag reference."));
      continue;
    }
    const candidate = raw as { tagRef?: unknown; evidence?: unknown };
    const ref = typeof candidate.tagRef === "string" ? candidate.tagRef : "";
    const tagId = wire.tagIds.get(ref);
    const name = wire.tagNames.get(ref);
    const tag = tagId ? tags.find((item) => item.id === tagId) : undefined;
    if (!tag || !name) {
      issues.push(issue("tag_invalid", null, null, raw, "AI referred to a Tag that was not supplied in the glossary."));
      continue;
    }
    const evidence = typeof candidate.evidence === "string" && candidate.evidence.trim() ? candidate.evidence.trim().slice(0, 1500) : undefined;
    addExisting(tag, evidence);
  }

  const seenNewNames = new Set<string>();
  for (const raw of rawNew) {
    const parsed = jobExtractionNewTagSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push(issue("tag_invalid", null, null, raw, "Every proposed new Tag needs a canonical name and a non-empty definition."));
      continue;
    }
    const proposed = parsed.data;
    const existing = terms.get(normalizedTagTerm(proposed.name));
    if (existing) {
      addExisting(existing, proposed.evidence);
      continue;
    }
    const normalizedName = normalizedTagTerm(proposed.name);
    if (seenNewNames.has(normalizedName)) continue;
    seenNewNames.add(normalizedName);
    newTags.push(proposed);
  }
  return { existingTags, newTags, issues };
}

export async function extractJobWithPartialOutcomes(
  rootPath: string,
  request: JobExtractionRequest,
  signal?: AbortSignal,
  targetFieldIds?: readonly string[],
): Promise<PartialJobExtractionResult> {
  const connection = aiConnectionStatusSchema.parse(requireAiConnectionForOperation(rootPath, "job_extraction"));
  const targetSet = targetFieldIds ? new Set(targetFieldIds) : null;
  const allFields = listCandidatureFields(rootPath);
  const fields = allFields.filter((field) => field.definition.enabled && field.preferences.aiUseAllowed && (!targetSet || targetSet.has(field.definition.id)));
  if (targetSet && fields.length !== targetSet.size) {
    throw new Error("The requested information is no longer available for AI use.");
  }
  const tags = listTags(rootPath);
  if (!targetSet && fields.length === 0 && tags.length === 0) {
    throw new Error("Allow AI use for at least one application information item first.");
  }
  const wire = discoveryWireRequest(request, fields, tags);
  const capture = capturingFetch(wire.request, signal);
  const provider = createWorkspaceAiProvider(rootPath, capture.fetchImpl);

  let rawResult: unknown;
  let providerValidationError = "";
  let fallbackRawModelResponse = "";
  try {
    rawResult = await provider.extractJob(connection, wire.request, signal);
  } catch (reason) {
    if (!(reason instanceof AiProviderError) || reason.diagnostic?.failureKind !== "operation_contract_invalid") throw reason;
    fallbackRawModelResponse = reason.diagnostic.rawModelResponse;
    providerValidationError = reason.diagnostic.validationError;
    const recoverable = parseRecoverableModelResult(reason.diagnostic.rawModelResponse);
    if (!recoverable) throw reason;
    rawResult = recoverable;
  }

  const envelope = looseEnvelope(rawResult);
  if (!envelope) throw new Error("The configured provider returned an invalid job extraction result envelope.");
  const existing = validateExistingProposals(rootPath, wire, envelope.proposals);
  const discovered = validateNewFields(rootPath, envelope.newFields, allFields);
  const tagProposals = validateTags(wire, envelope.existingTags, envelope.newTags, tags);
  const exchange = capturedExchange(connection, capture.snapshot(), providerValidationError, fallbackRawModelResponse);

  return partialJobExtractionResultSchema.parse({
    proposals: [
      ...existing.proposals,
      ...discovered.reused.filter((proposal) => !existing.proposals.some((current) => current.fieldId === proposal.fieldId)),
    ],
    newFields: discovered.fields,
    existingTags: tagProposals.existingTags,
    newTags: tagProposals.newTags,
    issues: [...existing.issues, ...discovered.issues, ...tagProposals.issues],
    ...(exchange ? { exchange } : {}),
  });
}
