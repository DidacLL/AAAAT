import type { AiOperation } from "../shared/ai-connection-contracts";
import { aiOperationLabels, aiOperations } from "../shared/ai-connection-contracts";
import type { AiPromptDisclosure } from "../shared/ai-prompt-contracts";
import { AI_DEFAULT_INSTRUCTIONS, createOpenAiCompatibleProvider, type ModelProvider } from "./ai-provider";
import { withWorkspaceDatabase } from "./workspace";

const contextSummary: Readonly<Record<AiOperation, string>> = {
  opportunity_review: "AI-visible candidature information plus career context allowed for this review. Retained Sources are not added implicitly.",
  job_extraction: "Only the supplied Source text plus the requested eligible field definitions. Single-field requests contain only that target; bulk requests contain only eligible missing targets.",
  historical_field_discovery: "Only the retained Sources selected by the user plus the one target field.",
  cv_tailoring: "Bounded AI-visible application information plus AI-visible professional evidence from the selected Working CV.",
  cover_letter_draft: "Bounded AI-visible application information plus AI-visible reusable professional evidence for the selected cover letter.",
};

const responseExpectation: Readonly<Record<AiOperation, string>> = {
  opportunity_review: "JSON: summary, relevant evidence, uncertainties and questions. Read-only review; no workflow decisions.",
  job_extraction: "JSON proposals keyed by task-local field references, with optional new fields only when existing information cannot fit.",
  historical_field_discovery: "JSON proposal for the one requested field; no other candidature mutation authority.",
  cv_tailoring: "JSON recommendations using only supplied task-local evidence references.",
  cover_letter_draft: "JSON recipient, subject, body paragraphs and closing; no invented career facts.",
};

function key(operation: AiOperation): string { return `ai.prompt.instruction.${operation}`; }

export function aiPromptInstructions(rootPath: string): Partial<Record<AiOperation, string>> {
  return withWorkspaceDatabase(rootPath, (database) => {
    const instructions: Partial<Record<AiOperation, string>> = {};
    for (const operation of aiOperations) {
      const row = database.prepare("SELECT value FROM workspace_metadata WHERE key = ?").get(key(operation)) as { value: string } | undefined;
      if (row) instructions[operation] = row.value;
    }
    return instructions;
  });
}

export function listAiPromptDisclosures(rootPath: string): AiPromptDisclosure[] {
  const instructions = aiPromptInstructions(rootPath);
  return aiOperations.map((operation) => {
    const custom = Object.prototype.hasOwnProperty.call(instructions, operation);
    return {
      operation,
      label: aiOperationLabels[operation],
      defaultInstruction: AI_DEFAULT_INSTRUCTIONS[operation],
      instruction: custom ? instructions[operation] ?? "" : AI_DEFAULT_INSTRUCTIONS[operation],
      isDefault: !custom,
      contextSummary: contextSummary[operation],
      responseExpectation: responseExpectation[operation],
    };
  });
}

export function saveAiPromptInstruction(rootPath: string, operation: AiOperation, instruction: string): AiPromptDisclosure[] {
  withWorkspaceDatabase(rootPath, (database) => {
    database.prepare("INSERT OR REPLACE INTO workspace_metadata(key, value) VALUES (?, ?)").run(key(operation), instruction);
  });
  return listAiPromptDisclosures(rootPath);
}

export function resetAiPromptInstruction(rootPath: string, operation: AiOperation): AiPromptDisclosure[] {
  withWorkspaceDatabase(rootPath, (database) => {
    database.prepare("DELETE FROM workspace_metadata WHERE key = ?").run(key(operation));
  });
  return listAiPromptDisclosures(rootPath);
}

export function createWorkspaceAiProvider(
  rootPath: string,
  fetchImpl: typeof fetch = fetch,
): ModelProvider {
  return createOpenAiCompatibleProvider(fetchImpl, undefined, aiPromptInstructions(rootPath));
}
