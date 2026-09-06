export const vscodeMcpSetupRecipe = Object.freeze({
  id: "vscode.mcp" as const,
  host: "vscode" as const,
  transport: "stdio" as const,
  capabilityNames: Object.freeze(["candidature.create", "career_context.read"] as const),
  toolNames: Object.freeze(["candidature_create", "career_context_read"] as const),
  permissionScope:
    "Create one candidature from one retained Source and read the non-empty user-written Career Context in the selected existing AAAAT workspace." as const,
  privacyDisclosure:
    "The host configuration contains the AAAAT executable and selected workspace paths so the user-trusted host can launch the local stdio server. candidature_create accepts one retained Source and returns only a creation acknowledgement. career_context_read accepts no data arguments and returns only non-empty user-written Career Context values. Neither tool exposes durable local IDs, candidature history, unrelated retained Sources, profile or document browsing, database access, filesystem access, process access, or network access. A shell-capable host remains the user's trust choice outside this tool payload boundary." as const,
  actions: Object.freeze([
    "validate-workspace",
    "validate-executable",
    "verify-mcp-tools",
    "write-vscode-mcp-config",
  ] as const),
});
