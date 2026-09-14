import { cancelAiTask, clearAiTask, useAiTasks } from "./ai-task-store";

export function AiTaskStatus() {
  const tasks = useAiTasks();
  if (tasks.length === 0) return null;

  const active = tasks.filter((task) => task.status === "queued" || task.status === "working");
  const failed = tasks.filter((task) => task.status === "failed");
  const completed = tasks.filter((task) => task.status === "completed");
  const cancelled = tasks.filter((task) => task.status === "cancelled");
  const overallStatus = active.length > 0 ? "working" : failed.length > 0 ? "failed" : "completed";
  const summary = active.length > 0
    ? `AI tasks · ${active.length} working`
    : failed.length > 0
      ? `AI tasks · ${failed.length} needs attention`
      : completed.length > 0
        ? `AI tasks · ${completed.length} completed`
        : `AI tasks · ${cancelled.length} cancelled`;

  return (
    <details className={`shell-ai-task-status shell-ai-task-status-${overallStatus}`} open={active.length > 0 || failed.length > 0}>
      <summary>{summary}</summary>
      <div className="shell-ai-task-list">
        {tasks.map((task) => (
          <article key={task.key} className={`shell-ai-task shell-ai-task-${task.status}`}>
            <div>
              <strong>{task.label}</strong>
              <span>
                {task.status === "queued"
                  ? "Queued"
                  : task.status === "working"
                    ? task.detail ?? "Working…"
                    : task.status === "completed"
                      ? task.detail ?? "Completed"
                      : task.status === "cancelled"
                        ? "Cancelled"
                        : "Failed"}
              </span>
              {task.error ? <small>{task.error}</small> : null}
            </div>
            {task.status === "queued" || task.status === "working" ? (
              <button type="button" className="compact-secondary" onClick={() => cancelAiTask(task.key)}>
                Cancel
              </button>
            ) : (
              <button type="button" className="compact-secondary" onClick={() => clearAiTask(task.key)}>
                Dismiss
              </button>
            )}
          </article>
        ))}
      </div>
    </details>
  );
}
