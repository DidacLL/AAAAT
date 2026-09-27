import { cleanup, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/CandidaturesAiWorkspace", () => ({
  CandidaturesAiWorkspace: () => <section>Applications work</section>,
}));
vi.mock("../src/renderer/DocumentsStartWorkspace", () => ({
  DocumentsStartWorkspace: ({
    onDirtyChange,
    onOpenDocument,
  }: {
    onDirtyChange?: (dirty: boolean) => void;
    onOpenDocument?: (documentId: string) => void;
  }) => {
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
        <button type="button" onClick={() => onOpenDocument?.("00000000-0000-4000-8000-000000000b01")}>Open Saved CV</button>
      </section>
    );
  },
}));
vi.mock("../src/renderer/DocumentsWorkspace", async () => {
  const { useContextualHandoffs } = await import("../src/renderer/contextual-handoffs");
  return {
    DocumentsWorkspace: () => {
      const handoffs = useContextualHandoffs();
      return (
        <section>
          <span>Document</span>
          <button
            type="button"
            onClick={() => handoffs.openProfessionalInformationItem(
              "00000000-0000-4000-8000-000000000b01",
              "00000000-0000-4000-8000-000000000b02",
            )}
          >
            Open My information
          </button>
        </section>
      );
    },
  };
});
vi.mock("../src/renderer/ProfileWorkspace", () => ({
  ProfileWorkspace: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => {
    const [value, setValue] = useState("");
    return (
      <section>
        <span>Profile</span>
        <input
          aria-label="Profile draft"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onDirtyChange?.(event.target.value.length > 0);
          }}
        />
      </section>
    );
  },
}));
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

  it("keeps the document return reachable and protects dirty My information work", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    const home = await screen.findByRole("region", { name: "Home" });
    await user.click(within(home).getByRole("button", { name: "Open CVs" }));
    await user.click(screen.getByRole("button", { name: "Open Saved CV" }));
    await user.click(screen.getByRole("button", { name: "Open My information" }));

    expect(screen.getByRole("status")).toHaveTextContent("Editing My information used by this document.");
    const returnButton = screen.getByRole("button", { name: "Return to document" });
    expect(returnButton).toBeInTheDocument();

    const profileDraft = screen.getByRole("textbox", { name: "Profile draft" });
    await user.type(profileDraft, "Unsaved reusable wording");
    await user.click(returnButton);
    expect(confirm).toHaveBeenCalledWith("Discard unsaved My information edits and return to document?");
    expect(profileDraft).toHaveValue("Unsaved reusable wording");

    confirm.mockReturnValue(true);
    await user.click(returnButton);
    expect(screen.getByText("Document")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
