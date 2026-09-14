import { z } from "zod";

import { aiOperationSchema } from "./ai-connection-contracts";

export const AI_EXCHANGE_DIAGNOSTIC_MARKER = "AAAAT_AI_EXCHANGE:";

export const aiExchangeFailureKindSchema = z.enum([
  "connection_unreachable",
  "provider_http_failure",
  "provider_envelope_invalid",
  "model_response_invalid_json",
  "operation_contract_invalid",
  "operation_incompatible",
]);
export type AiExchangeFailureKind = z.infer<typeof aiExchangeFailureKindSchema>;

export const aiStructuredOutputModeSchema = z.enum([
  "json_schema",
  "plain_json_fallback",
]);
export type AiStructuredOutputMode = z.infer<typeof aiStructuredOutputModeSchema>;

export const aiExchangeDiagnosticSchema = z
  .object({
    id: z.string().uuid(),
    operation: aiOperationSchema,
    endpoint: z.string().url(),
    model: z.string().min(1),
    systemInstruction: z.string(),
    userPayload: z.string(),
    rawModelResponse: z.string(),
    validationError: z.string(),
    failureKind: aiExchangeFailureKindSchema,
    structuredOutputMode: aiStructuredOutputModeSchema,
  })
  .strict();
export type AiExchangeDiagnostic = z.infer<typeof aiExchangeDiagnosticSchema>;
