export const externalAssistantMcpContract = Object.freeze({
  transport: "stdio" as const,
  capabilityNames: Object.freeze([
    "candidature.create",
    "opportunity_research.context.read",
    "candidature.source.add",
    "career_context.read",
    "cv_descriptions.read",
    "cv_content.read",
    "cv.render",
    "installer.status.read",
    "configurator.status.read",
  ] as const),
  toolNames: Object.freeze([
    "candidature_create",
    "opportunity_research_context_read",
    "candidature_source_add",
    "career_context_read",
    "cv_descriptions_read",
    "cv_content_read",
    "cv_render",
    "installer_status_read",
    "configurator_status_read",
  ] as const),
  permissionScope:
    "Create one candidature from one retained Source; for the single candidature the user locally selects for the opportunity-research task, read only its AI-permitted formatted information and retain one returned Source; read only non-empty Career preferences the user locally permits for external career assistance; read user-authored AI-visible CV tags and notes; read the effective content of the single CV the user explicitly allows; request local PDF rendering only when that same CV has separate external render authorization; and read privacy-minimal installation/configuration readiness. None of these capabilities provide generic storage or machine authority." as const,
  privacyDisclosure:
    "The external assistant receives only the payload of the bounded capability it invokes. candidature_create accepts one retained Source and returns only a creation acknowledgement. opportunity_research_context_read accepts no selectors and returns null unless the user has locally selected one candidature for that task; it never exposes other candidatures, Sources, professional information, documents, local IDs, or paths. candidature_source_add writes only Source material to that same task-selected candidature and returns only a retained acknowledgement. career_context_read returns only non-empty user-written Career preferences explicitly permitted for external assistance. cv_descriptions_read returns only user-authored AI-visible CV tags and notes under temporary labels. cv_content_read returns only effective content of the one CV explicitly allowed for external access. cv_render requests only AAAAT's normal local render for that authorized CV and returns no paths or document identity. installer_status_read returns only workspace/document-rendering readiness and missing known TeX command names; configurator_status_read returns only optional AI configuration readability, connection count and per-operation route availability, never connection names or career/application content. No tool exposes generic database, filesystem, process, network, browse, search, query, package-manager or command authority. A host with broader machine access remains the user's separate trust choice outside AAAAT's tool boundary." as const,
});

export const vscodeMcpSetupRecipe = Object.freeze({
  id: "vscode.mcp" as const,
  host: "vscode" as const,
  transport: externalAssistantMcpContract.transport,
  capabilityNames: externalAssistantMcpContract.capabilityNames,
  toolNames: externalAssistantMcpContract.toolNames,
  permissionScope: externalAssistantMcpContract.permissionScope,
  privacyDisclosure: externalAssistantMcpContract.privacyDisclosure,
  actions: Object.freeze([
    "validate-workspace",
    "validate-executable",
    "verify-mcp-tools",
    "write-vscode-mcp-config",
  ] as const),
});
