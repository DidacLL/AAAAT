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

describe("external CV content access control", () => {
  it("keeps rendering disabled after content disclosure until separately confirmed", async () => {
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

    await user.click(
      await screen.findByRole("button", { name: "Allow external assistants to read this CV content" }),
    );
    expect(update).toHaveBeenCalledWith({ documentId: document.id, allowed: true });
    expect(screen.getByText("External rendering is not authorized.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Allow external PDF rendering" }));
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("request local PDF rendering"));
    expect(updateRender).toHaveBeenCalledWith({ documentId: document.id, allowed: true });
    expect(await screen.findByText(/external host may request AAAAT's normal local render/i)).toBeInTheDocument();
  });

  it("revokes content and render authority together and disables permission changes while edits are unsaved", async () => {
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
    expect(await screen.findByRole("button", { name: "Revoke external CV content access" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Revoke external render authorization" })).toBeDisabled();

    rerender(
      <CvExternalContentAccessPanel
        document={document}
        disabled={false}
        onError={() => undefined}
        onNotice={() => undefined}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Revoke external CV content access" }));
    expect(update).toHaveBeenCalledWith({ documentId: document.id, allowed: false });
    expect(await screen.findByText("External rendering is not authorized.")).toBeInTheDocument();
  });
});
