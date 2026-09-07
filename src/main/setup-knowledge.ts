export const vscodeMcpSetupRecipe = Object.freeze({
  id: "vscode.mcp" as const,
  host: "vscode" as const,
  transport: "stdio" as const,
  capabilityNames: Object.freeze([
    "candidature.create",
    "career_context.read",
    "cv_descriptions.read",
  ] as const),
  toolNames: Object.freeze([
    "candidature_create",
    "career_context_read",
    "cv_descriptions_read",
  ] as const),
  permissionScope:
    "Create one candidature from one retained Source, read the non-empty user-written Career Context, and read user-authored AI-visible CV tags and notes in the selected existing AAAAT workspace." as const,
  privacyDisclosure:
    "The host configuration contains the AAAAT executable and selected workspace paths so the user-trusted host can launch the local stdio server. candidature_create accepts one retained Source and returns only a creation acknowledgement. career_context_read accepts no data arguments and returns only non-empty user-written Career Context values. cv_descriptions_read accepts no data arguments and returns only user-authored AI-visible CV tags and notes under response-local labels; it does not expose CV titles, document content, durable local IDs, profile data, candidature history, or file paths. None of these tools expose generic database, filesystem, process, network, browse, search, or query authority. A shell-capable host remains the user's trust choice outside this tool payload boundary." as const,
  actions: Object.freeze([
    "validate-workspace",
    "validate-executable",
    "verify-mcp-tools",
    "write-vscode-mcp-config",
  ] as const),
});