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
    "The host configuration contains the AAAAT executable and selected workspace paths so the user-trusted host can launch the local stdio server. Tool payloads may request bounded field metadata and send one candidature-create input; AAAAT returns only scoped metadata or a creation acknowledgement, never record IDs, stored candidature values, retained Source text, database access, filesystem access, process access, or network access. A shell-capable host remains the user's trust choice outside this tool payload boundary." as const,
  actions: Object.freeze([
    "validate-workspace",
    "validate-executable",
    "verify-mcp-tools",
    "write-vscode-mcp-config",
  ] as const),
});
