import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({
    documentHandoff: null,
    openDocumentFromCandidature: () => undefined,
  }),
}));
vi.mock("../src/renderer/CandidatureBulkAiReview", () => ({ CandidatureBulkAiReview: () => null }));
vi.mock("../src/renderer/CandidatureFieldAiState", () => ({ CandidatureFieldAiState: () => null }));
vi.mock("../src/renderer/CandidatureOfferPanel", () => ({ CandidatureOfferPanel: () => null }));
vi.mock("../src/renderer/CandidatureSourcesPanel", () => ({ CandidatureSourcesPanel: () => null }));

import { CandidaturesWorkspace } from "../src/renderer/CandidaturesWorkspace";
import type { CandidatureAiTaskTemplate } from "../src/shared/candidature-opportunity-research-access-contracts";
import type { CandidatureFieldConfiguration, CandidatureRecord } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000551";
const fieldId = "00000000-0000-4000-8000-000000000552";
const savedTemplateId = "00000000-0000-4000-8000-000000000553";
const current = vi.fn();
const update = vi.fn();
const taskContext = vi.fn();
const taskTemplates = vi.fn();
const saveTaskTemplate = vi.fn();
const deleteTaskTemplate = vi.fn();
const copyTask = vi.fn();
const exportTask = vi.fn();
const retainResult = vi.fn();
const importResult = vi.fn();
let savedTemplates: CandidatureAiTaskTemplate[] = [];

function field(): CandidatureFieldConfiguration {
  return {
    definition: {
      id: fieldId,
      systemKey: "candidature.role",
      label: "Role",
      description: "Target role",
      valueType: "text",
      cardinality: "one",
      choices: [],
      enabled: true,
      createdAt: "2026-09-25T00:00:00.000Z",
      updatedAt: "2026-09-25T00:00:00.000Z",
    },
    preferences: {
      fieldId,
      favourite: true,
      favouriteOrder: null,
      presentationSize: "normal",
      aiUseAllowed: true,
    },
  };
}

function record(): CandidatureRecord {
  return {
    id: candidatureId,
    archived: false,
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:00:00.000Z",
    sourceSearchText: "Platform Engineer",
    values: [{
      candidatureId,
      fieldId,
      value: "Platform Engineer",
      createdAt: "2026-09-25T00:00:00.000Z",
      updatedAt: "2026-09-25T00:00:00.000Z",
    }],
    tagIds: [],
  };
}

function installApi() {
  const stored = record();
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        list: vi.fn(async () => [stored]),
        listFields: vi.fn(async () => [field()]),
        listTags: vi.fn(async () => []),
        listSources: vi.fn(async () => []),
      },
      documentDomain: {
        collections: vi.fn(async () => ({
          templates: [],
          workingCvs: [],
          renderedCvs: [],
          letters: [],
          renderedLetters: [],
          applicationPackets: [],
        })),
      },
      candidatureOpportunityResearchAccess: {
        current,
        update,
        taskContext,
        taskTemplates,
        saveTaskTemplate,
        deleteTaskTemplate,
        copyTask,
        exportTask,
        retainResult,
        importResult,
      },
    },
  });
}

function prepareAccessApi() {
  savedTemplates = [];
  current.mockResolvedValue({ candidatureId, allowed: false });
  update.mockImplementation(async ({ allowed }: { readonly allowed: boolean }) => ({ candidatureId, allowed }));
  taskContext.mockResolvedValue({ information: [{ label: "Role", value: "Platform Engineer" }] });
  taskTemplates.mockImplementation(async () => [...savedTemplates]);
  saveTaskTemplate.mockImplementation(async ({ id, name, instruction }) => {
    const saved = { id: id ?? savedTemplateId, name, instruction } as CandidatureAiTaskTemplate;
    savedTemplates = [...savedTemplates.filter((candidate) => candidate.id !== saved.id), saved];
    return saved;
  });
  deleteTaskTemplate.mockImplementation(async (id: string) => {
    savedTemplates = savedTemplates.filter((candidate) => candidate.id !== id);
    return "deleted" as const;
  });
  copyTask.mockResolvedValue("copied");
  exportTask.mockResolvedValue("exported");
  retainResult.mockResolvedValue("retained");
  importResult.mockResolvedValue("imported");
  installApi();
}

async function openSelectedCandidature(user: ReturnType<typeof userEvent.setup>) {
  render(<CandidaturesWorkspace />);
  await user.click(await screen.findByRole("button", { name: "Inspect saved application" }));
  await user.click(screen.getByRole("button", { name: "Open application" }));
  return screen.findByRole("button", { name: "Send to my AI" });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  savedTemplates = [];
});

