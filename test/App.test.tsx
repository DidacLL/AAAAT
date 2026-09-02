import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "../src/renderer/App";
import type { DesktopApi } from "../src/shared/contracts";

const initialize = vi.fn(async () => ({
  state: "ready" as const,
  schemaVersion: 1,
  initializedAt: "2026-09-02T12:00:00.000Z",
}));

const desktopApi: DesktopApi = {
  system: {
    info: async () => ({
      appVersion: "2.0.0",
      electronVersion: "44.1.1",
      nodeVersion: "24.19.0",
    }),
  },
  workspace: {
    initialize,
  },
};

describe("AAAAT empty state", () => {
  beforeEach(() => {
    initialize.mockClear();
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: desktopApi,
    });
  });

  it("creates the local workspace through the bounded desktop API", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "No workspace selected." }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Create local workspace" }),
    );

    expect(initialize).toHaveBeenCalledOnce();
    expect(
      await screen.findByRole("heading", { name: "Local workspace ready." }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Workspace ready" }),
    ).toBeDisabled();
  });
});
