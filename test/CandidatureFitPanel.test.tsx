import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CandidatureFitPanel } from "../src/renderer/CandidatureFitPanel";
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
  conceptIds: [],
};

const projectedPrivateValue = "opaque local replacement";
const previewFit = vi.fn();
const assessFit = vi.fn();
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
      <CandidatureFitPanel record={record} />
    </ContextualHandoffContext.Provider>,
  );
}

describe("candidature AI fit panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
          { kind: "identity", title: projectedPrivateValue },
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
      value: {
        ai: { previewFit, assessFit },
        setupEnvironment: {
          current: vi.fn().mockResolvedValue({
            ai: { operations: [{ operation: "fit_assessment", available: true }] },
          }),
        },
      },
    });
  });

  afterEach(() => cleanup());

  it("shows the projected local payload before running the read-only assessment", async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.getByText(/saved candidature snapshot/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Preview AI context" }));

    expect(previewFit).toHaveBeenCalledWith({
      candidatureId: record.id,
      identityPrivacy: "token",
      contactPrivacy: "token",
    });
    expect(
      screen.getByText(
        (content, element) => element?.tagName === "PRE" && content.includes(projectedPrivateValue),
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run local fit assessment" }));

    expect(assessFit).toHaveBeenCalledWith({
      candidatureId: record.id,
      identityPrivacy: "token",
      contactPrivacy: "token",
    });
    expect(await screen.findByText("Strong match.")).toBeInTheDocument();
  });

  it("offers AI connections Settings only when the fit route is unavailable", async () => {
    previewFit.mockRejectedValueOnce(new Error("No validated AI route is available."));
    window.aaaat.setupEnvironment.current = vi.fn().mockResolvedValue({
      ai: { operations: [{ operation: "fit_assessment", available: false }] },
    }) as typeof window.aaaat.setupEnvironment.current;
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Preview AI context" }));
    const settings = await screen.findByRole("button", { name: "Open AI connections settings" });
    await user.click(settings);

    expect(openSettingsFor).toHaveBeenCalledWith("ai", "candidatures");
  });
});