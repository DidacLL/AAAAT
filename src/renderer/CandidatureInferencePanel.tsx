import { useEffect, useMemo, useState } from "react";

import type { JobExtractionResult } from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
} from "../shared/contracts";
import { CandidatureFieldValueEditor } from "./CandidatureFieldValueEditor";
import { startAiTask, useAiTask } from "./ai-task-store";
import { useContextualHandoffs } from "./contextual-handoffs";

interface Props {
  readonly candidature: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly targetFieldIds: readonly string[];
  readonly taskId: string;
  readonly title: string;
  readonly onSaveValue: (fieldId: string, value: CandidatureRuntimeValue) => Promise<void>;
  readonly onClose: () => void;
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
  onSaveValue,
  onClose,
}: Props) {
  const { openSettingsFor } = useContextualHandoffs();
  const task = useAiTask<JobExtractionResult>(taskId);
  const [sources, setSources] = useState<CandidatureSource[] | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [handledFieldIds, setHandledFieldIds] = useState<ReadonlySet<string>>(new Set());
  const targetSet = useMemo(() => new Set(targetFieldIds), [targetFieldIds]);
  const requestedFields = fields.filter(
    (field) => targetSet.has(field.definition.id) && field.definition.enabled && field.preferences.aiDiscovery,
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
  }, [candidature.id, task?.status]);

  const context = sources === null ? "" : sourceContext(candidature, fields, sources, targetSet);
  const active = task?.status === "queued" || task?.status === "working";
  const proposals = (task?.result?.proposals ?? []).filter(
    (proposal) => targetSet.has(proposal.fieldId) && !handledFieldIds.has(proposal.fieldId),
  );
  const requestLabel = requestedFields.length === 1
    ? `Ask AI to find ${requestedFields[0]?.definition.label ?? "this information"}`
    : "Ask AI to find missing information";

  const start = () => {
    if (!context || requestedFields.length === 0) return;
    startAiTask<JobExtractionResult>(taskId, async (updateDetail) => {
      updateDetail(
        `Looking through retained Sources and information for ${requestedFields.length === 1 ? requestedFields[0]?.definition.label ?? "this information" : `${requestedFields.length} missing items`}. Slow local models can take several minutes.`,
      );
      return window.aaaat.ai.extractJob({
        sourceTitle: "Retained AAAAT candidature context",
        sourceUrl: "",
        sourceText: context,
      });
    });
  };

  const markHandled = (fieldId: string) => {
    setHandledFieldIds((current) => new Set([...current, fieldId]));
  };

  return (
    <section className="candidature-inference-panel" aria-label="Candidature AI suggestions">
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">AI suggestions</p>
          <h4>{title}</h4>
          <p>
            AAAAT can look through retained Sources and information you allow AI to use. Nothing changes until you accept a suggestion.
          </p>
        </div>
        <button type="button" className="compact-secondary" onClick={onClose}>Hide</button>
      </div>

      {requestedFields.length === 0 ? (
        <p className="compact-help">AI suggestions are turned off for this information. You can change that under the secondary information customization controls.</p>
      ) : sources === null || aiReady === null ? (
        <p role="status">Checking whether AI is ready for this request…</p>
      ) : !aiReady ? (
        <div className="ai-task-failure">
          <p>AI is not ready for this action yet. Open AI settings to check the connection. Manual editing remains available.</p>
          <button type="button" className="compact-secondary" onClick={() => openSettingsFor("ai", "candidatures")}>
            Open AI settings
          </button>
        </div>
      ) : !context ? (
        <p className="compact-help">Keep some Source text or information allowed for AI use before asking AI to find a value.</p>
      ) : (
        <>
          <details className="ai-disclosure-preview">
            <summary>What this request will send</summary>
            <pre>{context}</pre>
          </details>

          {task?.status === "queued" ? (
            <p role="status" className="ai-task-state">Queued. You can keep editing this candidature while AAAAT waits for the model.</p>
          ) : task?.status === "working" ? (
            <p role="status" className="ai-task-state">{task.detail ?? "Working…"}</p>
          ) : task?.status === "failed" ? (
            <div className="ai-task-failure" role="alert">
              <strong>AI could not finish this request</strong>
              <p>{task.error}</p>
            </div>
          ) : null}

          {!task || task.status === "failed" ? (
            <button type="button" disabled={active} onClick={start}>
              {task?.status === "failed" ? "Retry AI request" : requestLabel}
            </button>
          ) : null}

          {task?.status === "completed" && proposals.length === 0 ? (
            <div>
              <p role="status">AI finished but did not find a usable value for this information.</p>
              <button type="button" className="compact-secondary" onClick={start}>Try again</button>
            </div>
          ) : null}

          {proposals.length > 0 ? (
            <div className="ai-proposal-list" aria-label="AI proposals">
              {proposals.map((proposal) => {
                const field = fields.find((candidate) => candidate.definition.id === proposal.fieldId);
                if (!field) return null;
                const existing = candidature.values.some((value) => value.fieldId === proposal.fieldId);
                return (
                  <article key={proposal.fieldId} className="retained-information-card ai-proposal-card">
                    <div>
                      <strong>{field.definition.label}</strong>
                      <p>{existing ? "Suggested replacement. The current value stays unchanged until you save." : "Suggested value. Nothing is retained until you save."}</p>
                    </div>
                    <CandidatureFieldValueEditor
                      field={field}
                      value={proposal.value}
                      initialEditing
                      saveLabel="Use suggestion"
                      clearLabel="Reject suggestion"
                      onSave={async (value) => {
                        await onSaveValue(field.definition.id, value);
                        markHandled(field.definition.id);
                      }}
                      onClear={async () => markHandled(field.definition.id)}
                    />
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
