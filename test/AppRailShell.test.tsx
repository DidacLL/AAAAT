import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aiOperations } from "../src/shared/ai-connection-contracts";

vi.mock("../src/renderer/CandidaturesAiWorkspace", () => ({ CandidaturesAiWorkspace: () => <section>Applications</section> }));
vi.mock("../src/renderer/DocumentsStartWorkspace", () => ({ DocumentsStartWorkspace: () => <section>CVs</section> }));
vi.mock("../src/renderer/DocumentsWorkspace", () => ({ DocumentsWorkspace: () => <section>Document</section> }));
vi.mock("../src/renderer/ProfileWorkspace", () => ({ ProfileWorkspace: () => <section>Profile</section> }));
vi.mock("../src/renderer/CareerContextPanel", () => ({ CareerContextPanel: () => <section>Career</section> }));
vi.mock("../src/renderer/AiTaskStatus", () => ({ AiTaskStatus: () => null }));
vi.mock("../src/renderer/WorkspaceRecoveryPanel", () => ({ WorkspaceRecoveryPanel: () => null }));
vi.mock("../src/renderer/SettingsWorkspace", () => ({
  SettingsWorkspace: () => <section aria-label="Mock settings">Settings panel</section>,
}));

import { App } from "../src/renderer/App";

const workspace = { rootPath: "/tmp/rail-demo" };
const readyEnvironment = {
  workspaceReady: true,
  tex: {
    commands: [
      { command: "latexmk" as const, available: true, version: "Latexmk" },
      { command: "pdflatex" as const, available: true, version: "pdfTeX" },
    ],
    documentRenderingReady: true,
  },
  ai: {
    configurationReadable: true,
    connectionCount: 1,
    operations: aiOperations.map((operation, index) => ({
      operation,
      available: index === 0,
      connectionName: index === 0 ? "Local model" : null,
    })),
  },
};

beforeEach(() => {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      workspace: {
        current: async () => workspace,
        recent: async () => workspace.rootPath,
        status: async () => ({ demo: true }),
      },
      setupEnvironment: { current: async () => readyEnvironment },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("loaded workspace shell", () => {
  it("keeps Data, AI and PDF state in the persistent rail and leaves loaded Home free of duplicate environment widgets", async () => {
    const user = userEvent.setup();
    render(<App />);

    const home = await screen.findByRole("region", { name: "Home" });
    expect(home).toHaveTextContent("rail-demo");
    expect(within(home).queryByText(/Data:/)).not.toBeInTheDocument();
    expect(within(home).queryByRole("button")).not.toBeInTheDocument();

    const status = await screen.findByLabelText("Environment status");
    expect(status).toHaveTextContent("Data: Demo");
    expect(status).toHaveTextContent("AI: Ready");
    expect(status).toHaveTextContent("PDF: Ready");

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("region", { name: "Mock settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Environment status")).toBe(status);
  });
});
