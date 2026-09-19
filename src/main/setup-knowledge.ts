export const externalAssistantMcpContract = Object.freeze({
  transport: "stdio" as const,
  capabilityNames: Object.freeze([
    "candidature.create",
    "application.documents.create",
    "opportunity_research.context.read",
    "candidature.source.add",
    "career_context.read",
    "installer.status.read",
    "installer.rendering.self_test",
    "configurator.status.read",
    "configurator.ai_connection.save",
    "configurator.ai_operation.validate",
    "configurator.ai_operation.default",
  ] as const),
  toolNames: Object.freeze([
    "candidature_create",
    "application_documents_create",
    "opportunity_research_context_read",
    "candidature_source_add",
    "career_context_read",
    "installer_status_read",
    "installer_rendering_self_test",
    "configurator_status_read",
    "configurator_ai_connection_save",
    "configurator_ai_operation_validate",
    "configurator_ai_operation_default",
  ] as const),
  permissionScope:
    "Perform only typed AAAAT product intentions: create an application or complete application-document workspace from retained material; work with the one locally task-selected opportunity; read explicitly permitted Career context; inspect setup readiness; and, only while the user enables the matching local setup authority, run AAAAT's fixed rendering self-test or save/validate/select typed AI connection configuration. No capability provides generic storage or machine authority." as const,
  privacyDisclosure:
    "The external assistant receives only the payload of the bounded capability it invokes. Application creation accepts retained offer text and requested output kinds and returns only created/prepared booleans, never local IDs or paths. Opportunity and Career reads remain locally selected/disclosed. installer_status_read and configurator_status_read remain privacy-minimal. installer_rendering_self_test accepts no path, command or package-manager input and is denied unless installer.ai actions are enabled in AAAAT Settings. configurator AI mutations accept only connection name/endpoint/model and typed AAAAT operation names, use the same endpoint validation and capability validation as the desktop, expose no credentials, and are denied unless configurator.ai actions are enabled in Settings. No tool exposes generic database, filesystem, process, network, browse, search, query, package-manager or command authority. A host with broader machine access remains the user's separate trust choice outside AAAAT's tool boundary." as const,
});
