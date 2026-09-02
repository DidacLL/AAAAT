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
  type AiConnectionInput,
  type AiConnectionStatus,
  type FitAssessmentPreview,
  type FitAssessmentRequest,
  type FitAssessmentResult,
  type FitProjectedProfileItem,
  type PrivacyMode,
} from "../shared/ai-contracts";
import type { ProfileItem } from "../shared/contracts";
import { listCandidatures } from "./candidature-service";
import {
  createOpenAiCompatibleProvider,
  type FitModelProvider,
} from "./ai-provider";
import { getProfile } from "./profile-service";

const storedConnectionSchema = z
  .object({
    version: z.literal(1),
    name: z.string().min(1),
    endpoint: z.string().url(),
    model: z.string().min(1),
    classification: z.enum(["local", "remote", "unknown"]),
    encryptedApiKey: z.string().min(1).optional(),
  })
  .strict();

type StoredConnection = z.infer<typeof storedConnectionSchema>;

export interface SecureStorageAdapter {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}

function connectionPath(rootPath: string): string {
  return path.join(rootPath, "ai-connection.json");
}

function readStoredConnection(rootPath: string): StoredConnection | null {
  const filePath = connectionPath(rootPath);
  if (!existsSync(filePath)) {
    return null;
  }
  try {
    return storedConnectionSchema.parse(JSON.parse(readFileSync(filePath, "utf8")));
  } catch {
    throw new AiServiceError("The stored AI connection configuration is invalid.");
  }
}

function loopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function validateEndpoint(input: AiConnectionInput): URL {
  const endpoint = new URL(input.endpoint);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new AiServiceError("The AI endpoint must be a plain provider base URL.");
  }
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new AiServiceError("The AI endpoint must use HTTP or HTTPS.");
  }
  if (input.classification === "local") {
    if (!loopbackHost(endpoint.hostname)) {
      throw new AiServiceError("A local AI connection must use a loopback endpoint.");
    }
  } else if (endpoint.protocol !== "https:") {
    throw new AiServiceError("Remote or unknown AI connections must use HTTPS.");
  }
  return endpoint;
}

function statusFor(
  stored: StoredConnection,
  secureStorage: SecureStorageAdapter,
): AiConnectionStatus {
  return aiConnectionStatusSchema.parse({
    name: stored.name,
    endpoint: stored.endpoint,
    model: stored.model,
    classification: stored.classification,
    hasCredential: Boolean(stored.encryptedApiKey),
    secureStorageAvailable: secureStorage.isEncryptionAvailable(),
  });
}

export function getAiConnection(
  rootPath: string,
  secureStorage: SecureStorageAdapter,
): AiConnectionStatus | null {
  const stored = readStoredConnection(rootPath);
  return stored ? statusFor(stored, secureStorage) : null;
}

export function saveAiConnection(
  rootPath: string,
  rawInput: AiConnectionInput,
  secureStorage: SecureStorageAdapter,
): AiConnectionStatus {
  const input = aiConnectionInputSchema.parse(rawInput);
  const endpoint = validateEndpoint(input);
  const previous = readStoredConnection(rootPath);
  let encryptedApiKey = previous?.encryptedApiKey;

  if (input.apiKey && input.apiKey.length > 0) {
    if (!secureStorage.isEncryptionAvailable()) {
      throw new AiServiceError(
        "Secure credential storage is unavailable on this system, so AAAAT did not save the API key.",
      );
    }
    encryptedApiKey = secureStorage.encryptString(input.apiKey).toString("base64");
  }

  const stored = storedConnectionSchema.parse({
    version: 1,
    name: input.name,
    endpoint: endpoint.toString().replace(/\/$/, ""),
    model: input.model,
    classification: input.classification,
    ...(encryptedApiKey ? { encryptedApiKey } : {}),
  });
  writeFileSync(connectionPath(rootPath), `${JSON.stringify(stored, null, 2)}\n`, "utf8");
  return statusFor(stored, secureStorage);
}

function credentialFor(
  stored: StoredConnection,
  secureStorage: SecureStorageAdapter,
): string | null {
  if (!stored.encryptedApiKey) {
    return null;
  }
  if (!secureStorage.isEncryptionAvailable()) {
    throw new AiServiceError(
      "The stored AI credential cannot be decrypted because secure credential storage is unavailable.",
    );
  }
  try {
    return secureStorage.decryptString(Buffer.from(stored.encryptedApiKey, "base64"));
  } catch {
    throw new AiServiceError("AAAAT could not decrypt the stored AI credential.");
  }
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
  if (mode === "omit") {
    return null;
  }
  const project = (value: string | undefined) => {
    if (value === undefined) return undefined;
    return mode === "token" ? token(value) : value;
  };
  return {
    kind: item.kind,
    title: project(item.title) ?? "",
    ...(project(item.subtitle) ? { subtitle: project(item.subtitle) } : {}),
    ...(project(item.description) ? { description: project(item.description) } : {}),
    ...(project(item.startDate) ? { startDate: project(item.startDate) } : {}),
    ...(project(item.endDate) ? { endDate: project(item.endDate) } : {}),
  };
}

function projectFitContext(
  rootPath: string,
  request: FitAssessmentRequest,
): Projection {
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

function requireStoredConnection(rootPath: string): StoredConnection {
  const stored = readStoredConnection(rootPath);
  if (!stored) {
    throw new AiServiceError("Configure an AI connection before using AI assistance.");
  }
  return stored;
}

export function previewFitAssessment(
  rootPath: string,
  rawRequest: FitAssessmentRequest,
  secureStorage: SecureStorageAdapter,
): FitAssessmentPreview {
  const request = fitAssessmentRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  const projection = projectFitContext(rootPath, request);
  return fitAssessmentPreviewSchema.parse({
    connection: statusFor(stored, secureStorage),
    projectedContext: projection.context,
    requiresRemoteDisclosure: stored.classification !== "local",
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
  secureStorage: SecureStorageAdapter,
  provider: FitModelProvider = createOpenAiCompatibleProvider(),
): Promise<FitAssessmentResult> {
  const request = fitAssessmentRequestSchema.parse(rawRequest);
  const stored = requireStoredConnection(rootPath);
  const connection = statusFor(stored, secureStorage);
  const projection = projectFitContext(rootPath, request);
  const result = await provider.assessFit(
    connection,
    credentialFor(stored, secureStorage),
    projection.context,
  );
  return rehydrateResult(result, projection.tokenMap);
}
