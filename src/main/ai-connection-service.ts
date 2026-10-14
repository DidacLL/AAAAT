import { randomUUID } from "node:crypto";
import { ensureInstalledGranite } from "./local-granite-runtime";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { z } from "zod";

import {
  aiConnectionInputSchema,
  aiConnectionStatusSchema,
  type AiConnectionInput,
  type AiConnectionStatus,
} from "../shared/ai-contracts";
import {
  aiConnectionIdSchema,
  aiOperationLabels,
  aiOperationSchema,
  namedAiConnectionInputSchema,
  namedAiConnectionListSchema,
  portableAiSetupSchema,
  type AiOperation,
  type NamedAiConnection,
  type NamedAiConnectionInput,
  type PortableAiSetup,
} from "../shared/ai-connection-contracts";
import type { AiProviderConnection } from "./ai-provider";

const storedConnectionSchema = aiConnectionInputSchema
  .extend({
    id: aiConnectionIdSchema,
    credentialCiphertext: z.string().min(1).max(32768).optional(),
  });

type StoredConnection = z.infer<typeof storedConnectionSchema>;

const storedConnectionConfigurationSchema = z
  .object({
    connections: z.array(storedConnectionSchema).max(16),
    defaultConnectionId: aiConnectionIdSchema.nullable(),
  })
  .superRefine((configuration, context) => {
    const ids = configuration.connections.map((connection) => connection.id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: "custom", message: "AI connection IDs must be unique." });
    }
    const names = configuration.connections.map((connection) => connection.name.toLocaleLowerCase());
    if (new Set(names).size !== names.length) {
      context.addIssue({ code: "custom", message: "AI connection names must be unique." });
    }
    if (
      configuration.defaultConnectionId !== null &&
      !configuration.connections.some(
        (connection) => connection.id === configuration.defaultConnectionId,
      )
    ) {
      context.addIssue({ code: "custom", message: "The default AI connection must exist." });
    }

  });

type StoredConnectionConfiguration = z.infer<typeof storedConnectionConfigurationSchema>;

export class AiConnectionServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConnectionServiceError";
  }
}

interface AiCredentialProtection {
  readonly isSecure: () => boolean;
  readonly encryptString: (value: string) => Buffer;
  readonly decryptString: (value: Buffer) => string;
}

let credentialProtection: AiCredentialProtection | null = null;

export function configureAiCredentialProtection(protection: AiCredentialProtection): void {
  credentialProtection = Object.freeze(protection);
}

function normalizedCredential(value: string): string {
  const credential = value.trim().replace(/^Bearer\s+/iu, "").trim();
  if (!credential) throw new AiConnectionServiceError("Enter a non-empty AI credential.");
  return credential;
}

function encryptCredential(value: string): string {
  if (!credentialProtection?.isSecure()) {
    throw new AiConnectionServiceError(
      "Secure local credential storage is unavailable on this computer. Configure the operating-system credential store, then retry.",
    );
  }
  try {
    return credentialProtection.encryptString(normalizedCredential(value)).toString("base64");
  } catch (reason) {
    if (reason instanceof AiConnectionServiceError) throw reason;
    throw new AiConnectionServiceError("AAAAT could not protect this AI credential locally.");
  }
}

function decryptCredential(value: string): string {
  if (!credentialProtection) {
    throw new AiConnectionServiceError(
      "AAAAT cannot read the stored AI credential in this process.",
    );
  }
  try {
    return normalizedCredential(
      credentialProtection.decryptString(Buffer.from(value, "base64")),
    );
  } catch {
    throw new AiConnectionServiceError(
      "AAAAT could not read the stored AI credential. Replace or clear it in AI Settings.",
    );
  }
}

function connectionPath(rootPath: string): string {
  return path.join(rootPath, "ai-connection.json");
}

function loopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function validatedEndpoint(input: AiConnectionInput): string {
  const endpoint = new URL(input.endpoint);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new AiConnectionServiceError("The AI endpoint must be a plain provider base URL.");
  }
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new AiConnectionServiceError("The AI endpoint must use HTTP or HTTPS.");
  }
  if (endpoint.protocol === "http:" && !loopbackHost(endpoint.hostname)) {
    throw new AiConnectionServiceError("HTTP AI endpoints must use a loopback host.");
  }
  return endpoint.toString().replace(/\/$/, "");
}

const aiConnectionProbeTimeoutMs = 3_000;

function modelsUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/models`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

export async function probeAiConnection(
  rootPath: string,
  rawConnectionId: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = aiConnectionProbeTimeoutMs,
): Promise<boolean> {
  const connectionId = aiConnectionIdSchema.parse(rawConnectionId);
  const configuration = readConfiguration(rootPath);
  const connection = connectionById(configuration, connectionId);
  const providerConnection = providerConnectionForStored(connection);
  try {
    await ensureInstalledGranite(connection.endpoint, connection.model);
    const response = await fetchImpl(modelsUrl(connection.endpoint), {
      method: "GET",
      headers: {
        accept: "application/json",
        ...(providerConnection.credential
          ? { authorization: `Bearer ${providerConnection.credential}` }
          : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function emptyConfiguration(): StoredConnectionConfiguration {
  return { connections: [], defaultConnectionId: null };
}

function readConfiguration(rootPath: string): StoredConnectionConfiguration {
  const filePath = connectionPath(rootPath);
  if (!existsSync(filePath)) return emptyConfiguration();
  try {
    const configuration = storedConnectionConfigurationSchema.parse(
      JSON.parse(readFileSync(filePath, "utf8")),
    );
    for (const connection of configuration.connections) validatedEndpoint(connection);
    return configuration;
  } catch {
    throw new AiConnectionServiceError("The stored AI connection configuration is invalid.");
  }
}

function writeConfiguration(
  rootPath: string,
  configuration: StoredConnectionConfiguration,
): StoredConnectionConfiguration {
  const validated = storedConnectionConfigurationSchema.parse(configuration);
  writeFileSync(connectionPath(rootPath), `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  return validated;
}

function statusFor(connection: StoredConnection): AiConnectionStatus {
  return aiConnectionStatusSchema.parse({
    name: connection.name,
    endpoint: connection.endpoint,
    model: connection.model,
  });
}

function listFor(configuration: StoredConnectionConfiguration): NamedAiConnection[] {
  return namedAiConnectionListSchema.parse(
    configuration.connections.map((connection) => ({
      ...statusFor(connection),
      id: connection.id,
      hasCredential: connection.credentialCiphertext !== undefined,
      isDefault: connection.id === configuration.defaultConnectionId,

    })),
  );
}

function normalizedStoredConnection(
  input: NamedAiConnectionInput,
  id: string,
  credentialCiphertext?: string,
): StoredConnection {
  return storedConnectionSchema.parse({
    id,
    name: input.name,
    endpoint: validatedEndpoint(input),
    model: input.model,
    ...(credentialCiphertext ? { credentialCiphertext } : {}),
  });
}

function assertUniqueName(
  connections: readonly StoredConnection[],
  name: string,
  exceptId?: string,
): void {
  const normalized = name.toLocaleLowerCase();
  if (
    connections.some(
      (connection) =>
        connection.id !== exceptId && connection.name.toLocaleLowerCase() === normalized,
    )
  ) {
    throw new AiConnectionServiceError("AI connection names must be unique.");
  }
}

function connectionById(
  configuration: StoredConnectionConfiguration,
  connectionId: string,
): StoredConnection {
  const connection = configuration.connections.find((candidate) => candidate.id === connectionId);
  if (!connection) throw new AiConnectionServiceError("The AI connection no longer exists.");
  return connection;
}

function connectionForOperation(
  configuration: StoredConnectionConfiguration,
): StoredConnection | null {
  const connectionId = configuration.defaultConnectionId;
  return connectionId ? connectionById(configuration, connectionId) : null;
}

