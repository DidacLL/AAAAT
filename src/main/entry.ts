import { app } from "electron";

import {
  isExternalCommandInvocation,
  runExternalCommandProcess,
} from "./external-command";
import { isMcpInvocation, runMcpProcess } from "./mcp-server";
import {
  isWorkspaceBackupInvocation,
  isWorkspaceRestoreInvocation,
  runWorkspaceRecoveryProcess,
} from "./workspace-backup";

if (isWorkspaceBackupInvocation(process.argv) || isWorkspaceRestoreInvocation(process.argv)) {
  void runWorkspaceRecoveryProcess(process.argv, process.stdout).then(
    (exitCode) => app.exit(exitCode),
    () => app.exit(2),
  );
} else if (isMcpInvocation(process.argv)) {
  try {
    runMcpProcess(process.argv);
  } catch {
    app.exit(2);
  }
} else if (isExternalCommandInvocation(process.argv)) {
  void runExternalCommandProcess(process.argv, process.stdin, process.stdout).then(
    (exitCode) => app.exit(exitCode),
    () => app.exit(2),
  );
} else {
  void Promise.all([
    import("./ai-connection-ipc"),
    import("./ai-prompt-ipc"),
    import("./candidature-activity-ipc"),
    import("./candidature-opportunity-research-access-ipc"),
    import("./candidature-search-ipc"),
    import("./career-context-ai-disclosure-ipc"),
    import("./document-domain-ipc"),
    import("./profile-ai-context-ipc"),
    import("./profile-variant-ipc"),
    import("./setup-environment-ipc"),
    import("./setup-assistant-ipc"),
  ]).then(() => import("./main"));
}
