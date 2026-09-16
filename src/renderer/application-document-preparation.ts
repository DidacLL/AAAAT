import type { NamedAiConnection } from "../shared/ai-connection-contracts";
import type { DocumentRecord } from "../shared/contracts";
import { cvTailoringSelection } from "../shared/application-material";
import { startAiTask } from "./ai-task-store";

export interface ApplicationPreparationResult {
  readonly extractedValues: number;
  readonly extractionIssues: number;
  readonly preparationIssues: number;
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
  readonly extract?: boolean;
}): Promise<boolean> {
  const [connections, profile] = await Promise.all([
    window.aaaat.aiConnections.list(),
    window.aaaat.profile.current(),
  ]);
  const hasEvidence = profile.items.some((item) => item.kind !== "identity" && item.kind !== "contact" && item.kind !== "link");
  const extractionReady = input.extract === true && operationAvailable(connections, "job_extraction");
  const cvDocument = input.documents.find((document) => document.kind === "cv");
  const coverLetterDocument = input.documents.find((document) => document.kind === "cover_letter");
  const cvReady = Boolean(cvDocument) && hasEvidence && operationAvailable(connections, "cv_tailoring");
  const letterReady = Boolean(coverLetterDocument) && hasEvidence && operationAvailable(connections, "cover_letter_draft");

  if (!extractionReady && !cvReady && !letterReady) return false;

  const taskKey = applicationPreparationTaskKey(input.candidatureId);
  startAiTask<ApplicationPreparationResult>(
    taskKey,
    async (updateDetail, signal) => {
      let extractedValues = 0;
      let extractionIssues = 0;
      let preparationIssues = 0;
      let cvPrepared = false;
      let coverLetterPrepared = false;

      if (extractionReady) {
        updateDetail("Reading the retained job offer for useful application details.");
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
              const current = (await window.aaaat.candidatures.list()).find((item) => item.id === input.candidatureId);
              if (current?.values.some((value) => value.fieldId === proposal.fieldId)) continue;
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
        } catch {
          extractionIssues += 1;
        } finally {
          signal.removeEventListener("abort", cancelExtraction);
        }
      }

      if (signal.aborted) return { extractedValues, extractionIssues, preparationIssues, cvPrepared, coverLetterPrepared };

      if (cvDocument && cvReady) {
        updateDetail("Tailoring the CV evidence to this opportunity.");
        try {
          const baseline = (await window.aaaat.documents.list()).find((document) => document.id === cvDocument.id);
          const tailored = await window.aaaat.ai.tailorCv({
            candidatureId: input.candidatureId,
            documentId: cvDocument.id,
          });
          const current = (await window.aaaat.documents.list()).find((document) => document.id === cvDocument.id);
          if (!signal.aborted && baseline && current && JSON.stringify(current.rules) === JSON.stringify(baseline.rules)) {
          const selection = cvTailoringSelection(
            profile.items,
            tailored.recommendations.map((recommendation) => recommendation.itemId),
          );
          await window.aaaat.documents.applySelection({
            documentId: cvDocument.id,
            expectedRules: current.rules,
            includedItemIds: [...selection.includedItemIds],
            orderedItemIds: [...selection.orderedItemIds],
          });
          cvPrepared = true;
          }
        } catch { preparationIssues += 1; }
      }

      if (signal.aborted) return { extractedValues, extractionIssues, preparationIssues, cvPrepared, coverLetterPrepared };

      if (coverLetterDocument && letterReady) {
        updateDetail("Drafting the cover letter from the opportunity and your retained evidence.");
        try {
          const baseline = (await window.aaaat.documents.list()).find((document) => document.id === coverLetterDocument.id);
          const draft = await window.aaaat.ai.draftCoverLetter({
            candidatureId: input.candidatureId,
            documentId: coverLetterDocument.id,
          });
          const current = (await window.aaaat.documents.list()).find((document) => document.id === coverLetterDocument.id);
          const unchanged = baseline && current &&
            current.title === baseline.title && current.language === baseline.language &&
            current.recipient === baseline.recipient && current.subject === baseline.subject &&
            current.closing === baseline.closing &&
            JSON.stringify(current.bodyParagraphs) === JSON.stringify(baseline.bodyParagraphs);
          if (!signal.aborted && unchanged && current) {
          await window.aaaat.documents.update({
            id: current.id,
            title: current.title,
            language: current.language,
            engine: current.engine,
            recipient: draft.recipient,
            subject: draft.subject,
            bodyParagraphs: draft.bodyParagraphs,
            closing: draft.closing,
          });
          coverLetterPrepared = true;
          }
        } catch { preparationIssues += 1; }
      }

      return { extractedValues, extractionIssues, preparationIssues, cvPrepared, coverLetterPrepared };
    },
    "Prepare application documents",
    (result) => {
      const prepared = [result.cvPrepared ? "CV" : null, result.coverLetterPrepared ? "cover letter" : null]
        .filter(Boolean)
        .join(" and ");
      if (!prepared && result.extractedValues === 0) {
        return "Offer retained · local drafts are ready to edit · optional AI preparation did not add material";
      }
      const retained = result.extractedValues > 0 ? ` · ${result.extractedValues} offer detail${result.extractedValues === 1 ? "" : "s"} retained` : "";
      const review = result.extractionIssues + result.preparationIssues > 0 ? " · some optional suggestions could not be applied" : "";
      return `${prepared || "Application material"} ready${retained}${review}`;
    },
  );
  return true;
}
