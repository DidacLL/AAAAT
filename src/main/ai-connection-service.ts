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

function normalizedInput(input: AiConnectionInput): AiConnectionInput {
  const validated = aiConnectionInputSchema.parse(input);
  return aiConnectionInputSchema.parse({ ...validated, endpoint: validatedEndpoint(validated) });
}

function emptyConfiguration(): StoredConnectionConfiguration {
  return storedConnectionConfigurationSchema.parse({
    version: 3,
    connections: [],
    defaultConnectionId: null,
    operationDefaults: {},
  });
}

function readConfiguration(rootPath: string): StoredConnectionConfiguration {
  const configPath = connectionPath(rootPath);
  if (!existsSync(configPath)) return emptyConfiguration();
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(configPath, "utf8")) as unknown;
  } catch {
    throw new AiConnectionServiceError("AAAAT could not read the local AI connection settings.");
  }
  const result = storedConnectionConfigurationSchema.safeParse(parsed);
  if (!result.success) {
    throw new AiConnectionServiceError("The local AI connection settings use an unsupported format.");
  }
  return result.data;
}

function writeConfiguration(rootPath: string, configuration: StoredConnectionConfiguration): void {
  writeFileSync(
    connectionPath(rootPath),
    `${JSON.stringify(storedConnectionConfigurationSchema.parse(configuration), null, 2)}\n`,
    "utf8",
  );
}

function publicConnections(configuration: StoredConnectionConfiguration): NamedAiConnection[] {
  return namedAiConnectionListSchema.parse(
    configuration.connections.map((connection) => ({
      id: connection.id,
      name: connection.name,
      endpoint: connection.endpoint,
      model: connection.model,
      isDefault: connection.id === configuration.defaultConnectionId,
      validatedOperations: connection.validatedOperations,
      defaultForOperations: aiOperations.filter(
        (operation) => configuration.operationDefaults[operation] === connection.id,
      ),
    })),
  );
}

function sameProvider(left: AiConnectionInput, right: AiConnectionInput): boolean {
  return left.endpoint === right.endpoint && left.model === right.model;
}

function assertUniqueName(
  configuration: StoredConnectionConfiguration,
  name: string,
  exceptId?: string,
): void {
  const normalized = name.toLocaleLowerCase();
  if (
    configuration.connections.some(
      (connection) =>
        connection.id !== exceptId && connection.name.toLocaleLowerCase() === normalized,
    )
  ) {
    throw new AiConnectionServiceError("AI connection names must be unique.");
  }
}

function clearDefaultsFor(
  defaults: OperationDefaults,
  connectionId: string,
): OperationDefaults {
  return Object.fromEntries(
    Object.entries(defaults).filter(([, value]) => value !== connectionId),
  ) as OperationDefaults;
}

export function listAiConnections(rootPath: string): NamedAiConnection[] {
  return publicConnections(readConfiguration(rootPath));
}

export function saveNamedAiConnection(
  rootPath: string,
  rawInput: NamedAiConnectionInput,
): NamedAiConnection[] {
  const input = namedAiConnectionInputSchema.parse(rawInput);
  const normalized = normalizedInput(input);
  const configuration = readConfiguration(rootPath);
  assertUniqueName(configuration, normalized.name, input.id);

  let connections: StoredConnection[];
  let operationDefaults = configuration.operationDefaults;
  let savedId: string;
  if (input.id) {
    const existing = configuration.connections.find((connection) => connection.id === input.id);
    if (!existing) throw new AiConnectionServiceError("The AI connection no longer exists.");
    const providerChanged = !sameProvider(existing, normalized);
    savedId = existing.id;
    connections = configuration.connections.map((connection) =>
      connection.id === existing.id
        ? storedConnectionSchema.parse({
            ...normalized,
            id: existing.id,
            validatedOperations: providerChanged ? [] : existing.validatedOperations,
          })
        : connection,
    );
    if (providerChanged) operationDefaults = clearDefaultsFor(operationDefaults, existing.id);
  } else {
    if (configuration.connections.length >= 16) {
      throw new AiConnectionServiceError("AAAAT supports at most 16 configured AI connections.");
    }
    savedId = randomUUID();
    connections = [
      ...configuration.connections,
      storedConnectionSchema.parse({
        ...normalized,
        id: savedId,
        validatedOperations: [],
      }),
    ];
  }

  const defaultConnectionId = configuration.defaultConnectionId ?? savedId;
  const next = storedConnectionConfigurationSchema.parse({
    version: 3,
    connections,
    defaultConnectionId,
    operationDefaults,
  });
  writeConfiguration(rootPath, next);
  return publicConnections(next);
}

