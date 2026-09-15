import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import type { DocumentRecord } from "../shared/contracts";
import { cvTailoringSelection } from "../shared/application-material";
import { startAiTask } from "./ai-task-store";

export interface ApplicationPreparationResult {
  readonly extractedValues: number;
  readonly extractionIssues: number;
  readonly cvPrepared: boolean;
  readonly coverLetterPrepared: boolean;
}

export function applicationPreparationTaskKey(candidatureId: string): string {
  return `application-material:${candidatureId}`;
}

function operationAvailable(
  connections: readonly NamedAiConnection[],
  operation: "job_extraction" | "cv_tailoring" | "cover_letter_draft",
): boolean {
  return connections.some(
    (connection) =>
      connection.validatedOperations.includes(operation) &&
      (connection.defaultForOperations.includes(operation) || connection.isDefault),
  );
}

export async function maybeStartApplicationDocumentPreparation(input: {
  readonly candidatureId: string;
  readonly sourceText: string;
  readonly documents: readonly DocumentRecord[];
}): Promise<boolean> {
  const [connections, profile] = await Promise.all([
    window.aaaat.aiConnections.list(),
    window.aaaat.profile.current(),
  ]);
  const hasEvidence = profile.items.length > 0;
  const extractionReady = operationAvailable(connections, "job_extraction");
  const cvDocument = input.documents.find((document) => document.kind === "cv");
  const coverLetterDocument = input.documents.find((document) => document.kind === "cover_letter");
  const cvReady = Boolean(cvDocument) && operationAvailable(connections, "cv_tailoring");
  const letterReady = Boolean(coverLetterDocument) && operationAvailable(connections, "cover_letter_draft");

  if (!extractionReady || !hasEvidence || (!cvReady && !letterReady)) return false;

  const taskKey = applicationPreparationTaskKey(input.candidatureId);
  startAiTask<ApplicationPreparationResult>(
    taskKey,
    async (updateDetail, signal) => {
      let extractedValues = 0;
      let extractionIssues: number;
      let cvPrepared = false;
      let coverLetterPrepared = false;

      updateDetail("Reading the retained job offer and matching it to your saved information.");
      const extractionTaskId = `${taskKey}:extract`;
      const cancelExtraction = () => {
        void window.aaaat.aiTasks.cancelJobExtraction(extractionTaskId).catch(() => undefined);
      };
      signal.addEventListener("abort", cancelExtraction, { once: true });
      try {
        const extraction = await window.aaaat.aiTasks.extractJob(extractionTaskId, {
          sourceTitle: "",
          sourceUrl: "",
          sourceText: input.sourceText,
        });
        extractionIssues = extraction.issues.length;
        for (const proposal of extraction.proposals) {
          if (signal.aborted) break;
          try {
            await window.aaaat.candidatures.setFieldValue({
              candidatureId: input.candidatureId,
              fieldId: proposal.fieldId,
              value: proposal.value,
            });
            extractedValues += 1;
          } catch {
            extractionIssues += 1;
          }
        }
      } finally {
        signal.removeEventListener("abort", cancelExtraction);
      }

      if (signal.aborted || extractedValues === 0) {
        return { extractedValues, extractionIssues, cvPrepared, coverLetterPrepared };
      }

      if (cvDocument && cvReady) {
        updateDetail("Tailoring the CV evidence to this opportunity.");
        const tailored = await window.aaaat.ai.tailorCv({
          candidatureId: input.candidatureId,
          documentId: cvDocument.id,
        });
        if (!signal.aborted) {
          const selection = cvTailoringSelection(
            profile.items,
            tailored.recommendations.map((recommendation) => recommendation.itemId),
          );
          const included = new Set(selection.includedItemIds);
          for (const item of profile.items) {
            await window.aaaat.documents.configureItem({
              documentId: cvDocument.id,
              itemId: item.id,
              included: included.has(item.id),
              contentPatch: null,
            });
          }
          if (selection.orderedItemIds.length > 0) {
            await window.aaaat.documents.reorder({
              documentId: cvDocument.id,
              itemIds: [...selection.orderedItemIds],
            });
          }
          cvPrepared = true;
        }
      }

      if (signal.aborted) return { extractedValues, extractionIssues, cvPrepared, coverLetterPrepared };

      if (coverLetterDocument && letterReady) {
        updateDetail("Drafting the cover letter from the opportunity and your retained evidence.");
        const draft = await window.aaaat.ai.draftCoverLetter({
          candidatureId: input.candidatureId,
          documentId: coverLetterDocument.id,
        });
        if (!signal.aborted) {
          await window.aaaat.documents.update({
            id: coverLetterDocument.id,
            title: coverLetterDocument.title,
            language: coverLetterDocument.language,
            engine: coverLetterDocument.engine,
            recipient: draft.recipient,
            subject: draft.subject,
            bodyParagraphs: draft.bodyParagraphs,
            closing: draft.closing,
          });
          coverLetterPrepared = true;
        }
      }

      return { extractedValues, extractionIssues, cvPrepared, coverLetterPrepared };
    },
    "Prepare application documents",
    (result) => {
      const prepared = [result.cvPrepared ? "CV" : null, result.coverLetterPrepared ? "cover letter" : null]
        .filter(Boolean)
        .join(" and ");
      if (!prepared && result.extractedValues === 0) {
        return "Offer retained · automatic drafting could not find safe structured opportunity facts · documents remain ready for manual editing";
      }
      const retained = result.extractedValues > 0 ? ` · ${result.extractedValues} offer detail${result.extractedValues === 1 ? "" : "s"} retained` : "";
      const review = result.extractionIssues > 0 ? ` · ${result.extractionIssues} extraction suggestion${result.extractionIssues === 1 ? "" : "s"} skipped safely` : "";
      return `${prepared || "Application material"} ready${retained}${review}`;
    },
  );
  return true;
}
