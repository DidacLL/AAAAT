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
} from "./candidature-inference-context";
import { AiExchangeInspector } from "./AiExchangeInspector";
import { useContextualHandoffs } from "./contextual-handoffs";

interface InferenceTaskResult extends PartialJobExtractionResult {
  readonly appliedFieldIds?: readonly string[];
  readonly tagInference?: PartialTagInferenceResult;
  readonly tagInferenceError?: string;
  readonly tagInferenceFailureExchange?: AiExchangeDiagnostic;
  readonly fieldInferenceError?: string;
  readonly fieldInferenceFailureExchange?: AiExchangeDiagnostic;
}

export interface TagProposalReviewState {
  readonly handled: readonly string[];
  readonly drafts: Readonly<Record<number, TagInferenceNewTag>>;
  readonly aliases: Readonly<Record<number, string>>;
}

interface Props {
  readonly candidature: CandidatureRecord;
  readonly fields: readonly CandidatureFieldConfiguration[];
  readonly targetFieldIds: readonly string[];
  readonly taskId: string;
  readonly title: string;
  readonly includeTagInference?: boolean;
  readonly onChanged?: () => void | Promise<void>;
  readonly fieldRevision?: (fieldId: string) => number;
  readonly canFillField?: (fieldId: string) => boolean;
  readonly tagRevision?: () => number;
  readonly onTagEdit?: () => void;
  readonly initialTagReview?: TagProposalReviewState;
  readonly onTagReviewChange?: (taskId: string, review: TagProposalReviewState) => void;
}

