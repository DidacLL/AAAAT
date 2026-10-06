import type {
  AiConnectionOperationInput,
  NamedAiConnection,
} from "../shared/ai-connection-contracts";
import type {
  CoverLetterDraft,
  CoverLetterDraftRequest,
  CvWritingRequest,
  CvWritingResult,
  JobExtractionRequest,
  TagInferenceRequest,
} from "../shared/ai-contracts";
import type { PartialJobExtractionResult, PartialTagInferenceResult } from "../shared/ai-proposal-outcomes";
import type { CancellableJobExtractionTaskRequest } from "../shared/ai-task-cancellation-contracts";
import { validateAiConnectionOperation } from "./ai-connection-service";
import { draftCoverLetter, writeCvField } from "./ai-service";
import { extractJobWithPartialOutcomes } from "./robust-job-extraction";
import { inferTagsWithPartialOutcomes } from "./robust-tag-inference";

const activeExtractions = new Map<string, AbortController>();
const activeTagInferences = new Map<string, AbortController>();
const activeConnectionValidations = new Map<string, AbortController>();
const activeCvWritings = new Map<string, AbortController>();
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

export async function runCancellableTagInference(
  rootPath: string,
  taskId: string,
  request: TagInferenceRequest,
): Promise<PartialTagInferenceResult> {
  const previous = activeTagInferences.get(taskId);
  previous?.abort();

  const controller = new AbortController();
  activeTagInferences.set(taskId, controller);
  try {
    return await inferTagsWithPartialOutcomes(rootPath, request, controller.signal);
  } finally {
    if (activeTagInferences.get(taskId) === controller) activeTagInferences.delete(taskId);
  }
}

export function cancelCancellableTagInference(taskId: string): boolean {
  const controller = activeTagInferences.get(taskId);
  if (!controller) return false;
  controller.abort();
  activeTagInferences.delete(taskId);
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


export async function runCancellableCvWriting(
  rootPath: string,
  taskId: string,
  request: CvWritingRequest,
): Promise<CvWritingResult> {
  const previous = activeCvWritings.get(taskId);
  previous?.abort();

  const controller = new AbortController();
  activeCvWritings.set(taskId, controller);
  try {
    return await writeCvField(rootPath, request, undefined, controller.signal);
  } finally {
    if (activeCvWritings.get(taskId) === controller) activeCvWritings.delete(taskId);
  }
}

export function cancelCancellableCvWriting(taskId: string): boolean {
  const controller = activeCvWritings.get(taskId);
  if (!controller) return false;
  controller.abort();
  activeCvWritings.delete(taskId);
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
