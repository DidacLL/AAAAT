import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/renderer/CandidaturesAiWorkspace", () => ({
  CandidaturesAiWorkspace: ({ initialCandidatureId }: { readonly initialCandidatureId?: string }) => (
    <section aria-label="Applications work">
      <span>{initialCandidatureId ? `Selected ${initialCandidatureId}` : "Application corpus"}</span>
    </section>
  ),
}));
vi.mock("../src/renderer/DocumentsStartWorkspace", () => ({
  DocumentsStartWorkspace: () => <section aria-label="CV and document work">Document collection</section>,
}));
vi.mock("../src/renderer/DocumentsWorkspace", async () => {
  const { useContextualHandoffs } = await import("../src/renderer/contextual-handoffs");
  return {
    DocumentsWorkspace: () => {
      const { documentHandoff } = useContextualHandoffs();
      return <section aria-label="Document detail">Selected document {documentHandoff?.documentId ?? "none"}</section>;
    },
  };
});
vi.mock("../src/renderer/ProfileWorkspace", () => ({ ProfileWorkspace: () => <section>Profile</section> }));
vi.mock("../src/renderer/CareerContextPanel", () => ({ CareerContextPanel: () => <section>Career</section> }));
vi.mock("../src/renderer/AiTaskStatus", () => ({ AiTaskStatus: () => null }));
vi.mock("../src/renderer/WorkspaceRailStatus", () => ({ WorkspaceRailStatus: () => null }));
vi.mock("../src/renderer/TagVisor", () => ({ TagVisor: () => null }));
vi.mock("../src/renderer/WorkspaceRecoveryPanel", () => ({
  WorkspaceRecoveryPanel: ({ currentWorkspace }: { readonly currentWorkspace: unknown }) => (
    <section aria-label={currentWorkspace ? "Backup and recovery" : "Workspace recovery"}>Recovery tools</section>
  ),
}));

import { App } from "../src/renderer/App";

const workspace = { rootPath: "/tmp/aaaat-home-workspace" };
const candidatureId = "00000000-0000-4000-8000-000000000a11";
const fieldId = "00000000-0000-4000-8000-000000000a12";
const documentId = "00000000-0000-4000-8000-000000000a13";
const now = "2026-09-29T12:00:00.000Z";
let currentWorkspace: typeof workspace | null;

beforeEach(() => {
  currentWorkspace = workspace;
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      workspace: {
        current: async () => currentWorkspace,
        recent: async () => workspace.rootPath,
        continueRecent: async () => workspace,
        choose: async () => workspace,
        createDemo: async () => workspace,
        status: async () => ({ demo: false }),
        reset: async () => workspace,
        delete: async () => undefined,
      },
      candidatures: {
        list: async () => [{
          id: candidatureId,
          archived: false,
          createdAt: now,
          updatedAt: now,
          sourceSearchText: "",
          values: [{ candidatureId, fieldId, value: "Aurora systems", createdAt: now, updatedAt: now }],
          tagIds: [],
        }],
        listFields: async () => [{
          definition: {
            id: fieldId,
            systemKey: null,
            label: "Current signal",
            description: "",
            valueType: "text",
            cardinality: "one",
            choices: [],
            enabled: true,
            createdAt: now,
            updatedAt: now,
          },
          preferences: {
            fieldId,
            favourite: true,
            favouriteOrder: 0,
            presentationSize: "normal",
            aiUseAllowed: true,
          },
        }],
      },
      documentDomain: {
        collections: async () => ({
          templates: [],
          workingCvs: [{
            id: documentId,
            title: "Aurora Working CV",
            sourceTemplateId: null,
            candidatureId: null,
            sections: [],
            createdAt: now,
            updatedAt: now,
          }],
          renderedCvs: [],
          letters: [],
          renderedLetters: [],
          applicationPackets: [],
        }),
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("loaded Home shell behavior", () => {
  it("opens exact recent work and leaves workspace administration in Settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    const home = await screen.findByRole("region", { name: "Home" });
    expect(within(home).getByText("aaaat-home-workspace")).toBeInTheDocument();
    expect(within(home).getByText("Local workspace")).toBeInTheDocument();
    expect(within(home).queryByRole("button", { name: "New workspace" })).not.toBeInTheDocument();
    expect(within(home).queryByRole("button", { name: "Open existing workspace" })).not.toBeInTheDocument();
    expect(within(home).queryByRole("button", { name: "Open demo" })).not.toBeInTheDocument();
    expect(within(home).queryByRole("region", { name: "Workspace recovery" })).not.toBeInTheDocument();

    await user.click(await within(home).findByRole("button", { name: /Aurora systems/ }));
    expect(await screen.findByText(`Selected ${candidatureId}`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Home" }));
    const returnedHome = await screen.findByRole("region", { name: "Home" });
    await user.click(await within(returnedHome).findByRole("button", { name: /Aurora Working CV/ }));
    expect(await screen.findByText(`Selected document ${documentId}`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Home" }));
    await screen.findByRole("region", { name: "Home" });
    await user.click(screen.getByRole("button", { name: "Settings" }));
    const settings = await screen.findByRole("region", { name: "Settings" });
    expect(within(settings).getByRole("button", { name: "Create another workspace" })).toBeInTheDocument();
    expect(within(settings).getByRole("button", { name: "Open another workspace" })).toBeInTheDocument();
    await user.click(within(settings).getByRole("button", { name: "Backup" }));
    expect(within(settings).getByRole("region", { name: "Backup and recovery" })).toBeInTheDocument();
  });

  it("preserves first-run workspace entry and recovery semantics", async () => {
    currentWorkspace = null;
    render(<App />);

    expect(await screen.findByRole("heading", { name: "Welcome to AAAAT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Continue previous workspace/ })).toBeInTheDocument();
    const createWorkspace = screen.getByRole("button", { name: "New workspace" });
    const openWorkspace = screen.getByRole("button", { name: "Open folder" });
    const openDemo = screen.getByRole("button", { name: "Open demo" });
    expect(createWorkspace).toHaveClass("primary-action");
    expect(openWorkspace).toHaveClass("primary-action");
    expect(openDemo).toHaveClass("secondary-action");
    expect(screen.getByRole("region", { name: "Workspace recovery" })).toBeInTheDocument();
  });
});
