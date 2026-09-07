export const vscodeMcpSetupRecipe = Object.freeze({
  id: "vscode.mcp" as const,
  host: "vscode" as const,
  transport: "stdio" as const,
  capabilityNames: Object.freeze([
    "candidature.create",
    "career_context.read",
    "cv_descriptions.read",
    "cv_content.read",
    "cv.render",
  ] as const),
  toolNames: Object.freeze([
    "candidature_create",
    "career_context_read",
    "cv_descriptions_read",
    "cv_content_read",
    "cv_render",
  ] as const),
  permissionScope:
    "Create one candidature from one retained Source, read the non-empty user-written Career Context, read user-authored AI-visible CV tags and notes, read the effective content of the single CV the user explicitly allows, and request local PDF rendering only when that same CV has separate external render authorization in the selected existing AAAAT workspace." as const,
  privacyDisclosure:
    "The host configuration contains the AAAAT executable and selected workspace paths so the user-trusted host can launch the local stdio server. candidature_create accepts one retained Source and returns only a creation acknowledgement. career_context_read accepts no data arguments and returns only non-empty user-written Career Context values. cv_descriptions_read accepts no data arguments and returns only user-authored AI-visible CV tags and notes under response-local labels; it does not expose CV titles, document content, durable local IDs, profile data, candidature history, or file paths. cv_content_read accepts no data arguments and returns null unless the user has deliberately selected one CV for external content access; when selected it returns only that CV's effective resolved profile-item content without the document title, local IDs, paths, raw TeX/PDF, descriptors, candidature history, or other documents. cv_render accepts no data arguments and returns null unless that content-selected CV also has separate local external-render authorization; when authorized it requests AAAAT's normal local PDF render and returns only a success acknowledgement, never paths, document identity, TeX/PDF bytes, commands, engine settings, or logs. None of these tools expose generic database, filesystem, process, network, browse, search, query, or command authority. A shell-capable host remains the user's trust choice outside this tool payload boundary." as const,
  actions: Object.freeze([
    "validate-workspace",
    "validate-executable",
    "verify-mcp-tools",
    "write-vscode-mcp-config",
  ] as const),
});