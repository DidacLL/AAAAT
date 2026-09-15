import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CvExternalContentAccessPanel } from "../src/renderer/CvExternalContentAccessPanel";
import type { DocumentRecord } from "../src/shared/contracts";
import type { CvContentAccessDesktopApi } from "../src/shared/cv-content-access-contracts";

const document: DocumentRecord = {
  id: "00000000-0000-4000-8000-000000000501",
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

const current = vi.fn<CvContentAccessDesktopApi["cvContentAccess"]["current"]>();
const update = vi.fn<CvContentAccessDesktopApi["cvContentAccess"]["update"]>();
const updateRender = vi.fn<CvContentAccessDesktopApi["cvContentAccess"]["updateRender"]>();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { cvContentAccess: { current, update, updateRender } } as CvContentAccessDesktopApi,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("external assistant access control", () => {
  it("presents one understandable document permission while keeping render authorization advanced", async () => {
    current.mockResolvedValueOnce({ documentId: document.id, allowed: false, renderAllowed: false });
    update.mockResolvedValueOnce({ documentId: document.id, allowed: true, renderAllowed: false });
    updateRender.mockResolvedValueOnce({
      documentId: document.id,
      allowed: true,
      renderAllowed: true,
    });
    installApi();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();

    render(
      <CvExternalContentAccessPanel
        document={document}
        disabled={false}
        onError={() => undefined}
        onNotice={() => undefined}
      />,
    );

    expect(await screen.findByRole("heading", { name: "External assistant access" })).toBeInTheDocument();
    const content = screen.getByRole("checkbox", { name: "Allow external assistant to use this CV" });
    expect(content).not.toBeChecked();
    expect(screen.queryByText("Advanced authorization")).not.toBeInTheDocument();

    await user.click(content);
    expect(update).toHaveBeenCalledWith({ documentId: document.id, allowed: true });
    expect(await screen.findByText("Advanced authorization")).toBeInTheDocument();

    await user.click(screen.getByText("Advanced authorization", { selector: "summary" }));
    const renderAccess = screen.getByRole("checkbox", { name: "Allow external assistant to request local PDF rendering" });
    expect(renderAccess).not.toBeChecked();
    await user.click(renderAccess);
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("local PDF render"));
    expect(updateRender).toHaveBeenCalledWith({ documentId: document.id, allowed: true });
  });

  it("revokes content and render authority together and disables permission changes while document edits are unsaved", async () => {
    current.mockResolvedValue({ documentId: document.id, allowed: true, renderAllowed: true });
    update.mockResolvedValue({ documentId: document.id, allowed: false, renderAllowed: false });
    installApi();
    const user = userEvent.setup();

    const { rerender } = render(
      <CvExternalContentAccessPanel
        document={document}
        disabled={true}
        onError={() => undefined}
        onNotice={() => undefined}
      />,
    );
    const content = await screen.findByRole("checkbox", { name: "Allow external assistant to use this CV" });
    expect(content).toBeDisabled();
    await user.click(screen.getByText("Advanced authorization", { selector: "summary" }));
    expect(screen.getByRole("checkbox", { name: "Allow external assistant to request local PDF rendering" })).toBeDisabled();

    rerender(
      <CvExternalContentAccessPanel
        document={document}
        disabled={false}
        onError={() => undefined}
        onNotice={() => undefined}
      />,
    );
    await user.click(screen.getByRole("checkbox", { name: "Allow external assistant to use this CV" }));
    expect(update).toHaveBeenCalledWith({ documentId: document.id, allowed: false });
    expect(await screen.findByText("CV content is not shared.")).toBeInTheDocument();
    expect(screen.queryByText("Advanced authorization")).not.toBeInTheDocument();
  });
});