function providerConnectionForStored(connection: StoredConnection): AiProviderConnection {
  const status = statusFor(connection);
  return connection.credentialCiphertext
    ? { ...status, credential: decryptCredential(connection.credentialCiphertext) }
    : status;
}

export function listAiConnections(rootPath: string): NamedAiConnection[] {
  return listFor(readConfiguration(rootPath));
}

export function getDefaultAiConnection(rootPath: string): AiConnectionStatus | null {
  const configuration = readConfiguration(rootPath);
  if (configuration.defaultConnectionId === null) return null;
  const connection = configuration.connections.find(
    (candidate) => candidate.id === configuration.defaultConnectionId,
  );
  return connection ? statusFor(connection) : null;
}

export function requireDefaultAiConnection(rootPath: string): AiConnectionStatus {
  const configuration = readConfiguration(rootPath);
  if (configuration.connections.length === 0) {
    throw new AiConnectionServiceError(
      "Configure an AI connection before using AI assistance.",
    );
  }
  if (configuration.defaultConnectionId === null) {
    throw new AiConnectionServiceError(
      "Choose a default AI connection before using AI assistance.",
    );
  }
  return statusFor(connectionById(configuration, configuration.defaultConnectionId));
}

export function getAiConnectionForOperation(
  rootPath: string,
  rawOperation: AiOperation,
): AiConnectionStatus | null {
  aiOperationSchema.parse(rawOperation);
  const connection = connectionForOperation(readConfiguration(rootPath));
  return connection ? statusFor(connection) : null;
}

export function requireAiConnectionForOperation(
  rootPath: string,
  rawOperation: AiOperation,
): AiConnectionStatus {
  const operation = aiOperationSchema.parse(rawOperation);
  const configuration = readConfiguration(rootPath);
  if (configuration.connections.length === 0) {
    throw new AiConnectionServiceError(
      "Configure an AI connection before using AI assistance.",
    );
  }
  const connection = connectionForOperation(configuration);
  if (!connection) {
    throw new AiConnectionServiceError(
      `Choose a default AI connection before using ${aiOperationLabels[operation]}.`,
    );
  }
  return statusFor(connection);
}

export function requireAiProviderConnectionForOperation(
  rootPath: string,
  rawOperation: AiOperation,
): AiProviderConnection {
  const operation = aiOperationSchema.parse(rawOperation);
  const configuration = readConfiguration(rootPath);
  if (configuration.connections.length === 0) {
    throw new AiConnectionServiceError(
      "Configure an AI connection before using AI assistance.",
    );
  }
  const connection = connectionForOperation(configuration);
  if (!connection) {
    throw new AiConnectionServiceError(
      `Choose a default AI connection before using ${aiOperationLabels[operation]}.`,
    );
  }
  return providerConnectionForStored(connection);
}

export function saveNamedAiConnection(
  rootPath: string,
  rawInput: NamedAiConnectionInput,
): NamedAiConnection[] {
  const input = namedAiConnectionInputSchema.parse(rawInput);
  const configuration = readConfiguration(rootPath);
  assertUniqueName(configuration.connections, input.name, input.id);

  if (input.id) {
    const index = configuration.connections.findIndex((connection) => connection.id === input.id);
    if (index < 0) throw new AiConnectionServiceError("The AI connection no longer exists.");
    const previous = configuration.connections[index];
    if (!previous) throw new AiConnectionServiceError("The AI connection no longer exists.");
    const endpoint = validatedEndpoint(input);
    const credentialCiphertext =
      input.credential === undefined
        ? previous.credentialCiphertext
        : input.credential === null
          ? undefined
          : encryptCredential(input.credential);
    const connections = [...configuration.connections];
    connections[index] = normalizedStoredConnection(
      { ...input, endpoint },
      input.id,
      credentialCiphertext,
    );
    return listFor(
      writeConfiguration(rootPath, {
        ...configuration,
        connections,
      }),
    );
  }

  if (configuration.connections.length >= 16) {
    throw new AiConnectionServiceError("AAAAT supports at most 16 AI connections.");
  }
  const id = randomUUID();
  const credentialCiphertext =
    typeof input.credential === "string" ? encryptCredential(input.credential) : undefined;
  const connection = normalizedStoredConnection(input, id, credentialCiphertext);
  return listFor(
    writeConfiguration(rootPath, {
      ...configuration,
      connections: [...configuration.connections, connection],
      defaultConnectionId:
        configuration.connections.length === 0 ? id : configuration.defaultConnectionId,
    }),
  );
}

