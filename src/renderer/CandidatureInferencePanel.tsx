import { useEffect, useMemo, useState } from "react";

import type { JobExtractionNewField } from "../shared/ai-contracts";
import type {
  JobExtractionProposalIssue,
  PartialJobExtractionResult,
} from "../shared/ai-proposal-outcomes";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
} from "../shared/contracts";
import { clearAiTask, startAiTask, useAiTask } from "./ai-task-store";
import { useContextualHandoffs } from "./contextual-handoffs";

interface InferenceTaskResult extends PartialJobExtractionResult {
  readonly appliedFieldIds?: readonly string[];
}

interface Props {
  readonly candidature: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly targetFieldIds: readonly string[];
  readonly taskId: string;
  readonly title: string;
  readonly allowNewFields?: boolean;
  readonly onChanged?: () => void | Promise<void>;
}

function displayValue(
  field: CandidatureFieldConfiguration,
  value: CandidatureRuntimeValue,
): string {
  const one = (item: string | number | boolean): string => {
    if (field.definition.valueType === "choice" && typeof item === "string") {
      return field.definition.choices.find((choice) => choice.id === item)?.label ?? item;
    }
    return String(item);
  };
  return Array.isArray(value) ? value.map(one).join(", ") : one(value);
}

function routeReady(connections: Awaited<ReturnType<typeof window.aaaat.aiConnections.list>>): boolean {
  return connections.some(
    (connection) =>
      connection.validatedOperations.includes("job_extraction") &&
      (connection.defaultForOperations.includes("job_extraction") || connection.isDefault),
  );
}

