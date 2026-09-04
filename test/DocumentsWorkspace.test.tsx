import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentsWorkspace } from "../src/renderer/DocumentsWorkspace";
import type { DesktopApi, DocumentRecord, ProfileSnapshot, ProfileVariant } from "../src/shared/contracts";

const item = {
  id: "00000000-0000-4000-8000-000000000101",
  kind: "summary" as const,
  title: "Canonical summary",
  description: "General profile text",
  sortOrder: 0,
};
const variant: ProfileVariant = {
  id: "00000000-0000-4000-8000-000000000102",
  name: "Platform focus",
  focus: "Platform",
  targetTags: ["platform"],
  preferredLanguage: "en",
  rules: [],
};
const profile: ProfileSnapshot = { items: [item], variants: [variant] };

function record(overrides: Partial<DocumentRecord> = {}): DocumentRecord {
  return {
    id: "00000000-0000-4000-8000-000000000103",
    kind: "cv",
    title: "Platform CV",
    variantId: variant.id,
    engine: "pdflatex",
    bodyParagraphs: [],
    mode: "managed",
    rules: [],
    projectPath: "/tmp/workspace/documents/doc",
    sourcePath: "/tmp/workspace/documents/doc/main.tex",
    artifactPath: "/tmp/workspace/documents/doc/build/main.pdf",
    ...overrides,
  };
}

const list = vi.fn<DesktopApi["documents"]["list"]>();
const create = vi.fn<DesktopApi["documents"]["create"]>();
const update = vi.fn<DesktopApi["documents"]["update"]>();
const resolve = vi.fn<DesktopApi["documents"]["resolve"]>();
const renderDocument = vi.fn<DesktopApi["documents"]["render"]>();
const regenerate = vi.fn<DesktopApi["documents"]["regenerate"]>();
const exportProject = vi.fn<DesktopApi["documents"]["exportProject"]>();

function installApi() {
  const api = {
    profile: {
      current: async () => profile,
      resolveVariant: async () => ({ variant, items: [item] }),
    },
    documents: {
      list,
      create,
      update,
      remove: vi.fn(),
      configureItem: vi.fn(),
      reorder: vi.fn(),
      resolve,
      render: renderDocument,
      regenerate,
      exportProject,
    },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("manual Documents workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    create.mockResolvedValue(record());
    update.mockImplementation(async (value) => record({ ...value }));
    resolve.mockResolvedValue({ document: record(), items: [item] });
    renderDocument.mockResolvedValue(record());
    regenerate.mockResolvedValue(record());
    exportProject.mockResolvedValue(null);
    installApi();
  });

  afterEach(() => cleanup());

  it("creates a CV from a focused profile variant and exposes portable locations", async () => {
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);
    await screen.findByRole("heading", { name: "Documents" });
    await user.type(screen.getByLabelText("Title"), "Platform CV");
    await user.click(screen.getByRole("button", { name: "Create document" }));

    expect(create).toHaveBeenCalledWith({
      kind: "cv",
      title: "Platform CV",
      variantId: variant.id,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(await screen.findByText("/tmp/workspace/documents/doc/main.tex")).toBeInTheDocument();
    expect(screen.getByText("/tmp/workspace/documents/doc/build/main.pdf")).toBeInTheDocument();
  });

  it("edits structured cover-letter content through the document service", async () => {
    const cover = record({
      kind: "cover_letter",
      title: "Cover letter",
      recipient: "Hiring team",
      subject: "Application",
      bodyParagraphs: ["Original paragraph"],
      closing: "Regards",
    });
    list.mockResolvedValueOnce([cover]);
    resolve.mockResolvedValue({ document: cover, items: [item] });
    update.mockResolvedValue({ ...cover, recipient: "Hiring manager", bodyParagraphs: ["Edited paragraph"] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    const saveButton = await screen.findByRole("button", { name: "Save structured content" });
    const form = saveButton.closest("form");
    if (!form) throw new Error("Expected document edit form");
    const editor = within(form);
    await user.clear(editor.getByLabelText("Recipient"));
    await user.type(editor.getByLabelText("Recipient"), "Hiring manager");
    await user.clear(editor.getByLabelText("Body paragraphs"));
    await user.type(editor.getByLabelText("Body paragraphs"), "Edited paragraph");
    await user.click(saveButton);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: cover.id,
        recipient: "Hiring manager",
        bodyParagraphs: ["Edited paragraph"],
      }),
    );
  });

  it("keeps manual TeX preservation explicit before overwrite", async () => {
    const manual = record({ mode: "manual" });
    list.mockResolvedValueOnce([manual]);
    resolve.mockResolvedValue({ document: manual, items: [item] });
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    expect(await screen.findByText(/Direct TeX edits were detected/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Replace manual source from structured data" }));
    expect(regenerate).toHaveBeenCalledWith(manual.id);
  });
});
