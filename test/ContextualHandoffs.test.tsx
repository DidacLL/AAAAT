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
        <button type="button" onClick={() => onDirtyChange?.(true)}>Make candidature dirty</button>
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
          <button type="button" onClick={handoffs.returnToCandidature}>Return to candidature</button>
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
  ProfileWorkspace: ({
    initialItemId,
    onDirtyChange,
  }: {
    initialItemId?: string;
    onDirtyChange?: (dirty: boolean) => void;
  }) => (
    <section aria-label="Mock professional information">
      <p>Item {initialItemId ?? "overview"}</p>
      <button type="button" onClick={() => onDirtyChange?.(true)}>Make professional information dirty</button>
    </section>
  ),
}));

vi.mock("../src/renderer/SettingsWorkspace", () => ({
  SettingsWorkspace: ({ initialView }: { initialView?: string }) => (
    <section aria-label="Mock settings">Settings detail {initialView ?? "overview"}</section>
  ),
}));

vi.mock("../src/renderer/CareerContextPanel", () => ({ CareerContextPanel: () => null }));
vi.mock("../src/renderer/AiDocumentsWorkspace", () => ({ AiDocumentsWorkspace: () => null }));
vi.mock("../src/renderer/TodosWorkspace", () => ({ TodosWorkspace: () => null }));
vi.mock("../src/renderer/WorkspaceRecoveryPanel", () => ({ WorkspaceRecoveryPanel: () => null }));

import { App } from "../src/renderer/App";

const workspace: WorkspaceInfo = { rootPath: "/tmp/contextual-handoffs" };

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      workspace: {
        current: async () => workspace,
        choose: async () => workspace,
      },
    },
  });
}

describe("contextual handoff coordination", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    installApi();
  });

  afterEach(() => cleanup());

  it("carries candidature context into the shared document area and returns to the exact mounted origin", async () => {
    const user = userEvent.setup();
    render(<App />);

    const candidatureRegion = await screen.findByRole("region", { name: "Mock candidatures" });
    await user.click(screen.getByRole("button", { name: "Open linked document" }));
    expect(screen.getByRole("region", { name: "Mock documents" })).toHaveTextContent(
      "For cand-1 · document doc-1",
    );

    await user.click(screen.getByRole("button", { name: "Return to candidature" }));
    expect(screen.getByRole("region", { name: "Mock candidatures" })).toBe(candidatureRegion);
  });

  it("opens one reusable source and returns to the same document with a fresh mounted document surface", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "CVs & letters" }));
    const firstDocumentRegion = screen.getByRole("region", { name: "Mock documents" });
    await user.click(screen.getByRole("button", { name: "Open reusable source" }));
    expect(screen.getByRole("region", { name: "Mock professional information" })).toHaveTextContent(
      "Item item-1",
    );

    await user.click(screen.getByRole("button", { name: "Return to document" }));
    const returnedDocumentRegion = screen.getByRole("region", { name: "Mock documents" });
    expect(returnedDocumentRegion).toHaveTextContent("document doc-1");
    expect(returnedDocumentRegion).not.toBe(firstDocumentRegion);
  });

  it("enters the requested Settings detail and returns to the mounted document work", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "CVs & letters" }));
    const documentRegion = screen.getByRole("region", { name: "Mock documents" });
    await user.click(screen.getByRole("button", { name: "Open render settings" }));
    expect(screen.getByRole("region", { name: "Mock settings" })).toHaveTextContent(
      "Settings detail rendering",
    );
    await user.click(screen.getByRole("button", { name: "Return to document" }));
    expect(screen.getByRole("region", { name: "Mock documents" })).toBe(documentRegion);

    await user.click(screen.getByRole("button", { name: "Open AI settings" }));
    expect(screen.getByRole("region", { name: "Mock settings" })).toHaveTextContent(
      "Settings detail ai",
    );
  });

  it("does not discard dirty Professional information through the shell return", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "CVs & letters" }));
    await user.click(screen.getByRole("button", { name: "Open reusable source" }));
    await user.click(screen.getByRole("button", { name: "Make professional information dirty" }));
    await user.click(screen.getByRole("button", { name: "Return to document" }));

    expect(confirm).toHaveBeenCalledWith(
      "Discard unsaved professional-information edits and return to document?",
    );
    expect(screen.getByRole("region", { name: "Mock professional information" })).toBeVisible();
  });

  it("does not discard a dirty document when returning to a candidature", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Open linked document" }));
    await user.click(screen.getByRole("button", { name: "Make document dirty" }));
    await user.click(screen.getByRole("button", { name: "Return to candidature" }));

    expect(confirm).toHaveBeenCalledWith(
      "Discard unsaved document edits and return to this candidature?",
    );
    expect(screen.getByRole("region", { name: "Mock documents" })).toBeVisible();
  });
});
