import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useContextualHandoffs } from "../src/renderer/contextual-handoffs";
import type { WorkspaceInfo } from "../src/shared/contracts";

vi.mock("../src/renderer/CandidaturesAiWorkspace", () => ({
  CandidaturesAiWorkspace: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => {
    const handoffs = useContextualHandoffs();
    return (
      <section aria-label="Mock candidatures">
        <button type="button" onClick={() => handoffs.openDocumentFromCandidature("cand-1", "doc-1")}>
          Open linked document
        </button>
        <button type="button" onClick={() => handoffs.openDocumentFromCandidature("cand-1")}>
          Create candidature document
        </button>
        <button type="button" onClick={() => handoffs.openSettingsFor("ai", "candidatures")}>
          Open candidature AI settings
        </button>
        <button type="button" onClick={() => onDirtyChange?.(true)}>Make candidature dirty</button>
      </section>
    );
  },
}));

vi.mock("../src/renderer/DocumentsStartWorkspace", () => ({
  DocumentsStartWorkspace: () => {
    const handoffs = useContextualHandoffs();
    return (
      <section aria-label="Mock documents">
        <p>For standalone · document new</p>
        <button type="button" onClick={() => handoffs.openProfessionalInformationItem("doc-1", "item-1")}>
          Open reusable source
        </button>
        <button type="button" onClick={() => handoffs.openSettingsFor("rendering", "documents")}>
          Open render settings
        </button>
        <button type="button" onClick={() => handoffs.openSettingsFor("ai", "documents")}>
          Open AI settings
        </button>
      </section>
    );
  },
}));

vi.mock("../src/renderer/DocumentsWorkspace", () => ({
  DocumentsWorkspace: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => {
    const handoffs = useContextualHandoffs();
    return (
      <section aria-label="Mock documents">
        <p>
          For {handoffs.documentHandoff?.candidatureId ?? "standalone"} · document {handoffs.documentHandoff?.documentId ?? "new"}
        </p>
        {handoffs.documentHandoff?.candidatureId ? (
          <button type="button" onClick={handoffs.returnToCandidature}>Return to application</button>
        ) : null}
        <button type="button" onClick={() => handoffs.openProfessionalInformationItem("doc-1", "item-1")}>
          Open reusable source
        </button>
        <button type="button" onClick={() => handoffs.openSettingsFor("rendering", "documents")}>
          Open render settings
        </button>
        <button type="button" onClick={() => handoffs.openSettingsFor("ai", "documents")}>
          Open AI settings
        </button>
        <button type="button" onClick={() => onDirtyChange?.(true)}>Make document dirty</button>
      </section>
    );
  },
}));

vi.mock("../src/renderer/ProfileWorkspace", () => ({
  ProfileWorkspace: ({ initialItemId, onDirtyChange }: { initialItemId?: string; onDirtyChange?: (dirty: boolean) => void }) => {
    const handoffs = useContextualHandoffs();
    return (
      <section aria-label="Mock My information">
        <p>Item {initialItemId ?? "overview"}</p>
        <button type="button" onClick={() => onDirtyChange?.(true)}>Make My information dirty</button>
        <button type="button" onClick={() => { onDirtyChange?.(false); handoffs.returnToDocument(); }}>
          Save handed-off item
        </button>
      </section>
    );
  },
}));

vi.mock("../src/renderer/SettingsWorkspace", () => ({
  SettingsWorkspace: ({ initialView }: { initialView?: string }) => (
    <section aria-label="Mock settings">Settings detail {initialView ?? "overview"}</section>
  ),
}));

vi.mock("../src/renderer/CareerContextPanel", () => ({
  CareerContextPanel: ({ onDirtyChange }: { onDirtyChange?: (dirty: boolean) => void }) => (
    <section aria-label="Mock career preferences">
      <button type="button" onClick={() => onDirtyChange?.(true)}>Make career preferences dirty</button>
    </section>
  ),
}));
vi.mock("../src/renderer/WorkspaceRecoveryPanel", () => ({ WorkspaceRecoveryPanel: () => null }));

import { App } from "../src/renderer/App";

const workspace: WorkspaceInfo = { rootPath: "/tmp/contextual-handoffs" };

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      workspace: { current: async () => workspace, recent: async () => workspace.rootPath, choose: async () => workspace, status: async () => ({ demo: false }) },
      setupEnvironment: { current: async () => ({ ai: { configurationReadable: true, connectionCount: 0, operations: [] }, tex: { documentRenderingReady: false } }) },
      profile: { current: async () => ({ items: [] }) },
      profileVariants: { list: async () => [] },
      documentDomain: { collections: async () => ({ templates: [], workingCvs: [], renderedCvs: [], letters: [], applicationPackets: [] }) },
    },
  });
}

async function openSavedApplications(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Open contextual-handoffs/ }));
  await user.click(await screen.findByRole("button", { name: "Applications" }));
  return screen.findByRole("region", { name: "Mock candidatures" });
}

async function openDocuments(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: /Open contextual-handoffs/ }));
  await user.click(await screen.findByRole("button", { name: "CVs" }));
  return screen.findByRole("region", { name: "Mock documents" });
}

