export const vscodeMcpSetupRecipe = Object.freeze({
  id: "vscode.mcp" as const,
  host: "vscode" as const,
  transport: "stdio" as const,
  capabilityNames: Object.freeze(["candidature.create"] as const),
  toolNames: Object.freeze(["candidature_create"] as const),
  permissionScope:
    "Create one candidature from one retained Source in the selected existing AAAAT workspace." as const,
  privacyDisclosure:
    "The host configuration contains the AAAAT executable and selected workspace paths so the user-trusted host can launch the local stdio server. The candidature_create tool accepts one retained Source and returns only a creation acknowledgement, never record IDs, stored candidature values, other retained Sources, database access, filesystem access, process access, or network access. A shell-capable host remains the user's trust choice outside this tool payload boundary." as const,
  actions: Object.freeze([
    "validate-workspace",
    "validate-executable",
    "verify-mcp-tools",
    "write-vscode-mcp-config",
  ] as const),
});
