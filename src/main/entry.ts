import { app, safeStorage } from "electron";

import { configureAiCredentialProtection } from "./ai-connection-service";
import { isMcpInvocation, runMcpProcess } from "./mcp-server";
import {
  isWorkspaceBackupInvocation,
  isWorkspaceRestoreInvocation,
  runWorkspaceRecoveryProcess,
} from "./workspace-backup";

configureAiCredentialProtection({
  isSecure: () =>
    safeStorage.isEncryptionAvailable() &&
    (process.platform !== "linux" || safeStorage.getSelectedStorageBackend() !== "basic_text"),
  encryptString: (value) => safeStorage.encryptString(value),
  decryptString: (value) => safeStorage.decryptString(value),
});

if (isWorkspaceBackupInvocation(process.argv) || isWorkspaceRestoreInvocation(process.argv)) {
  void runWorkspaceRecoveryProcess(process.argv, process.stdout).then(
    (exitCode) => app.exit(exitCode),
    () => app.exit(2),
  );
} else if (isMcpInvocation(process.argv)) {
  void app.whenReady().then(
    () => {
      try {
        runMcpProcess(process.argv);
      } catch {
        app.exit(2);
      }
    },
    () => app.exit(2),
  );
} else {
  void import("./main");
}
