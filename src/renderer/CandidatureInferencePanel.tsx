import { useEffect, useMemo, useState } from "react";

import type { JobExtractionNewField, JobExtractionNewTag } from "../shared/ai-contracts";
import type {
  JobExtractionExistingTag,
  PartialJobExtractionResult,
} from "../shared/ai-proposal-outcomes";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureRuntimeValue,
  CandidatureSource,
} from "../shared/contracts";
import { compactSourceText } from "../shared/source-text";
import { clearAiTask, startAiTask, useAiTask } from "./ai-task-store";
import { useContextualHandoffs } from "./contextual-handoffs";

type InferenceTaskResult = PartialJobExtractionResult;

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

function routeReady(
  connections: Awaited<ReturnType<typeof window.aaaat.aiConnections.list>>,
): boolean {
  return connections.some(
    (connection) =>
      connection.defaultForOperations.includes("job_extraction") || connection.isDefault,
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
    if (!field?.preferences.aiUseAllowed) return [];
    return [`${field.definition.label}: ${displayValue(field, item.value)}`];
  });

  const parts = sources.map((source, index) =>
    [
      `Retained Source ${index + 1}`,
      source.title ? `Title: ${source.title}` : "",
      source.url ? `URL: ${source.url}` : "",
      compactSourceText(source.sourceText),
    ]
      .filter(Boolean)
      .join("\n"),
  );

  if (retained.length > 0) {
    parts.push(
      `Already retained information allowed for AI use:\n${retained.join("\n")}`,
    );
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

  const byLabel = new Map(
    choices.map((choice) => [normalizedLabel(choice.label), choice.id]),
  );
  const mapOne = (value: string | number | boolean): string | null =>
    typeof value === "string" ? (byLabel.get(normalizedLabel(value)) ?? null) : null;

  if (Array.isArray(suggestion.value)) {
    const mapped = suggestion.value.map(mapOne);
    return mapped.every((value): value is string => value !== null) ? mapped : null;
  }
  return mapOne(suggestion.value);
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
  const [handledTags, setHandledTags] = useState<Set<string>>(() => new Set());
  const [handledNewFields, setHandledNewFields] = useState<Set<number>>(() => new Set());
  const [newFieldError, setNewFieldError] = useState<string | null>(null);
  const targetSet = useMemo(() => new Set(targetFieldIds), [targetFieldIds]);
  const requestedFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          targetSet.has(field.definition.id) &&
          field.definition.enabled &&
          field.preferences.aiUseAllowed,
      ),
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
            targetFieldIds: [...targetFieldIds],
          });
        } finally {
          signal.removeEventListener("abort", cancelProvider);
        }

        return result;
      },
      title,
      (result) => {
        const usable = result.proposals.filter((proposal) => targetSet.has(proposal.fieldId));
        const newFieldCount = allowNewFields ? result.newFields.length : 0;
        const tagCount = allowNewFields ? result.existingTags.length + result.newTags.length : 0;
        const review = result.issues.length;
        return `Completed · ${usable.length} value${usable.length === 1 ? "" : "s"} found${newFieldCount ? ` · ${newFieldCount} new field suggestion${newFieldCount === 1 ? "" : "s"}` : ""}${tagCount ? ` · ${tagCount} Tag suggestion${tagCount === 1 ? "" : "s"}` : ""}${review ? ` · ${review} needs review` : ""}`;
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

  const createAndUseField = async (proposal: JobExtractionNewField, index: number) => {
    setNewFieldError(null);
    const choices = createChoices(proposal);
    const value = createdValue(proposal, choices);
    if (value === null) {
      setNewFieldError(`AAAAT could not map the proposed value for ${proposal.label} to its choices.`);
      return;
    }

    let created: CandidatureFieldConfiguration | null = null;
    try {
      created = await window.aaaat.candidatures.createField({
        label: proposal.label,
        description: proposal.description,
        valueType: proposal.valueType,
        cardinality: proposal.cardinality,
        choices,
        enabled: true,
      });
      await window.aaaat.candidatures.setFieldValue({
        candidatureId: candidature.id,
        fieldId: created.definition.id,
        value,
      });
      setHandledNewFields((handled) => new Set(handled).add(index));
      await onChanged?.();
    } catch (reason) {
      if (created) {
        try {
          await window.aaaat.candidatures.deleteField(created.definition.id);
        } catch {
          // If another action started using the new field, keep it rather than deleting shared data.
        }
      }
      setNewFieldError(
        reason instanceof Error
          ? reason.message
          : `AAAAT could not create ${proposal.label}.`,
      );
    }
  };

  const attachExistingTag = async (proposal: JobExtractionExistingTag) => {
    const current = (await window.aaaat.candidatures.list()).find(
      (item) => item.id === candidature.id,
    );
    if (!current) return;

    await window.aaaat.candidatures.setTags({
      candidatureId: candidature.id,
      tagIds: [...new Set([...current.tagIds, proposal.tagId])],
    });
    setHandledTags((handled) => new Set(handled).add(`existing:${proposal.tagId}`));
    await onChanged?.();
  };

  const createAndAttachTag = async (proposal: JobExtractionNewTag, index: number) => {
    const tag = await window.aaaat.candidatures.createTag({
      name: proposal.name,
      definition: proposal.definition,
      aliases: proposal.aliases,
    });
    const current = (await window.aaaat.candidatures.list()).find(
      (item) => item.id === candidature.id,
    );
    if (!current) return;

    await window.aaaat.candidatures.setTags({
      candidatureId: candidature.id,
      tagIds: [...new Set([...current.tagIds, tag.id])],
    });
    setHandledTags((handled) => new Set(handled).add(`new:${index}`));
    await onChanged?.();
  };

  if (requestedFields.length === 0) {
    return <p className="compact-help">This information is not available for AI use.</p>;
  }
  if (
    sources === null ||
    aiReady === null ||
    task?.status === "queued" ||
    task?.status === "working"
  ) {
    return null;
  }
  if (!aiReady) {
    return (
      <div className="ai-task-failure candidature-inline-ai-message">
        <span>AI is not ready for this request.</span>
        <button
          type="button"
          className="compact-secondary"
          onClick={() => openSettingsFor("ai", "candidatures")}
        >
          Open AI settings
        </button>
      </div>
    );
  }
  if (!context) {
    return (
      <p className="compact-help candidature-inline-ai-message">
        Keep some Source text or retained information available to AI before asking for this value.
      </p>
    );
  }
  if (task?.status === "failed") {
    return (
      <div className="ai-task-failure candidature-inline-ai-message" role="alert">
        <span>{task.error}</span>
        <button
          type="button"
          className="compact-secondary"
          onClick={() => clearAiTask(taskId)}
        >
          Retry
        </button>
      </div>
    );
  }

  const result = task?.status === "completed" ? task.result : undefined;
  const newFieldSuggestions = result
    ? result.newFields
        .map((proposal, index) => ({ proposal, index }))
        .filter(({ index }) => !handledNewFields.has(index))
    : [];
  const showSuggestionReview =
    allowNewFields &&
    result &&
    (newFieldSuggestions.length > 0 || result.existingTags.length > 0 || result.newTags.length > 0);
  if (!showSuggestionReview) return null;

  return (
    <section className="candidature-tag-proposals" aria-label="AI suggestions">
      <h4>AI suggestions</h4>
      {newFieldError ? <p className="error-message" role="alert">{newFieldError}</p> : null}
      {newFieldSuggestions.map(({ proposal, index }) => (
        <article key={`new-field:${index}`}>
          <strong>{proposal.label}</strong>
          <p>{proposal.description}</p>
          <p className="compact-help">
            Proposed value: {Array.isArray(proposal.value) ? proposal.value.map(String).join(", ") : String(proposal.value)}
          </p>
          <div className="button-row">
            <button type="button" onClick={() => void createAndUseField(proposal, index)}>
              Create and use
            </button>
            <button
              type="button"
              className="compact-secondary"
              onClick={() => setHandledNewFields((handled) => new Set(handled).add(index))}
            >
              Ignore
            </button>
          </div>
        </article>
      ))}
      {result.existingTags.length > 0 || result.newTags.length > 0 ? <h5>Tag suggestions</h5> : null}
      {result.existingTags.map((proposal) => {
        const key = `existing:${proposal.tagId}`;
        if (handledTags.has(key)) return null;
        return (
          <article key={key}>
            <strong>{proposal.name}</strong>
            {proposal.evidence ? <p>{proposal.evidence}</p> : null}
            <div className="button-row">
              <button type="button" onClick={() => void attachExistingTag(proposal)}>
                Attach Tag
              </button>
              <button
                type="button"
                className="compact-secondary"
                onClick={() =>
                  setHandledTags((handled) => new Set(handled).add(key))
                }
              >
                Ignore
              </button>
            </div>
          </article>
        );
      })}
      {result.newTags.map((proposal, index) => {
        const key = `new:${index}`;
        if (handledTags.has(key)) return null;
        return (
          <article key={key}>
            <strong>{proposal.name}</strong>
            <p>{proposal.definition}</p>
            {proposal.aliases.length ? (
              <p className="compact-help">Also: {proposal.aliases.join(", ")}</p>
            ) : null}
            {proposal.evidence ? (
              <p className="compact-help">Evidence: {proposal.evidence}</p>
            ) : null}
            <div className="button-row">
              <button
                type="button"
                onClick={() => void createAndAttachTag(proposal, index)}
              >
                Create and attach
              </button>
              <button
                type="button"
                className="compact-secondary"
                onClick={() =>
                  setHandledTags((handled) => new Set(handled).add(key))
                }
              >
                Ignore
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
}