export function setDefaultAiConnection(rootPath: string, connectionId: string): NamedAiConnection[] {
  const validatedId = aiConnectionIdSchema.parse(connectionId);
  const configuration = readConfiguration(rootPath);
  if (!configuration.connections.some((connection) => connection.id === validatedId)) {
    throw new AiConnectionServiceError("The AI connection no longer exists.");
  }
  const next = storedConnectionConfigurationSchema.parse({
    ...configuration,
    defaultConnectionId: validatedId,
  });
  writeConfiguration(rootPath, next);
  return publicConnections(next);
}

export function removeAiConnection(rootPath: string, connectionId: string): NamedAiConnection[] {
  const validatedId = aiConnectionIdSchema.parse(connectionId);
  const configuration = readConfiguration(rootPath);
  if (!configuration.connections.some((connection) => connection.id === validatedId)) {
    throw new AiConnectionServiceError("The AI connection no longer exists.");
  }
  const next = storedConnectionConfigurationSchema.parse({
    version: 3,
    connections: configuration.connections.filter((connection) => connection.id !== validatedId),
    defaultConnectionId:
      configuration.defaultConnectionId === validatedId ? null : configuration.defaultConnectionId,
    operationDefaults: clearDefaultsFor(configuration.operationDefaults, validatedId),
  });
  writeConfiguration(rootPath, next);
  return publicConnections(next);
}

export function getDefaultAiConnection(rootPath: string): AiConnectionStatus | null {
  const configuration = readConfiguration(rootPath);
  const connection = configuration.connections.find(
    (candidate) => candidate.id === configuration.defaultConnectionId,
  );
  return connection ? aiConnectionStatusSchema.parse(connection) : null;
}

export function requireDefaultAiConnection(rootPath: string): AiConnectionStatus {
  const connection = getDefaultAiConnection(rootPath);
  if (!connection) {
    throw new AiConnectionServiceError(
      "Configure and choose a default local AI connection in Settings first.",
    );
  }
  return connection;
}

export function getAiConnectionForOperation(
  rootPath: string,
  operation: AiOperation,
): AiConnectionStatus | null {
  const validatedOperation = aiOperationSchema.parse(operation);
  const configuration = readConfiguration(rootPath);
  const explicitId = configuration.operationDefaults[validatedOperation];
  const preferredId = explicitId ?? configuration.defaultConnectionId;
  if (!preferredId) return null;
  const connection = configuration.connections.find((candidate) => candidate.id === preferredId);
  if (!connection || !connection.validatedOperations.includes(validatedOperation)) return null;
  return aiConnectionStatusSchema.parse(connection);
}

export function requireAiConnectionForOperation(
  rootPath: string,
  operation: AiOperation,
): AiConnectionStatus {
  const validatedOperation = aiOperationSchema.parse(operation);
  const connection = getAiConnectionForOperation(rootPath, validatedOperation);
  if (!connection) {
    throw new AiConnectionServiceError(
      `Validate and choose a local AI connection for ${aiOperationLabels[validatedOperation]} in Settings first.`,
    );
  }
  return connection;
}

export async function validateAiConnectionOperation(
  rootPath: string,
  rawInput: AiConnectionOperationInput,
  provider?: ModelProvider,
): Promise<NamedAiConnection[]> {
  const input = aiConnectionOperationInputSchema.parse(rawInput);
  const before = readConfiguration(rootPath);
  const connection = before.connections.find((candidate) => candidate.id === input.connectionId);
  if (!connection) throw new AiConnectionServiceError("The AI connection no longer exists.");
  const operationProvider = provider ?? createOpenAiCompatibleProvider();
  await validateAiOperation(aiConnectionStatusSchema.parse(connection), input.operation, operationProvider);

  const current = readConfiguration(rootPath);
  const currentConnection = current.connections.find((candidate) => candidate.id === input.connectionId);
  if (!currentConnection) {
    throw new AiConnectionServiceError(
      "The AI connection changed while capability validation was running. Validate again.",
    );
  }
  if (!sameProvider(connection, currentConnection)) {
    throw new AiConnectionServiceError(
      "The AI connection changed while capability validation was running. Validate again.",
    );
  }

  const connections = current.connections.map((candidate) =>
    candidate.id === currentConnection.id
      ? storedConnectionSchema.parse({
          ...candidate,
          validatedOperations: candidate.validatedOperations.includes(input.operation)
            ? candidate.validatedOperations
            : [...candidate.validatedOperations, input.operation],
        })
      : candidate,
  );
  const operationDefaults: OperationDefaults = current.operationDefaults[input.operation]
    ? current.operationDefaults
    : { ...current.operationDefaults, [input.operation]: currentConnection.id };
  const next = storedConnectionConfigurationSchema.parse({
    ...current,
    connections,
    operationDefaults,
  });
  writeConfiguration(rootPath, next);
  return publicConnections(next);
}

