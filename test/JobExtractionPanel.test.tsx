import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { JobExtractionPanel } from "../src/renderer/JobExtractionPanel";
import { clearAllAiTasks } from "../src/renderer/ai-task-store";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
import type { PartialJobExtractionResult } from "../src/shared/ai-proposal-outcomes";
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
    favourite: false,
    favouriteOrder: null,
    presentationSize: "normal",
    aiUseAllowed: true,
  },
};
const contactFieldId = "00000000-0000-4000-8000-000000000903";
const contactField: CandidatureFieldConfiguration = {
  definition: {
    ...field.definition,
    id: contactFieldId,
    label: "Recruiter contact",
    valueType: "text",
  },
  preferences: {
    ...field.preferences,
    fieldId: contactFieldId,
  },
};

const extractJob = vi.fn();
const cancelJobExtraction = vi.fn();
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function extractionResult(
  proposals: PartialJobExtractionResult["proposals"],
  issues: PartialJobExtractionResult["issues"] = [],
): PartialJobExtractionResult {
  return { proposals, newFields: [], existingTags: [], newTags: [], issues };
}

describe("saved Source extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllAiTasks();
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
    extractJob.mockResolvedValue(
      extractionResult([
        { fieldId, value: 1500 },
        { fieldId: contactFieldId, value: "recruiter@example.test" },
      ]),
    );
    cancelJobExtraction.mockResolvedValue(true);
    setFieldValue.mockResolvedValue(undefined);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        aiTasks: { extractJob, cancelJobExtraction },
        aiConnections: { list: listConnections },
        candidatures: { listFields, setFieldValue },
      },
    });
  });

  afterEach(() => {
    cleanup();
    clearAllAiTasks();
  });

  it("acknowledges extraction immediately, discloses the exact Source, and retains only selected proposals", async () => {
    const user = userEvent.setup();
    const pending = deferred<PartialJobExtractionResult>();
    extractJob.mockReturnValueOnce(pending.promise);
    renderPanel();

    await screen.findByRole("heading", { name: "Ask AI to find useful information?" });
    expect(extractJob).not.toHaveBeenCalled();
    expect(screen.getByText("Remote review endpoint")).toBeInTheDocument();
    expect(screen.getByText("Remote HTTPS")).toBeInTheDocument();
    expect(screen.queryByText("https://review.example.test/v1")).not.toBeInTheDocument();
    expect(screen.queryByText("review-model")).not.toBeInTheDocument();
    expect(screen.getByText(source.sourceText)).toBeInTheDocument();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Ask AI to find information" }));
    expect(await screen.findByText(/Queued|Looking through the saved Source/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep without AI" })).toBeEnabled();
    expect(extractJob).toHaveBeenCalledWith(`initial-extraction:${candidatureId}`, source);

    pending.resolve(
      extractionResult([
        { fieldId, value: 1500 },
        { fieldId: contactFieldId, value: "recruiter@example.test" },
      ]),
    );
    await screen.findByRole("heading", { name: "Suggested information" });
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole("checkbox", { name: /Recruiter contact: recruiter@example/ }));
    await user.click(screen.getByRole("button", { name: "Keep selected information" }));

    expect(setFieldValue).toHaveBeenCalledWith({ candidatureId, fieldId, value: 1500 });
    expect(setFieldValue).toHaveBeenCalledTimes(1);
    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("keeps successful siblings when one selected proposal cannot be persisted", async () => {
    const user = userEvent.setup();
    setFieldValue.mockImplementation(async ({ fieldId: selectedFieldId }) => {
      if (selectedFieldId === contactFieldId) throw new Error("Recruiter contact changed while saving.");
      return undefined;
    });
    renderPanel();
    await screen.findByRole("heading", { name: "Ask AI to find useful information?" });
    await user.click(screen.getByRole("button", { name: "Ask AI to find information" }));
    await screen.findByRole("heading", { name: "Suggested information" });
    await user.click(screen.getByRole("button", { name: "Keep selected information" }));

    expect(setFieldValue).toHaveBeenCalledTimes(2);
    expect(onAccepted).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
    expect(await screen.findByText(/1 field kept · 1 needs review/i)).toBeInTheDocument();
    expect(screen.getByText(/Recruiter contact changed while saving/i)).toBeInTheDocument();
  });

  it("shows field-specific unusable proposals without turning the extraction into a failed task", async () => {
    const user = userEvent.setup();
    extractJob.mockResolvedValueOnce(
      extractionResult(
        [{ fieldId, value: 1500 }],
        [
          {
            kind: "invalid",
            fieldId: contactFieldId,
            fieldLabel: "Recruiter contact",
            proposedValue: ["a@example.test", "b@example.test"],
            reason: "Recruiter contact accepts one value, but AI proposed 2.",
          },
        ],
      ),
    );
    renderPanel();
    await screen.findByRole("heading", { name: "Ask AI to find useful information?" });
    await user.click(screen.getByRole("button", { name: "Ask AI to find information" }));

    await screen.findByRole("heading", { name: "Suggested information" });
    expect(screen.getByText(/1 AI suggestion needs review/i)).toBeInTheDocument();
    expect(screen.getByText(/a@example.test, b@example.test/i)).toBeInTheDocument();
    expect(screen.getByText(/accepts one value, but AI proposed 2/i)).toBeInTheDocument();
    expect(screen.queryByText(/AI could not finish this request/i)).not.toBeInTheDocument();
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

    await screen.findByRole("heading", { name: "Ask AI to find useful information?" });
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

    await screen.findByRole("heading", { name: "Ask AI to find useful information?" });
    expect(screen.getByText("Selected general default")).toBeInTheDocument();
    expect(screen.queryByText("Validated alternative")).not.toBeInTheDocument();
  });

  it("keeps the saved Source unchanged when dismissed and exposes extraction failure with retry", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole("heading", { name: "Ask AI to find useful information?" });
    await user.click(screen.getByRole("button", { name: "Keep without AI" }));

    expect(extractJob).not.toHaveBeenCalled();
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(setFieldValue).not.toHaveBeenCalled();

    cleanup();
    onDismiss.mockClear();
    clearAllAiTasks();
    extractJob.mockRejectedValueOnce(new Error("The configured endpoint did not respond."));
    renderPanel();
    await screen.findByRole("heading", { name: "Ask AI to find useful information?" });
    await user.click(screen.getByRole("button", { name: "Ask AI to find information" }));

    expect(await screen.findByText("The configured endpoint did not respond.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry AI request" })).toBeEnabled();
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
    expect(screen.queryByRole("heading", { name: "Ask AI to find useful information?" })).not.toBeInTheDocument();
  });

  it("shows the exact setup action when no validated route is usable", async () => {
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
    const user = userEvent.setup();
    renderPanel();

    await screen.findByRole("heading", { name: "AI is not ready for this action yet" });
    await user.click(screen.getByRole("button", { name: "Open AI settings" }));
    expect(openSettingsFor).toHaveBeenCalledWith("ai", "candidatures");
    expect(screen.getByRole("button", { name: "Keep without AI" })).toBeEnabled();
  });
});
