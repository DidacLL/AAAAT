import { clearAiTask, useAiTasks } from "./ai-task-store";

export function AiTaskStatus() {
  const tasks = useAiTasks();
  if (tasks.length === 0) return null;

  const active = tasks.filter((task) => task.status === "queued" || task.status === "working");
  const failed = tasks.filter((task) => task.status === "failed");
  const completed = tasks.filter((task) => task.status === "completed");
  const overallStatus = active.length > 0 ? "working" : failed.length > 0 ? "failed" : "completed";
  const summary = active.length > 0
    ? `AI tasks · ${active.length} working`
    : failed.length > 0
      ? `AI tasks · ${failed.length} needs attention`
      : `AI tasks · ${completed.length} completed`;

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
                      : "Failed"}
              </span>
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
