import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  aiConnectionInputSchema,
  aiConnectionStatusSchema,
  coverLetterDraftSchema,
  cvTailoringResultSchema,
  documentAiContextSchema,
  documentAiRequestSchema,
  fitAssessmentPreviewSchema,
  fitAssessmentRequestSchema,
  fitAssessmentResultSchema,
  fitProjectedCandidatureSchema,
  fitProjectedContextSchema,
  historicalFieldDiscoveryRequestSchema,
  historicalFieldDiscoveryResultSchema,
  jobExtractionProviderRequestSchema,
  jobExtractionRequestSchema,
  jobExtractionResultSchema,
  variantRecommendationContextSchema,
  variantRecommendationRequestSchema,
  variantRecommendationResultSchema,
  type AiConnectionInput,
  type AiConnectionStatus,
  type CoverLetterDraft,
  type CvTailoringResult,
  type DocumentAiRequest,
  type FitAssessmentPreview,
  type FitAssessmentRequest,
  type FitAssessmentResult,
  type FitProjectedCandidature,
  type FitProjectedProfileItem,
  type HistoricalFieldDiscoveryRequest,
  type HistoricalFieldDiscoveryResult,
  type JobExtractionProviderRequest,
  type JobExtractionRequest,
  type JobExtractionResult,
  type PrivacyMode,
  type VariantRecommendationRequest,
  type VariantRecommendationResult,
} from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRuntimeValue,
  ProfileItem,
} from "../shared/contracts";
import { createOpenAiCompatibleProvider, type ModelProvider } from "./ai-provider";
import {
  listCandidatureFields,
  validateCandidatureFieldValueInDatabase,
} from "./candidature-field-service";
import {
  getCandidature,
  listCandidatureSources,
} from "./candidature-service";
import { listDocuments, resolveDocument } from "./document-service";
import { getProfile, resolveProfileVariant } from "./profile-service";
import { withWorkspaceDatabase } from "./workspace";

const storedConnectionSchema = z
  .object({
    version: z.literal(1),
    name: z.string().min(1),
    endpoint: z.string().url(),
    model: z.string().min(1),
  })
  .strict();

type StoredConnection = z.infer<typeof storedConnectionSchema>;

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}

function connectionPath(rootPath: string): string {
  return path.join(rootPath, "ai-connection.json");
}

function loopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function validateEndpoint(input: AiConnectionInput): URL {
  const endpoint = new URL(input.endpoint);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new AiServiceError("The local AI endpoint must be a plain provider base URL.");
  }
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new AiServiceError("The local AI endpoint must use HTTP or HTTPS.");
  }
  if (!loopbackHost(endpoint.hostname)) {
    throw new AiServiceError("The first AI connection must use a loopback endpoint.");
  }
  return endpoint;
}

function readStoredConnection(rootPath: string): StoredConnection | null {
  const filePath = connectionPath(rootPath);
  if (!existsSync(filePath)) return null;
  try {
    const stored = storedConnectionSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
    validateEndpoint({ name: stored.name, endpoint: stored.endpoint, model: stored.model });
    return stored;
  } catch {
    throw new AiServiceError("The stored AI connection configuration is invalid.");
  }
}

function statusFor(stored: StoredConnection): AiConnectionStatus {
  return aiConnectionStatusSchema.parse({
    name: stored.name,
    endpoint: stored.endpoint,
    model: stored.model,
  });
}

function requireStoredConnection(rootPath: string): StoredConnection {
  const stored = readStoredConnection(rootPath);
  if (!stored) {
    throw new AiServiceError("Configure a local AI connection before using AI assistance.");
  }
  return stored;
}

export function getAiConnection(rootPath: string): AiConnectionStatus | null {
  const stored = readStoredConnection(rootPath);
  return stored ? statusFor(stored) : null;
}

export function saveAiConnection(
  rootPath: string,
  rawInput: AiConnectionInput,
): AiConnectionStatus {
  const input = aiConnectionInputSchema.parse(rawInput);
  const endpoint = validateEndpoint(input);
  const stored = storedConnectionSchema.parse({
    version: 1,
    name: input.name,
    endpoint: endpoint.toString().replace(/\/$/, ""),
    model: input.model,
  });
  writeFileSync(connectionPath(rootPath), `${JSON.stringify(stored, null, 2)}\n`, "utf8");
  return statusFor(stored);
}

interface Projection<T> {
  readonly context: T;
  readonly tokenMap: ReadonlyMap<string, string>;
}

