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
  aiConnectionOperationInputSchema,
  aiOperationLabels,
  aiOperationSchema,
  aiOperations,
  namedAiConnectionInputSchema,
  namedAiConnectionListSchema,
  portableAiSetupSchema,
  type AiConnectionOperationInput,
  type AiOperation,
  type NamedAiConnection,
  type NamedAiConnectionInput,
  type PortableAiSetup,
} from "../shared/ai-connection-contracts";
import { createOpenAiCompatibleProvider, type ModelProvider } from "./ai-provider";
import { validateAiOperation } from "./ai-operation-validation";

const storedConnectionSchema = aiConnectionInputSchema
  .extend({
    id: aiConnectionIdSchema,
    validatedOperations: z.array(aiOperationSchema).max(aiOperations.length),
  })
  .strict();

type StoredConnection = z.infer<typeof storedConnectionSchema>;

const operationDefaultsSchema = z
  .object({
    fit_assessment: aiConnectionIdSchema.optional(),
    job_extraction: aiConnectionIdSchema.optional(),
    historical_field_discovery: aiConnectionIdSchema.optional(),
    variant_recommendation: aiConnectionIdSchema.optional(),
    cv_tailoring: aiConnectionIdSchema.optional(),
    cover_letter_draft: aiConnectionIdSchema.optional(),
    candidature_comparison: aiConnectionIdSchema.optional(),
  })
  .strict();

type OperationDefaults = z.infer<typeof operationDefaultsSchema>;

const storedConnectionConfigurationSchema = z
  .object({
    version: z.literal(3),
    connections: z.array(storedConnectionSchema).max(16),
    defaultConnectionId: aiConnectionIdSchema.nullable(),
    operationDefaults: operationDefaultsSchema,
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
    for (const operation of aiOperations) {
      const connectionId = configuration.operationDefaults[operation];
      if (!connectionId) continue;
      const connection = configuration.connections.find((candidate) => candidate.id === connectionId);
      if (!connection || !connection.validatedOperations.includes(operation)) {
        context.addIssue({
          code: "custom",
          message: `The default connection for ${aiOperationLabels[operation]} must be validated for that operation.`,
        });
      }
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
  return { version: 3, connections: [], defaultConnectionId: null, operationDefaults: {} };
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
      validatedOperations: aiOperations.filter((operation) =>
        connection.validatedOperations.includes(operation),
      ),
      defaultForOperations: aiOperations.filter(
        (operation) => configuration.operationDefaults[operation] === connection.id,
      ),
    })),
  );
}

