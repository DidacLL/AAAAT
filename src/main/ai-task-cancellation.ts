import type {
  AiConnectionOperationInput,
  NamedAiConnection,
} from "../shared/ai-connection-contracts";
import type { JobExtractionRequest } from "../shared/ai-contracts";
import type { PartialJobExtractionResult } from "../shared/ai-proposal-outcomes";
import type { CancellableJobExtractionTaskRequest } from "../shared/ai-task-cancellation-contracts";
import { validateAiConnectionOperation } from "./ai-connection-service";
import { extractJobWithPartialOutcomes } from "./robust-job-extraction";

const activeExtractions = new Map<string, AbortController>();
const activeConnectionValidations = new Map<string, AbortController>();

export async function runCancellableJobExtraction(
  rootPath: string,
  taskId: string,
  request: CancellableJobExtractionTaskRequest,
): Promise<PartialJobExtractionResult> {
  const previous = activeExtractions.get(taskId);
  previous?.abort();

  const controller = new AbortController();
  activeExtractions.set(taskId, controller);
  const { targetFieldIds, ...sourceRequest } = request;

  try {
    return await extractJobWithPartialOutcomes(
      rootPath,
      sourceRequest satisfies JobExtractionRequest,
      controller.signal,
      targetFieldIds,
    );
  } finally {
    if (activeExtractions.get(taskId) === controller) activeExtractions.delete(taskId);
  }
}

export function cancelCancellableJobExtraction(taskId: string): boolean {
  const controller = activeExtractions.get(taskId);
  if (!controller) return false;
  controller.abort();
  activeExtractions.delete(taskId);
  return true;
}

export async function runCancellableAiConnectionValidation(
  rootPath: string,
  taskId: string,
  request: AiConnectionOperationInput,
): Promise<NamedAiConnection[]> {
  const previous = activeConnectionValidations.get(taskId);
  previous?.abort();

  const controller = new AbortController();
  activeConnectionValidations.set(taskId, controller);
  try {
    return await validateAiConnectionOperation(rootPath, request, undefined, controller.signal);
  } finally {
    if (activeConnectionValidations.get(taskId) === controller) {
      activeConnectionValidations.delete(taskId);
    }
  }
}

export function cancelCancellableAiConnectionValidation(taskId: string): boolean {
  const controller = activeConnectionValidations.get(taskId);
  if (!controller) return false;
  controller.abort();
  activeConnectionValidations.delete(taskId);
  return true;
}