export function setDefaultAiConnection(
  rootPath: string,
  rawConnectionId: string,
): NamedAiConnection[] {
  const connectionId = aiConnectionIdSchema.parse(rawConnectionId);
  const configuration = readConfiguration(rootPath);
  connectionById(configuration, connectionId);
  return listFor(
    writeConfiguration(rootPath, { ...configuration, defaultConnectionId: connectionId }),
  );
}

export function removeAiConnection(
  rootPath: string,
  rawConnectionId: string,
): NamedAiConnection[] {
  const connectionId = aiConnectionIdSchema.parse(rawConnectionId);
  const configuration = readConfiguration(rootPath);
  connectionById(configuration, connectionId);
  return listFor(
    writeConfiguration(rootPath, {
      ...configuration,
      connections: configuration.connections.filter((connection) => connection.id !== connectionId),
      defaultConnectionId:
        configuration.defaultConnectionId === connectionId
          ? null
          : configuration.defaultConnectionId,
    }),
  );
}

export function saveDefaultAiConnection(
  rootPath: string,
  rawInput: AiConnectionInput,
): AiConnectionStatus {
  const input = aiConnectionInputSchema.parse(rawInput);
  const configuration = readConfiguration(rootPath);
  if (configuration.defaultConnectionId !== null) {
    saveNamedAiConnection(rootPath, {
      ...input,
      id: configuration.defaultConnectionId,
    });
    return requireDefaultAiConnection(rootPath);
  }
  if (configuration.connections.length > 0) {
    throw new AiConnectionServiceError(
      "Choose a default AI connection before updating the current connection.",
    );
  }
  saveNamedAiConnection(rootPath, input);
  return requireDefaultAiConnection(rootPath);
}

export function buildPortableAiSetup(rootPath: string): PortableAiSetup {
  const configuration = readConfiguration(rootPath);
  const defaultConnection =
    configuration.defaultConnectionId === null
      ? null
      : configuration.connections.find(
          (connection) => connection.id === configuration.defaultConnectionId,
        ) ?? null;
  return portableAiSetupSchema.parse({
    format: "aaaat-ai-setup",
    version: 1,
    connections: configuration.connections.map(statusFor),
    defaultConnectionName: defaultConnection?.name ?? null,
  });
}

export function replaceAiConnectionsFromPortableSetup(
  rootPath: string,
  rawSetup: PortableAiSetup,
): NamedAiConnection[] {
  const setup = portableAiSetupSchema.parse(rawSetup);
  const validatedConnections = setup.connections.map((connection) => ({
    input: namedAiConnectionInputSchema.parse(connection),
    endpoint: validatedEndpoint(connection),
  }));
  const connections = validatedConnections.map(({ input, endpoint }) =>
    normalizedStoredConnection({ ...input, endpoint }, randomUUID()),
  );
  const defaultConnection =
    setup.defaultConnectionName === null
      ? null
      : connections.find(
          (connection) =>
            connection.name.toLocaleLowerCase() === setup.defaultConnectionName?.toLocaleLowerCase(),
        ) ?? null;
  if (setup.defaultConnectionName !== null && !defaultConnection) {
    throw new AiConnectionServiceError("The portable default AI connection does not exist.");
  }
  return listFor(
    writeConfiguration(rootPath, {
      connections,
      defaultConnectionId: defaultConnection?.id ?? null,
    }),
  );
}
