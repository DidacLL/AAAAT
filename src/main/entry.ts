import { app } from "electron";

import {
  isExternalCommandInvocation,
  runExternalCommandProcess,
} from "./external-command";
import { isMcpInvocation, runMcpProcess } from "./mcp-server";
import {
  isVscodeMcpSetupInvocation,
  runVscodeMcpSetupProcess,
} from "./vscode-mcp-setup";
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
} else if (isVscodeMcpSetupInvocation(process.argv)) {
  void runVscodeMcpSetupProcess(process.argv, process.execPath, process.stdout).then(
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
    import("./artifact-ipc"),
    import("./candidature-activity-ipc"),
    import("./candidature-opportunity-research-access-ipc"),
    import("./candidature-search-ipc"),
    import("./combined-document-ipc"),
    import("./cv-content-access-ipc"),
    import("./cv-descriptor-ipc"),
    import("./document-output-ipc"),
    import("./todo-ipc"),
    import("./focus-ipc"),
    import("./setup-environment-ipc"),
  ]).then(() => import("./main"));
}
