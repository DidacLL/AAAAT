import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureFitPanel } from "../src/renderer/CandidatureFitPanel";
import type { CandidatureRecord } from "../src/shared/contracts";

const record: CandidatureRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  archived: false,
  createdAt: "2026-09-04T10:00:00.000Z",
  updatedAt: "2026-09-04T10:00:00.000Z",
  label: "Example Corp — Platform Engineer",
  values: [],
  documentIds: [],
  conceptIds: [],
};

const previewFit = vi.fn();
const assessFit = vi.fn();

describe("candidature AI fit panel", () => {
  beforeEach(() => {
    previewFit.mockReset();
    assessFit.mockReset();
    previewFit.mockResolvedValue({
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
          { kind: "identity", title: "[AAAT_PRIVATE_11111111-1111-4111-8111-111111111111]" },
          { kind: "skill", title: "TypeScript" },
        ],
      },
    });
    assessFit.mockResolvedValue({
      fit: "strong",
      summary: "Strong match.",
      strengths: ["TypeScript"],
      gaps: [],
      focus: ["Platform ownership"],
    });
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { ai: { previewFit, assessFit } },
    });
  });

  afterEach(() => cleanup());

  it("shows the projected local payload before running the read-only assessment", async () => {
    const user = userEvent.setup();
    render(<CandidatureFitPanel record={record} />);

    expect(screen.getByText(/saved candidature snapshot/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview AI context" }));

    expect(previewFit).toHaveBeenCalledWith({
      candidatureId: record.id,
      identityPrivacy: "token",
      contactPrivacy: "token",
    });
    expect(screen.getByText(/AAAT_PRIVATE_11111111/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run local fit assessment" }));

    expect(assessFit).toHaveBeenCalledWith({
      candidatureId: record.id,
      identityPrivacy: "token",
      contactPrivacy: "token",
    });
    expect(await screen.findByText("Strong match.")).toBeInTheDocument();
  });
});
