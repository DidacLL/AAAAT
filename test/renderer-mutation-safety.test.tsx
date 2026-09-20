import { cleanup, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/CandidaturesAiWorkspace", () => ({
  CandidaturesAiWorkspace: () => <section>Applications work</section>,
}));
vi.mock("../src/renderer/DocumentsStartWorkspace", () => ({
  DocumentsStartWorkspace: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => {
    const [title, setTitle] = useState("");
    return (
      <section>
        <input
          aria-label="Draft CV title"
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
vi.mock("../src/renderer/WorkspaceRailStatus", () => ({ WorkspaceRailStatus: () => null }));
vi.mock("../src/renderer/WorkspaceRecoveryPanel", () => ({ WorkspaceRecoveryPanel: () => null }));
vi.mock("../src/renderer/SettingsWorkspace", () => ({ SettingsWorkspace: () => <section>Settings</section> }));

import { App } from "../src/renderer/App";

const workspace = { rootPath: "/tmp/aaaat-mutation-safety" };

beforeEach(() => {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      workspace: {
        current: async () => workspace,
        recent: async () => workspace.rootPath,
        status: async () => ({ demo: false }),
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("renderer mutation safety", () => {
  it("does not leave mounted work when the user declines to discard unsaved edits", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    const home = await screen.findByRole("region", { name: "Home" });
    await user.click(within(home).getByRole("button", { name: "Open CVs" }));

    const draft = screen.getByRole("textbox", { name: "Draft CV title" });
    await user.type(draft, "Unsaved CV");
    await user.click(screen.getByRole("button", { name: "Applications" }));

    expect(confirm).toHaveBeenCalledOnce();
    expect(draft).toHaveValue("Unsaved CV");

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Applications" }));
    expect(screen.getByRole("button", { name: "Applications" })).toHaveAttribute("aria-current", "page");
  });
});
