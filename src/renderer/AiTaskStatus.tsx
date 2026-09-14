import { clearAiTask, useAiTasks } from "./ai-task-store";

export function AiTaskStatus() {
  const tasks = useAiTasks();
  if (tasks.length === 0) return null;

  const active = tasks.filter((task) => task.status === "queued" || task.status === "working");
  const failed = tasks.filter((task) => task.status === "failed");
  const completed = tasks.filter((task) => task.status === "completed");
  const summary = active.length > 0
    ? `AI work · ${active.length} running`
    : failed.length > 0
      ? `AI work · ${failed.length} needs attention`
      : `AI work · ${completed.length} completed`;

  return (
    <details className="shell-ai-task-status">
      <summary>{summary}</summary>
      <div className="shell-ai-task-list">
        {tasks.map((task) => (
          <article key={task.key} className={`shell-ai-task shell-ai-task-${task.status}`}>
            <div>
              <strong>{task.label}</strong>
              <span>{task.status === "queued" ? "Queued" : task.status === "working" ? task.detail ?? "Working…" : task.status === "completed" ? "Completed" : "Failed"}</span>
              {task.error ? <small>{task.error}</small> : null}
            </div>
            {task.status === "completed" || task.status === "failed" ? (
              <button type="button" className="compact-secondary" onClick={() => clearAiTask(task.key)}>
                Dismiss
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </details>
  );
}
