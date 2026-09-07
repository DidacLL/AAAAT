import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/renderer/App";
import type { AiConnectionDesktopApi } from "../src/shared/ai-connection-contracts";
import type { CareerContext, DesktopApi, ProfileSnapshot, WorkspaceInfo } from "../src/shared/contracts";
import type { SetupEnvironmentDesktopApi } from "../src/shared/setup-environment-contracts";
import type { TodoDesktopApi } from "../src/shared/todo-contracts";
import type { WorkspaceRecoveryDesktopApi } from "../src/shared/workspace-recovery-contracts";

const readyWorkspace: WorkspaceInfo = { rootPath: "/tmp/aaaat-workspace" };
const restoredWorkspace: WorkspaceInfo = { rootPath: "/tmp/restored-aaaat-workspace" };
const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
const emptyCareerContext: CareerContext = {
  careerDirection: "",
  objectives: "",
  constraints: "",
  targetRoles: "",
  targetMarketsLocations: "",
  workPreferences: "",
  applicationWritingPreferences: "",
};
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
    connectionCount: 0,
    operations: [
      { operation: "fit_assessment" as const, available: false, connectionName: null },
      { operation: "job_extraction" as const, available: false, connectionName: null },
      { operation: "historical_field_discovery" as const, available: false, connectionName: null },
      { operation: "variant_recommendation" as const, available: false, connectionName: null },
      { operation: "cv_tailoring" as const, available: false, connectionName: null },
      { operation: "cover_letter_draft" as const, available: false, connectionName: null },
    ],
  },
};
const current = vi.fn<DesktopApi["workspace"]["current"]>();
const choose = vi.fn<DesktopApi["workspace"]["choose"]>();
const backup = vi.fn<WorkspaceRecoveryDesktopApi["workspaceRecovery"]["backup"]>();
const restore = vi.fn<WorkspaceRecoveryDesktopApi["workspaceRecovery"]["restore"]>();
const unavailable = async (): Promise<never> => {
  throw new Error("Unavailable in workspace-state test");
};

const desktopApi: DesktopApi &
  WorkspaceRecoveryDesktopApi &
  SetupEnvironmentDesktopApi &
  AiConnectionDesktopApi &
  TodoDesktopApi = {
  system: {
    info: async () => ({ appVersion: "2.0.0", electronVersion: "44.1.1", nodeVersion: "24.19.0" }),
  },
  workspace: { current, choose },
  workspaceRecovery: { backup, restore },
  setupEnvironment: { current: async () => readyEnvironment },
  aiConnections: {
    list: async () => [],
    save: async () => [],
    setDefault: async () => [],
    remove: async () => [],
    validateOperation: async () => [],
    setOperationDefault: async () => [],
    exportPortable: async () => "cancelled",
    importPortable: async () => ({ status: "cancelled", connections: [] }),
  },
  todos: {
    list: async () => [],
    create: unavailable,
    update: unavailable,
    toggle: unavailable,
    remove: async () => [],
  },
  profile: {
    current: async () => emptyProfile,
    addItem: async () => emptyProfile,
    updateItem: async () => emptyProfile,
    removeItem: async () => emptyProfile,
    createVariant: async () => emptyProfile,
    updateVariant: async () => emptyProfile,
    removeVariant: async () => emptyProfile,
    configureVariantItem: async () => emptyProfile,
    reorderVariant: async () => emptyProfile,
    resolveVariant: unavailable,
  },
  careerContext: {
    current: async () => emptyCareerContext,
    update: async (update) => update,
  },
  documents: {
    list: async () => [],
    create: unavailable,
    update: unavailable,
    remove: async () => [],
    configureItem: unavailable,
    reorder: unavailable,
    resolve: unavailable,
    render: unavailable,
    regenerate: unavailable,
    exportProject: async () => null,
  },
  candidatures: {
    list: async () => [],
    create: unavailable,
    update: unavailable,
    filter: async () => [],
    listFields: async () => [],
    createField: unavailable,
    updateField: unavailable,
    deleteField: async () => [],
    updateFieldPreferences: unavailable,
    setFieldValue: unavailable,
    clearFieldValue: unavailable,
    listSources: async () => [],
    addSource: unavailable,
    updateSource: unavailable,
    removeSource: unavailable,
    setDocuments: unavailable,
    listConcepts: async () => [],
    createConcept: unavailable,
    updateConcept: unavailable,
    setConcepts: unavailable,
  },
};

