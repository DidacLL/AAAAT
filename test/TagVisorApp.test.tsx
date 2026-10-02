import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  activeRoot: "/tmp/tag-workspace-a",
  tagSets: {} as Record<string, Array<{
    id: string;
    name: string;
    aliases: string[];
    definition: string;
    notes?: string;
  }>>,
}));

vi.mock("../src/renderer/CandidaturesAiWorkspace", async () => {
  const { useEffect, useState } = await import("react");
  return {
    CandidaturesAiWorkspace: ({
      onTagContextChange,
    }: {
      onDirtyChange?: (dirty: boolean) => void;
      onTagContextChange?: (context: {
        candidatureId: string;
        tags: Array<{ id: string; name: string; aliases: string[]; definition: string; notes?: string }>;
      } | null) => void;
    }) => {
      const [draft, setDraft] = useState("");
      const [revision, setRevision] = useState(0);
      useEffect(() => {
        onTagContextChange?.({
          candidatureId: "00000000-0000-4000-8000-000000003695",
          tags: state.tagSets[state.activeRoot] ?? [],
        });
        return () => onTagContextChange?.(null);
      }, [onTagContextChange, revision]);
      return (
        <section aria-label="Applications mock">
          <input aria-label="Application draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button
            type="button"
            onClick={() => {
              state.tagSets[state.activeRoot] = (state.tagSets[state.activeRoot] ?? []).map((tag) =>
                tag.name === "Reliability engineering"
                  ? { ...tag, definition: "Updated shared reliability meaning" }
                  : tag,
              );
              setRevision((current) => current + 1);
            }}
          >
            Update shared Tag
          </button>
          <button
            type="button"
            onClick={() => {
              state.tagSets[state.activeRoot] = [
                ...(state.tagSets[state.activeRoot] ?? []),
                {
                  id: "00000000-0000-4000-8000-000000003699",
                  name: "Aviation safety",
                  aliases: ["Safety"],
                  definition: "Shared safety vocabulary",
                },
              ];
              setRevision((current) => current + 1);
            }}
          >
            Create shared Tag
          </button>
        </section>
      );
    },
  };
});
vi.mock("../src/renderer/DocumentsStartWorkspace", () => ({
  DocumentsStartWorkspace: () => <section aria-label="CVs mock">CVs</section>,
}));
vi.mock("../src/renderer/DocumentsWorkspace", () => ({
  DocumentsWorkspace: () => <section aria-label="Document mock">Document</section>,
}));
vi.mock("../src/renderer/ProfileWorkspace", () => ({
  ProfileWorkspace: () => <section aria-label="Profile mock">Profile</section>,
}));
vi.mock("../src/renderer/CareerContextPanel", () => ({
  CareerContextPanel: () => <section aria-label="Career mock">Career</section>,
}));
vi.mock("../src/renderer/AiTaskStatus", () => ({ AiTaskStatus: () => null }));
vi.mock("../src/renderer/WorkspaceRailStatus", () => ({ WorkspaceRailStatus: () => null }));
vi.mock("../src/renderer/WorkspaceRecoveryPanel", () => ({ WorkspaceRecoveryPanel: () => null }));
vi.mock("../src/renderer/SettingsWorkspace", () => ({
  SettingsWorkspace: ({
    onChooseWorkspace,
    onWorkspaceReset,
    onRestored,
  }: {
    onChooseWorkspace: (choice: "create" | "open") => void;
    onWorkspaceReset: (workspace: { rootPath: string }) => void;
    onRestored: (workspace: { rootPath: string }) => void;
  }) => (
    <section aria-label="Settings mock">
      <button type="button" onClick={() => {
        state.activeRoot = "/tmp/tag-workspace-b";
        onChooseWorkspace("open");
      }}>Switch workspace</button>
      <button type="button" onClick={() => {
        state.tagSets[state.activeRoot] = [{
          id: "00000000-0000-4000-8000-000000003698",
          name: "Reset vocabulary",
          aliases: [],
          definition: "Vocabulary loaded after reset",
        }];
        onWorkspaceReset({ rootPath: state.activeRoot });
      }}>Reset workspace</button>
      <button type="button" onClick={() => {
        state.activeRoot = "/tmp/tag-workspace-c";
        onRestored({ rootPath: state.activeRoot });
      }}>Restore workspace</button>
    </section>
  ),
}));

import { App } from "../src/renderer/App";

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      workspace: {
        current: vi.fn(async () => ({ rootPath: state.activeRoot })),
        recent: vi.fn(async () => state.activeRoot),
        continueRecent: vi.fn(async () => ({ rootPath: state.activeRoot })),
        choose: vi.fn(async () => ({ rootPath: state.activeRoot })),
        createDemo: vi.fn(async () => ({ rootPath: state.activeRoot })),
        status: vi.fn(async () => ({ demo: false })),
      },
    },
  });
}

