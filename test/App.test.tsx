import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/renderer/App";
import type {
  DesktopApi,
  WorkspaceInfo,
} from "../src/shared/contracts";

const readyWorkspace: WorkspaceInfo = {
  rootPath: "/tmp/aaaat-workspace",
  schemaVersion: 1,
  initializedAt: "2026-09-02T12:00:00.000Z",
};

const current = vi.fn<DesktopApi["workspace"]["current"]>();
const choose = vi.fn<DesktopApi["workspace"]["choose"]>();

const desktopApi: DesktopApi = {
  system: {
    info: async () => ({
      appVersion: "2.0.0",
      electronVersion: "44.1.1",
      nodeVersion: "24.19.0",
    }),
  },
  workspace: {
    current,
    choose,
  },
};

describe("AAAAT workspace state", () => {
  beforeEach(() => {
    current.mockReset();
    choose.mockReset();
    current.mockResolvedValue(null);
    choose.mockResolvedValue(readyWorkspace);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: desktopApi,
    });
  });

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
    expect(
      await screen.findByRole("heading", { name: "Workspace ready." }),
    ).toBeInTheDocument();
    expect(screen.getByText(readyWorkspace.rootPath)).toBeInTheDocument();
  });

  it("keeps the first-run state when folder selection is cancelled", async () => {
    choose.mockResolvedValueOnce(null);
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      await screen.findByRole("button", { name: "Open existing workspace" }),
    );

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

    expect(
      await screen.findByRole("heading", { name: "Workspace ready." }),
    ).toBeInTheDocument();
    expect(screen.getByText(readyWorkspace.rootPath)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose another workspace" }),
    ).toBeInTheDocument();
  });
});
