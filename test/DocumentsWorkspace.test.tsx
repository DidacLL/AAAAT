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
const remove = vi.fn<DesktopApi["documents"]["remove"]>();
const configureItem = vi.fn<DesktopApi["documents"]["configureItem"]>();
const reorder = vi.fn<DesktopApi["documents"]["reorder"]>();
const resolve = vi.fn<DesktopApi["documents"]["resolve"]>();
const renderDocument = vi.fn<DesktopApi["documents"]["render"]>();
const regenerate = vi.fn<DesktopApi["documents"]["regenerate"]>();
const exportProject = vi.fn<DesktopApi["documents"]["exportProject"]>();

const desktopApi: DesktopApi = {
  system: { info: async () => ({ appVersion: "2", electronVersion: "44", nodeVersion: "24" }) },
  workspace: {
    current: async () => ({ rootPath: "/tmp/workspace" }),
    choose: async () => ({ rootPath: "/tmp/workspace" }),
  },
  profile: {
    current: async () => profile,
    addItem: async () => profile,
    updateItem: async () => profile,
    removeItem: async () => profile,
    createVariant: async () => profile,
    updateVariant: async () => profile,
    removeVariant: async () => profile,
    configureVariantItem: async () => profile,
    reorderVariant: async () => profile,
    resolveVariant: async () => ({ variant, items: [item] }),
  },
  documents: {
    list,
    create,
    update,
    remove,
    configureItem,
    reorder,
    resolve,
    render: renderDocument,
    regenerate,
    exportProject,
  },
};

describe("manual Documents workspace", () => {
  beforeEach(() => {
    for (const mock of [list, create, update, remove, configureItem, reorder, resolve, renderDocument, regenerate, exportProject]) {
      mock.mockReset();
    }
    list.mockResolvedValue([]);
    create.mockResolvedValue(record());
    update.mockImplementation(async (value) => record({ ...value }));
    remove.mockResolvedValue([]);
    configureItem.mockResolvedValue(record());
    reorder.mockResolvedValue(record());
    resolve.mockImplementation(async () => ({ document: record(), items: [item] }));
    renderDocument.mockResolvedValue(record());
    regenerate.mockResolvedValue(record());
    exportProject.mockResolvedValue(null);
    Object.defineProperty(window, "aaaat", { configurable: true, value: desktopApi });
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
    expect(screen.getByRole("button", { name: "Render PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export portable project" })).toBeInTheDocument();
  });

  it("edits structured cover-letter content through the document service", async () => {
    const cover = record({
      kind: "cover_letter",
      title: "Cover letter",
      recipient: "Hiring team",
      subject: "Platform role",
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

    expect(update).toHaveBeenCalledWith(expect.objectContaining({
      id: cover.id,
      recipient: "Hiring manager",
      bodyParagraphs: ["Edited paragraph"],
    }));
  });

  it("resets document-specific controls when selecting another document", async () => {
    const first = record({
      title: "First CV",
      rules: [{
        itemId: item.id,
        excluded: false,
        contentPatch: { title: "First override" },
        orderRank: null,
      }],
    });
    const second = record({
      id: "00000000-0000-4000-8000-000000000104",
      title: "Second CV",
      rules: [{
        itemId: item.id,
        excluded: true,
        contentPatch: { title: "Second override" },
        orderRank: null,
      }],
    });
    list.mockResolvedValueOnce([first, second]);
    resolve.mockImplementation(async (documentId) => ({
      document: documentId === first.id ? first : second,
      items: documentId === first.id ? [item] : [],
    }));
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    expect(await screen.findByLabelText("Override title")).toHaveValue("First override");
    expect(screen.getByLabelText("Include")).toBeChecked();
    await user.click(screen.getByRole("button", { name: /Second CV/ }));
    expect(await screen.findByLabelText("Override title")).toHaveValue("Second override");
    expect(screen.getByLabelText("Include")).not.toBeChecked();
  });

  it("makes manual TeX preservation explicit before any overwrite", async () => {
    const manual = record({ mode: "manual" });
    list.mockResolvedValueOnce([manual]);
    resolve.mockResolvedValue({ document: manual, items: [item] });
    regenerate.mockResolvedValue(record());
    const user = userEvent.setup();
    render(<DocumentsWorkspace />);

    expect(
      await screen.findByText(/Direct TeX edits were detected/),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Replace manual source from structured data" }),
    );
    expect(regenerate).toHaveBeenCalledWith(manual.id);
  });
});
