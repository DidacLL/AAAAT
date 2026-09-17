import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidaturesAiWorkspace } from "../src/renderer/CandidaturesAiWorkspace";

vi.mock("../src/renderer/CandidatureManualEntryPanel", () => ({
  CandidatureManualEntryPanel: ({ onDone }: { onDone: () => void }) => (
    <section aria-label="New application form">
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
