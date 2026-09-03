import { app } from "electron";

import {
  isExternalCommandInvocation,
  runExternalCommandProcess,
} from "./external-command";

if (isExternalCommandInvocation(process.argv)) {
  void runExternalCommandProcess(process.argv, process.stdin, process.stdout).then(
    (exitCode) => app.exit(exitCode),
    () => app.exit(2),
  );
} else {
  void import("./main");
}
