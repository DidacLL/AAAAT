import { useEffect, useMemo, useState } from "react";

import type { JobExtractionResult } from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
} from "../shared/contracts";
import { clearAiTask, startAiTask, useAiTask } from "./ai-task-store";
import { useContextualHandoffs } from "./contextual-handoffs";

interface Props {
  readonly candidature: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly targetFieldIds: readonly string[];
  readonly taskId: string;
  readonly title: string;
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

export function CandidatureInferencePanel({
  candidature,
  fields,
  targetFieldIds,
  taskId,
  title,
}: Props) {
  const { openSettingsFor } = useContextualHandoffs();
  const task = useAiTask<JobExtractionResult>(taskId);
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

    startAiTask<JobExtractionResult>(
      taskId,
      async (updateDetail) => {
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
        return window.aaaat.ai.extractJob({
          sourceTitle: "Retained AAAAT candidature context",
          sourceUrl: "",
          sourceText: context,
        });
      },
      title,
      (result) => {
        const usable = result.proposals.filter((proposal) => targetSet.has(proposal.fieldId));
        return usable.length > 0
          ? `Completed · ${usable.length} proposal${usable.length === 1 ? "" : "s"} ready for review`
          : "Completed · no usable proposal";
      },
      targetFieldIds,
    );
  }, [aiReady, context, requestedFields, targetFieldIds, targetSet, task, taskId, title]);

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