export function setAiOperationDefault(
  rootPath: string,
  rawInput: AiConnectionOperationInput,
): NamedAiConnection[] {
  const input = aiConnectionOperationInputSchema.parse(rawInput);
  const configuration = readConfiguration(rootPath);
  const connection = configuration.connections.find((candidate) => candidate.id === input.connectionId);
  if (!connection) throw new AiConnectionServiceError("The AI connection no longer exists.");
  if (!connection.validatedOperations.includes(input.operation)) {
    throw new AiConnectionServiceError(
      `Validate ${aiOperationLabels[input.operation]} for this connection before choosing it as the operation default.`,
    );
  }
  const next = storedConnectionConfigurationSchema.parse({
    ...configuration,
    operationDefaults: {
      ...configuration.operationDefaults,
      [input.operation]: connection.id,
    },
  });
  writeConfiguration(rootPath, next);
  return publicConnections(next);
}

export function exportPortableAiSetup(rootPath: string): PortableAiSetup {
  const configuration = readConfiguration(rootPath);
  const defaultConnection = configuration.connections.find(
    (connection) => connection.id === configuration.defaultConnectionId,
  );
  return portableAiSetupSchema.parse({
    format: "aaaat-ai-setup",
    version: 1,
    connections: configuration.connections.map((connection) => ({
      name: connection.name,
      endpoint: connection.endpoint,
      model: connection.model,
    })),
    defaultConnectionName: defaultConnection?.name ?? null,
  });
}

export function replaceAiConnectionsFromPortableSetup(
  rootPath: string,
  rawSetup: PortableAiSetup,
): NamedAiConnection[] {
  const setup = portableAiSetupSchema.parse(rawSetup);
  const normalizedConnections = setup.connections.map(normalizedInput);
  const names = normalizedConnections.map((connection) => connection.name.toLocaleLowerCase());
  if (new Set(names).size !== names.length) {
    throw new AiConnectionServiceError("Portable AI connection names must be unique.");
  }

  const connections = normalizedConnections.map((connection) =>
    storedConnectionSchema.parse({
      ...connection,
      id: randomUUID(),
      validatedOperations: [],
    }),
  );
  let defaultConnectionId: string | null = null;
  if (setup.defaultConnectionName !== null) {
    const normalizedDefault = setup.defaultConnectionName.toLocaleLowerCase();
    const defaultConnection = connections.find(
      (connection) => connection.name.toLocaleLowerCase() === normalizedDefault,
    );
    if (!defaultConnection) {
      throw new AiConnectionServiceError("The portable default AI connection must exist.");
    }
    defaultConnectionId = defaultConnection.id;
  }

  const replacement = storedConnectionConfigurationSchema.parse({
    version: 3,
    connections,
    defaultConnectionId,
    operationDefaults: {},
  });
  writeConfiguration(rootPath, replacement);
  return publicConnections(replacement);
}

/**
 * Internal compatibility helper for direct service callers. Renderer Settings
 * uses the named plural connection API only.
 */
export function saveDefaultAiConnection(
  rootPath: string,
  rawInput: AiConnectionInput,
): AiConnectionStatus {
  const input = normalizedInput(rawInput);
  const configuration = readConfiguration(rootPath);
  const existingDefault = configuration.connections.find(
    (connection) => connection.id === configuration.defaultConnectionId,
  );
  const existing = existingDefault ?? configuration.connections[0];
  const connections = existing
    ? configuration.connections.map((connection) =>
        connection.id === existing.id
          ? storedConnectionSchema.parse({
              ...input,
              id: connection.id,
              validatedOperations: sameProvider(connection, input)
                ? connection.validatedOperations
                : [],
            })
          : connection,
      )
    : [
        storedConnectionSchema.parse({
          ...input,
          id: randomUUID(),
          validatedOperations: [],
        }),
      ];
  const selected = existing ? existing.id : connections[0]?.id;
  if (!selected) throw new AiConnectionServiceError("AAAAT could not save the AI connection.");
  const next = storedConnectionConfigurationSchema.parse({
    version: 3,
    connections,
    defaultConnectionId: selected,
    operationDefaults:
      existing && !sameProvider(existing, input)
        ? clearDefaultsFor(configuration.operationDefaults, existing.id)
        : configuration.operationDefaults,
  });
  writeConfiguration(rootPath, next);
  const saved = next.connections.find((connection) => connection.id === selected);
  if (!saved) throw new AiConnectionServiceError("AAAAT could not save the AI connection.");
  return aiConnectionStatusSchema.parse(saved);
}