function routeReady(
  connections: Awaited<ReturnType<typeof window.aaaat.aiConnections.list>>,
): boolean {
  return connections.some(
    (connection) =>
      connection.isDefault,
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
  fieldRevision,
  canFillField,
  tagRevision,
  onTagEdit,
  initialTagReview,
  onTagReviewChange,
}: Props) {
  const { openSettingsFor } = useContextualHandoffs();
  const task = useAiTask<InferenceTaskResult>(taskId);
  const [sources, setSources] = useState<CandidatureSource[] | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [handledTags, setHandledTags] = useState<Set<string>>(() => new Set(initialTagReview?.handled));
  const [tagDrafts, setTagDrafts] = useState<Readonly<Record<number, TagInferenceNewTag>>>(() => initialTagReview?.drafts ?? {});
  const [tagAliases, setTagAliases] = useState<Readonly<Record<number, string>>>(() => initialTagReview?.aliases ?? {});
  const [tagActionError, setTagActionError] = useState<string | null>(null);
  const [tagActionBusy, setTagActionBusy] = useState(false);
  useEffect(() => {
    if (includeTagInference) onTagReviewChange?.(taskId, { handled: [...handledTags], drafts: tagDrafts, aliases: tagAliases });
  }, [handledTags, includeTagInference, onTagReviewChange, tagAliases, tagDrafts, taskId]);
  const scopeFieldIds = task?.scopeFieldIds ?? targetFieldIds;
  const targetSet = useMemo(() => new Set(scopeFieldIds), [scopeFieldIds]);
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
  }, [candidature.id, includeTagInference, scopeFieldIds.length]);

  const fieldContext = useMemo(
    () => (
      sources === null
        ? ""
        : candidatureInferenceContext(candidature, fields, sources, targetSet)
    ),
    [candidature, fields, sources, targetSet],
  );
  const tagContext = useMemo(
    () => (sources === null ? "" : candidatureInferenceContext(candidature, fields, sources, new Set())),
    [candidature, fields, sources],
  );

  useEffect(() => {
    if (task || aiReady !== true || !fieldContext || (requestedFields.length === 0 && !includeTagInference)) return;

    startAiTask<InferenceTaskResult>(
      taskId,
      async (updateDetail, signal) => {
        const startedTagRevision = tagRevision?.() ?? 0;
        const revisions = new Map(requestedFields.map(field => [field.definition.id, fieldRevision?.(field.definition.id) ?? 0]));
        const complete = async (result: InferenceTaskResult): Promise<InferenceTaskResult> => {
          if (signal.aborted) return result;
          let currentSources: CandidatureSource[];
          let currentFields: CandidatureFieldConfiguration[];
          try {
            [currentSources, currentFields] = await Promise.all([window.aaaat.candidatures.listSources(candidature.id), window.aaaat.candidatures.listFields()]);
          } catch { return result; }
          if (JSON.stringify(currentSources) !== JSON.stringify(sources)) return result;
          const applied: string[] = [];
          for (const proposal of result.proposals) {
            if (signal.aborted) break;
            if (candidature.values.some(value => value.fieldId === proposal.fieldId)
              || canFillField?.(proposal.fieldId) === false
              || (fieldRevision?.(proposal.fieldId) ?? 0) !== revisions.get(proposal.fieldId)
              || !currentFields.some(field => field.definition.id === proposal.fieldId && field.definition.enabled && field.preferences.aiUseAllowed)) continue;
            try {
              const saved = await window.aaaat.candidatures.setFieldValue({ candidatureId: candidature.id, fieldId: proposal.fieldId, value: proposal.value, onlyIfEmpty: true });
              if (saved.values.some(value => value.fieldId === proposal.fieldId && JSON.stringify(value.value) === JSON.stringify(proposal.value))) applied.push(proposal.fieldId);
            } catch { /* Keep a valid proposal reviewable if it cannot be applied to current information. */ }
          }
          if (!signal.aborted && (tagRevision?.() ?? 0) === startedTagRevision && result.tagInference?.existingTags.length) {
            try {
              await window.aaaat.candidatures.setTags({ candidatureId: candidature.id, tagIds: result.tagInference.existingTags.map(tag => tag.tagId), append: true });
              setHandledTags(current => new Set([...current, ...result.tagInference!.existingTags.map(tag => `existing:${tag.tagId}`)]));
            } catch { /* Retain suggestions when current Tag associations cannot be updated. */ }
          }
          try { await onChanged?.(); } catch { /* Applying a useful result and refreshing its view are separate outcomes. */ }
          return { ...result, appliedFieldIds: applied };
        };
        updateDetail(
          requestedFields.length === 1
            ? `Finding ${requestedFields[0]?.definition.label ?? "this information"}…`
            : requestedFields.length ? `Finding ${requestedFields.length} missing values…` : "Finding Tags…",
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
          const fieldPromise = requestedFields.length ? window.aaaat.aiTasks.extractJob(taskId, {
            sourceTitle: "Retained AAAAT candidature context",
            sourceUrl: "",
            sourceText: fieldContext,
            targetFieldIds: requestedFields.map(field => field.definition.id),
          }) : Promise.resolve({ proposals: [], issues: [] });

          if (!includeTagInference || !tagContext) return await complete(await fieldPromise);

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

          return await complete({
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
          });
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
    candidature.id,
    candidature.values,
    sources,
    fieldContext,
    includeTagInference,
    requestedFields,
    tagContext,
    targetFieldIds,
    targetSet,
    task,
    taskId,
    title,
    fieldRevision,
    canFillField,
    onChanged,
    tagRevision,
  ]);

  const attachExistingTag = async (proposal: TagInferenceExistingTag) => {
    if (tagActionBusy) return;
    setTagActionBusy(true); setTagActionError(null);
    onTagEdit?.();
    try {
      await window.aaaat.candidatures.setTags({ candidatureId: candidature.id, tagIds: [proposal.tagId], append: true });
      setHandledTags((handled) => new Set(handled).add(`existing:${proposal.tagId}`));
      await onChanged?.();
    } catch (reason) { setTagActionError(aiTaskFailure(reason).message); }
    finally { setTagActionBusy(false); }
  };

  const createAndAttachTag = async (proposal: TagInferenceNewTag, index: number) => {
    if (tagActionBusy) return;
    setTagActionBusy(true); setTagActionError(null);
    onTagEdit?.();
    try {
      const tag = tagDrafts[index] ?? proposal;
      await window.aaaat.candidatures.createAndAttachTag({ candidatureId: candidature.id, tag: { name: tag.name, definition: tag.definition, aliases: tagAliases[index] === undefined ? tag.aliases : tagAliases[index].split(",").map(alias => alias.trim()).filter(Boolean) } });
      setHandledTags(handled => new Set(handled).add(`new:${index}`));
      await onChanged?.();
    } catch (reason) { setTagActionError(aiTaskFailure(reason).message); }
    finally { setTagActionBusy(false); }
  };

  if (requestedFields.length === 0 && !includeTagInference) {
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
      {tagActionError ? <p className="error-message" role="alert">{tagActionError}</p> : null}
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
                  <button type="button" disabled={tagActionBusy} onClick={() => void attachExistingTag(proposal)}>
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
            const proposed = tagDrafts[index] ?? proposal;
            const edit = (patch: Partial<TagInferenceNewTag>) => setTagDrafts(current => ({ ...current, [index]: { ...(current[index] ?? proposal), ...patch } }));
            if (handledTags.has(key)) return null;
            return (
              <article key={key}>
                <label>Name<input value={proposed.name} disabled={tagActionBusy} onChange={event => edit({ name: event.target.value })} /></label>
                <label>Definition<textarea value={proposed.definition} rows={3} disabled={tagActionBusy} onChange={event => edit({ definition: event.target.value })} /></label>
                <label>Aliases<input value={tagAliases[index] ?? proposed.aliases.join(", ")} disabled={tagActionBusy} onChange={event => setTagAliases(current => ({ ...current, [index]: event.target.value }))} /></label>
                {proposal.evidence ? (
                  <p className="compact-help">Evidence: {proposal.evidence}</p>
                ) : null}
                <div className="button-row">
                  <button
                    type="button"
                    disabled={tagActionBusy || !proposed.name.trim() || !proposed.definition.trim()}
                    onClick={() => void createAndAttachTag(proposal, index)}
                  >
                    Create
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
