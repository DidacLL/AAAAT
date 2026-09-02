import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureFitPanel } from "../src/renderer/CandidatureFitPanel";
import type { CandidatureRecord } from "../src/shared/contracts";

const record: CandidatureRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  company: "Example Corp",
  role: "Platform Engineer",
  location: "Remote",
  workMode: "remote",
  salaryText: "",
  source: "Job board",
  sourceUrl: "",
  sourceText: "Build TypeScript systems.",
  status: "saved",
  applicationDate: "",
  nextAction: "",
  nextActionDate: "",
  notes: "",
  archived: false,
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
        name: "Remote fixture",
        endpoint: "https://models.example.test/v1",
        model: "fixture-model",
        classification: "remote",
        hasCredential: true,
        secureStorageAvailable: true,
      },
      projectedContext: {
        candidature: {
          company: "Example Corp",
          role: "Platform Engineer",
          location: "Remote",
          workMode: "remote",
          salaryText: "",
          source: "Job board",
          sourceText: "Build TypeScript systems.",
        },
        profileItems: [
          { kind: "identity", title: "[AAAT_PRIVATE_1]" },
          { kind: "skill", title: "TypeScript" },
        ],
      },
      requiresRemoteDisclosure: true,
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

  it("shows the exact projected payload and requires acknowledgement before remote inference", async () => {
    const user = userEvent.setup();
    render(<CandidatureFitPanel record={record} />);

    expect(screen.getByText(/saved candidature snapshot/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview AI context" }));

    expect(previewFit).toHaveBeenCalledWith({
      candidatureId: record.id,
      identityPrivacy: "token",
      contactPrivacy: "token",
    });
    expect(screen.getByText(/AAAT_PRIVATE_1/)).toBeInTheDocument();
    expect(screen.getByText(/will leave this computer/i)).toBeInTheDocument();

    const run = screen.getByRole("button", { name: "Run fit assessment" });
    expect(run).toBeDisabled();
    await user.click(
      screen.getByRole("checkbox", {
        name: /I understand that the projected context shown above/i,
      }),
    );
    expect(run).toBeEnabled();
    await user.click(run);

    expect(assessFit).toHaveBeenCalledWith({
      candidatureId: record.id,
      identityPrivacy: "token",
      contactPrivacy: "token",
    });
    expect(await screen.findByText("Strong match.")).toBeInTheDocument();
  });
});
