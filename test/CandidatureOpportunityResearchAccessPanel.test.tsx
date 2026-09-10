import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidatureOpportunityResearchAccessPanel } from "../src/renderer/CandidatureOpportunityResearchAccessPanel";
import type { CandidatureOpportunityResearchAccessDesktopApi } from "../src/shared/candidature-opportunity-research-access-contracts";

const candidatureId = "00000000-0000-4000-8000-000000000551";
const current = vi.fn<
  CandidatureOpportunityResearchAccessDesktopApi["candidatureOpportunityResearchAccess"]["current"]
>();
const update = vi.fn<
  CandidatureOpportunityResearchAccessDesktopApi["candidatureOpportunityResearchAccess"]["update"]
>();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatureOpportunityResearchAccess: { current, update },
    } as CandidatureOpportunityResearchAccessDesktopApi,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("external opportunity research control", () => {
  it("enables one explicit task-scoped candidature handoff with bounded disclosure copy", async () => {
    current.mockResolvedValueOnce({ candidatureId, allowed: false });
    update.mockResolvedValueOnce({ candidatureId, allowed: true });
    installApi();
    const user = userEvent.setup();

    render(
      <CandidatureOpportunityResearchAccessPanel
        candidatureId={candidatureId}
        contextDirty={false}
      />,
    );

    expect(await screen.findByText(/only retained information from this candidature/i)).toBeInTheDocument();
    expect(screen.getByText(/does not expose Sources, other candidatures/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Allow external opportunity research for this candidature",
      }),
    );
    expect(update).toHaveBeenCalledWith({ candidatureId, allowed: true });
    expect(await screen.findByText(/available to the bounded external opportunity-research task/i)).toBeInTheDocument();
  });

  it("does not enable stale persisted context and revokes an active task when relevant edits become dirty", async () => {
    current.mockResolvedValue({ candidatureId, allowed: true });
    update.mockResolvedValue({ candidatureId, allowed: false });
    installApi();

    const { rerender } = render(
      <CandidatureOpportunityResearchAccessPanel
        candidatureId={candidatureId}
        contextDirty={false}
      />,
    );
    expect(await screen.findByRole("button", { name: "Revoke external opportunity research" })).toBeEnabled();

    rerender(
      <CandidatureOpportunityResearchAccessPanel
        candidatureId={candidatureId}
        contextDirty={true}
      />,
    );
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith({ candidatureId, allowed: false }),
    );
    expect(
      await screen.findByText(/revoked because the task context has unsaved edits/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Allow external opportunity research for this candidature",
      }),
    ).toBeDisabled();
  });
});