function sourceContext(
  candidature: CandidatureRecord,
  fields: readonly CandidatureFieldConfiguration[],
  sources: readonly CandidatureSource[],
  targetFieldIds: ReadonlySet<string>,
): string {
  const retained = candidature.values.flatMap((item) => {
    if (targetFieldIds.has(item.fieldId)) return [];
    const field = fields.find((candidate) => candidate.definition.id === item.fieldId);
    if (!field || field.preferences.aiContextMode !== "expose") return [];
    return [`${field.definition.label}: ${displayValue(field, item.value)}`];
  });

  const parts = sources.map((source, index) =>
    [
      `Retained Source ${index + 1}`,
      source.title ? `Title: ${source.title}` : "",
      source.url ? `URL: ${source.url}` : "",
      source.sourceText,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  if (retained.length > 0) {
    parts.push(`Already retained information allowed for AI use:\n${retained.join("\n")}`);
  }
  return parts.join("\n\n---\n\n").slice(0, 50000).trim();
}

function normalizedLabel(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function createChoices(suggestion: JobExtractionNewField) {
  return suggestion.valueType === "choice"
    ? suggestion.choices.map((label) => ({ id: crypto.randomUUID(), label }))
    : [];
}

function createdValue(
  suggestion: JobExtractionNewField,
  choices: readonly { readonly id: string; readonly label: string }[],
): CandidatureRuntimeValue | null {
  if (suggestion.valueType !== "choice") return suggestion.value;
  const byLabel = new Map(choices.map((choice) => [normalizedLabel(choice.label), choice.id]));
  const mapOne = (value: string | number | boolean): string | null =>
    typeof value === "string" ? (byLabel.get(normalizedLabel(value)) ?? null) : null;
  if (Array.isArray(suggestion.value)) {
    const mapped = suggestion.value.map(mapOne);
    return mapped.every((value): value is string => value !== null) ? mapped : null;
  }
  return mapOne(suggestion.value);
}

function newFieldIssue(
  suggestion: JobExtractionNewField,
  reason: string,
): JobExtractionProposalIssue {
  return {
    kind: "new_field_invalid",
    fieldId: null,
    fieldLabel: suggestion.label,
    proposedValue: suggestion.value,
    reason,
  };
}

export function CandidatureInferencePanel({
  candidature,
  fields,
  targetFieldIds,
  taskId,
  title,
  allowNewFields = false,
  onChanged,
}: Props) {
  const { openSettingsFor } = useContextualHandoffs();
  const task = useAiTask<InferenceTaskResult>(taskId);
  const [sources, setSources] = useState<CandidatureSource[] | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const targetSet = useMemo(() => new Set(targetFieldIds), [targetFieldIds]);
  const requestedFields = useMemo(
    () => fields.filter((field) => targetSet.has(field.definition.id) && field.definition.enabled),
    [fields, targetSet],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      window.aaaat.candidatures.listSources(candidature.id),
      window.aaaat.aiConnections.list(),
    ])
      .then(([retainedSources, connections]) => {
        if (!active) return;
        setSources(retainedSources);
        setAiReady(routeReady(connections));
      })
      .catch(() => {
        if (!active) return;
        setSources([]);
        setAiReady(false);
      });
    return () => {
      active = false;
    };
  }, [candidature.id]);

  const context = useMemo(
    () => (sources === null ? "" : sourceContext(candidature, fields, sources, targetSet)),
    [candidature, fields, sources, targetSet],
  );

  useEffect(() => {
    if (task || aiReady !== true || !context || requestedFields.length === 0) return;

    startAiTask<InferenceTaskResult>(
      taskId,
      async (updateDetail, signal) => {
        const discoveryDisabled = requestedFields.filter((field) => !field.preferences.aiDiscovery);
        if (discoveryDisabled.length > 0) {
          await Promise.all(
            discoveryDisabled.map((field) =>
              window.aaaat.candidatures.updateFieldPreferences({
                ...field.preferences,
                fieldId: field.definition.id,
                aiDiscovery: true,
              }),
            ),
          );
        }
        updateDetail(
          requestedFields.length === 1
            ? `Finding ${requestedFields[0]?.definition.label ?? "this information"}…`
            : `Finding ${requestedFields.length} missing values…`,
        );

        const cancelProvider = () => {
          void window.aaaat.aiTasks.cancelJobExtraction(taskId).catch(() => undefined);
        };
        signal.addEventListener("abort", cancelProvider, { once: true });
        let result: PartialJobExtractionResult;
        try {
          result = await window.aaaat.aiTasks.extractJob(taskId, {
            sourceTitle: "Retained AAAAT candidature context",
            sourceUrl: "",
            sourceText: context,
            targetFieldIds,
          });
        } finally {
          signal.removeEventListener("abort", cancelProvider);
        }
        if (!allowNewFields || result.newFields.length === 0 || signal.aborted) return result;

        updateDetail("Adding useful information found in the offer…");
        const existing = await window.aaaat.candidatures.listFields();
        const labels = new Set(existing.map((field) => normalizedLabel(field.definition.label)));
        const createdProposals: PartialJobExtractionResult["proposals"] = [];
        const appliedFieldIds: string[] = [];
        const issues: JobExtractionProposalIssue[] = [...result.issues];

        for (const suggestion of result.newFields) {
          if (signal.aborted) break;
          if (labels.has(normalizedLabel(suggestion.label))) {
            issues.push(newFieldIssue(suggestion, "This proposed information duplicates an existing field."));
            continue;
          }
          const choices = createChoices(suggestion);
          const value = createdValue(suggestion, choices);
          if (value === null) {
            issues.push(newFieldIssue(suggestion, "AAAAT could not map the proposed value to the proposed choices."));
            continue;
          }

          let created: CandidatureFieldConfiguration | null = null;
          try {
            created = await window.aaaat.candidatures.createField({
              label: suggestion.label,
              description: suggestion.description,
              valueType: suggestion.valueType,
              cardinality: suggestion.cardinality,
              choices,
              enabled: true,
            });
            await window.aaaat.candidatures.updateFieldPreferences({
              ...created.preferences,
              fieldId: created.definition.id,
              aiDiscovery: true,
              aiContextMode: "expose",
            });
            await window.aaaat.candidatures.setFieldValue({
              candidatureId: candidature.id,
              fieldId: created.definition.id,
              value,
            });
            labels.add(normalizedLabel(suggestion.label));
            createdProposals.push({ fieldId: created.definition.id, value });
            appliedFieldIds.push(created.definition.id);
          } catch (reason) {
            issues.push(
              newFieldIssue(
                suggestion,
                reason instanceof Error
                  ? reason.message
                  : "AAAAT could not retain this proposed information.",
              ),
            );
            if (created) {
              try {
                await window.aaaat.candidatures.deleteField(created.definition.id);
              } catch {
                // Keep the validated field if it became used concurrently.
              }
            }
          }
        }

        if (appliedFieldIds.length > 0 && !signal.aborted) await onChanged?.();
        return {
          proposals: [...result.proposals, ...createdProposals],
          newFields: [],
          issues,
          ...(result.exchange ? { exchange: result.exchange } : {}),
          appliedFieldIds,
        };
      },
      title,
      (result) => {
        const usable = result.proposals.filter(
          (proposal) => targetSet.has(proposal.fieldId) || (result.appliedFieldIds ?? []).includes(proposal.fieldId),
        );
        const review = result.issues.length;
        if (usable.length === 0 && review === 0) return "Completed · no usable information found";
        if (review > 0) {
          return `Completed · ${usable.length} value${usable.length === 1 ? "" : "s"} found · ${review} needs review`;
        }
        const added = result.appliedFieldIds?.length ?? 0;
        return added > 0
          ? `Completed · ${usable.length} value${usable.length === 1 ? "" : "s"} found, ${added} new field${added === 1 ? "" : "s"} added`
          : `Completed · ${usable.length} value${usable.length === 1 ? "" : "s"} found`;
      },
      targetFieldIds,
    );
  }, [
    aiReady,
    allowNewFields,
    candidature.id,
    context,
    onChanged,
    requestedFields,
    targetFieldIds,
    targetSet,
    task,
    taskId,
    title,
  ]);

  if (requestedFields.length === 0) {
    return <p className="compact-help">There is no available information to fill here.</p>;
  }
  if (sources === null || aiReady === null || task?.status === "queued" || task?.status === "working") {
    return null;
  }
  if (!aiReady) {
    return (
      <div className="ai-task-failure candidature-inline-ai-message">
        <span>AI is not ready for this request.</span>
        <button type="button" className="compact-secondary" onClick={() => openSettingsFor("ai", "candidatures")}>
          Open AI settings
        </button>
      </div>
    );
  }
  if (!context) {
    return (
      <p className="compact-help candidature-inline-ai-message">
        Keep some Source text or allow retained information as AI context before asking AI to fill this value.
      </p>
    );
  }
  if (task?.status === "failed") {
    return (
      <div className="ai-task-failure candidature-inline-ai-message" role="alert">
        <span>{task.error}</span>
        <button type="button" className="compact-secondary" onClick={() => clearAiTask(taskId)}>
          Retry
        </button>
      </div>
    );
  }
  return null;
}
