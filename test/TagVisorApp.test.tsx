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
  const { useState } = await import("react");
  return {
    CandidaturesAiWorkspace: ({
      onTagGlossaryChange,
    }: {
      onDirtyChange?: (dirty: boolean) => void;
      onTagGlossaryChange?: () => void;
    }) => {
      const [draft, setDraft] = useState("");
      return (
        <section aria-label="Applications mock">
          <input aria-label="Application draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
          <button
            type="button"
            onClick={() => {
              state.tagSets[state.activeRoot] = state.tagSets[state.activeRoot].map((tag) =>
                tag.name === "Reliability engineering"
                  ? { ...tag, definition: "Updated shared reliability meaning" }
                  : tag,
              );
              onTagGlossaryChange?.();
            }}
          >
            Update shared Tag
          </button>
          <button
            type="button"
            onClick={() => {
              state.tagSets[state.activeRoot] = [
                ...state.tagSets[state.activeRoot],
                {
                  id: "00000000-0000-4000-8000-000000003699",
                  name: "Aviation safety",
                  aliases: ["Safety"],
                  definition: "Shared safety vocabulary",
                },
              ];
              onTagGlossaryChange?.();
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
      <button
        type="button"
        onClick={() => {
          state.activeRoot = "/tmp/tag-workspace-b";
          onChooseWorkspace("open");
        }}
      >
        Switch workspace
      </button>
      <button
        type="button"
        onClick={() => {
          state.tagSets[state.activeRoot] = [{
            id: "00000000-0000-4000-8000-000000003698",
            name: "Reset vocabulary",
            aliases: [],
            definition: "Vocabulary loaded after reset",
          }];
          onWorkspaceReset({ rootPath: state.activeRoot });
        }}
      >
        Reset workspace
      </button>
      <button
        type="button"
        onClick={() => {
          state.activeRoot = "/tmp/tag-workspace-c";
          onRestored({ rootPath: state.activeRoot });
        }}
      >
        Restore workspace
      </button>
    </section>
  ),
}));

import { App } from "../src/renderer/App";

function installApi() {
  const listTags = vi.fn(async () => state.tagSets[state.activeRoot] ?? []);
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
      candidatures: { listTags },
    },
  });
  return { listTags };
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

describe("persistent rail Tag visor", () => {
  it("stays reachable in the loaded rail across Home, Applications, CVs, My information and Settings", async () => {
    installApi();
    const user = userEvent.setup();
    render(<App />);

    const home = await screen.findByRole("region", { name: "Home" });
    const rail = screen.getByRole("complementary", { name: "Workspace controls" });
    expect(home).toBeVisible();
    expect(within(rail).getByRole("region", { name: "Tags glossary" })).toBeVisible();
    expect(within(rail).getByRole("searchbox", { name: "Search Tags" })).toBeVisible();

    await user.click(within(rail).getByRole("button", { name: "Applications" }));
    expect(within(rail).getByRole("region", { name: "Tags glossary" })).toBeVisible();
    await user.click(within(rail).getByRole("button", { name: "CVs" }));
    expect(within(rail).getByRole("region", { name: "Tags glossary" })).toBeVisible();
    await user.click(within(rail).getByRole("button", { name: "My information" }));
    expect(within(rail).getByRole("region", { name: "Tags glossary" })).toBeVisible();
    await user.click(within(rail).getByRole("button", { name: "Settings" }));
    expect(within(rail).getByRole("region", { name: "Tags glossary" })).toBeVisible();
  });

  it("refreshes create/update changes without remounting or discarding candidature work", async () => {
    const api = installApi();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("region", { name: "Home" });
    await user.click(screen.getByRole("button", { name: "Applications" }));
    const draft = screen.getByRole("textbox", { name: "Application draft" });
    await user.type(draft, "unsaved candidature work");

    const search = screen.getByRole("searchbox", { name: "Search Tags" });
    await user.type(search, "SRE");
    await user.click(await screen.findByRole("button", { name: "Reliability engineering" }));
    expect(screen.getByRole("article", { name: "Selected Tag" })).toHaveTextContent("Initial shared reliability meaning");

    await user.click(screen.getByRole("button", { name: "Update shared Tag" }));
    await waitFor(() => expect(screen.getByRole("article", { name: "Selected Tag" }))
      .toHaveTextContent("Updated shared reliability meaning"));
    expect(draft).toHaveValue("unsaved candidature work");

    await user.click(screen.getByRole("button", { name: "Create shared Tag" }));
    await user.clear(search);
    await user.type(search, "Aviation");
    expect(await screen.findByRole("button", { name: "Aviation safety" })).toBeVisible();
    expect(draft).toHaveValue("unsaved candidature work");
    expect(api.listTags.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it("loads the appropriate glossary after workspace switch, reset and restore", async () => {
    installApi();
    const user = userEvent.setup();
    render(<App />);

    await screen.findByRole("region", { name: "Home" });
    let search = screen.getByRole("searchbox", { name: "Search Tags" });
    await user.type(search, "Reliability");
    expect(await screen.findByRole("button", { name: "Reliability engineering" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Switch workspace" }));
    search = await screen.findByRole("searchbox", { name: "Search Tags" });
    await user.type(search, "Workspace B");
    expect(await screen.findByRole("button", { name: "Workspace B vocabulary" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Reset workspace" }));
    search = screen.getByRole("searchbox", { name: "Search Tags" });
    await user.clear(search);
    await user.type(search, "Reset");
    expect(await screen.findByRole("button", { name: "Reset vocabulary" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Restore workspace" }));
    search = await screen.findByRole("searchbox", { name: "Search Tags" });
    await user.type(search, "Workspace C");
    expect(await screen.findByRole("button", { name: "Workspace C vocabulary" })).toBeVisible();
  });
});
