import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CvAssistantDescriptorPanel } from "../src/renderer/CvAssistantDescriptorPanel";
import type { DocumentRecord } from "../src/shared/contracts";
import type { CvDescriptorDesktopApi } from "../src/shared/cv-descriptor-contracts";

const document: DocumentRecord = {
  id: "00000000-0000-4000-8000-000000000401",
  kind: "cv",
  title: "Private document title",
  variantId: null,
  engine: "pdflatex",
  bodyParagraphs: [],
  mode: "managed",
  rules: [],
  projectPath: "/private/workspace/documents/cv",
  sourcePath: "/private/workspace/documents/cv/main.tex",
  artifactPath: "/private/workspace/documents/cv/build/main.pdf",
};

const current = vi.fn<CvDescriptorDesktopApi["cvDescriptors"]["current"]>();
const update = vi.fn<CvDescriptorDesktopApi["cvDescriptors"]["update"]>();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { cvDescriptors: { current, update } } as CvDescriptorDesktopApi,
  });
}

afterEach(() => cleanup());

describe("AI-visible CV description editor", () => {
  it("loads, edits and saves only explicit tags and notes", async () => {
    current.mockResolvedValueOnce({
      documentId: document.id,
      tags: ["platform"],
      notes: "Good for platform roles.",
    });
    update.mockImplementation(async (input) => input);
    installApi();
    const onDirtyChange = vi.fn();
    const onError = vi.fn();
    const onNotice = vi.fn();
    const user = userEvent.setup();

    render(
      <CvAssistantDescriptorPanel
        document={document}
        onDirtyChange={onDirtyChange}
        onError={onError}
        onNotice={onNotice}
      />,
    );

    expect(await screen.findByLabelText("AI-visible tags")).toHaveValue("platform");
    expect(screen.getByLabelText("AI-visible notes")).toHaveValue("Good for platform roles.");
    expect(current).toHaveBeenCalledWith(document.id);

    await user.clear(screen.getByLabelText("AI-visible tags"));
    await user.type(screen.getByLabelText("AI-visible tags"), "backend, leadership");
    await user.clear(screen.getByLabelText("AI-visible notes"));
    await user.type(screen.getByLabelText("AI-visible notes"), "Strong leadership evidence.");
    expect(onDirtyChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Save AI-visible description" }));
    expect(update).toHaveBeenCalledWith({
      documentId: document.id,
      tags: ["backend", "leadership"],
      notes: "Strong leadership evidence.",
    });
    expect(onNotice).toHaveBeenCalledWith("AI-visible CV description saved.");
  });

  it("clears descriptors explicitly with empty tags and null notes", async () => {
    current.mockResolvedValueOnce({
      documentId: document.id,
      tags: ["platform"],
      notes: "Existing note.",
    });
    update.mockImplementation(async (input) => input);
    installApi();
    const user = userEvent.setup();

    render(
      <CvAssistantDescriptorPanel
        document={document}
        onDirtyChange={() => undefined}
        onError={() => undefined}
        onNotice={() => undefined}
      />,
    );
    await screen.findByLabelText("AI-visible tags");
    await user.clear(screen.getByLabelText("AI-visible tags"));
    await user.clear(screen.getByLabelText("AI-visible notes"));
    await user.click(screen.getByRole("button", { name: "Save AI-visible description" }));

    expect(update).toHaveBeenCalledWith({ documentId: document.id, tags: [], notes: null });
  });
});
