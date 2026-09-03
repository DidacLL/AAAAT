import { app } from "electron";

import {
  isExternalCommandInvocation,
  runExternalCommandProcess,
} from "./external-command";
import { isMcpInvocation, runMcpProcess } from "./mcp-server";

if (isMcpInvocation(process.argv)) {
  void runMcpProcess(process.argv).then(
    () => app.exit(0),
    () => app.exit(2),
  );
} else if (isExternalCommandInvocation(process.argv)) {
  void runExternalCommandProcess(process.argv, process.stdin, process.stdout).then(
    (exitCode) => app.exit(exitCode),
    () => app.exit(2),
  );
} else {
  void import("./main");
}
