import {
  externalAssistantGuidanceSchema,
  type ExternalAssistantGuidance,
} from "../shared/setup-environment-contracts";

export const externalAssistantGuidance: ExternalAssistantGuidance =
  externalAssistantGuidanceSchema.parse({
    title: "AAAAT reusable AI instructions",
    content: `# Working with AAAAT

When the user gives you an AAAAT task:

- Treat the Context section as the information supplied for that task.
- Follow the Task section as the user's editable instruction.
- Do the useful work itself; do not repeat or explain the AAAAT task envelope unless the user asks.
- Return the substantive result as Markdown or plain text so it can be retained in AAAAT.

When AAAAT tools are available in this AI environment:

- Prefer the relevant AAAAT tool when it avoids asking the user to re-enter the same AAAAT information.
- Use only the AAAAT tools relevant to the current task.

When AAAAT tools are not available, work from the task/context the user supplied and return the completed result for the user to paste or import into AAAAT.
`,
  });
