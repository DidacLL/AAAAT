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
const onDirtyChange = vi.fn();

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
        onDirtyChange={onDirtyChange}
      />
    </ContextualHandoffContext.Provider>,
  );
}

describe("saved Source extraction", () => {
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

  it("presents configured extraction immediately after save, discloses the exact Source, and retains only selected proposals", async () => {
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole("heading", { name: "Extract useful information?" });
    expect(screen.queryByRole("button", { name: "Review source with AI" })).not.toBeInTheDocument();
    expect(extractJob).not.toHaveBeenCalled();
    expect(screen.getByText("Remote review endpoint")).toBeInTheDocument();
    expect(screen.getByText("Remote HTTPS")).toBeInTheDocument();
    expect(screen.queryByText("https://review.example.test/v1")).not.toBeInTheDocument();
    expect(screen.queryByText("review-model")).not.toBeInTheDocument();
    expect(screen.getByText(source.sourceText)).toBeInTheDocument();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Extract useful information" }));

    expect(extractJob).toHaveBeenCalledWith(source);
    await screen.findByRole("heading", { name: "Proposed information" });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
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
    renderPanel();

    await screen.findByRole("heading", { name: "Extract useful information?" });
    expect(screen.getByText("Laptop model")).toBeInTheDocument();
    expect(screen.getByText("Local on this computer")).toBeInTheDocument();
    expect(screen.queryByText("http://127.0.0.1:11434/v1")).not.toBeInTheDocument();
  });

  it("shows the same validated general default that runtime routing will use", async () => {
    listConnections.mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-000000000905",
        name: "Validated alternative",
        endpoint: "https://alternative.example.test/v1",
        model: "alternative-model",
        isDefault: false,
        validatedOperations: ["job_extraction"],
        defaultForOperations: [],
      },
      {
        id: "00000000-0000-4000-8000-000000000906",
        name: "Selected general default",
        endpoint: "http://localhost:11434/v1",
        model: "default-model",
        isDefault: true,
        validatedOperations: ["job_extraction"],
        defaultForOperations: [],
      },
    ]);
    renderPanel();

    await screen.findByRole("heading", { name: "Extract useful information?" });
    expect(screen.getByText("Selected general default")).toBeInTheDocument();
    expect(screen.queryByText("Validated alternative")).not.toBeInTheDocument();
  });

  it("keeps the saved Source unchanged when the user keeps it without AI or extraction fails", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole("heading", { name: "Extract useful information?" });
    await user.click(screen.getByRole("button", { name: "Keep without AI" }));

    expect(extractJob).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(setFieldValue).not.toHaveBeenCalled();

    onDismiss.mockClear();
    extractJob.mockRejectedValueOnce(new Error("The configured endpoint did not respond."));
    renderPanel();
    await screen.findAllByRole("heading", { name: "Extract useful information?" });
    const buttons = screen.getAllByRole("button", { name: "Extract useful information" });
    await user.click(buttons.at(-1)!);

    expect(await screen.findByText("The configured endpoint did not respond.")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Open AI connections settings" }).at(-1)!);
    expect(openSettingsFor).toHaveBeenCalledWith("ai", "candidatures");
    expect(setFieldValue).not.toHaveBeenCalled();
    expect(onAccepted).not.toHaveBeenCalled();
  });

  it("shows no extraction ceremony when the Source has no text", () => {
    render(
      <JobExtractionPanel
        candidatureId={candidatureId}
        source={{ ...source, sourceText: "" }}
        onAccepted={onAccepted}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.queryByRole("heading", { name: "Extract useful information?" })).not.toBeInTheDocument();
  });

  it("shows no extraction ceremony when the selected route is not validated", async () => {
    listConnections.mockResolvedValueOnce([
      {
        id: "00000000-0000-4000-8000-000000000907",
        name: "Validated alternative",
        endpoint: "https://alternative.example.test/v1",
        model: "alternative-model",
        isDefault: false,
        validatedOperations: ["job_extraction"],
        defaultForOperations: [],
      },
      {
        id: "00000000-0000-4000-8000-000000000908",
        name: "Unvalidated general default",
        endpoint: "http://localhost:11434/v1",
        model: "default-model",
        isDefault: true,
        validatedOperations: [],
        defaultForOperations: [],
      },
    ]);
    renderPanel();

    await vi.waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Extract useful information?" })).not.toBeInTheDocument();
    });
  });
});
