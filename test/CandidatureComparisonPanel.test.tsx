import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureComparisonPanel } from "../src/renderer/CandidatureComparisonPanel";

const firstId = "00000000-0000-4000-8000-000000001901";
const secondId = "00000000-0000-4000-8000-000000001902";
const records = [
  {
    id: firstId,
    archived: false,
    createdAt: "2026-09-06T00:00:00.000Z",
    updatedAt: "2026-09-06T00:00:00.000Z",
    label: "Alpha opportunity",
    sourceSearchText: "",
    values: [],
    documentIds: [],
    conceptIds: [],
  },
  {
    id: secondId,
    archived: false,
    createdAt: "2026-09-06T00:00:01.000Z",
    updatedAt: "2026-09-06T00:00:01.000Z",
    label: "Beta opportunity",
    sourceSearchText: "",
    values: [],
    documentIds: [],
    conceptIds: [],
  },
];

const preview = vi.fn();
const run = vi.fn();

beforeEach(() => {
  preview.mockReset();
  run.mockReset();
  preview.mockResolvedValue({
    connection: {
      name: "Local comparison model",
      endpoint: "http://localhost:11434/v1",
      model: "comparison-model",
    },
    entries: [
      {
        candidatureId: firstId,
        localLabel: "Alpha opportunity",
        providerLabel: "Candidature 1",
        information: [{ label: "Role", value: "Platform engineer" }],
      },
      {
        candidatureId: secondId,
        localLabel: "Beta opportunity",
        providerLabel: "Candidature 2",
        information: [],
      },
    ],
  });
  run.mockResolvedValue({
    analyses: [
      {
        candidatureId: firstId,
        strengths: ["Strong platform scope"],
        concerns: [],
        questions: ["Clarify team size"],
      },
      {
        candidatureId: secondId,
        strengths: [],
        concerns: ["Sparse compensation information"],
        questions: [],
      },
    ],
    considerations: ["Compare the trade-offs that matter to you."],
  });
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: { list: async () => records },
      candidatureComparison: { preview, run },
    },
  });
});

afterEach(() => cleanup());

describe("candidature comparison panel", () => {
  it("requires an explicit disclosure preview before running a selected comparison", async () => {
    const user = userEvent.setup();
    render(<CandidatureComparisonPanel />);

    expect(await screen.findByRole("heading", { name: "Compare selected candidatures" })).toBeInTheDocument();
    expect(screen.getByText(/Sources, profile data, documents, ToDos and candidature history/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Compare these candidatures" })).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Alpha opportunity"));
    expect(screen.getByRole("button", { name: "Preview disclosure" })).toBeDisabled();
    await user.click(screen.getByLabelText("Beta opportunity"));
    await user.click(screen.getByRole("button", { name: "Preview disclosure" }));

    expect(preview).toHaveBeenCalledWith({ candidatureIds: [firstId, secondId] });
    expect(await screen.findByText("Provider label: Candidature 1")).toBeInTheDocument();
    expect(screen.getByText(/Role:/).closest("li")).toHaveTextContent("Role: Platform engineer");
    expect(run).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Compare these candidatures" }));
    expect(run).toHaveBeenCalledWith({ candidatureIds: [firstId, secondId] });
    expect(await screen.findByText("Strong platform scope")).toBeInTheDocument();
    expect(screen.getByText("Compare the trade-offs that matter to you.")).toBeInTheDocument();
    expect(screen.getByText("AAAAT does not rank these opportunities or choose one for you.")).toBeInTheDocument();
  });

  it("invalidates an existing preview when the selected set changes", async () => {
    const user = userEvent.setup();
    render(<CandidatureComparisonPanel />);
    await user.click(await screen.findByLabelText("Alpha opportunity"));
    await user.click(screen.getByLabelText("Beta opportunity"));
    await user.click(screen.getByRole("button", { name: "Preview disclosure" }));
    expect(await screen.findByRole("button", { name: "Compare these candidatures" })).toBeInTheDocument();

    await user.click(screen.getByLabelText("Beta opportunity"));
    expect(screen.queryByRole("button", { name: "Compare these candidatures" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview disclosure" })).toBeDisabled();
  });
});