function tokenFactory(tokenMap: Map<string, string>) {
  let counter = tokenMap.size;
  return (value: string): string => {
    counter += 1;
    const placeholder = `[AAAT_PRIVATE_${counter}]`;
    tokenMap.set(placeholder, value);
    return placeholder;
  };
}

function projectedItem(
  item: ProfileItem,
  mode: PrivacyMode,
  token: (value: string) => string,
): FitProjectedProfileItem | null {
  if (mode === "omit") return null;
  const project = (value: string | undefined) => {
    if (value === undefined) return undefined;
    return mode === "token" ? token(value) : value;
  };
  const title = project(item.title) ?? "";
  const subtitle = project(item.subtitle);
  const description = project(item.description);
  const startDate = project(item.startDate);
  const endDate = project(item.endDate);
  return {
    kind: item.kind,
    title,
    ...(subtitle !== undefined ? { subtitle } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(startDate !== undefined ? { startDate } : {}),
    ...(endDate !== undefined ? { endDate } : {}),
  };
}

function tokenRuntimeValue(
  value: CandidatureRuntimeValue,
  token: (value: string) => string,
): CandidatureRuntimeValue {
  if (Array.isArray(value)) return value.map((item) => token(String(item)));
  return token(String(value));
}

function aiDiscoveryField(field: CandidatureFieldConfiguration) {
  return {
    id: field.definition.id,
    label: field.definition.label,
    description: field.definition.description,
    valueType: field.definition.valueType,
    cardinality: field.definition.cardinality,
    choices: field.definition.choices,
  };
}

function projectCandidature(
  rootPath: string,
  candidatureId: string,
): Projection<FitProjectedCandidature> {
  const candidature = getCandidature(rootPath, candidatureId);
  const fields = new Map(
    listCandidatureFields(rootPath).map((field) => [field.definition.id, field]),
  );
  const tokenMap = new Map<string, string>();
  const token = tokenFactory(tokenMap);
  const information = candidature.values.flatMap((retained) => {
    const field = fields.get(retained.fieldId);
    if (!field || field.preferences.aiContextMode === "omit") return [];
    return [
      {
        fieldId: field.definition.id,
        label: field.definition.label,
        value:
          field.preferences.aiContextMode === "token"
            ? tokenRuntimeValue(retained.value, token)
            : retained.value,
      },
    ];
  });
  const sources = listCandidatureSources(rootPath, candidatureId)
    .slice(0, 20)
    .map((source) => ({
      title: source.title,
      url: source.url,
      sourceText: source.sourceText.slice(0, 12000),
    }));
  return {
    context: fitProjectedCandidatureSchema.parse({
      label: candidature.label,
      information,
      sources,
    }),
    tokenMap,
  };
}

function requireCandidature(rootPath: string, candidatureId: string) {
  try {
    return getCandidature(rootPath, candidatureId);
  } catch {
    throw new AiServiceError("The selected candidature no longer exists.");
  }
}

function projectFitContext(rootPath: string, request: FitAssessmentRequest): Projection<z.infer<typeof fitProjectedContextSchema>> {
  const candidatureProjection = projectCandidature(rootPath, request.candidatureId);
  const tokenMap = new Map(candidatureProjection.tokenMap);
  const token = tokenFactory(tokenMap);
  const profileItems = getProfile(rootPath).items.flatMap((item) => {
    const mode =
      item.kind === "identity"
        ? request.identityPrivacy
        : item.kind === "contact"
          ? request.contactPrivacy
          : "expose";
    const projected = projectedItem(item, mode, token);
    return projected ? [projected] : [];
  });
  return {
    context: fitProjectedContextSchema.parse({
      candidature: candidatureProjection.context,
      profileItems,
    }),
    tokenMap,
  };
}

export function previewFitAssessment(
  rootPath: string,
  rawRequest: FitAssessmentRequest,
): FitAssessmentPreview {
  const request = fitAssessmentRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  const projection = projectFitContext(rootPath, request);
  return fitAssessmentPreviewSchema.parse({
    connection: statusFor(stored),
    projectedContext: projection.context,
  });
}

function rehydrate(value: string, tokenMap: ReadonlyMap<string, string>): string {
  let result = value;
  for (const [token, original] of tokenMap) result = result.split(token).join(original);
  return result;
}

function rehydrateFitResult(
  result: FitAssessmentResult,
  tokenMap: ReadonlyMap<string, string>,
): FitAssessmentResult {
  return fitAssessmentResultSchema.parse({
    fit: result.fit,
    summary: rehydrate(result.summary, tokenMap),
    strengths: result.strengths.map((value) => rehydrate(value, tokenMap)),
    gaps: result.gaps.map((value) => rehydrate(value, tokenMap)),
    focus: result.focus.map((value) => rehydrate(value, tokenMap)),
  });
}

export async function assessFit(
  rootPath: string,
  rawRequest: FitAssessmentRequest,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<FitAssessmentResult> {
  const request = fitAssessmentRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  const projection = projectFitContext(rootPath, request);
  const result = await provider.assessFit(statusFor(stored), projection.context);
  return rehydrateFitResult(result, projection.tokenMap);
}

function discoveryFields(rootPath: string): CandidatureFieldConfiguration[] {
  return listCandidatureFields(rootPath).filter(
    (field) => field.definition.enabled && field.preferences.aiDiscovery,
  );
}

function validateDiscoveryResult(
  rootPath: string,
  request: JobExtractionProviderRequest,
  result: JobExtractionResult,
): JobExtractionResult {
  const requested = new Set(request.fields.map((field) => field.id));
  const proposals = result.proposals.flatMap((proposal) => {
    if (!requested.has(proposal.fieldId)) {
      throw new AiServiceError("The model proposed a candidature field that was not requested.");
    }
    const normalized = withWorkspaceDatabase(rootPath, (database) =>
      validateCandidatureFieldValueInDatabase(database, proposal.fieldId, proposal.value),
    );
    return normalized === null ? [] : [{ fieldId: proposal.fieldId, value: normalized }];
  });
  return jobExtractionResultSchema.parse({ proposals });
}

export async function extractJob(
  rootPath: string,
  rawRequest: JobExtractionRequest,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<JobExtractionResult> {
  const request = jobExtractionRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  const fields = discoveryFields(rootPath);
  if (fields.length === 0) {
    throw new AiServiceError("Enable AI discovery for at least one candidature field first.");
  }
  const providerRequest = jobExtractionProviderRequestSchema.parse({
    ...request,
    fields: fields.map(aiDiscoveryField),
  });
  const result = jobExtractionResultSchema.parse(
    await provider.extractJob(statusFor(stored), providerRequest),
  );
  return validateDiscoveryResult(rootPath, providerRequest, result);
}

export async function discoverCandidatureFieldFromSources(
  rootPath: string,
  rawRequest: HistoricalFieldDiscoveryRequest,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<HistoricalFieldDiscoveryResult> {
  const request = historicalFieldDiscoveryRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  const candidature = requireCandidature(rootPath, request.candidatureId);
  const field = listCandidatureFields(rootPath).find(
    (candidate) => candidate.definition.id === request.fieldId,
  );
  if (!field || !field.definition.enabled) {
    throw new AiServiceError("Choose an enabled candidature field for discovery.");
  }
  const sourceMap = new Map(
    listCandidatureSources(rootPath, request.candidatureId).map((source) => [source.id, source]),
  );
  const selected = request.sourceIds.map((sourceId) => {
    const source = sourceMap.get(sourceId);
    if (!source) {
      throw new AiServiceError("A selected Source no longer belongs to this candidature.");
    }
    return source;
  });
  const sourceText = selected
    .map(
      (source) =>
        `Source: ${source.title}\nURL: ${source.url}\n${source.sourceText}`,
    )
    .join("\n\n---\n\n")
    .slice(0, 50000)
    .trim();
  if (!sourceText) throw new AiServiceError("The selected Sources contain no text to analyze.");

  const providerRequest = jobExtractionProviderRequestSchema.parse({
    sourceText,
    sourceTitle: "Retained AAAAT Sources",
    sourceUrl: "",
    fields: [aiDiscoveryField(field)],
  });
  const rawResult = jobExtractionResultSchema.parse(
    await provider.extractJob(statusFor(stored), providerRequest),
  );
  const result = validateDiscoveryResult(rootPath, providerRequest, rawResult);
  return historicalFieldDiscoveryResultSchema.parse({
    proposal: result.proposals[0] ?? null,
    existingValuePresent: candidature.values.some((value) => value.fieldId === request.fieldId),
  });
}

export async function recommendVariant(
  rootPath: string,
  rawRequest: VariantRecommendationRequest,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<VariantRecommendationResult> {
  const request = variantRecommendationRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  requireCandidature(rootPath, request.candidatureId);
  const variants = getProfile(rootPath).variants;
  if (variants.length === 0) {
    throw new AiServiceError("Create a profile variant before requesting a recommendation.");
  }
  const projection = projectCandidature(rootPath, request.candidatureId);
  const context = variantRecommendationContextSchema.parse({
    candidature: projection.context,
    variants: variants.map((variant) => ({
      id: variant.id,
      name: variant.name,
      focus: variant.focus,
      targetTags: variant.targetTags,
      ...(variant.preferredLanguage ? { preferredLanguage: variant.preferredLanguage } : {}),
    })),
  });
  const result = variantRecommendationResultSchema.parse(
    await provider.recommendVariant(statusFor(stored), context),
  );
  if (!getProfile(rootPath).variants.some((variant) => variant.id === result.variantId)) {
    throw new AiServiceError("The model recommended a profile variant that no longer exists.");
  }
  return variantRecommendationResultSchema.parse({
    ...result,
    rationale: rehydrate(result.rationale, projection.tokenMap),
  });
}

const documentEvidenceKinds = new Set([
  "summary",
  "experience",
  "education",
  "project",
  "skill",
  "certification",
  "language",
]);

function requireDocument(rootPath: string, documentId: string) {
  const document = listDocuments(rootPath).find((candidate) => candidate.id === documentId);
  if (!document) throw new AiServiceError("The selected document no longer exists.");
  return document;
}

function documentContext(
  candidature: FitProjectedCandidature,
  items: readonly ProfileItem[],
) {
  const evidence = items
    .filter((item) => documentEvidenceKinds.has(item.kind))
    .map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      ...(item.subtitle ? { subtitle: item.subtitle } : {}),
      ...(item.description ? { description: item.description } : {}),
    }));
  if (evidence.length === 0) {
    throw new AiServiceError("Add non-sensitive career evidence before requesting document assistance.");
  }
  return documentAiContextSchema.parse({ candidature, items: evidence });
}

function currentDocumentEvidenceIds(rootPath: string, documentId: string): ReadonlySet<string> {
  const document = requireDocument(rootPath, documentId);
  if (document.kind !== "cv") throw new AiServiceError("Choose a CV document for CV tailoring.");
  return new Set(
    resolveProfileVariant(rootPath, document.variantId).items
      .filter((item) => documentEvidenceKinds.has(item.kind))
      .map((item) => item.id),
  );
}

export async function tailorCv(
  rootPath: string,
  rawRequest: DocumentAiRequest,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<CvTailoringResult> {
  const request = documentAiRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  requireCandidature(rootPath, request.candidatureId);
  const document = requireDocument(rootPath, request.documentId);
  if (document.kind !== "cv") throw new AiServiceError("Choose a CV document for CV tailoring.");
  const projection = projectCandidature(rootPath, request.candidatureId);
  const context = documentContext(
    projection.context,
    resolveProfileVariant(rootPath, document.variantId).items,
  );
  const result = cvTailoringResultSchema.parse(
    await provider.tailorCv(statusFor(stored), context),
  );
  const allowed = currentDocumentEvidenceIds(rootPath, request.documentId);
  if (result.recommendations.some((item) => !allowed.has(item.itemId))) {
    throw new AiServiceError("The model recommended a profile item that no longer exists.");
  }
  return cvTailoringResultSchema.parse({
    recommendations: result.recommendations.map((item) => ({
      ...item,
      rationale: rehydrate(item.rationale, projection.tokenMap),
    })),
  });
}

export async function draftCoverLetter(
  rootPath: string,
  rawRequest: DocumentAiRequest,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<CoverLetterDraft> {
  const request = documentAiRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  requireCandidature(rootPath, request.candidatureId);
  const document = requireDocument(rootPath, request.documentId);
  if (document.kind !== "cover_letter") {
    throw new AiServiceError("Choose a cover-letter document for cover-letter drafting.");
  }
  const projection = projectCandidature(rootPath, request.candidatureId);
  const context = documentContext(
    projection.context,
    resolveDocument(rootPath, document.id).items,
  );
  const result = coverLetterDraftSchema.parse(
    await provider.draftCoverLetter(statusFor(stored), context),
  );
  return coverLetterDraftSchema.parse({
    recipient: rehydrate(result.recipient, projection.tokenMap),
    subject: rehydrate(result.subject, projection.tokenMap),
    bodyParagraphs: result.bodyParagraphs.map((paragraph) =>
      rehydrate(paragraph, projection.tokenMap),
    ),
    closing: rehydrate(result.closing, projection.tokenMap),
  });
}
