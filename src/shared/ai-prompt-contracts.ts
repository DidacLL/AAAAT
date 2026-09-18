import { z } from "zod";
import { aiOperationSchema } from "./ai-connection-contracts";

export const aiPromptChannels = Object.freeze({
  list: "aaaat:ai-prompt-list",
  save: "aaaat:ai-prompt-save",
  reset: "aaaat:ai-prompt-reset",
} as const);

export const aiPromptDisclosureSchema = z.object({
  operation: aiOperationSchema,
  label: z.string().min(1),
  defaultInstruction: z.string().min(1),
  instruction: z.string().max(12000),
  isDefault: z.boolean(),
  contextSummary: z.string().min(1),
  responseExpectation: z.string().min(1),
}).strict();
export type AiPromptDisclosure = z.infer<typeof aiPromptDisclosureSchema>;
export const aiPromptDisclosureListSchema = z.array(aiPromptDisclosureSchema);
export const aiPromptUpdateSchema = z.object({ operation: aiOperationSchema, instruction: z.string().max(12000) }).strict();
export type AiPromptUpdate = z.infer<typeof aiPromptUpdateSchema>;

export interface AiPromptDesktopApi {
  readonly aiPrompts: {
    readonly list: () => Promise<AiPromptDisclosure[]>;
    readonly save: (input: AiPromptUpdate) => Promise<AiPromptDisclosure[]>;
    readonly reset: (operation: z.infer<typeof aiOperationSchema>) => Promise<AiPromptDisclosure[]>;
  };
}
