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
      { operation: "opportunity_review" as const, available: false, connectionName: null },
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
  setupEnvironment: {
    current: async () => readyEnvironment,
    connectVscode: async () => ({ status: "cancelled", message: "No project was changed." }),
  },
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
  systemInfo: undefined as never,
} as never;

beforeEach(() => {
  current.mockResolvedValue(null);
  choose.mockResolvedValue(readyWorkspace);
  backup.mockResolvedValue({ status: "backed_up" });
  restore.mockResolvedValue({ status: "cancelled" });
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: desktopApi,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App workspace state", () => {
  it("starts with first-run choices when there is no current workspace", async () => {
    render(<App />);

    expect(await screen.findByRole("button", { name: "Create workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open existing workspace" })).toBeInTheDocument();
  });

  it("enters the workspace after choosing one", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Create workspace" }));

    expect(choose).toHaveBeenCalledWith("create");
    expect(await screen.findByText(readyWorkspace.rootPath)).toBeInTheDocument();
  });
});
