export const vscodeMcpSetupRecipe = Object.freeze({
  id: "vscode.mcp" as const,
  host: "vscode" as const,
  transport: "stdio" as const,
  capabilityNames: Object.freeze(["candidature.create"] as const),
  toolNames: Object.freeze(["candidature_create"] as const),
  permissionScope: "Create one candidature in the selected existing AAAAT workspace." as const,
  privacyDisclosure:
    "The host may send only candidature-create fields to AAAAT. AAAAT returns only a creation acknowledgement and does not expose workspace paths, record IDs, stored source text, notes, database access, filesystem access, shell access, process access, or network access." as const,
  actions: Object.freeze([
    "validate-workspace",
    "validate-executable",
    "verify-mcp-tools",
    "write-vscode-mcp-config",
  ] as const),
});
