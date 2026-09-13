import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OpportunityReviewPanel } from "../src/renderer/OpportunityReviewPanel";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
import type { CandidatureRecord } from "../src/shared/contracts";

const record: CandidatureRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  archived: false,
  createdAt: "2026-09-04T10:00:00.000Z",
  updatedAt: "2026-09-04T10:00:00.000Z",
  label: "Example Corp — Platform Engineer",
  sourceSearchText: "",
  values: [],
  documentIds: [],
  tagIds: [],
};

const projectedPrivateValue = "opaque local replacement";
const previewOpportunityReview = vi.fn();
const reviewOpportunity = vi.fn();
const setupCurrent = vi.fn();
const openSettingsFor = vi.fn();

function handoffs(): ContextualHandoffApi {
  return {
    documentHandoff: null,
    professionalInformationHandoff: null,
    settingsHandoff: null,
    openDocumentFromCandidature: vi.fn(),
    returnToCandidature: vi.fn(),
    openProfessionalInformationItem: vi.fn(),
    returnToDocument: vi.fn(),
    openSettingsFor,
    returnFromSettings: vi.fn(),
  };
}

function renderPanel() {
  return render(
    <ContextualHandoffContext.Provider value={handoffs()}>
      <OpportunityReviewPanel record={record} />
    </ContextualHandoffContext.Provider>,
  );
}

describe("candidature opportunity-review panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    previewOpportunityReview.mockResolvedValue({
      connection: {
        name: "Local fixture",
        endpoint: "http://localhost:11434/v1",
        model: "fixture-model",
      },
      projectedContext: {
        candidature: {
          label: "Candidature",
          information: [
            {
              fieldId: "00000000-0000-4000-8000-000000000101",
              label: "Organisation",
              value: "Example Corp",
            },
          ],
          sources: [],
        },
        profileItems: [
          { kind: "identity", title: projectedPrivateValue },
          { kind: "skill", title: "TypeScript" },
        ],
      },
    });
    reviewOpportunity.mockResolvedValue({
      summary: "Relevant TypeScript experience is retained.",
      relevantEvidence: ["TypeScript"],
      uncertainties: ["The Source does not state the team scope."],
      questions: ["Which platform responsibilities matter most?"],
    });
    setupCurrent.mockResolvedValue({
      ai: { operations: [{ operation: "opportunity_review", available: true }] },
    });
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        ai: { previewOpportunityReview, reviewOpportunity },
        setupEnvironment: { current: setupCurrent },
      },
    });
  });

  afterEach(() => cleanup());

  it("shows the projected payload and ordinary local connection identity before the read-only review", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByText(/saved candidature snapshot/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview what AI will receive" }));

    expect(previewOpportunityReview).toHaveBeenCalledWith({
      candidatureId: record.id,
      identityPrivacy: "token",
      contactPrivacy: "token",
    });
    expect(screen.getByText(/AI connection: Local fixture · local on this computer/)).toBeInTheDocument();
    expect(screen.queryByText("http://localhost:11434/v1")).not.toBeInTheDocument();
    expect(screen.queryByText("fixture-model")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        (content, element) => element?.tagName === "PRE" && content.includes(projectedPrivateValue),
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Ask AI for an opportunity review" }));

    expect(reviewOpportunity).toHaveBeenCalledWith({
      candidatureId: record.id,
      identityPrivacy: "token",
      contactPrivacy: "token",
    });
    expect(await screen.findByText("Relevant TypeScript experience is retained.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Relevant evidence" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Uncertainties" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Questions" })).toBeInTheDocument();
    expect(screen.queryByText(/strong fit/i)).not.toBeInTheDocument();
  });

  it("identifies a remote HTTPS connection without exposing endpoint or model detail", async () => {
    previewOpportunityReview.mockResolvedValueOnce({
      connection: {
        name: "Remote fixture",
        endpoint: "https://models.example.test/v1",
        model: "remote-model",
      },
      projectedContext: {
        candidature: { label: "Candidature", information: [], sources: [] },
        profileItems: [],
      },
    });
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Preview what AI will receive" }));

    expect(screen.getByText(/AI connection: Remote fixture · remote HTTPS/)).toBeInTheDocument();
    expect(screen.queryByText("https://models.example.test/v1")).not.toBeInTheDocument();
    expect(screen.queryByText("remote-model")).not.toBeInTheDocument();
  });

  it("offers AI connections Settings only when the opportunity-review route is unavailable", async () => {
    previewOpportunityReview.mockRejectedValueOnce(new Error("No validated AI route is available."));
    setupCurrent.mockResolvedValueOnce({
      ai: { operations: [{ operation: "opportunity_review", available: false }] },
    });
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Preview what AI will receive" }));
    const settings = await screen.findByRole("button", { name: "Open AI connections settings" });
    await user.click(settings);

    expect(openSettingsFor).toHaveBeenCalledWith("ai", "candidatures");
  });
});
