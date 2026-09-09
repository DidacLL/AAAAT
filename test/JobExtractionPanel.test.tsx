import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobExtractionPanel } from "../src/renderer/JobExtractionPanel";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
import type { CandidatureFieldConfiguration } from "../src/shared/contracts";

const fieldId = "00000000-0000-4000-8000-000000000901";
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
const setupCurrent = vi.fn();
const onCreate = vi.fn();
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
      <JobExtractionPanel onCreate={onCreate} />
    </ContextualHandoffContext.Provider>,
  );
}

describe("Source discovery panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFields.mockResolvedValue([field]);
    extractJob.mockResolvedValue({ proposals: [{ fieldId, value: 1500 }] });
    setupCurrent.mockResolvedValue({
      ai: { operations: [{ operation: "job_extraction", available: true }] },
    });
    onCreate.mockResolvedValue(true);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        ai: { extractJob },
        candidatures: { listFields },
        setupEnvironment: { current: setupCurrent },
      },
    });
  });

  afterEach(() => cleanup());

  it("discovers current registered information and creates only after explicit acceptance", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Discover registered information from a Source");

    await user.type(screen.getByLabelText("Source title"), "Pilot vacancy");
    await user.type(screen.getByLabelText("Source URL"), "https://example.test/job/1");
    await user.type(screen.getByLabelText("Source text"), "Applicants need at least 1,500 total flight hours.");
    await user.click(screen.getByRole("button", { name: "Discover configured fields" }));

    expect(extractJob).toHaveBeenCalledWith({
      sourceTitle: "Pilot vacancy",
      sourceUrl: "https://example.test/job/1",
      sourceText: "Applicants need at least 1,500 total flight hours.",
    });
    expect(await screen.findByText("Minimum flight hours")).toBeInTheDocument();
    expect(screen.getByText("1500")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Create candidature and accept proposal" }),
    );
    expect(onCreate).toHaveBeenCalledWith({
      source: {
        kind: "job_posting",
        title: "Pilot vacancy",
        url: "https://example.test/job/1",
        sourceText: "Applicants need at least 1,500 total flight hours.",
      },
      values: [{ fieldId, value: 1500 }],
    });
  });

  it("accepts an empty proposal without inventing candidature information", async () => {
    extractJob.mockResolvedValueOnce({ proposals: [] });
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Discover registered information from a Source");
    await user.type(screen.getByLabelText("Source text"), "A sparse opportunity with no supported facts.");
    await user.click(screen.getByRole("button", { name: "Discover configured fields" }));

    expect(await screen.findByText(/No configured discovery field was supported/)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Create candidature and accept proposal" }),
    );
    expect(onCreate).toHaveBeenCalledWith({
      source: {
        kind: "job_posting",
        title: "",
        url: "",
        sourceText: "A sparse opportunity with no supported facts.",
      },
      values: [],
    });
  });

  it("offers AI connections Settings when job extraction has no available route", async () => {
    extractJob.mockRejectedValueOnce(new Error("No validated AI route is available."));
    setupCurrent.mockResolvedValueOnce({
      ai: { operations: [{ operation: "job_extraction", available: false }] },
    });
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Discover registered information from a Source");
    await user.type(screen.getByLabelText("Source text"), "Source text requiring AI analysis.");
    await user.click(screen.getByRole("button", { name: "Discover configured fields" }));

    const settings = await screen.findByRole("button", { name: "Open AI connections settings" });
    await user.click(settings);
    expect(openSettingsFor).toHaveBeenCalledWith("ai", "candidatures");
  });
});