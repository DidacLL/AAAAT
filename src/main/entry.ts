import { app } from "electron";

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
} else {
  void import("./main");
}
