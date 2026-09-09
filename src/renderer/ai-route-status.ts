import type { AiOperation } from "../shared/ai-connection-contracts";

export async function isAiOperationUnavailable(operation: AiOperation): Promise<boolean> {
  try {
    const environment = await window.aaaat.setupEnvironment.current();
    return environment.ai.operations.find((status) => status.operation === operation)?.available === false;
  } catch {
    return false;
  }
}
