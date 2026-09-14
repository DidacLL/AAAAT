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

describe("optional CV assistant description", () => {
  it("keeps tags and notes behind one optional disclosure and saves them explicitly", async () => {
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

    expect(await screen.findByText("Optional assistant description")).toBeInTheDocument();
    await user.click(screen.getByText("Optional assistant description", { selector: "summary" }));
    expect(screen.getByLabelText("Tags")).toHaveValue("platform");
    expect(screen.getByLabelText("Notes")).toHaveValue("Good for platform roles.");
    expect(current).toHaveBeenCalledWith(document.id);

    await user.clear(screen.getByLabelText("Tags"));
    await user.type(screen.getByLabelText("Tags"), "backend, leadership");
    await user.clear(screen.getByLabelText("Notes"));
    await user.type(screen.getByLabelText("Notes"), "Strong leadership evidence.");
    expect(onDirtyChange).toHaveBeenCalledWith(true);

    await user.click(screen.getByRole("button", { name: "Save description" }));
    expect(update).toHaveBeenCalledWith({
      documentId: document.id,
      tags: ["backend", "leadership"],
      notes: "Strong leadership evidence.",
    });
    expect(onNotice).toHaveBeenCalledWith("Assistant description saved.");
  });

  it("clears the optional description explicitly", async () => {
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
    await screen.findByText("Optional assistant description");
    await user.click(screen.getByText("Optional assistant description", { selector: "summary" }));
    await user.clear(screen.getByLabelText("Tags"));
    await user.clear(screen.getByLabelText("Notes"));
    await user.click(screen.getByRole("button", { name: "Save description" }));

    expect(update).toHaveBeenCalledWith({ documentId: document.id, tags: [], notes: null });
  });
});
