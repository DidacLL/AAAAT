import type { JobExtractionRequest } from "../shared/ai-contracts";
import type { PartialJobExtractionResult } from "../shared/ai-proposal-outcomes";
import { extractJobWithPartialOutcomes } from "./robust-job-extraction";

const activeExtractions = new Map<string, AbortController>();

export async function runCancellableJobExtraction(
  rootPath: string,
  taskId: string,
  request: JobExtractionRequest,
): Promise<PartialJobExtractionResult> {
  const previous = activeExtractions.get(taskId);
  previous?.abort();

  const controller = new AbortController();
  activeExtractions.set(taskId, controller);

  try {
    return await extractJobWithPartialOutcomes(rootPath, request, controller.signal);
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
