import type { JobExtractionRequest, JobExtractionResult } from "../shared/ai-contracts";
import { createOpenAiCompatibleProvider } from "./ai-provider";
import { extractJob } from "./ai-service";

const activeExtractions = new Map<string, AbortController>();

export async function runCancellableJobExtraction(
  rootPath: string,
  taskId: string,
  request: JobExtractionRequest,
): Promise<JobExtractionResult> {
  const previous = activeExtractions.get(taskId);
  previous?.abort();

  const controller = new AbortController();
  activeExtractions.set(taskId, controller);
  const provider = createOpenAiCompatibleProvider();
  const cancellableProvider = {
    ...provider,
    extractJob: (connection: Parameters<typeof provider.extractJob>[0], input: Parameters<typeof provider.extractJob>[1]) =>
      provider.extractJob(connection, input, controller.signal),
  };

  try {
    return await extractJob(rootPath, request, cancellableProvider);
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