function normalizedStoredConnection(
  input: NamedAiConnectionInput,
  id: string,
  validatedOperations: readonly AiOperation[] = [],
): StoredConnection {
  return storedConnectionSchema.parse({
    id,
    name: input.name,
    endpoint: validatedEndpoint(input),
    model: input.model,
    validatedOperations,
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

function clearOperationDefaultsForConnection(
  defaults: OperationDefaults,
  connectionId: string,
): OperationDefaults {
  const next: OperationDefaults = { ...defaults };
  for (const operation of aiOperations) {
    if (next[operation] === connectionId) delete next[operation];
  }
  return operationDefaultsSchema.parse(next);
}

function connectionById(
  configuration: StoredConnectionConfiguration,
  connectionId: string,
): StoredConnection {
  const connection = configuration.connections.find((candidate) => candidate.id === connectionId);
  if (!connection) throw new AiConnectionServiceError("The AI connection no longer exists.");
  return connection;
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
  return statusFor(connectionById(configuration, configuration.defaultConnectionId));
}

export function getAiConnectionForOperation(
  rootPath: string,
  rawOperation: AiOperation,
): AiConnectionStatus | null {
  const operation = aiOperationSchema.parse(rawOperation);
  const configuration = readConfiguration(rootPath);
  const operationDefaultId = configuration.operationDefaults[operation];
  if (operationDefaultId) return statusFor(connectionById(configuration, operationDefaultId));
  if (configuration.defaultConnectionId === null) return null;
  const fallback = connectionById(configuration, configuration.defaultConnectionId);
  return fallback.validatedOperations.includes(operation) ? statusFor(fallback) : null;
}

export function requireAiConnectionForOperation(
  rootPath: string,
  rawOperation: AiOperation,
): AiConnectionStatus {
  const operation = aiOperationSchema.parse(rawOperation);
  const configuration = readConfiguration(rootPath);
  if (configuration.connections.length === 0) {
    throw new AiConnectionServiceError(
      "Configure a local AI connection before using AI assistance.",
    );
  }
  const connection = getAiConnectionForOperation(rootPath, operation);
  if (!connection) {
    throw new AiConnectionServiceError(
      `Validate and choose a connection for ${aiOperationLabels[operation]} before using this AI operation.`,
    );
  }
  return connection;
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
    const capabilityBoundaryChanged = endpoint !== previous.endpoint || input.model !== previous.model;
    const connections = [...configuration.connections];
    connections[index] = normalizedStoredConnection(
      { ...input, endpoint },
      input.id,
      capabilityBoundaryChanged ? [] : previous.validatedOperations,
    );
    return listFor(
      writeConfiguration(rootPath, {
        ...configuration,
        connections,
        operationDefaults: capabilityBoundaryChanged
          ? clearOperationDefaultsForConnection(configuration.operationDefaults, input.id)
          : configuration.operationDefaults,
      }),
    );
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
  connectionById(configuration, connectionId);
  return listFor(
    writeConfiguration(rootPath, { ...configuration, defaultConnectionId: connectionId }),
  );
}

export async function validateAiConnectionOperation(
  rootPath: string,
  rawInput: AiConnectionOperationInput,
  provider: ModelProvider = createOpenAiCompatibleProvider(),
): Promise<NamedAiConnection[]> {
  const input = aiConnectionOperationInputSchema.parse(rawInput);
  const configuration = readConfiguration(rootPath);
  const connection = connectionById(configuration, input.connectionId);
  await validateAiOperation(statusFor(connection), input.operation, provider);

  const currentConfiguration = readConfiguration(rootPath);
  const currentConnection = connectionById(currentConfiguration, input.connectionId);
  if (
    currentConnection.endpoint !== connection.endpoint ||
    currentConnection.model !== connection.model
  ) {
    throw new AiConnectionServiceError(
      "The AI connection changed during capability validation. Validate the operation again.",
    );
  }

  const connections = currentConfiguration.connections.map((candidate) =>
    candidate.id === currentConnection.id
      ? storedConnectionSchema.parse({
          ...candidate,
          validatedOperations: aiOperations.filter(
            (operation) =>
              operation === input.operation || candidate.validatedOperations.includes(operation),
          ),
        })
      : candidate,
  );
  const operationDefaults = currentConfiguration.operationDefaults[input.operation]
    ? currentConfiguration.operationDefaults
    : operationDefaultsSchema.parse({
        ...currentConfiguration.operationDefaults,
        [input.operation]: input.connectionId,
      });
  return listFor(
    writeConfiguration(rootPath, {
      ...currentConfiguration,
      connections,
      operationDefaults,
    }),
  );
}

export function setAiOperationDefault(
  rootPath: string,
  rawInput: AiConnectionOperationInput,
): NamedAiConnection[] {
  const input = aiConnectionOperationInputSchema.parse(rawInput);
  const configuration = readConfiguration(rootPath);
  const connection = connectionById(configuration, input.connectionId);
  if (!connection.validatedOperations.includes(input.operation)) {
    throw new AiConnectionServiceError(
      `${connection.name} is not validated for ${aiOperationLabels[input.operation]}.`,
    );
  }
  return listFor(
    writeConfiguration(rootPath, {
      ...configuration,
      operationDefaults: operationDefaultsSchema.parse({
        ...configuration.operationDefaults,
        [input.operation]: input.connectionId,
      }),
    }),
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
      operationDefaults: clearOperationDefaultsForConnection(
        configuration.operationDefaults,
        connectionId,
      ),
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
      version: 3,
      connections,
      defaultConnectionId: defaultConnection?.id ?? null,
      operationDefaults: {},
    }),
  );
}