beforeEach(() => {
  state.activeRoot = "/tmp/tag-workspace-a";
  state.tagSets = {
    "/tmp/tag-workspace-a": [{
      id: "00000000-0000-4000-8000-000000003696",
      name: "Reliability engineering",
      aliases: ["SRE"],
      definition: "Initial shared reliability meaning",
      notes: "Workspace A notes",
    }],
    "/tmp/tag-workspace-b": [{
      id: "00000000-0000-4000-8000-000000003697",
      name: "Workspace B vocabulary",
      aliases: ["B term"],
      definition: "Vocabulary from workspace B",
    }],
    "/tmp/tag-workspace-c": [{
      id: "00000000-0000-4000-8000-000000003700",
      name: "Workspace C vocabulary",
      aliases: ["C term"],
      definition: "Vocabulary from restored workspace C",
    }],
  };
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("contextual rail Tag monitor in App", () => {
  it("stays read-only and follows Applications context while other destinations show the neutral state", async () => {
    installApi();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("region", { name: "Home" });
    const rail = screen.getByRole("complementary", { name: "Workspace controls" });
    const monitor = within(rail).getByRole("region", { name: "Tags glossary" });
    expect(monitor).toHaveTextContent("Select an application to inspect its Tags");
    expect(within(rail).queryByRole("searchbox", { name: "Search Tags" })).not.toBeInTheDocument();

    await user.click(within(rail).getByRole("button", { name: "Applications" }));
    await waitFor(() => expect(monitor).toHaveTextContent("Reliability engineering"));
    expect(monitor).toHaveTextContent("Initial shared reliability meaning");

    await user.click(within(rail).getByRole("button", { name: "CVs" }));
    expect(monitor).toHaveTextContent("Select an application to inspect its Tags");
    await user.click(within(rail).getByRole("button", { name: "My information" }));
    expect(monitor).toHaveTextContent("Select an application to inspect its Tags");
    await user.click(within(rail).getByRole("button", { name: "Settings" }));
    expect(monitor).toHaveTextContent("Select an application to inspect its Tags");
  });

  it("updates shared Tag meaning without remounting or discarding application work", async () => {
    installApi();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("region", { name: "Home" });
    await user.click(screen.getByRole("button", { name: "Applications" }));
    const draft = screen.getByRole("textbox", { name: "Application draft" });
    await user.type(draft, "unsaved candidature work");

    const monitor = screen.getByRole("region", { name: "Tags glossary" });
    await waitFor(() => expect(monitor).toHaveTextContent("Initial shared reliability meaning"));
    await user.click(screen.getByRole("button", { name: "Update shared Tag" }));
    await waitFor(() => expect(monitor).toHaveTextContent("Updated shared reliability meaning"));
    expect(draft).toHaveValue("unsaved candidature work");

    await user.click(screen.getByRole("button", { name: "Create shared Tag" }));
    await waitFor(() => expect(monitor).toHaveTextContent("Aviation safety"));
    expect(monitor).toHaveTextContent("Shared safety vocabulary");
    expect(draft).toHaveValue("unsaved candidature work");
    expect(within(monitor).queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("does not leak stale application Tags after workspace switch, reset or restore", async () => {
    installApi();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("region", { name: "Home" });
    const rail = screen.getByRole("complementary", { name: "Workspace controls" });
    await user.click(within(rail).getByRole("button", { name: "Applications" }));
    await waitFor(() => expect(within(rail).getByRole("region", { name: "Tags glossary" })).toHaveTextContent("Reliability engineering"));

    await user.click(within(rail).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Switch workspace" }));
    expect(within(rail).getByRole("region", { name: "Tags glossary" })).toHaveTextContent("Select an application to inspect its Tags");

    await user.click(within(rail).getByRole("button", { name: "Applications" }));
    await waitFor(() => expect(within(rail).getByRole("region", { name: "Tags glossary" })).toHaveTextContent("Workspace B vocabulary"));

    await user.click(within(rail).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Reset workspace" }));
    expect(within(rail).getByRole("region", { name: "Tags glossary" })).toHaveTextContent("Select an application to inspect its Tags");

    await user.click(within(rail).getByRole("button", { name: "Applications" }));
    await waitFor(() => expect(within(rail).getByRole("region", { name: "Tags glossary" })).toHaveTextContent("Reset vocabulary"));

    await user.click(within(rail).getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Restore workspace" }));
    expect(within(rail).getByRole("region", { name: "Tags glossary" })).toHaveTextContent("Select an application to inspect its Tags");

    await user.click(within(rail).getByRole("button", { name: "Applications" }));
    await waitFor(() => expect(within(rail).getByRole("region", { name: "Tags glossary" })).toHaveTextContent("Workspace C vocabulary"));
  });
});
