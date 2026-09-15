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

describe("AAAAT intention-first shell", () => {
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

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("creates a local workspace and presents ordinary intentions rather than persisted entity destinations", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Choose where AAAAT should keep your career workspace." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create workspace" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try with demo data" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Create workspace" }));
    expect(choose).toHaveBeenCalledWith("create");
    expect(await screen.findByRole("heading", { name: "Turn a job offer into application documents." })).toBeInTheDocument();

    const navigation = screen.getByRole("navigation", { name: "Primary work areas" });
    expect(within(navigation).getAllByRole("button").map((button) => button.textContent)).toEqual([
      "From a job offer",
      "CV & cover letter",
      "Saved applications",
      "My information",
    ]);
    expect(within(navigation).queryByRole("button", { name: "Candidatures" })).not.toBeInTheDocument();
    expect(within(navigation).queryByRole("button", { name: "Documents" })).not.toBeInTheDocument();
  });

  it("opens remembered work on the job-offer journey instead of requiring candidature recall", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Turn a job offer into application documents." })).toBeInTheDocument();
    expect(screen.getByLabelText("Job offer")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Tailored CV/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Cover letter/ })).toBeChecked();
  });

  it("keeps standalone document work independently discoverable without exposing variants first", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole("button", { name: "CV & cover letter" }));

    expect(await screen.findByRole("heading", { name: "What are you making?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New CV/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New cover letter/ })).toBeInTheDocument();
    expect(screen.getByText("Creation options", { selector: "summary" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Saved variation/)).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Document assistance" })).not.toBeInTheDocument();
  });

  it("protects a pasted offer when the user tries to leave the journey", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<App />);

    await user.type(await screen.findByLabelText("Job offer"), "Unsaved vacancy text");
    await user.click(screen.getByRole("button", { name: "Saved applications" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved edits and leave this work?");
    expect(screen.getByLabelText("Job offer")).toHaveValue("Unsaved vacancy text");
    expect(screen.queryByRole("heading", { name: "Candidatures" })).not.toBeInTheDocument();
  });

  it("makes host-agnostic external assistance primary in Settings while retaining VS Code as optional", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: /External assistants & portability/ }));

    expect(await screen.findByRole("heading", { name: "Use AAAAT from a compatible assistant" })).toBeInTheDocument();
    expect(screen.getByText(/ChatGPT, Claude, local agents, editors/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "External setup action authority" })).toBeInTheDocument();
    expect(screen.getByText("Optional VS Code adapter", { selector: "summary" })).toBeInTheDocument();
    expect(screen.queryByText(/Connect the demonstrated VS Code external tool/i)).not.toBeInTheDocument();
  });

  it("keeps backup restore usable from first run", async () => {
    restore.mockResolvedValueOnce({ status: "restored", workspace: restoredWorkspace });
    const user = userEvent.setup();
    render(<App />);

    const restoreDisclosure = await screen.findByText("Restore a backup", { selector: "summary" });
    await user.click(restoreDisclosure);
    await user.click(screen.getByRole("button", { name: "Choose backup to restore" }));

    expect(restore).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(restoredWorkspace.rootPath)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Turn a job offer into application documents." })).toBeInTheDocument();
  });
});