describe("selected candidature Send to my AI", () => {
  it("keeps retained task access collapsed behind application content until deliberately opened", async () => {
    prepareAccessApi();
    current.mockResolvedValue({ candidatureId, allowed: true });
    const user = userEvent.setup();
    const open = await openSelectedCandidature(user);

    await waitFor(() => expect(current).toHaveBeenCalledWith(candidatureId));
    const selected = screen.getByRole("region", { name: "Application information" });
    const primary = screen.getByRole("region", { name: "Starred application information" });
    const externalAi = screen.getByRole("region", { name: "Send to my AI" });
    expect(selected).toContainElement(primary);
    expect(selected).toContainElement(externalAi);
    expect(primary.compareDocumentPosition(externalAi) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(primary).toHaveTextContent("Platform Engineer");
    expect(screen.queryByLabelText("Task instructions")).not.toBeInTheDocument();
    expect(taskContext).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();

    await user.click(open);
    expect(update).toHaveBeenCalledWith({ candidatureId, allowed: true });
    expect(taskContext).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Task instructions")).toBeVisible();
    expect(screen.getByRole("region", { name: "Context sent with task" })).toHaveTextContent("Platform Engineer");
  });

  it("is directly discoverable and revokes the selected context when retained context becomes dirty", async () => {
    prepareAccessApi();
    const user = userEvent.setup();
    const open = await openSelectedCandidature(user);
    expect(screen.queryByRole("group", { name: "More" })).not.toBeInTheDocument();
    await user.click(open);

    expect(update).toHaveBeenCalledWith({ candidatureId, allowed: true });
    expect(taskContext).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Task instructions")).toBeVisible();
    expect(screen.getByRole("region", { name: "Context sent with task" })).toHaveTextContent("Platform Engineer");

    await user.click(screen.getByRole("button", { name: "Edit Role" }));
    const value = screen.getByLabelText("Value");
    await user.clear(value);
    await user.type(value, "Staff Platform Engineer");

    await waitFor(() => expect(update).toHaveBeenCalledWith({ candidatureId, allowed: false }));
    expect(await screen.findByText(/Save or discard the application edits before sending it to AI/i)).toBeVisible();
    expect(screen.getByRole("button", { name: "Send to my AI" })).toBeDisabled();
  });

  it("revokes the selected external context while an Add information draft is dirty", async () => {
    prepareAccessApi();
    const user = userEvent.setup();
    const open = await openSelectedCandidature(user);
    await user.click(open);
    expect(update).toHaveBeenCalledWith({ candidatureId, allowed: true });

    await user.click(screen.getByText("More"));
    await user.click(screen.getByRole("button", { name: "Add information" }));
    await user.type(screen.getByPlaceholderText("Flight hours"), "Seniority");

    await waitFor(() => expect(update).toHaveBeenCalledWith({ candidatureId, allowed: false }));
    expect(screen.getByRole("button", { name: "Send to my AI" })).toBeDisabled();
  });

  it("lets the user edit, reuse and transport tasks without requiring a file ceremony", async () => {
    prepareAccessApi();
    const user = userEvent.setup();
    const open = await openSelectedCandidature(user);
    await user.click(open);

    await user.selectOptions(screen.getByLabelText("Task template"), "interview-preparation");
    const instruction = screen.getByLabelText("Task instructions");
    expect((instruction as HTMLTextAreaElement).value).toContain("interview brief");
    await user.clear(instruction);
    await user.type(instruction, "Compare this role with the supplied context and give me five interview questions.");

    await user.type(screen.getByLabelText("Reusable task name"), "My interview review");
    await user.click(screen.getByRole("button", { name: "Save as reusable task" }));
    expect(saveTaskTemplate).toHaveBeenCalledWith({
      id: undefined,
      name: "My interview review",
      instruction: "Compare this role with the supplied context and give me five interview questions.",
    });
    expect(await screen.findByRole("option", { name: "My interview review" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Update saved task" })).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Task template"), "opportunity-research");
    await user.selectOptions(screen.getByLabelText("Task template"), `user:${savedTemplateId}`);
    expect(screen.getByLabelText("Task instructions")).toHaveValue(
      "Compare this role with the supplied context and give me five interview questions.",
    );

    await user.click(screen.getByRole("button", { name: "Copy task" }));
    expect(copyTask).toHaveBeenCalledWith(
      "Compare this role with the supplied context and give me five interview questions.",
    );
    expect(await screen.findByText("Task copied.")).toBeVisible();

    const result = screen.getByLabelText("AI result");
    await user.type(result, "Useful returned analysis from the external AI.");
    await user.click(screen.getByRole("button", { name: "Save result" }));
    expect(retainResult).toHaveBeenCalledWith("Useful returned analysis from the external AI.");
    expect(await screen.findByText(/Result saved as a Source/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Export file…" }));
    expect(exportTask).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Import result…" }));
    expect(importResult).toHaveBeenCalledTimes(1);
  });
});
