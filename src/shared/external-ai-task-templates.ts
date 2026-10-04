export const opportunityResearchTaskInstruction =
  "Research this opportunity and produce a concise application brief with relevant verified facts and source links, positioning ideas supported by the supplied context, important unknowns or questions, and concrete preparation points. If key details are missing, state them instead of guessing.";

export const interviewPreparationTaskInstruction =
  "Prepare an interview brief for this opportunity. Identify useful areas to investigate or prepare from the supplied context, propose concrete questions to ask, and flag missing details that would materially change the preparation. Verify employer-specific facts when possible and do not invent them.";

export const shippedCandidatureAiTaskTemplates = Object.freeze([
  {
    id: "opportunity-research",
    label: "Opportunity research",
    instruction: opportunityResearchTaskInstruction,
  },
  {
    id: "interview-preparation",
    label: "Interview preparation",
    instruction: interviewPreparationTaskInstruction,
  },
] as const);
