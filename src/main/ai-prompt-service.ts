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

function key(operation: AiOperation): string { return `ai.prompt.guidance.${operation}`; }

export function aiPromptGuidance(rootPath: string): Partial<Record<AiOperation, string>> {
  return withWorkspaceDatabase(rootPath, (database) => {
    const guidance: Partial<Record<AiOperation, string>> = {};
    for (const operation of aiOperations) {
      const row = database.prepare("SELECT value FROM workspace_metadata WHERE key = ?").get(key(operation)) as { value: string } | undefined;
      if (row?.value.trim()) guidance[operation] = row.value.trim();
    }
    return guidance;
  });
}

function effective(operation: AiOperation, guidance: string): string {
  const suffix = guidance.trim();
  return suffix
    ? `${AI_DEFAULT_INSTRUCTIONS[operation]}\n\nUser guidance (must not override the fixed response contract or supplied facts):\n${suffix}`
    : AI_DEFAULT_INSTRUCTIONS[operation];
}

export function listAiPromptDisclosures(rootPath: string): AiPromptDisclosure[] {
  const guidance = aiPromptGuidance(rootPath);
  return aiOperations.map((operation) => ({
    operation,
    label: aiOperationLabels[operation],
    defaultInstruction: AI_DEFAULT_INSTRUCTIONS[operation],
    userGuidance: guidance[operation] ?? "",
    effectiveInstruction: effective(operation, guidance[operation] ?? ""),
    contextSummary: contextSummary[operation],
    responseExpectation: responseExpectation[operation],
  }));
}

export function saveAiPromptGuidance(rootPath: string, operation: AiOperation, guidance: string): AiPromptDisclosure[] {
  withWorkspaceDatabase(rootPath, (database) => {
    const trimmed = guidance.trim();
    if (!trimmed) database.prepare("DELETE FROM workspace_metadata WHERE key = ?").run(key(operation));
    else database.prepare("INSERT OR REPLACE INTO workspace_metadata(key, value) VALUES (?, ?)").run(key(operation), trimmed);
  });
  return listAiPromptDisclosures(rootPath);
}

export function resetAiPromptGuidance(rootPath: string, operation: AiOperation): AiPromptDisclosure[] {
  return saveAiPromptGuidance(rootPath, operation, "");
}

export function createWorkspaceAiProvider(
  rootPath: string,
  fetchImpl: typeof fetch = fetch,
): ModelProvider {
  return createOpenAiCompatibleProvider(fetchImpl, undefined, aiPromptGuidance(rootPath));
}