describe("AAAAT workspace state", () => {
  beforeEach(() => {
    current.mockReset();
    choose.mockReset();
    backup.mockReset();
    restore.mockReset();
    current.mockResolvedValue(null);
    choose.mockResolvedValue(readyWorkspace);
    backup.mockResolvedValue({ status: "backed_up" });
    restore.mockResolvedValue({ status: "cancelled" });
    Object.defineProperty(window, "aaaat", { configurable: true, value: desktopApi });
  });

  afterEach(() => cleanup());

  it("creates a user-owned workspace with the accepted primary work destinations", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      await screen.findByRole("heading", {
        name: "Choose where AAAAT should keep your career workspace.",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create workspace" }));
    expect(choose).toHaveBeenCalledWith("create");
    expect(await screen.findByText(readyWorkspace.rootPath)).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Primary work areas" });
    expect(within(navigation).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Candidatures",
      "CVs & letters",
      "Professional information",
    ]);
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "ToDos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI assist" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Profile" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Documents" })).not.toBeInTheDocument();
  });

  it("restores a workspace directly from the first-run surface", async () => {
    restore.mockResolvedValueOnce({ status: "restored", workspace: restoredWorkspace });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Restore workspace backup" }));

    expect(restore).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(restoredWorkspace.rootPath)).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Primary work areas" })).toBeInTheDocument();
  });

  it("keeps the first-run state when folder selection is cancelled", async () => {
    choose.mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "Open existing workspace" }));
    expect(choose).toHaveBeenCalledWith("open");
    expect(
      screen.getByRole("heading", {
        name: "Choose where AAAAT should keep your career workspace.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the remembered workspace and opens Candidatures on restart", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    render(<App />);
    expect(await screen.findByText(readyWorkspace.rootPath)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Switch workspace" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Candidatures" })).toBeInTheDocument();
  });

  it("keeps reminders contextual under Candidatures", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Candidatures" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "ToDos" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reminders" }));
    expect(await screen.findByRole("heading", { name: "ToDos" })).toBeInTheDocument();
  });

  it("keeps AI document assistance contextual under CVs and letters", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "CVs & letters" }));
    expect(screen.queryByRole("heading", { name: "Document assistance" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Optional AI assistance" }));
    expect(await screen.findByRole("heading", { name: "Document assistance" })).toBeInTheDocument();
  });

  it("exposes recovery controls through secondary Settings and keeps the current workspace when restore fails", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    restore.mockRejectedValueOnce(new Error("invalid backup"));
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Settings" }));
    expect(await screen.findByRole("button", { name: "Back up workspace" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Restore workspace backup" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AAAAT could not restore that backup. The current workspace was not changed.",
    );
    expect(screen.getByText(readyWorkspace.rootPath)).toBeInTheDocument();
  });

  it("keeps a dirty professional-information editor mounted when global navigation is cancelled", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Professional information" }));
    await user.type(await screen.findByLabelText("Title"), "Unsaved profile item");
    await user.click(screen.getByRole("button", { name: "CVs & letters" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved edits and leave this workspace area?");
    expect(screen.getByLabelText("Title")).toHaveValue("Unsaved profile item");
    expect(screen.queryByRole("heading", { name: "Documents" })).not.toBeInTheDocument();
  });

  it("does not open the workspace picker while an editor discard is cancelled", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Professional information" }));
    await user.type(await screen.findByLabelText("Title"), "Unsaved profile item");
    await user.click(screen.getByRole("button", { name: "Switch workspace" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved edits and switch workspaces?");
    expect(choose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Title")).toHaveValue("Unsaved profile item");
  });

  it("keeps a draft mounted when the workspace picker is cancelled after confirmation", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    choose.mockResolvedValueOnce(null);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Professional information" }));
    await user.type(await screen.findByLabelText("Title"), "Draft retained after picker cancel");
    await user.click(screen.getByRole("button", { name: "Switch workspace" }));

    expect(choose).toHaveBeenCalledWith("create");
    expect(await screen.findByLabelText("Title")).toHaveValue("Draft retained after picker cancel");
  });
});
