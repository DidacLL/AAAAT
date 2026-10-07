export const externalAssistantMcpContract = Object.freeze({
  transport: "stdio" as const,
  capabilityNames: Object.freeze([
    "candidature.create",
    "application_information.task.read",
    "application_information.proposals.submit",
    "interview_preparation.context.read",
    "interview_preparation.result.save",
    "installer.status.read",
    "installer.rendering.self_test",
    "configurator.status.read",
    "configurator.ai_connection.save",
    "configurator.ai_operation.validate",
    "configurator.ai_operation.default",
  ] as const),
  toolNames: Object.freeze([
    "candidature_create",
    "application_information_task_read",
    "application_information_proposals_submit",
    "interview_preparation_context_read",
    "interview_preparation_result_save",
    "installer_status_read",
    "installer_rendering_self_test",
    "configurator_status_read",
    "configurator_ai_connection_save",
    "configurator_ai_operation_validate",
    "configurator_ai_operation_default",
  ] as const),
  permissionScope:
    "Perform only typed AAAAT product intentions: create an application from supplied Source material; work with the one locally selected application's prepared application-information or interview-preparation task; inspect setup readiness; and, only while the user enables the matching local setup authority, run AAAAT's fixed rendering self-test or save/validate/select typed AI connection configuration. No capability provides generic candidature CRUD, corpus access, storage access, or machine authority." as const,
  privacyDisclosure:
    "The external assistant receives only the payload of the bounded capability it invokes. Application-information uses one locally selected application, task-local field/choice references, retained task context, and only the field information AAAAT assigned and allows for AI use. Private assigned values are represented only as USERPRIVATE placeholders using the user-visible field title. Returned field proposals are validated locally and enter user review instead of mutating fields or becoming Sources. Interview preparation is separate and may retain only the returned free-text preparation as a Source. No application capability exposes durable candidature/field IDs, corpus browsing, generic database/filesystem/process/shell authority, or unrelated application data. Setup tools remain independently bounded and expose no application data." as const,
});
