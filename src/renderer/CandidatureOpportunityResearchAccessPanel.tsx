import { useEffect, useState } from "react";

import type {
  CandidatureAiTaskTemplate,
  CandidatureOpportunityResearchAccess,
  CandidatureOpportunityResearchTaskContext,
} from "../shared/candidature-opportunity-research-access-contracts";
import type { CandidatureRuntimeValue } from "../shared/contracts";
import { shippedCandidatureAiTaskTemplates } from "../shared/external-ai-task-templates";

const shippedTaskTemplates = shippedCandidatureAiTaskTemplates;

type BusyAction =
  | "open"
  | "close"
  | "save-template"
  | "delete-template"
  | "copy"
  | "export"
  | "retain"
  | "import";

function displayValue(value: CandidatureRuntimeValue): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function CandidatureOpportunityResearchAccessPanel({
  candidatureId,
  contextDirty,
}: {
  readonly candidatureId: string;
  readonly contextDirty: boolean;
}) {
  const [access, setAccess] = useState<CandidatureOpportunityResearchAccess | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [taskContext, setTaskContext] = useState<CandidatureOpportunityResearchTaskContext | null>(null);
  const [userTemplates, setUserTemplates] = useState<CandidatureAiTaskTemplate[]>([]);
  const [templateId, setTemplateId] = useState<string>(shippedTaskTemplates[0].id);
  const [selectedUserTemplateId, setSelectedUserTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [instruction, setInstruction] = useState<string>(shippedTaskTemplates[0].instruction);
  const [resultText, setResultText] = useState("");
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    let active = true;
    void Promise.all([api.current(candidatureId), api.taskTemplates()])
      .then(([current, templates]) => {
        if (!active) return;
        setAccess(current);
        setUserTemplates(templates);
        setTaskContext(null);
        setEditorOpen(false);
      })
      .catch(() => {
        if (active) setError("AAAAT could not prepare Send to my AI for this application.");
      });
    return () => {
      active = false;
    };
  }, [candidatureId, contextDirty]);

  useEffect(() => {
    if (!contextDirty || !access?.allowed) return;
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    let active = true;
    void api
      .update({ candidatureId, allowed: false })
      .then((saved) => {
        if (!active) return;
        setAccess(saved);
        setEditorOpen(false);
        setTaskContext(null);
        setMessage("Save or discard the application edits before sending it to AI.");
      })
      .catch(() => {
        if (active) setError("AAAAT could not refresh the external AI context after the application changed.");
      });
    return () => {
      active = false;
    };
  }, [access?.allowed, candidatureId, contextDirty]);

  const openEditor = async () => {
    if (contextDirty) return;
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    setBusy("open");
    setMessage(null);
    setError(null);
    try {
      const [saved, context, templates] = await Promise.all([
        api.update({ candidatureId, allowed: true }),
        api.taskContext(),
        api.taskTemplates(),
      ]);
      setAccess(saved);
      setTaskContext(context);
      setUserTemplates(templates);
      setEditorOpen(true);
    } catch {
      setError("AAAAT could not prepare this application for external AI.");
    } finally {
      setBusy(null);
    }
  };

  const closeEditor = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api) return;
    setBusy("close");
    setMessage(null);
    setError(null);
    try {
      const saved = await api.update({ candidatureId, allowed: false });
      setAccess(saved);
      setEditorOpen(false);
      setTaskContext(null);
    } catch {
      setError("AAAAT could not close the external AI task.");
    } finally {
      setBusy(null);
    }
  };

  const chooseTemplate = (nextId: string) => {
    const shipped = shippedTaskTemplates.find((candidate) => candidate.id === nextId);
    if (shipped) {
      setTemplateId(shipped.id);
      setSelectedUserTemplateId(null);
      setTemplateName("");
      setInstruction(shipped.instruction);
      setMessage(null);
      setError(null);
      return;
    }
    const id = nextId.startsWith("user:") ? nextId.slice(5) : "";
    const saved = userTemplates.find((candidate) => candidate.id === id);
    if (!saved) return;
    setTemplateId(`user:${saved.id}`);
    setSelectedUserTemplateId(saved.id);
    setTemplateName(saved.name);
    setInstruction(saved.instruction);
    setMessage(null);
    setError(null);
  };

  const saveTemplate = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !templateName.trim() || !instruction.trim()) return;
    setBusy("save-template");
    setMessage(null);
    setError(null);
    try {
      const saved = await api.saveTaskTemplate({
        id: selectedUserTemplateId ?? undefined,
        name: templateName,
        instruction,
      });
      const templates = await api.taskTemplates();
      setUserTemplates(templates);
      setTemplateId(`user:${saved.id}`);
      setSelectedUserTemplateId(saved.id);
      setTemplateName(saved.name);
      setInstruction(saved.instruction);
      setMessage(selectedUserTemplateId ? "Saved task updated." : "Reusable task saved.");
    } catch {
      setError("AAAAT could not save the reusable task.");
    } finally {
      setBusy(null);
    }
  };

  const deleteTemplate = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !selectedUserTemplateId) return;
    setBusy("delete-template");
    setMessage(null);
    setError(null);
    try {
      await api.deleteTaskTemplate(selectedUserTemplateId);
      const templates = await api.taskTemplates();
      setUserTemplates(templates);
      setTemplateId(shippedTaskTemplates[0].id);
      setSelectedUserTemplateId(null);
      setTemplateName("");
      setInstruction(shippedTaskTemplates[0].instruction);
      setMessage("Saved task deleted.");
    } catch {
      setError("AAAAT could not delete the reusable task.");
    } finally {
      setBusy(null);
    }
  };

  const copyTask = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !editorOpen || !instruction.trim()) return;
    setBusy("copy");
    setMessage(null);
    setError(null);
    try {
      await api.copyTask(instruction);
      setMessage("Task copied.");
    } catch {
      setError("AAAAT could not copy the task.");
    } finally {
      setBusy(null);
    }
  };

  const exportTask = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !editorOpen || !instruction.trim()) return;
    setBusy("export");
    setMessage(null);
    setError(null);
    try {
      const result = await api.exportTask(instruction);
      if (result === "exported") setMessage("Task file saved.");
    } catch {
      setError("AAAAT could not export the task.");
    } finally {
      setBusy(null);
    }
  };

  const retainResult = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !editorOpen || !resultText.trim()) return;
    setBusy("retain");
    setMessage(null);
    setError(null);
    try {
      await api.retainResult(resultText);
      setResultText("");
      setMessage("Result saved as a Source on this application.");
    } catch {
      setError("AAAAT could not save the pasted AI result.");
    } finally {
      setBusy(null);
    }
  };

  const importResult = async () => {
    const api = window.aaaat.candidatureOpportunityResearchAccess;
    if (!api || !editorOpen) return;
    setBusy("import");
    setMessage(null);
    setError(null);
    try {
      const result = await api.importResult();
      if (result === "imported") setMessage("Result saved as a Source on this application.");
    } catch {
      setError("AAAAT could not import the AI result.");
    } finally {
      setBusy(null);
    }
  };

  const disabled = busy !== null;

  return (
    <section className="manual-source-warning" aria-label="Send to my AI">
      <h3>Send to my AI</h3>
      {error ? <p className="error-message" role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}

      {!editorOpen ? (
        <>
          <p>
            {access?.allowed
              ? "Task access is ready. Open it when you want to review or send it."
              : "Choose or write a task for this application and use it with your preferred AI."}
          </p>
          {contextDirty ? (
            <p className="compact-help">Save or discard the application edits first.</p>
          ) : null}
          <button
            type="button"
            disabled={disabled || contextDirty || access === null}
            onClick={() => void openEditor()}
          >
            {busy === "open" ? "Opening…" : "Send to my AI"}
          </button>
        </>
      ) : (
        <>
          <label htmlFor={`ai-task-template-${candidatureId}`}>Task</label>
          <select
            id={`ai-task-template-${candidatureId}`}
            aria-label="Task template"
            value={templateId}
            disabled={disabled}
            onChange={(event) => chooseTemplate(event.currentTarget.value)}
          >
            <optgroup label="AAAAT tasks">
              {shippedTaskTemplates.map((template) => (
                <option key={template.id} value={template.id}>{template.label}</option>
              ))}
            </optgroup>
            {userTemplates.length > 0 ? (
              <optgroup label="My tasks">
                {userTemplates.map((template) => (
                  <option key={template.id} value={`user:${template.id}`}>{template.name}</option>
                ))}
              </optgroup>
            ) : null}
          </select>

          <label htmlFor={`ai-task-instruction-${candidatureId}`}>Instructions</label>
          <textarea
            id={`ai-task-instruction-${candidatureId}`}
            aria-label="Task instructions"
            rows={7}
            value={instruction}
            disabled={disabled}
            onChange={(event) => setInstruction(event.currentTarget.value)}
          />

          <label htmlFor={`ai-task-name-${candidatureId}`}>Reusable task name</label>
          <input
            id={`ai-task-name-${candidatureId}`}
            aria-label="Reusable task name"
            value={templateName}
            disabled={disabled}
            placeholder="My application review"
            onChange={(event) => setTemplateName(event.currentTarget.value)}
          />
          <div className="button-row">
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled || !templateName.trim() || !instruction.trim()}
              onClick={() => void saveTemplate()}
            >
              {busy === "save-template"
                ? "Saving…"
                : selectedUserTemplateId
                  ? "Update saved task"
                  : "Save as reusable task"}
            </button>
            {selectedUserTemplateId ? (
              <button
                type="button"
                className="compact-secondary"
                disabled={disabled}
                onClick={() => void deleteTemplate()}
              >
                {busy === "delete-template" ? "Deleting…" : "Delete saved task"}
              </button>
            ) : null}
          </div>

          <section aria-label="Context sent with task">
            <h4>Context</h4>
            {taskContext?.information.length ? (
              <dl>
                {taskContext.information.map(({ label, value }) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{displayValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="compact-help">No application information is available to AI for this task.</p>
            )}
          </section>

          <div className="button-row">
            <button
              type="button"
              disabled={disabled || !instruction.trim()}
              onClick={() => void copyTask()}
            >
              {busy === "copy" ? "Copying…" : "Copy task"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled || !instruction.trim()}
              onClick={() => void exportTask()}
            >
              {busy === "export" ? "Exporting…" : "Export file…"}
            </button>
          </div>

          <label htmlFor={`ai-result-${candidatureId}`}>Paste AI result</label>
          <textarea
            id={`ai-result-${candidatureId}`}
            aria-label="AI result"
            rows={6}
            value={resultText}
            disabled={disabled}
            onChange={(event) => setResultText(event.currentTarget.value)}
          />
          <div className="button-row">
            <button
              type="button"
              disabled={disabled || !resultText.trim()}
              onClick={() => void retainResult()}
            >
              {busy === "retain" ? "Saving…" : "Save result"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled}
              onClick={() => void importResult()}
            >
              {busy === "import" ? "Importing…" : "Import result…"}
            </button>
            <button
              type="button"
              className="compact-secondary"
              disabled={disabled}
              onClick={() => void closeEditor()}
            >
              {busy === "close" ? "Closing…" : "Close"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
