import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidaturesAiWorkspace } from "../src/renderer/CandidaturesAiWorkspace";

vi.mock("../src/renderer/CandidatureManualEntryPanel", () => ({
  CandidatureManualEntryPanel: ({
    onDone,
    onDirtyChange,
  }: {
    onDone: () => void;
    onDirtyChange?: (dirty: boolean) => void;
  }) => (
    <section aria-label="New application form">
      <button type="button" onClick={() => onDirtyChange?.(true)}>Make dirty</button>
      <button type="button" onClick={onDone}>Save application</button>
    </section>
  ),
}));
vi.mock("../src/renderer/CandidaturesWorkspace", () => ({
  CandidaturesWorkspace: () => <section aria-label="Applications information">Applications</section>,
}));
vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({ openDocumentFromCandidature: vi.fn() }),
}));

afterEach(() => cleanup());

describe("Applications owner surface", () => {
  it("does not discard a dirty new application when switching views without confirmation", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<CandidaturesAiWorkspace />);

    await user.click(screen.getByRole("button", { name: "New application" }));
    await user.click(screen.getByRole("button", { name: "Make dirty" }));
    await user.click(screen.getByRole("button", { name: "Applications" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved application edits?");
    expect(screen.getByLabelText("New application form")).toBeVisible();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Applications" }));
    expect(screen.getByLabelText("Applications information")).toBeVisible();
  });

  it("uses one Applications information view instead of Focus / All data configuration modes", async () => {
    const user = userEvent.setup();
    render(<CandidaturesAiWorkspace />);

    expect(screen.getByRole("button", { name: "Applications" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByLabelText("Applications information")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Focus" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "All data" })).not.toBeInTheDocument();
    expect(screen.queryByText("Choose Focus information")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New application" }));
    expect(screen.getByLabelText("New application form")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Save application" }));
    expect(screen.getByLabelText("Applications information")).toBeVisible();
  });
});
