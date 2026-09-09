import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobExtractionPanel } from "../src/renderer/JobExtractionPanel";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
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
const contactFieldId = "00000000-0000-4000-8000-000000000903";
const contactField: CandidatureFieldConfiguration = {
  definition: {
    ...field.definition,
    id: contactFieldId,
    label: "Recruiter contact",
  },
  preferences: {
    ...field.preferences,
    fieldId: contactFieldId,
  },
};

const extractJob = vi.fn();
const listFields = vi.fn();
const listConnections = vi.fn();
const setFieldValue = vi.fn();
const onAccepted = vi.fn();
const onDismiss = vi.fn();
const openSettingsFor = vi.fn();

const handoffs: ContextualHandoffApi = {
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

function renderPanel() {
  return render(
    <ContextualHandoffContext.Provider value={handoffs}>
      <JobExtractionPanel
        candidatureId={candidatureId}
        source={source}
        onAccepted={onAccepted}
        onDismiss={onDismiss}
      />
    </ContextualHandoffContext.Provider>,
  );
}

describe("saved Source AI review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listFields.mockResolvedValue([field, contactField]);
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
    extractJob.mockResolvedValue({
      proposals: [
        { fieldId, value: "1500" },
        { fieldId: contactFieldId, value: "recruiter@example.test" },
      ],
    });
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

  it("keeps the Source first, discloses only ordinary remote connection detail, and retains only selected proposals", async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole("heading", { name: "Review source with AI" });
    expect(extractJob).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Review source with AI" }));
    expect(screen.getByText("Remote review endpoint")).toBeInTheDocument();
    expect(screen.getByText("Remote HTTPS")).toBeInTheDocument();
    expect(screen.queryByText("https://review.example.test/v1")).not.toBeInTheDocument();
    expect(screen.queryByText("review-model")).not.toBeInTheDocument();
    expect(screen.getByText(source.sourceText)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Send selected Source to AI" }));

    expect(extractJob).toHaveBeenCalledWith(source);
    await screen.findByRole("heading", { name: "Proposed information" });
    await user.click(screen.getByRole("checkbox", { name: /Recruiter contact: recruiter@example/ }));
    await user.click(screen.getByRole("button", { name: "Keep selected information" }));

    expect(setFieldValue).toHaveBeenCalledWith({ candidatureId, fieldId, value: "1500" });
    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("identifies a loopback connection as local without exposing its literal endpoint", async () => {
    listConnections.mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-000000000904",
        name: "Laptop model",
        endpoint: "http://127.0.0.1:11434/v1",
        model: "local-model",
        isDefault: true,
        validatedOperations: ["job_extraction"],
        defaultForOperations: ["job_extraction"],
      },
    ]);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole("heading", { name: "Review source with AI" });
    await user.click(screen.getByRole("button", { name: "Review source with AI" }));

    expect(screen.getByText("Laptop model")).toBeInTheDocument();
    expect(screen.getByText("Local on this computer")).toBeInTheDocument();
    expect(screen.queryByText("http://127.0.0.1:11434/v1")).not.toBeInTheDocument();
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
    await user.click(screen.getByRole("button", { name: "Open AI connections settings" }));
    expect(openSettingsFor).toHaveBeenCalledWith("ai", "candidatures");
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
