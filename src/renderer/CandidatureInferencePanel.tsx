import { useEffect, useMemo, useState } from "react";

import type { AiExchangeDiagnostic } from "../shared/ai-diagnostics";
import type {
  PartialJobExtractionResult,
  PartialTagInferenceResult,
  TagInferenceExistingTag,
} from "../shared/ai-proposal-outcomes";
import type {
  TagInferenceNewTag,
} from "../shared/ai-contracts";
import type {
  CandidatureFieldConfiguration,
  CandidatureRecord,
  CandidatureSource,
} from "../shared/contracts";
import {
  aiTaskFailure,
  startAiTask,
  useAiTask,
} from "./ai-task-store";
import {
  candidatureInferenceContext,
  candidatureTagInferenceContext,
} from "./candidature-inference-context";
import { AiExchangeInspector } from "./AiExchangeInspector";
import { useContextualHandoffs } from "./contextual-handoffs";

interface InferenceTaskResult extends PartialJobExtractionResult {
  readonly tagInference?: PartialTagInferenceResult;
  readonly tagInferenceError?: string;
  readonly tagInferenceFailureExchange?: AiExchangeDiagnostic;
  readonly fieldInferenceError?: string;
  readonly fieldInferenceFailureExchange?: AiExchangeDiagnostic;
}

interface Props {
  readonly candidature: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly targetFieldIds: readonly string[];
  readonly taskId: string;
  readonly title: string;
  readonly includeTagInference?: boolean;
  readonly onChanged?: () => void | Promise<void>;
}

function routeReady(
  connections: Awaited<ReturnType<typeof window.aaaat.aiConnections.list>>,
): boolean {
  return connections.some(
    (connection) =>
      connection.defaultForOperations.includes("job_extraction") || connection.isDefault,
  );
}

