import { aiOperationLabels } from "../shared/ai-connection-contracts";
import type { SetupEnvironmentSnapshot } from "../shared/setup-environment-contracts";

export type SetupGuidanceArtifactName = "installer.ai" | "configurator.ai";

export interface SetupGuidanceArtifact {
  readonly name: SetupGuidanceArtifactName;
  readonly text: string;
}

function connectionCountLabel(count: number): string {
  return `${count} configured AI connection${count === 1 ? "" : "s"}`;
}

export function buildSetupGuidance(
  snapshot: SetupEnvironmentSnapshot,
): readonly [SetupGuidanceArtifact, SetupGuidanceArtifact] {
  const texLines = snapshot.tex.commands
    .map((command) => `- ${command.command}: ${command.available ? "available" : "missing"}.`)
    .join("\n");
  const operationLines = snapshot.ai.operations
    .map(
      (status) =>
        `- ${aiOperationLabels[status.operation]}: ${status.available ? "validated route available" : "no validated route"}.`,
    )
    .join("\n");

  const installer = `AAAAT free-chat setup guidance — installer.ai

Purpose: Help a non-developer prepare only the missing local software AAAAT already knows it needs.

Current AAAAT status:
- Configured workspace: ${snapshot.workspaceReady ? "available" : "unavailable"}.
${texLines}
- Document rendering: ${snapshot.tex.documentRenderingReady ? "ready" : "not ready"}.

Rules for this setup conversation:
- Reuse every working tool marked available. Do not replace or reinstall it merely for consistency.
- If a required TeX tool is missing, explain the normal official or graphical installation route for the user's actual operating system or TeX distribution. Ask which operating system/distribution they use before giving platform-specific steps.
- Do not assume shell commands, a package manager, administrator access, developer expertise, paid services, or hidden automation. Prefer ordinary installer/UI steps. If a command-line verification would help, make it optional and explain it.
- Do not modify AAAAT workspace files or any career/application data.
- Ask before any system-level change.
- After changes, tell the user to return to AAAAT Settings > Local setup status and choose Refresh environment.
${snapshot.tex.documentRenderingReady ? "- Document rendering is already ready. Say that no TeX installation is needed unless the user explicitly wants to change their setup." : "- Document rendering is not ready. Guide only the missing prerequisite(s) above."}`;

  const aiStatus = snapshot.ai.configurationReadable
    ? `${connectionCountLabel(snapshot.ai.connectionCount)}.`
    : "AAAAT cannot currently read the optional AI connection configuration. Do not infer connection state.";

  const configurator = `AAAAT free-chat setup guidance — configurator.ai

Purpose: Help a non-developer configure optional AI assistance through AAAAT's normal Settings UI.

Current AAAAT status:
- AI configuration: ${aiStatus}
${operationLines}

Rules for this setup conversation:
- AI is optional. Preserve complete manual use and do not pressure the user to configure a model or paid service.
- The current user-facing connection path supports loopback HTTP endpoints and remote HTTPS endpoints whose authentication is already handled outside AAAAT. Do not invent API keys, OAuth, provider accounts, or authentication capabilities that AAAAT has not reported.
- Guide changes only through AAAAT Settings. Do not ask the user to edit JSON, SQLite, workspace files, or hidden scripts.
- An operation may use only a connection validated for that operation. Do not recommend connection scanning, automatic alternate fallback, or an unvalidated operation default.
- If a desired operation has no validated route, explain how to add or select a connection in Settings, validate that specific operation, and then set an explicit operation default if useful.
- Do not request candidature, profile, Source, document, or other career/application content; this setup conversation does not need it.
- Treat suggestions as proposals. The user makes every configuration choice explicitly in AAAAT.
- If AAAAT reports that AI configuration is unreadable, do not guess. Tell the user to return to Settings, refresh the environment status, and resolve that setup problem first.`;

  return [
    { name: "installer.ai", text: installer },
    { name: "configurator.ai", text: configurator },
  ] as const;
}
