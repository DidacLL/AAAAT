import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobExtractionPanel } from "../src/renderer/JobExtractionPanel";
import type { CandidatureFieldConfiguration } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000900";
const fieldId = "00000000-0000-4000-8000-000000000901";
const source = {
  sourceTitle: "Pilot vacancy",
  sourceUrl: "https://example.test/job/1",
  sourceText: "Applicants need at least 1,500 total flight hours.",
};
const field: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: null,
    label: "Minimum flight hours",
    description: "Minimum total flight hours requested.",
    valueType: "number",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  preferences: {
    fieldId,
    focusVisible: false,
    focusOrder: null,
    focusProminence: "normal",
    identityOrder: null,
    aiDiscovery: true,
    aiContextMode: "expose",
  },
};

const extractJob = vi.fn();
const listFields = vi.fn();
const listConnections = vi.fn();
const setFieldValue = vi.fn();
const onAccepted = vi.fn();
const onDismiss = vi.fn();

function renderPanel() {
  return render(
    <JobExtractionPanel
      candidatureId={candidatureId}
      source={source}
      onAccepted={onAccepted}
      onDismiss={onDismiss}
    />,
  );
}

describe("saved Source AI review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFields.mockResolvedValue([field]);
    listConnections.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000902",
        name: "Remote review endpoint",
        endpoint: "https://review.example.test/v1",
        model: "review-model",
        isDefault: true,
        validatedOperations: ["job_extraction"],
        defaultForOperations: ["job_extraction"],
      },
    ]);
    extractJob.mockResolvedValue({ proposals: [{ fieldId, value: "1500" }] });
    setFieldValue.mockResolvedValue(undefined);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        ai: { extractJob },
        aiConnections: { list: listConnections },
        candidatures: { listFields, setFieldValue },
      },
    });
  });

  afterEach(() => cleanup());

  it("keeps the Source first, discloses the exact selected material, and retains only selected proposals", async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole("heading", { name: "Review source with AI" });
    expect(extractJob).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Review source with AI" }));
    expect(screen.getByText("Remote review endpoint")).toBeInTheDocument();
    expect(screen.getByText(source.sourceText)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send selected Source to AI" }));

    expect(extractJob).toHaveBeenCalledWith(source);
    await screen.findByRole("heading", { name: "Proposed information" });
    await user.click(screen.getByRole("checkbox", { name: /Minimum flight hours: 1500/ }));
    await user.click(screen.getByRole("button", { name: "Keep selected information" }));

    expect(setFieldValue).toHaveBeenCalledWith(candidatureId, { fieldId, value: "1500" });
    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("allows a saved Source to remain unchanged after dismissal or an AI failure", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole("heading", { name: "Review source with AI" });
    await user.click(screen.getByRole("button", { name: "Review source with AI" }));
    await user.click(screen.getByRole("button", { name: "Keep without AI" }));

    expect(extractJob).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();

    extractJob.mockRejectedValueOnce(new Error("The configured endpoint did not respond."));
    await user.click(screen.getByRole("button", { name: "Review source with AI" }));
    await user.click(screen.getByRole("button", { name: "Send selected Source to AI" }));

    expect(await screen.findByText("The configured endpoint did not respond.")).toBeInTheDocument();
    expect(setFieldValue).not.toHaveBeenCalled();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it("does not show a generic AI form when the saved Source has no text", () => {
    render(
      <JobExtractionPanel
        candidatureId={candidatureId}
        source={{ ...source, sourceText: "" }}
        onAccepted={onAccepted}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Review source with AI" })).not.toBeInTheDocument();
  });

  it("does not show a review action when no valid extraction route exists", async () => {
    listConnections.mockResolvedValueOnce([]);
    renderPanel();

    await vi.waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Review source with AI" })).not.toBeInTheDocument();
    });
  });
});
