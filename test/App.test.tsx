import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/renderer/App";
import type { DesktopApi, ProfileSnapshot, WorkspaceInfo } from "../src/shared/contracts";

const readyWorkspace: WorkspaceInfo = { rootPath: "/tmp/aaaat-workspace" };
const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
const current = vi.fn<DesktopApi["workspace"]["current"]>();
const choose = vi.fn<DesktopApi["workspace"]["choose"]>();
const unavailable = async (): Promise<never> => {
  throw new Error("Unavailable in workspace-state test");
};

const desktopApi: DesktopApi = {
  system: {
    info: async () => ({ appVersion: "2.0.0", electronVersion: "44.1.1", nodeVersion: "24.19.0" }),
  },
  workspace: { current, choose },
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
    current.mockResolvedValue(null);
    choose.mockResolvedValue(readyWorkspace);
    Object.defineProperty(window, "aaaat", { configurable: true, value: desktopApi });
  });

  afterEach(() => cleanup());

  it("creates a user-owned workspace through the bounded desktop API", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(
      await screen.findByRole("heading", {
        name: "Choose where AAAAT should keep your career workspace.",
      }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create workspace" }));
    expect(choose).toHaveBeenCalledWith("create");
    expect(await screen.findByRole("heading", { name: "Workspace ready." })).toBeInTheDocument();
    expect(screen.getByText(readyWorkspace.rootPath)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Candidatures" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
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

  it("shows the remembered workspace path on restart", async () => {
    current.mockResolvedValueOnce(readyWorkspace);
    render(<App />);
    expect(await screen.findByRole("heading", { name: "Workspace ready." })).toBeInTheDocument();
    expect(screen.getByText(readyWorkspace.rootPath)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose another workspace" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Candidatures" })).toBeInTheDocument();
  });
});
