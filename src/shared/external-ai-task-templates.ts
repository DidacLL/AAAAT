export const applicationInformationTaskInstruction =
  "Propose values only for the application information fields AAAAT supplied. Use the task-local field and choice references exactly as provided. Do not propose Tags, new fields, opportunity scoring, research analysis, career advice, or unrelated work. Return only the requested field-proposal JSON.";

export const interviewPreparationTaskInstruction =
  "Prepare an interview brief for this opportunity. Identify useful areas to investigate or prepare from the supplied context, propose concrete questions to ask, and flag missing details that would materially change the preparation. Verify employer-specific facts when possible and do not invent them.";
