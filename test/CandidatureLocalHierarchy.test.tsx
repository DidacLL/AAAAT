import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureRecord, DesktopApi, DocumentRecord, TagRecord } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000701";
const tag: TagRecord = {
  id: "00000000-0000-4000-8000-000000000702",
  name: "Platform",
  definition: "Platform engineering",
  notes: "Ask about ownership boundaries.",
  aliases: ["platform team"],
};
const document: DocumentRecord = {
  id: "00000000-0000-4000-8000-000000000703",
  kind: "cv",
  title: "Application CV",
  variantId: null,
  language: "en",
  engine: "pdflatex",
  bodyParagraphs: [],
  mode: "managed",
  rules: [],
  projectPath: "/workspace/documents/cv",
  sourcePath: "/workspace/documents/cv/main.tex",
  artifactPath: "/workspace/documents/cv/build/main.pdf",
};
const candidature: CandidatureRecord = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-07T00:00:00.000Z",
  updatedAt: "2026-09-07T00:00:00.000Z",
  label: "Regional Air",
  sourceSearchText: "Raw retained offer material",
  values: [],
  documentIds: [document.id],
  tagIds: [],
};

const setTags = vi.fn();

function installApi() {
  setTags.mockImplementation(async ({ tagIds }) => ({ ...candidature, tagIds }));
  const api = {
    candidatures: {
      list: vi.fn().mockResolvedValue([candidature]),
      listFields: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      filter: vi.fn().mockResolvedValue([candidatureId]),
      createField: vi.fn(),
      updateField: vi.fn(),
      deleteField: vi.fn(),
      updateFieldPreferences: vi.fn(),
      setFieldValue: vi.fn(),
      clearFieldValue: vi.fn(),
      listSources: vi.fn().mockResolvedValue([]),
      addSource: vi.fn(),
      updateSource: vi.fn(),
      removeSource: vi.fn(),
      setDocuments: vi.fn(),
      listTags: vi.fn().mockResolvedValue([tag]),
      createTag: vi.fn(),
      updateTag: vi.fn(),
      setTags,
    },
    candidatureSearch: { search: vi.fn().mockResolvedValue([]) },
    documents: { list: vi.fn().mockResolvedValue([document]) },
    artifacts: { list: vi.fn().mockResolvedValue([]), capture: vi.fn() },
    ai: {
      discoverField: vi.fn(),
      previewOpportunityReview: vi.fn(),
      reviewOpportunity: vi.fn(),
      recommendVariant: vi.fn(),
    },
    profile: { current: vi.fn().mockResolvedValue({ items: [], variants: [] }) },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("complete candidature maintenance", () => {
  it("opens directly from corpus without the old tab hierarchy and keeps secondary data progressively disclosed", async () => {
    installApi();
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    expect(await screen.findByRole("heading", { name: "Candidatures" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Complete candidature" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Edit candidature" }));

    const complete = screen.getByRole("region", { name: "Complete candidature" });
    expect(within(complete).getByRole("heading", { name: "Regional Air" })).toBeInTheDocument();
    expect(within(complete).getByRole("region", { name: "Candidature information" })).toBeInTheDocument();
    expect(within(complete).getByRole("region", { name: "Sources" })).toBeInTheDocument();
    expect(within(complete).getByRole("region", { name: "Tags" })).toBeInTheDocument();
    expect(within(complete).getByRole("region", { name: "Application material" })).toBeInTheDocument();
    expect(within(complete).getByText("Activity", { selector: "summary" })).toBeInTheDocument();
    expect(screen.queryByRole("tablist", { name: "Candidature sections" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Concept/i)).not.toBeInTheDocument();
  });

  it("uses Tags for reusable glossary associations while application material remains independently available", async () => {
    installApi();
    const user = userEvent.setup();
    render(<CandidaturesWorkspace />);

    await user.click(await screen.findByRole("button", { name: "Edit candidature" }));

    const tags = screen.getByRole("region", { name: "Tags" });
    await user.click(within(tags).getByRole("checkbox", { name: "Platform" }));
    await user.click(within(tags).getByRole("button", { name: "Save Tag associations" }));
    expect(setTags).toHaveBeenCalledWith({ candidatureId, tagIds: [tag.id] });

    const applicationMaterial = screen.getByRole("region", { name: "Application material" });
    expect(within(applicationMaterial).getByRole("heading", { name: "Application CV" })).toBeInTheDocument();
    expect(
      within(applicationMaterial).getByRole("button", { name: "Create CV or letter for this candidature" }),
    ).toBeInTheDocument();
    expect(
      within(applicationMaterial).getByRole("button", { name: "Open in CVs & letters" }),
    ).toBeInTheDocument();
  });
});
