export const vscodeMcpSetupRecipe = Object.freeze({
  id: "vscode.mcp" as const,
  host: "vscode" as const,
  transport: "stdio" as const,
  capabilityNames: Object.freeze([
    "candidature.fields.list",
    "candidature.create",
  ] as const),
  toolNames: Object.freeze([
    "candidature_fields_list",
    "candidature_create",
  ] as const),
  permissionScope:
    "List enabled candidature information field definitions and create one candidature in the selected existing AAAAT workspace." as const,
  privacyDisclosure:
    "The host may request enabled candidature field definitions and send candidature-create values to AAAAT. AAAAT returns only bounded field metadata or a creation acknowledgement and does not expose workspace paths, record IDs, stored candidature values, retained Source text, database access, filesystem access, shell access, process access, or network access." as const,
  actions: Object.freeze([
    "validate-workspace",
    "validate-executable",
    "verify-mcp-tools",
    "write-vscode-mcp-config",
  ] as const),
});
