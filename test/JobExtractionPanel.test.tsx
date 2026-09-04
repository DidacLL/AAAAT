import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobExtractionPanel } from "../src/renderer/JobExtractionPanel";
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
const onCreate = vi.fn();

describe("Source discovery panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFields.mockResolvedValue([field]);
    extractJob.mockResolvedValue({ proposals: [{ fieldId, value: 1500 }] });
    onCreate.mockResolvedValue(true);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        ai: { extractJob },
        candidatures: { listFields },
      },
    });
  });

  afterEach(() => cleanup());

  it("discovers current registered information and creates only after explicit acceptance", async () => {
    const user = userEvent.setup();
    render(<JobExtractionPanel onCreate={onCreate} />);
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
    render(<JobExtractionPanel onCreate={onCreate} />);
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
});
