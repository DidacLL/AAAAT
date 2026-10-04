import type {
  AiConnectionOperationInput,
  NamedAiConnection,
} from "../shared/ai-connection-contracts";
import type {
  CoverLetterDraft,
  CoverLetterDraftRequest,
  CvTailoringRequest,
  CvTailoringResult,
  JobExtractionRequest,
} from "../shared/ai-contracts";
import type { PartialJobExtractionResult } from "../shared/ai-proposal-outcomes";
import type { CancellableJobExtractionTaskRequest } from "../shared/ai-task-cancellation-contracts";
import { validateAiConnectionOperation } from "./ai-connection-service";
import { draftCoverLetter, tailorCv } from "./ai-service";
import { extractJobWithPartialOutcomes } from "./robust-job-extraction";

const activeExtractions = new Map<string, AbortController>();
const activeConnectionValidations = new Map<string, AbortController>();
const activeCvTailorings = new Map<string, AbortController>();
const activeCoverLetterDrafts = new Map<string, AbortController>();

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


export async function runCancellableCvTailoring(
  rootPath: string,
  taskId: string,
  request: CvTailoringRequest,
): Promise<CvTailoringResult> {
  const previous = activeCvTailorings.get(taskId);
  previous?.abort();

  const controller = new AbortController();
  activeCvTailorings.set(taskId, controller);
  try {
    return await tailorCv(rootPath, request, undefined, controller.signal);
  } finally {
    if (activeCvTailorings.get(taskId) === controller) activeCvTailorings.delete(taskId);
  }
}

export function cancelCancellableCvTailoring(taskId: string): boolean {
  const controller = activeCvTailorings.get(taskId);
  if (!controller) return false;
  controller.abort();
  activeCvTailorings.delete(taskId);
  return true;
}

export async function runCancellableCoverLetterDraft(
  rootPath: string,
  taskId: string,
  request: CoverLetterDraftRequest,
): Promise<CoverLetterDraft> {
  const previous = activeCoverLetterDrafts.get(taskId);
  previous?.abort();

  const controller = new AbortController();
  activeCoverLetterDrafts.set(taskId, controller);
  try {
    return await draftCoverLetter(rootPath, request, undefined, controller.signal);
  } finally {
    if (activeCoverLetterDrafts.get(taskId) === controller) activeCoverLetterDrafts.delete(taskId);
  }
}

export function cancelCancellableCoverLetterDraft(taskId: string): boolean {
  const controller = activeCoverLetterDrafts.get(taskId);
  if (!controller) return false;
  controller.abort();
  activeCoverLetterDrafts.delete(taskId);
  return true;
}
