import { randomUUID } from "node:crypto";
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
  namedAiConnectionInputSchema,
  namedAiConnectionListSchema,
  type NamedAiConnection,
  type NamedAiConnectionInput,
} from "../shared/ai-connection-contracts";

const storedConnectionSchema = aiConnectionInputSchema
  .extend({ id: aiConnectionIdSchema })
  .strict();

type StoredConnection = z.infer<typeof storedConnectionSchema>;

const storedConnectionConfigurationSchema = z
  .object({
    version: z.literal(2),
    connections: z.array(storedConnectionSchema).max(16),
    defaultConnectionId: aiConnectionIdSchema.nullable(),
  })
  .strict()
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

function connectionPath(rootPath: string): string {
  return path.join(rootPath, "ai-connection.json");
}

function loopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function validatedEndpoint(input: AiConnectionInput): string {
  const endpoint = new URL(input.endpoint);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new AiConnectionServiceError("The local AI endpoint must be a plain provider base URL.");
  }
  if (endpoint.protocol !== "http:" && endpoint.protocol !== "https:") {
    throw new AiConnectionServiceError("The local AI endpoint must use HTTP or HTTPS.");
  }
  if (!loopbackHost(endpoint.hostname)) {
    throw new AiConnectionServiceError("Local AI connections must use a loopback endpoint.");
  }
  return endpoint.toString().replace(/\/$/, "");
}

function emptyConfiguration(): StoredConnectionConfiguration {
  return { version: 2, connections: [], defaultConnectionId: null };
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
      isDefault: connection.id === configuration.defaultConnectionId,
    })),
  );
}

function normalizedStoredConnection(
  input: NamedAiConnectionInput,
  id: string,
): StoredConnection {
  return storedConnectionSchema.parse({
    id,
    name: input.name,
    endpoint: validatedEndpoint(input),
    model: input.model,
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
      "Configure a local AI connection before using AI assistance.",
    );
  }
  if (configuration.defaultConnectionId === null) {
    throw new AiConnectionServiceError(
      "Choose a default local AI connection before using AI assistance.",
    );
  }
  const connection = configuration.connections.find(
    (candidate) => candidate.id === configuration.defaultConnectionId,
  );
  if (!connection) {
    throw new AiConnectionServiceError("The stored AI connection configuration is invalid.");
  }
  return statusFor(connection);
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
    const connections = [...configuration.connections];
    connections[index] = normalizedStoredConnection(input, input.id);
    return listFor(writeConfiguration(rootPath, { ...configuration, connections }));
  }

  if (configuration.connections.length >= 16) {
    throw new AiConnectionServiceError("AAAAT supports at most 16 local AI connections.");
  }
  const id = randomUUID();
  const connection = normalizedStoredConnection(input, id);
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
  if (!configuration.connections.some((connection) => connection.id === connectionId)) {
    throw new AiConnectionServiceError("The AI connection no longer exists.");
  }
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
  if (!configuration.connections.some((connection) => connection.id === connectionId)) {
    throw new AiConnectionServiceError("The AI connection no longer exists.");
  }
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
      "Choose a default local AI connection before updating the current connection.",
    );
  }
  saveNamedAiConnection(rootPath, input);
  return requireDefaultAiConnection(rootPath);
}
