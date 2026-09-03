import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobExtractionPanel } from "../src/renderer/JobExtractionPanel";

const extractJob = vi.fn();
const onCreate = vi.fn();

describe("job extraction panel", () => {
  beforeEach(() => {
    extractJob.mockReset();
    onCreate.mockReset();
    extractJob.mockResolvedValue({
      company: "Example Corp",
      role: "Platform Engineer",
      location: "Madrid",
      workMode: "hybrid",
      salaryText: "€70k",
    });
    onCreate.mockResolvedValue(true);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { ai: { extractJob } },
    });
  });
  afterEach(() => cleanup());

  it("extracts pasted source, shows a proposal, and creates only after explicit approval", async () => {
    const user = userEvent.setup();
    render(<JobExtractionPanel onCreate={onCreate} />);
    await user.type(screen.getByLabelText("Source"), "Company careers");
    await user.type(screen.getByLabelText("Source URL"), "https://example.test/job/1");
    await user.type(screen.getByLabelText("Job source text"), "Example Corp seeks a Platform Engineer.");
    await user.click(screen.getByRole("button", { name: "Extract job details" }));

    expect(extractJob).toHaveBeenCalledWith({
      source: "Company careers",
      sourceUrl: "https://example.test/job/1",
      sourceText: "Example Corp seeks a Platform Engineer.",
    });
    expect(await screen.findByText("Example Corp")).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Create candidature from proposal" }));
    expect(onCreate).toHaveBeenCalledWith({
      company: "Example Corp",
      role: "Platform Engineer",
      location: "Madrid",
      workMode: "hybrid",
      salaryText: "€70k",
      source: "Company careers",
      sourceUrl: "https://example.test/job/1",
      sourceText: "Example Corp seeks a Platform Engineer.",
      status: "saved",
      applicationDate: "",
      nextAction: "",
      nextActionDate: "",
      notes: "",
    });
  });
});
