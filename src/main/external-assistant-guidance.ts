import {
  externalAssistantGuidanceSchema,
  type ExternalAssistantGuidance,
} from "../shared/setup-environment-contracts";
import externalAssistantSkill from "./external-assistant-skill.md?raw";

export const externalAssistantGuidance: ExternalAssistantGuidance =
  externalAssistantGuidanceSchema.parse({
    title: "AAAAT reusable AI instructions",
    content: externalAssistantSkill,
  });
