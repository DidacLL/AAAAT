import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VariantRecommendationPanel } from "../src/renderer/VariantRecommendationPanel";
import type { CandidatureRecord } from "../src/shared/contracts";

const recommendVariant = vi.fn();
const profileCurrent = vi.fn();
const record: CandidatureRecord = {
  id: "00000000-0000-4000-8000-000000000001", company: "Example", role: "Platform Engineer", location: "Remote", workMode: "remote", salaryText: "", source: "", sourceUrl: "", sourceText: "Platform role", status: "saved", applicationDate: "", nextAction: "", nextActionDate: "", notes: "", archived: false, documentIds: [], conceptIds: [],
};

describe("variant recommendation panel", () => {
  beforeEach(() => {
    recommendVariant.mockReset(); profileCurrent.mockReset();
    recommendVariant.mockResolvedValue({ variantId: "00000000-0000-4000-8000-000000000010", rationale: "Matches platform focus." });
    profileCurrent.mockResolvedValue({ items: [], variants: [{ id: "00000000-0000-4000-8000-000000000010", name: "Platform", focus: "Platform focus", targetTags: [], preferredLanguage: "en", rules: [] }] });
    Object.defineProperty(window, "aaaat", { configurable: true, value: { ai: { recommendVariant }, profile: { current: profileCurrent } } });
  });
  afterEach(() => cleanup());

  it("shows a recommendation for an existing variant without a mutation action", async () => {
    const user = userEvent.setup();
    render(<VariantRecommendationPanel record={record} />);
    await user.click(screen.getByRole("button", { name: "Recommend existing variant" }));
    expect(recommendVariant).toHaveBeenCalledWith({ candidatureId: record.id });
    expect(await screen.findByText("Platform")).toBeInTheDocument();
    expect(screen.getByText("Matches platform focus.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apply|create|update/i })).not.toBeInTheDocument();
  });
});
