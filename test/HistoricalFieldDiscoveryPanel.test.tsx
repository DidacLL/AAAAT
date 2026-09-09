import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HistoricalFieldDiscoveryPanel } from "../src/renderer/HistoricalFieldDiscoveryPanel";
import {
  ContextualHandoffContext,
  type ContextualHandoffApi,
} from "../src/renderer/contextual-handoffs";
import type { CandidatureFieldConfiguration, CandidatureSource } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000001001";
const fieldId = "00000000-0000-4000-8000-000000001002";
const firstSourceId = "00000000-0000-4000-8000-000000001003";
const secondSourceId = "00000000-0000-4000-8000-000000001004";

const field: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: null,
    label: "Salary range",
    description: "Compensation stated in retained material.",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
  preferences: {
    fieldId,
    focusVisible: false,
    focusOrder: null,
    focusProminence: "normal",
    identityOrder: null,
    aiDiscovery: true,
    aiContextMode: "omit",
  },
};

const sources: CandidatureSource[] = [
  {
    id: firstSourceId,
    candidatureId,
    kind: "job_posting",
    title: "Job posting",
    url: "https://example.test/job",
    sourceText: "Salary: 70k–80k",
    createdAt: "2026-09-10T00:00:00.000Z",
    updatedAt: "2026-09-10T00:00:00.000Z",
  },
  {
    id: secondSourceId,
    candidatureId,
    kind: "recruiter_message",
    title: "Recruiter note",
    url: "",
    sourceText: "Unselected private note",
    createdAt: "2026-09-10T00:00:01.000Z",
    updatedAt: "2026-09-10T00:00:01.000Z",
  },
];

const listSources = vi.fn();
const discoverField = vi.fn();
const onAccept = vi.fn();
const onClose = vi.fn();

const handoffs: ContextualHandoffApi = {
  documentHandoff: null,
  professionalInformationHandoff: null,
  settingsHandoff: null,
  openDocumentFromCandidature: vi.fn(),
  returnToCandidature: vi.fn(),
  openProfessionalInformationItem: vi.fn(),
  returnToDocument: vi.fn(),
  openSettingsFor: vi.fn(),
  returnFromSettings: vi.fn(),
};

function renderPanel() {
  return render(
    <ContextualHandoffContext.Provider value={handoffs}>
      <HistoricalFieldDiscoveryPanel
        candidatureId={candidatureId}
        field={field}
        onAccept={onAccept}
        onClose={onClose}
      />
    </ContextualHandoffContext.Provider>,
  );
}

describe("historical field discovery Source selection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listSources.mockResolvedValue(sources);
    discoverField.mockResolvedValue({ proposal: null, existingValuePresent: false });
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        candidatures: { listSources },
        ai: { discoverField },
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("requires a non-empty selection, previews only selected Sources, and submits only selected IDs", async () => {
    const user = userEvent.setup();
    renderPanel();

    const send = await screen.findByRole("button", { name: "Send selected Sources to AI" });
    expect(send).toBeDisabled();
    expect(discoverField).not.toHaveBeenCalled();
    expect(screen.queryByText("Salary: 70k–80k")).not.toBeInTheDocument();
    expect(screen.queryByText("Unselected private note")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Job posting" }));
    expect(send).toBeEnabled();
    expect(screen.getByText("Salary: 70k–80k")).toBeInTheDocument();
    expect(screen.queryByText("Unselected private note")).not.toBeInTheDocument();

    await user.click(send);

    expect(discoverField).toHaveBeenCalledWith({
      candidatureId,
      fieldId,
      sourceIds: [firstSourceId],
    });
    expect(discoverField).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