describe("contextual handoff coordination", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installApi();
  });

  afterEach(() => cleanup());

  it("carries application context into the shared document area and returns to the exact mounted origin", async () => {
    const user = userEvent.setup();
    render(<App />);

    const candidatureRegion = await openSavedApplications(user);
    await user.click(screen.getByRole("button", { name: "Open linked document" }));
    expect(screen.getByRole("region", { name: "Mock documents" })).toHaveTextContent("For cand-1 · document doc-1");

    await user.click(screen.getByRole("button", { name: "Return to application" }));
    expect(screen.getByRole("region", { name: "Mock candidatures" })).toBe(candidatureRegion);
  });

  it("treats primary Applications navigation as a fresh corpus instead of a contextual return", async () => {
    const user = userEvent.setup();
    render(<App />);

    const candidatureRegion = await openSavedApplications(user);
    await user.click(screen.getByRole("button", { name: "Open linked document" }));
    await user.click(screen.getByRole("button", { name: "Applications" }));

    expect(screen.getByRole("region", { name: "Mock candidatures" })).not.toBe(candidatureRegion);
  });

  it("opens one reusable source and returns to the same document context", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openDocuments(user);
    await user.click(screen.getByRole("button", { name: "Open reusable source" }));
    expect(screen.getByRole("region", { name: "Mock My information" })).toHaveTextContent("Item item-1");

    await user.click(screen.getByRole("button", { name: "Return to document" }));
    expect(screen.getByRole("region", { name: "Mock documents" })).toHaveTextContent("document doc-1");
  });

  it("enters the requested Settings detail and returns to the mounted document work", async () => {
    const user = userEvent.setup();
    render(<App />);

    await openSavedApplications(user);
    await user.click(screen.getByRole("button", { name: "Open linked document" }));
    const documentRegion = screen.getByRole("region", { name: "Mock documents" });
    await user.click(screen.getByRole("button", { name: "Open render settings" }));
    expect(screen.getByRole("region", { name: "Mock settings" })).toHaveTextContent("Settings detail rendering");
    await user.click(screen.getByRole("button", { name: "Return to document" }));
    expect(screen.getByRole("region", { name: "Mock documents" })).toBe(documentRegion);

    await user.click(screen.getByRole("button", { name: "Open AI settings" }));
    expect(screen.getByRole("region", { name: "Mock settings" })).toHaveTextContent("Settings detail ai");
  });

  it("enters AI Settings from application context and returns to the same mounted application", async () => {
    const user = userEvent.setup();
    render(<App />);

    const candidatureRegion = await openSavedApplications(user);
    await user.click(screen.getByRole("button", { name: "Open candidature AI settings" }));
    expect(screen.getByRole("region", { name: "Mock settings" })).toHaveTextContent("Settings detail ai");
    await user.click(screen.getByRole("button", { name: "Return to application" }));
    expect(screen.getByRole("region", { name: "Mock candidatures" })).toBe(candidatureRegion);
  });

  it("does not discard dirty My information through the shell return", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    await openDocuments(user);
    await user.click(screen.getByRole("button", { name: "Open reusable source" }));
    await user.click(screen.getByRole("button", { name: "Make My information dirty" }));
    await user.click(screen.getByRole("button", { name: "Return to document" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved My information edits and return to document?");
    expect(screen.getByRole("region", { name: "Mock My information" })).toBeVisible();
  });

  it("does not let My information save bypass a dirty career-preferences draft", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    await openDocuments(user);
    await user.click(screen.getByRole("button", { name: "Open reusable source" }));
    await user.click(screen.getByRole("button", { name: "Make career preferences dirty" }));
    await user.click(screen.getByRole("button", { name: "Save handed-off item" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved My information edits and return to document?");
    expect(screen.getByRole("region", { name: "Mock My information" })).toBeVisible();
    expect(screen.getByRole("region", { name: "Mock career preferences" })).toBeVisible();
  });

  it("does not discard a dirty document when returning to an application", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    await openSavedApplications(user);
    await user.click(screen.getByRole("button", { name: "Open linked document" }));
    await user.click(screen.getByRole("button", { name: "Make document dirty" }));
    await user.click(screen.getByRole("button", { name: "Return to application" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved document edits and return to this application?");
    expect(screen.getByRole("region", { name: "Mock documents" })).toBeVisible();
  });

  it("does not drop a dirty hidden application origin when navigating to a third work area", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    const candidatureRegion = await openSavedApplications(user);
    await user.click(screen.getByRole("button", { name: "Make candidature dirty" }));
    await user.click(screen.getByRole("button", { name: "Open linked document" }));
    const documentRegion = screen.getByRole("region", { name: "Mock documents" });

    await user.click(screen.getByRole("button", { name: "My information" }));

    expect(confirm).toHaveBeenCalledWith("Discard unsaved edits and leave this work?");
    expect(documentRegion).toBeVisible();
    expect(candidatureRegion).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Mock My information" })).not.toBeInTheDocument();
  });
});
