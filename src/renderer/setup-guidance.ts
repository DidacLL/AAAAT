import { aiOperationLabels } from "../shared/ai-connection-contracts";
import type { SetupEnvironmentSnapshot } from "../shared/setup-environment-contracts";

export type SetupHarnessName = "installer.ai" | "configurator.ai";
export type SetupHarnessState = "ready" | "attention" | "optional";

export interface SetupHarnessCheck {
  readonly label: string;
  readonly ready: boolean;
  readonly detail: string;
}

export interface SetupHarnessView {
  readonly name: SetupHarnessName;
  readonly title: string;
  readonly state: SetupHarnessState;
  readonly summary: string;
  readonly checks: readonly SetupHarnessCheck[];
  readonly externalCapability: string;
}

export function buildSetupGuidance(
  snapshot: SetupEnvironmentSnapshot,
): readonly [SetupHarnessView, SetupHarnessView] {
  const installerChecks: SetupHarnessCheck[] = [
    {
      label: "Workspace",
      ready: snapshot.workspaceReady,
      detail: snapshot.workspaceReady
        ? "The current local workspace is available."
        : "Choose or create a usable local workspace.",
    },
    ...snapshot.tex.commands.map((command) => ({
      label: command.command,
      ready: command.available,
      detail: command.available
        ? "Available on this computer."
        : "Required for local PDF rendering and not currently available.",
    })),
  ];
  const installerReady = snapshot.workspaceReady && snapshot.tex.documentRenderingReady;

  const configuratorChecks: SetupHarnessCheck[] = [
    {
      label: "AI configuration",
      ready: snapshot.ai.configurationReadable,
      detail: snapshot.ai.configurationReadable
        ? `${String(snapshot.ai.connectionCount)} configured AI connection${snapshot.ai.connectionCount === 1 ? "" : "s"}.`
        : "AAAAT cannot currently read the optional AI configuration.",
    },
    ...snapshot.ai.operations.map((status) => ({
      label: aiOperationLabels[status.operation],
      ready: status.available,
      detail: status.available
        ? "A validated route is available."
        : "No validated route is configured. Manual use remains available.",
    })),
  ];
  const anyAiRoute = snapshot.ai.operations.some((status) => status.available);

  return [
    {
      name: "installer.ai",
      title: "Installation & local prerequisites",
      state: installerReady ? "ready" : "attention",
      summary: installerReady
        ? "AAAAT and local document rendering are ready for ordinary use."
        : "AAAAT can keep working while the missing local prerequisite is resolved.",
      checks: installerChecks,
      externalCapability:
        "A connected assistant may always inspect this bounded prerequisite status. If the user explicitly enables installer.ai actions in Settings, it may also request AAAAT's fixed rendering self-test. It receives no shell, package-manager, arbitrary command, path selector or general filesystem authority.",
    },
    {
      name: "configurator.ai",
      title: "Optional AI configuration",
      state: !snapshot.ai.configurationReadable ? "attention" : anyAiRoute ? "ready" : "optional",
      summary: !snapshot.ai.configurationReadable
        ? "Optional AI configuration needs attention."
        : anyAiRoute
          ? "One or more bounded AI operations have a validated route."
          : "AI is optional; AAAAT remains fully usable without a configured route.",
      checks: configuratorChecks,
      externalCapability:
        "A connected assistant may always inspect this privacy-minimal configuration coverage. If the user explicitly enables configurator.ai actions in Settings, it may save a typed name/endpoint/model connection, ask AAAAT to validate one known operation, and select an already validated per-operation default. It cannot bypass validation, add credentials or arbitrary provider options, or gain generic machine authority.",
    },
  ] as const;
}
