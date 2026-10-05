import {
  providerTagInferenceRequestSchema,
  tagInferenceNewTagSchema,
  type AiConnectionStatus,
  type ProviderTagInferenceRequest,
  type TagInferenceNewTag,
  type TagInferenceRequest,
} from "../shared/ai-contracts";
import type { AiStructuredOutputMode } from "../shared/ai-diagnostics";
import {
  partialTagInferenceResultSchema,
  type PartialTagInferenceResult,
  type TagInferenceExchange,
  type TagInferenceExistingTag,
  type TagInferenceIssue,
} from "../shared/ai-proposal-outcomes";
import type { TagRecord } from "../shared/contracts";
import { compactSourceText } from "../shared/source-text";
import { requireAiProviderConnectionForOperation } from "./ai-connection-service";
import { AiProviderError } from "./ai-provider";
import { createWorkspaceAiProvider } from "./ai-prompt-service";
import { listCandidatureFields } from "./candidature-field-service";
import { listTags } from "./tag-service";

interface TagWireRequest {
  readonly request: ProviderTagInferenceRequest;
  readonly tagIds: ReadonlyMap<string, string>;
}

interface CapturedExchange {
  readonly requestBody: string;
  readonly responseBody: string;
}

function normalizeTerm(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function tagWireRequest(
  rootPath: string,
  request: TagInferenceRequest,
  tags: readonly TagRecord[],
): TagWireRequest {
  const tagIds = new Map<string, string>();
  const providerTags = tags.slice(0, 300).map((tag, index) => {
    const tagRef = `aaaat_tag_${index + 1}`;
    tagIds.set(tagRef, tag.id);
    return {
      tagRef,
      name: tag.name,
      aliases: tag.aliases.slice(0, 8),
      definition: tag.definition.slice(0, 500),
    };
  });
  const fieldTitles = listCandidatureFields(rootPath)
    .filter((field) => field.definition.enabled)
    .slice(0, 64)
    .map((field) => field.definition.label);

  return {
    request: providerTagInferenceRequestSchema.parse({
      ...request,
      sourceText: compactSourceText(request.sourceText),
      fieldTitles,
      tags: providerTags,
    }),
    tagIds,
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
): TagInferenceExchange | undefined {
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
    operation: "tag_inference",
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
  readonly existingTags: unknown[];
  readonly newTags: unknown[];
}

function looseEnvelope(value: unknown): LooseEnvelope | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { existingTags?: unknown; newTags?: unknown };
  if (candidate.existingTags !== undefined && !Array.isArray(candidate.existingTags)) return null;
  if (candidate.newTags !== undefined && !Array.isArray(candidate.newTags)) return null;
  return {
    existingTags: (candidate.existingTags ?? []).slice(0, 30),
    newTags: (candidate.newTags ?? []).slice(0, 5),
  };
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
  return firstObject >= 0 && lastObject > firstObject
    ? text.slice(firstObject, lastObject + 1)
    : text;
}

function parseRecoverableModelResult(raw: string): LooseEnvelope | null {
  try {
    return looseEnvelope(JSON.parse(recoverableJsonText(raw)) as unknown);
  } catch {
    return null;
  }
}

function tagIssue(proposedValue: unknown, reason: string): TagInferenceIssue {
  return { proposedValue, reason };
}

function validateTagProposals(
  wire: TagWireRequest,
  rawExisting: readonly unknown[],
  rawNew: readonly unknown[],
  tags: readonly TagRecord[],
  fieldTitles: readonly string[],
): {
  readonly existingTags: TagInferenceExistingTag[];
  readonly newTags: TagInferenceNewTag[];
  readonly issues: TagInferenceIssue[];
} {
  const existingTags: TagInferenceExistingTag[] = [];
  const newTags: TagInferenceNewTag[] = [];
  const issues: TagInferenceIssue[] = [];
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const glossaryTerms = new Map<string, TagRecord>();
  for (const tag of tags) {
    glossaryTerms.set(normalizeTerm(tag.name), tag);
    for (const alias of tag.aliases) glossaryTerms.set(normalizeTerm(alias), tag);
  }
  const fieldTerms = new Set(fieldTitles.map(normalizeTerm).filter(Boolean));
  const seenExisting = new Set<string>();
  const seenNewTerms = new Set<string>();

  const representedByField = (tag: Pick<TagRecord, "name" | "aliases">): boolean =>
    [tag.name, ...tag.aliases].some((term) => fieldTerms.has(normalizeTerm(term)));

  const addExisting = (tag: TagRecord, evidence?: string) => {
    if (seenExisting.has(tag.id) || representedByField(tag)) return;
    seenExisting.add(tag.id);
    existingTags.push({ tagId: tag.id, name: tag.name, ...(evidence ? { evidence } : {}) });
  };

  for (const raw of rawExisting) {
    if (!raw || typeof raw !== "object") {
      issues.push(tagIssue(raw, "AI returned a Tag match without a Tag reference."));
      continue;
    }
    const candidate = raw as { tagRef?: unknown; evidence?: unknown };
    const tagId = typeof candidate.tagRef === "string" ? wire.tagIds.get(candidate.tagRef) : undefined;
    const tag = tagId ? byId.get(tagId) : undefined;
    if (!tag) {
      issues.push(tagIssue(raw, "AI referred to a Tag that was not supplied in the glossary."));
      continue;
    }
    if (representedByField(tag)) {
      issues.push(tagIssue(raw, "This Tag duplicates configured application information and was not suggested."));
      continue;
    }
    const evidence = typeof candidate.evidence === "string" && candidate.evidence.trim()
      ? candidate.evidence.trim().slice(0, 1500)
      : undefined;
    addExisting(tag, evidence);
  }

  for (const raw of rawNew) {
    const parsed = tagInferenceNewTagSchema.safeParse(raw);
    if (!parsed.success) {
      issues.push(tagIssue(raw, "Every proposed new Tag needs a canonical name and a non-empty definition."));
      continue;
    }
    const proposed = parsed.data;
    const proposedTerms = [proposed.name, ...proposed.aliases].map(normalizeTerm).filter(Boolean);
    if (proposedTerms.some((term) => fieldTerms.has(term))) {
      issues.push(tagIssue(raw, "This proposed Tag duplicates configured application information."));
      continue;
    }
    const existing = proposedTerms.map((term) => glossaryTerms.get(term)).find(Boolean);
    if (existing) {
      addExisting(existing, proposed.evidence);
      continue;
    }
    if (proposedTerms.some((term) => seenNewTerms.has(term))) {
      issues.push(tagIssue(raw, "This proposed Tag duplicates another new Tag suggestion."));
      continue;
    }
    for (const term of proposedTerms) seenNewTerms.add(term);
    newTags.push(proposed);
  }

  return { existingTags, newTags, issues };
}

export async function inferTagsWithPartialOutcomes(
  rootPath: string,
  request: TagInferenceRequest,
  signal?: AbortSignal,
): Promise<PartialTagInferenceResult> {
  const connection = requireAiProviderConnectionForOperation(rootPath, "tag_inference");
  const tags = listTags(rootPath);
  const wire = tagWireRequest(rootPath, request, tags);
  const fieldTitles = wire.request.fieldTitles;
  const capture = capturingFetch(signal);
  const provider = createWorkspaceAiProvider(rootPath, capture.fetchImpl);

  let rawResult: unknown;
  let providerValidationError = "";
  let fallbackRawModelResponse = "";
  try {
    rawResult = await provider.inferTags(connection, wire.request, signal);
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
  if (!envelope) throw new Error("The configured provider returned an invalid Tag inference result envelope.");
  const proposals = validateTagProposals(wire, envelope.existingTags, envelope.newTags, tags, fieldTitles);
  const exchange = capturedExchange(
    connection,
    capture.snapshot(),
    providerValidationError,
    fallbackRawModelResponse,
  );

  return partialTagInferenceResultSchema.parse({
    ...proposals,
    ...(exchange ? { exchange } : {}),
  });
}
