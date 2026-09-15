import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DocumentsStartWorkspace } from "../src/renderer/DocumentsStartWorkspace";
import type { DocumentRecord, ProfileSnapshot } from "../src/shared/contracts";

const profile: ProfileSnapshot = {
  items: [],
  variants: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Platform roles",
      focus: "Platform engineering",
      targetTags: [],
      rules: [],
    },
  ],
};

const existing: DocumentRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "cv",
  title: "Existing CV",
  variantId: null,
  engine: "pdflatex",
  bodyParagraphs: [],
  mode: "managed",
  rules: [],
  projectPath: "/tmp/existing",
  sourcePath: "/tmp/existing/main.tex",
  artifactPath: "/tmp/existing/build/main.pdf",
};

const created: DocumentRecord = {
  ...existing,
  id: "33333333-3333-4333-8333-333333333333",
  title: "CV",
  projectPath: "/tmp/created",
  sourcePath: "/tmp/created/main.tex",
  artifactPath: "/tmp/created/build/main.pdf",
};

const create = vi.fn();

beforeEach(() => {
  create.mockReset();
  create.mockResolvedValue(created);
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      profile: { current: async () => profile },
      documents: { list: async () => [existing], create },
    },
  });
});

afterEach(() => cleanup());

describe("standalone document start", () => {
  it("starts from document intentions and keeps variation choice behind optional creation details", async () => {
    const user = userEvent.setup();
    render(<DocumentsStartWorkspace onOpenDocument={() => undefined} />);

    expect(await screen.findByRole("heading", { name: "What are you making?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New CV/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New cover letter/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Existing CV/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/Saved variation/)).not.toBeVisible();

    await user.click(screen.getByText("Creation options", { selector: "summary" }));
    expect(screen.getByLabelText(/Document title/)).toBeVisible();
    expect(screen.getByLabelText(/Saved variation/)).toBeVisible();
  });

  it("creates a plain CV without requiring a title or variation and opens it immediately", async () => {
    const onOpenDocument = vi.fn();
    const user = userEvent.setup();
    render(<DocumentsStartWorkspace onOpenDocument={onOpenDocument} />);

    await user.click(await screen.findByRole("button", { name: /New CV/ }));

    expect(create).toHaveBeenCalledWith({
      kind: "cv",
      title: "CV",
      variantId: null,
      engine: "pdflatex",
      bodyParagraphs: [],
    });
    expect(onOpenDocument).toHaveBeenCalledWith(created.id);
  });
});
