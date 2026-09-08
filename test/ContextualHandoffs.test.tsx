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
  }) => {
    const handoffs = useContextualHandoffs();
    return (
      <section aria-label="Mock professional information">
        <p>Item {initialItemId ?? "overview"}</p>
        {handoffs.professionalInformationHandoff ? (
          <button type="button" onClick={handoffs.returnToDocument}>Return from reusable source</button>
        ) : null}
        <button type="button" onClick={() => onDirtyChange?.(true)}>Make professional information dirty</button>
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
  CareerContextPanel: () => null,
}));
vi.mock("../src/renderer/AiDocumentsWorkspace", () => ({
  AiDocumentsWorkspace: () => null,
}));
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

  it("carries candidature context into the shared document area and returns to the origin", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "Open linked document" }));
    expect(screen.getByRole("region", { name: "Mock documents" })).toHaveTextContent(
      "For cand-1 · document doc-1",
    );

    await user.click(screen.getByRole("button", { name: "Return to candidature" }));
    expect(screen.getByRole("region", { name: "Mock candidatures" })).toBeVisible();
  });

  it("opens one reusable source in Professional information and returns to the same document area", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "CVs & letters" }));
    await user.click(screen.getByRole("button", { name: "Open reusable source" }));
    expect(screen.getByRole("region", { name: "Mock professional information" })).toHaveTextContent(
      "Item item-1",
    );

    await user.click(screen.getByRole("button", { name: "Return from reusable source" }));
    expect(screen.getByRole("region", { name: "Mock documents" })).toBeVisible();
  });

  it("enters the requested Settings detail and returns to document work", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "CVs & letters" }));
    await user.click(screen.getByRole("button", { name: "Open render settings" }));
    expect(screen.getByRole("region", { name: "Mock settings" })).toHaveTextContent(
      "Settings detail rendering",
    );
    await user.click(screen.getByRole("button", { name: "Return to document" }));
    expect(screen.getByRole("region", { name: "Mock documents" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Open AI settings" }));
    expect(screen.getByRole("region", { name: "Mock settings" })).toHaveTextContent(
      "Settings detail ai",
    );
  });

  it("does not replace a dirty contextual target when discard is declined", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "CVs & letters" }));
    await user.click(screen.getByRole("button", { name: "Open reusable source" }));
    await user.click(screen.getByRole("button", { name: "Make professional information dirty" }));
    await user.click(screen.getByRole("button", { name: "Return from reusable source" }));
    await user.click(screen.getByRole("button", { name: "Open reusable source" }));

    expect(confirm).toHaveBeenCalledWith(
      "Discard unsaved professional-information edits and open this reusable source?",
    );
    expect(screen.getByRole("region", { name: "Mock documents" })).toBeVisible();
  });
});
