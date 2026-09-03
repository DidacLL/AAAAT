import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  aiConnectionInputSchema,
  aiConnectionStatusSchema,
  fitAssessmentPreviewSchema,
  fitAssessmentRequestSchema,
  fitAssessmentResultSchema,
  fitProjectedContextSchema,
  jobExtractionRequestSchema,
  jobExtractionResultSchema,
  type AiConnectionInput,
  type AiConnectionStatus,
  type FitAssessmentPreview,
  type FitAssessmentRequest,
  type FitAssessmentResult,
  type FitProjectedProfileItem,
  type JobExtractionRequest,
  type JobExtractionResult,
  type PrivacyMode,
} from "../shared/ai-contracts";
import type { ProfileItem } from "../shared/contracts";
import { createOpenAiCompatibleProvider, type ModelProvider } from "./ai-provider";
import { listCandidatures } from "./candidature-service";
import { getProfile } from "./profile-service";

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

interface Projection {
  readonly context: z.infer<typeof fitProjectedContextSchema>;
  readonly tokenMap: ReadonlyMap<string, string>;
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

function projectFitContext(rootPath: string, request: FitAssessmentRequest): Projection {
  const candidature = listCandidatures(rootPath).find(
    (candidate) => candidate.id === request.candidatureId,
  );
  if (!candidature) {
    throw new AiServiceError("The selected candidature no longer exists.");
  }

  const tokenMap = new Map<string, string>();
  let tokenCounter = 0;
  const token = (value: string) => {
    tokenCounter += 1;
    const placeholder = `[AAAT_PRIVATE_${tokenCounter}]`;
    tokenMap.set(placeholder, value);
    return placeholder;
  };

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
      candidature: {
        company: candidature.company,
        role: candidature.role,
        location: candidature.location,
        workMode: candidature.workMode,
        salaryText: candidature.salaryText,
        source: candidature.source,
        sourceText: candidature.sourceText.slice(0, 12_000),
      },
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
  for (const [token, original] of tokenMap) {
    result = result.split(token).join(original);
  }
  return result;
}

function rehydrateResult(
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
  return rehydrateResult(result, projection.tokenMap);
}

export async function extractJob(
  rootPath: string,
  rawRequest: JobExtractionRequest,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<JobExtractionResult> {
  const request = jobExtractionRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  return jobExtractionResultSchema.parse(
    await provider.extractJob(statusFor(stored), request),
  );
}
