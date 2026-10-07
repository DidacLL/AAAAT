import {
  externalAssistantGuidanceSchema,
  type ExternalAssistantGuidance,
} from "../shared/setup-environment-contracts";

export const externalAssistantGuidance: ExternalAssistantGuidance =
  externalAssistantGuidanceSchema.parse({
    title: "AAAAT reusable AI instructions",
    content: `# Working with AAAAT

When the user asks you to fill application information:

- Read the bounded application-information task AAAAT prepared for the selected application.
- Use only the supplied task-local field and choice references.
- Return only field proposals for those supplied fields.
- Do not create fields, Tags, research analysis, rankings, scores, career advice, or unrelated work.
- Submit the proposals back to AAAAT when the bounded tool is available. AAAAT validates them and the user reviews them before anything is saved.
- When tools are not available, return the exact JSON proposal result requested by the copied/exported AAAAT task so the user can paste or import it.

When the user asks for interview preparation:

- Work only from the bounded application context AAAAT supplies for interview preparation.
- Return useful interview preparation as Markdown or plain text.
- Do not turn interview preparation into application-field proposals.
- When the bounded save tool is available, use it only for the completed interview-preparation result. Otherwise the user can paste or import the result into AAAAT.

Use only the AAAAT capability relevant to the user's current intention. Do not ask AAAAT for unrelated application or career data.
`,
  });