export function CandidatureInferencePanel({
  candidature,
  fields,
  targetFieldIds,
  taskId,
  title,
  includeTagInference = false,
  onChanged,
}: Props) {
  const { openSettingsFor } = useContextualHandoffs();
  const task = useAiTask<InferenceTaskResult>(taskId);
  const [sources, setSources] = useState<CandidatureSource[] | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [handledTags, setHandledTags] = useState<Set<string>>(() => new Set());
  const targetSet = useMemo(() => new Set(targetFieldIds), [targetFieldIds]);
  const requestedFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          targetSet.has(field.definition.id)
          && field.definition.enabled
          && field.preferences.aiUseAllowed,
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

  const fieldContext = useMemo(
    () => (
      sources === null
        ? ""
        : candidatureInferenceContext(candidature, fields, sources, targetSet)
    ),
    [candidature, fields, sources, targetSet],
  );
  const tagContext = useMemo(
    () => (sources === null ? "" : candidatureTagInferenceContext(sources)),
    [sources],
  );

  useEffect(() => {
    if (task || aiReady !== true || !fieldContext || requestedFields.length === 0) return;

    startAiTask<InferenceTaskResult>(
      taskId,
      async (updateDetail, signal) => {
        updateDetail(
          requestedFields.length === 1
            ? `Finding ${requestedFields[0]?.definition.label ?? "this information"}…`
            : `Finding ${requestedFields.length} missing values…`,
        );

        const tagProviderTaskId = `${taskId}:tags`;
        const cancelProvider = () => {
          void window.aaaat.aiTasks.cancelJobExtraction(taskId).catch(() => undefined);
          if (includeTagInference && tagContext) {
            void window.aaaat.aiTasks.cancelTagInference(tagProviderTaskId).catch(() => undefined);
          }
        };
        signal.addEventListener("abort", cancelProvider, { once: true });

        try {
          const fieldPromise = window.aaaat.aiTasks.extractJob(taskId, {
            sourceTitle: "Retained AAAAT candidature context",
            sourceUrl: "",
            sourceText: fieldContext,
            targetFieldIds: [...targetFieldIds],
          });

          if (!includeTagInference || !tagContext) return await fieldPromise;

          const tagPromise = window.aaaat.aiTasks.inferTags(tagProviderTaskId, {
            sourceTitle: "Retained AAAAT candidature Sources",
            sourceUrl: "",
            sourceText: tagContext,
          });
          const [fieldOutcome, tagOutcome] = await Promise.allSettled([
            fieldPromise,
            tagPromise,
          ]);

          if (fieldOutcome.status === "rejected" && tagOutcome.status === "rejected") {
            throw fieldOutcome.reason;
          }

          const fieldFailure = fieldOutcome.status === "rejected"
            ? aiTaskFailure(fieldOutcome.reason)
            : null;
          const tagFailure = tagOutcome.status === "rejected"
            ? aiTaskFailure(tagOutcome.reason)
            : null;
          const fieldResult: PartialJobExtractionResult = fieldOutcome.status === "fulfilled"
            ? fieldOutcome.value
            : { proposals: [], issues: [] };

          return {
            ...fieldResult,
            ...(fieldFailure
              ? {
                  fieldInferenceError: fieldFailure.message,
                  ...(fieldFailure.exchange
                    ? { fieldInferenceFailureExchange: fieldFailure.exchange }
                    : {}),
                }
              : {}),
            ...(tagOutcome.status === "fulfilled"
              ? { tagInference: tagOutcome.value }
              : {}),
            ...(tagFailure
              ? {
                  tagInferenceError: tagFailure.message,
                  ...(tagFailure.exchange
                    ? { tagInferenceFailureExchange: tagFailure.exchange }
                    : {}),
                }
              : {}),
          };
        } finally {
          signal.removeEventListener("abort", cancelProvider);
        }
      },
      title,
      (result) => {
        const usable = result.proposals.filter((proposal) => targetSet.has(proposal.fieldId));
        const tagCount = result.tagInference
          ? result.tagInference.existingTags.length + result.tagInference.newTags.length
          : 0;
        const review = result.issues.length + (result.tagInference?.issues.length ?? 0);
        const degraded = Number(Boolean(result.fieldInferenceError)) + Number(Boolean(result.tagInferenceError));
        return `Completed · ${usable.length} value${usable.length === 1 ? "" : "s"} found${tagCount ? ` · ${tagCount} Tag suggestion${tagCount === 1 ? "" : "s"}` : ""}${review ? ` · ${review} needs review` : ""}${degraded ? ` · ${degraded} bounded request${degraded === 1 ? "" : "s"} unavailable` : ""}`;
      },
      targetFieldIds,
    );
  }, [
    aiReady,
    fieldContext,
    includeTagInference,
    requestedFields,
    tagContext,
    targetFieldIds,
    targetSet,
    task,
    taskId,
    title,
  ]);

  const attachExistingTag = async (proposal: TagInferenceExistingTag) => {
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

  const createAndAttachTag = async (proposal: TagInferenceNewTag, index: number) => {
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
    sources === null
    || aiReady === null
    || task?.status === "queued"
    || task?.status === "working"
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
  if (!fieldContext) {
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
      </div>
    );
  }

  const result = task?.status === "completed" ? task.result : undefined;
  if (!result) return null;
  const tagResult = result.tagInference;
  const hasTagReview = Boolean(
    includeTagInference
    && tagResult
    && (
      tagResult.existingTags.some(
        (proposal) =>
          !handledTags.has(`existing:${proposal.tagId}`)
          && !candidature.tagIds.includes(proposal.tagId),
      )
      || tagResult.newTags.some((_, index) => !handledTags.has(`new:${index}`))
      || tagResult.issues.length > 0
    ),
  );
  const hasDegradedResult = Boolean(result.fieldInferenceError || result.tagInferenceError);
  if (!hasTagReview && !hasDegradedResult) return null;

  return (
    <section className="candidature-tag-proposals" aria-label="AI suggestions">
      {result.fieldInferenceError ? (
        <div className="ai-task-failure candidature-inline-ai-message" role="alert">
          <span>
            Application information could not be inferred. Tag suggestions, if available, were kept.
          </span>
          <small>{result.fieldInferenceError}</small>
          {result.fieldInferenceFailureExchange ? (
            <AiExchangeInspector exchange={result.fieldInferenceFailureExchange} />
          ) : null}
        </div>
      ) : null}

      {result.tagInferenceError ? (
        <div className="ai-task-failure candidature-inline-ai-message" role="alert">
          <span>Tag suggestions were unavailable. Application-field results were kept.</span>
          <small>{result.tagInferenceError}</small>
          {result.tagInferenceFailureExchange ? (
            <AiExchangeInspector exchange={result.tagInferenceFailureExchange} />
          ) : null}
        </div>
      ) : null}

      {hasTagReview && tagResult ? (
        <>
          <h4>Tag suggestions</h4>
          {tagResult.existingTags.map((proposal) => {
            const key = `existing:${proposal.tagId}`;
            if (handledTags.has(key) || candidature.tagIds.includes(proposal.tagId)) return null;
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
          {tagResult.newTags.map((proposal, index) => {
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
          {tagResult.issues.length > 0 ? (
            <div className="candidature-field-ai-error" role="status">
              <strong>
                {tagResult.issues.length} Tag suggestion
                {tagResult.issues.length === 1 ? "" : "s"} could not be used
              </strong>
              {tagResult.issues.map((issue, index) => (
                <p key={index}>{issue.reason}</p>
              ))}
            </div>
          ) : null}
          {tagResult.exchange ? <AiExchangeInspector exchange={tagResult.exchange} /> : null}
        </>
      ) : null}
    </section>
  );
}
