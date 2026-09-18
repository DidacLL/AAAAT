import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { aiOperations } from "../src/shared/ai-connection-contracts";

vi.mock("../src/renderer/CandidaturesAiWorkspace", () => ({
  CandidaturesAiWorkspace: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => {
    const [draft, setDraft] = useState("");
    return (
      <section>
        Applications
        <input
          aria-label="Mock application draft"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            onDirtyChange?.(event.target.value.length > 0);
          }}
        />
      </section>
    );
  },
}));
vi.mock("../src/renderer/DocumentsStartWorkspace", () => ({
  DocumentsStartWorkspace: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => {
    const [title, setTitle] = useState("");
    return (
      <section>
        CVs
        <input
          aria-label="Mock CV title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            onDirtyChange?.(event.target.value.length > 0);
          }}
        />
      </section>
    );
  },
}));
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
  it("actually discards mounted work after confirming return Home", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App />);

    const home = await screen.findByRole("region", { name: "Home" });
    await user.click(within(home).getByRole("button", { name: /Open applications/ }));
    const draft = screen.getByRole("textbox", { name: "Mock application draft" });
    await user.type(draft, "unsaved");
    expect(draft).toHaveValue("unsaved");

    await user.click(screen.getByRole("button", { name: "Home" }));
    expect(window.confirm).toHaveBeenCalledWith("Discard unsaved edits and return home?");

    const returnedHome = await screen.findByRole("region", { name: "Home" });
    await user.click(within(returnedHome).getByRole("button", { name: /Open applications/ }));
    expect(screen.getByRole("textbox", { name: "Mock application draft" })).toHaveValue("");
  });

  it("protects an unsaved CV start draft when leaving the CV surface", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    const home = await screen.findByRole("region", { name: "Home" });
    await user.click(within(home).getByRole("button", { name: "Open CVs" }));
    const title = screen.getByRole("textbox", { name: "Mock CV title" });
    await user.type(title, "Unsaved CV");
    await user.click(screen.getByRole("button", { name: "Applications" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved edits and leave this work?");
    expect(screen.getByRole("textbox", { name: "Mock CV title" })).toHaveValue("Unsaved CV");

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Applications" }));
    expect(screen.getByRole("button", { name: "Applications" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps a branded useful Home while persistent environment state stays in the rail", async () => {
    const user = userEvent.setup();
    render(<App />);

    const home = await screen.findByRole("region", { name: "Home" });
    expect(within(home).getByAltText("AAAAT explorer robot holding a magnifying glass")).toBeInTheDocument();
    expect(home).toHaveTextContent("Your application work, on your computer.");
    expect(home).toHaveTextContent("rail-demo");
    expect(within(home).getByRole("button", { name: /Open applications/ })).toBeInTheDocument();
    expect(within(home).getByRole("button", { name: "Open CVs" })).toBeInTheDocument();
    expect(within(home).getByRole("button", { name: "New workspace" })).toBeInTheDocument();
    expect(within(home).getByRole("button", { name: "Open existing workspace" })).toBeInTheDocument();
    expect(within(home).getByRole("button", { name: "Open demo" })).toBeInTheDocument();
    expect(within(home).queryByText(/Data:/)).not.toBeInTheDocument();
    expect(within(home).queryByText(/AI:/)).not.toBeInTheDocument();
    expect(within(home).queryByText(/PDF:/)).not.toBeInTheDocument();

    const status = await screen.findByLabelText("Environment status");
    expect(status).toHaveTextContent("Data: Demo");
    expect(status).toHaveTextContent("AI: Needs attention");
    await waitFor(() => expect(status).toHaveTextContent("PDF: Ready"));

    await user.click(within(home).getByRole("button", { name: /Open applications/ }));
    expect(screen.getByRole("button", { name: "Applications" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByLabelText("Environment status")).toBe(status);

    await user.click(screen.getByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("region", { name: "Mock settings" })).toBeInTheDocument();
    expect(screen.getByLabelText("Environment status")).toBe(status);
  });
});
