import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/renderer/App";
import type { AiConnectionDesktopApi } from "../src/shared/ai-connection-contracts";
import type { CareerContextAiDisclosureDesktopApi } from "../src/shared/career-context-ai-disclosure-contracts";
import type { CareerContext, DesktopApi, ProfileSnapshot, WorkspaceInfo } from "../src/shared/contracts";
import type { SetupAssistantDesktopApi } from "../src/shared/setup-assistant-contracts";
import type { SetupEnvironmentDesktopApi } from "../src/shared/setup-environment-contracts";
import type { WorkspaceRecoveryDesktopApi } from "../src/shared/workspace-recovery-contracts";

const readyWorkspace: WorkspaceInfo = { rootPath: "/tmp/aaaat-workspace" };
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
const allCareerContextAiDisclosure = {
  careerDirection: true,
  objectives: true,
  constraints: true,
  targetRoles: true,
  targetMarketsLocations: true,
  workPreferences: true,
  applicationWritingPreferences: true,
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
const recent = vi.fn<DesktopApi["workspace"]["recent"]>();
const continueRecent = vi.fn<DesktopApi["workspace"]["continueRecent"]>();
const deleteWorkspace = vi.fn<DesktopApi["workspace"]["delete"]>();
const choose = vi.fn<DesktopApi["workspace"]["choose"]>();
const backup = vi.fn<WorkspaceRecoveryDesktopApi["workspaceRecovery"]["backup"]>();
const restore = vi.fn<WorkspaceRecoveryDesktopApi["workspaceRecovery"]["restore"]>();
const unavailable = async (): Promise<never> => {
  throw new Error("Unavailable in workspace-state test");
};

const desktopApi: DesktopApi &
  WorkspaceRecoveryDesktopApi &
  SetupAssistantDesktopApi &
  SetupEnvironmentDesktopApi &
  AiConnectionDesktopApi &
  CareerContextAiDisclosureDesktopApi = {
  system: {
    info: async () => ({ appVersion: "2.0.0", electronVersion: "44.1.1", nodeVersion: "24.19.0" }),
  },
  workspace: {
    current,
    recent,
    continueRecent,
    close: async () => undefined,
    delete: deleteWorkspace,
    choose,
    createDemo: async () => readyWorkspace,
    reset: async () => readyWorkspace,
    status: async () => ({ demo: false }),
  },
  workspaceRecovery: { backup, restore },
  setupAssistant: {
    access: async () => ({ installerActionsAllowed: false, configuratorActionsAllowed: false }),
    updateAccess: async (update) => update,
    runRenderingSelfTest: async () => ({ passed: true }),
  },
  setupEnvironment: {
    current: async () => readyEnvironment,
    externalConnection: async () => ({ packaged: false, executablePath: "electron", workspacePath: "/workspace" }),
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
  careerContextAiDisclosure: {
    current: async () => allCareerContextAiDisclosure,
    update: async (update) => update,
  },
  documents: {
    list: async () => [],
    create: unavailable,
    update: unavailable,
    remove: async () => [],
    configureItem: unavailable,
    applySelection: unavailable,
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
    listTags: async () => [],
    createTag: unavailable,
    updateTag: unavailable,
    setTags: unavailable,
  },
};

describe("AAAAT workspace shell", () => {
  beforeEach(() => {
    current.mockReset();
    recent.mockReset();
    continueRecent.mockReset();
    deleteWorkspace.mockReset();
    choose.mockReset();
    backup.mockReset();
    restore.mockReset();
    current.mockResolvedValue(null);
    recent.mockResolvedValue(null);
    continueRecent.mockResolvedValue(readyWorkspace);
    deleteWorkspace.mockResolvedValue(undefined);
    choose.mockResolvedValue(readyWorkspace);
    backup.mockResolvedValue({ status: "backed_up" });
    restore.mockResolvedValue({ status: "cancelled" });
    Object.defineProperty(window, "aaaat", { configurable: true, value: desktopApi });
  });

  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it("shows Welcome first with a remembered workspace and enters the saved-applications grid", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    recent.mockResolvedValueOnce(readyWorkspace.rootPath);
    const user = userEvent.setup();
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Welcome to AAAAT" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Workspace status")).toHaveTextContent("Workspace");
    expect(screen.getByRole("button", { name: /Enter workspace/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open existing workspace" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Enter workspace/ }));
    expect(await screen.findByRole("button", { name: "New application" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Candidatures" })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "Primary work areas" });
    expect(within(navigation).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "Applications", "CVs", "My information",
    ]);
  });

  it("keeps reusable CV creation in CVs and application creation in Applications", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    recent.mockResolvedValueOnce(readyWorkspace.rootPath);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /Enter workspace/ }));
    expect(screen.queryByRole("button", { name: /New CV/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "CVs" }));
    expect(await screen.findByRole("button", { name: /New CV/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New standalone letter/ })).not.toBeVisible();
  });

  it("returns to Welcome without a deleted workspace entrance", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    recent.mockResolvedValueOnce(readyWorkspace.rootPath);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: /Enter workspace/ }));
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: /Workspace/ }));
    await user.click(screen.getByRole("button", { name: "Delete workspace data" }));
    expect(deleteWorkspace).toHaveBeenCalledOnce();
    expect(await screen.findByRole("heading", { name: "Welcome to AAAAT" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Enter workspace/ })).not.toBeInTheDocument();
  });
});
