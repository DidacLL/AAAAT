import { createReadStream, createWriteStream } from "node:fs";
import { randomUUID } from "node:crypto";

import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio, StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";

import {
  mcpCandidatureCreateInputSchema,
  mcpCandidatureFieldsListResultSchema,
  type McpCandidatureCreateInput,
} from "../shared/ai-contracts";
import type { CandidatureInput, CandidatureRuntimeValue } from "../shared/contracts";
import { listCandidatureFields } from "./candidature-field-service";
import { createCandidature } from "./candidature-service";
import { openWorkspace } from "./workspace";

const mcpFlag = "--mcp";
const workspaceFlag = "--workspace";
export const candidatureCreateToolName = "candidature_create";
export const candidatureFieldsListToolName = "candidature_fields_list";

function exactlyOne(values: readonly string[], value: string): boolean {
  return values.filter((candidate) => candidate === value).length === 1;
}

export function isMcpInvocation(argv: readonly string[]): boolean {
  return argv.includes(mcpFlag);
}

export function mcpWorkspaceFromInvocation(argv: readonly string[]): string {
  if (!exactlyOne(argv, mcpFlag) || !exactlyOne(argv, workspaceFlag)) {
    throw new Error("Invalid MCP invocation.");
  }

  const workspacePath = argv[argv.indexOf(workspaceFlag) + 1];
  if (!workspacePath || workspacePath.startsWith("--")) {
    throw new Error("Invalid MCP invocation.");
  }
  return workspacePath;
}

function createServerForWorkspace(rootPath: string): McpServer {
  const server = new McpServer({ name: "aaaat", version: "2.0.0-alpha.0" });
  const operationScopes = new Map<string, { readonly createdAt: number; readonly fields: ReadonlyMap<string, { readonly fieldId: string; readonly choices: ReadonlyMap<string, string> }> }>();
  const maxOperationScopes = 8;

  const purgeExpiredScopes = () => {
    const expiresBefore = Date.now() - 5 * 60 * 1000;
    for (const [reference, scope] of operationScopes) {
      if (scope.createdAt < expiresBefore) operationScopes.delete(reference);
    }
  };

  server.registerTool(
    candidatureFieldsListToolName,
    {
      description: "List enabled candidature information fields for bounded external input. Returned field references are valid only for the matching candidature_create call, for up to five minutes; AAAAT keeps at most eight pending field lists.",
      inputSchema: z.object({}).strict(),
    },
    async () => {
      purgeExpiredScopes();
      const operationRef = `aaaat_mcp_${randomUUID()}`;
      const scopeFields = new Map<string, { readonly fieldId: string; readonly choices: ReadonlyMap<string, string> }>();
      const fields = listCandidatureFields(rootPath)
        .filter((field) => field.definition.enabled)
        .map((field, index) => {
          const fieldRef = `${operationRef}_${index + 1}`;
          const choices = new Map<string, string>();
          const listedChoices = field.definition.choices.map((choice, choiceIndex) => {
            const choiceRef = `${fieldRef}_${choiceIndex + 1}`;
            choices.set(choiceRef, choice.id);
            return { choiceRef, label: choice.label };
          });
          scopeFields.set(fieldRef, { fieldId: field.definition.id, choices });
          return {
          fieldRef,
          label: field.definition.label,
          description: field.definition.description,
          valueType: field.definition.valueType,
          cardinality: field.definition.cardinality,
          choices: listedChoices,
          };
        });
      operationScopes.set(operationRef, { createdAt: Date.now(), fields: scopeFields });
      while (operationScopes.size > maxOperationScopes) {
        const oldest = operationScopes.keys().next().value;
        if (!oldest) break;
        operationScopes.delete(oldest);
      }
      const result = mcpCandidatureFieldsListResultSchema.parse({ operationRef, fields });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result),
          },
        ],
      };
    },
  );

  server.registerTool(
    candidatureCreateToolName,
    {
      description: "Create one new candidature in the configured AAAAT workspace. A source-only capture needs no field list; values require fresh field references from candidature_fields_list.",
      inputSchema: mcpCandidatureCreateInputSchema,
    },
    async (input) => {
      purgeExpiredScopes();
      const parsed = mcpCandidatureCreateInputSchema.parse(input);
      const scope = parsed.operationRef ? operationScopes.get(parsed.operationRef) : undefined;
      if (parsed.values.length > 0 && !scope) {
        throw new Error("The field references are no longer valid. List fields again.");
      }
      if (parsed.operationRef) operationScopes.delete(parsed.operationRef);
      createCandidature(rootPath, localCandidatureInput(parsed, scope?.fields ?? new Map()));
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              ok: true,
              capability: "candidature.create",
              created: true,
            }),
          },
        ],
      };
    },
  );

  return server;
}

function localChoiceValue(
  value: CandidatureRuntimeValue,
  choices: ReadonlyMap<string, string>,
): CandidatureRuntimeValue {
  if (choices.size === 0) return value;
  const resolve = (candidate: string | number | boolean): string | number | boolean => {
    if (typeof candidate !== "string" || !choices.has(candidate)) {
      throw new Error("A choice reference is not valid for the selected field.");
    }
    return choices.get(candidate) ?? candidate;
  };
  return Array.isArray(value) ? value.map(resolve) : resolve(value);
}

function localCandidatureInput(
  input: McpCandidatureCreateInput,
  fields: ReadonlyMap<string, { readonly fieldId: string; readonly choices: ReadonlyMap<string, string> }>,
): CandidatureInput {
  return {
    ...(input.source ? { source: input.source } : {}),
    values: input.values.map((value) => {
      const field = fields.get(value.fieldRef);
      if (!field) throw new Error("A field reference is not valid for this operation.");
      return { fieldId: field.fieldId, value: localChoiceValue(value.value, field.choices) };
    }),
  };
}

export function createAaaatMcpServer(workspacePath: string): McpServer {
  return createServerForWorkspace(openWorkspace(workspacePath).rootPath);
}

export function runMcpProcess(argv: readonly string[]): void {
  const workspace = openWorkspace(mcpWorkspaceFromInvocation(argv));
  const input = createReadStream("", { fd: 0, autoClose: false });
  const output = createWriteStream("", { fd: 1, autoClose: false });
  const transport = new StdioServerTransport(input, output);
  serveStdio(() => createServerForWorkspace(workspace.rootPath), { transport });
  console.error("AAAAT MCP server ready on stdio");
}
