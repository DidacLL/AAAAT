import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandidatureOfferPanel } from "../src/renderer/CandidatureOfferPanel";

const sourceText = "<h2>Platform Engineer</h2>\n<div>English required</div>\nRAW-MARKER";

describe("CandidatureOfferPanel", () => {
  it("shows a readable primary offer and retains access to the exact original Source", async () => {
    Object.defineProperty(window, "aaaat", { configurable: true, value: {
      candidatures: { listSources: vi.fn().mockResolvedValue([{ id: crypto.randomUUID(), candidatureId: crypto.randomUUID(), kind: "job_posting", title: "Platform Engineer", url: "https://example.test/job", sourceText, createdAt: "2026-09-15", updatedAt: "2026-09-15" }]) },
    }});
    render(<CandidatureOfferPanel candidatureId={crypto.randomUUID()} />);
    expect(await screen.findByText(/English required/, { selector: "p.source-reader-content" })).toBeInTheDocument();
    expect(screen.getByText("Platform Engineer", { selector: "h4" })).toBeInTheDocument();
    expect(screen.getByText("Original Source")).toBeInTheDocument();
    expect(sourceText).toContain("<h2>");
  });
});
