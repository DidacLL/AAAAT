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

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { cvContentAccess: { current, update } } as CvContentAccessDesktopApi,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("external CV content access control", () => {
  it("requires explicit confirmation before allowing broader CV content disclosure", async () => {
    current.mockResolvedValueOnce({ documentId: document.id, allowed: false });
    update.mockResolvedValueOnce({ documentId: document.id, allowed: true });
    installApi();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const onNotice = vi.fn();
    const user = userEvent.setup();

    render(
      <CvExternalContentAccessPanel
        document={document}
        disabled={false}
        onError={() => undefined}
        onNotice={onNotice}
      />,
    );

    const allow = await screen.findByRole("button", {
      name: "Allow external assistants to read this CV content",
    });
    expect(current).toHaveBeenCalledWith(document.id);
    await user.click(allow);

    expect(confirm).toHaveBeenCalledWith(expect.stringContaining("shares the CV content"));
    expect(update).toHaveBeenCalledWith({ documentId: document.id, allowed: true });
    expect(onNotice).toHaveBeenCalledWith(
      "This CV is now the one CV available to the external content-read operation.",
    );
    expect(await screen.findByText("Content access allowed for this CV.")).toBeInTheDocument();
  });

  it("revokes immediately and disables permission changes while structured edits are unsaved", async () => {
    current.mockResolvedValue({ documentId: document.id, allowed: true });
    update.mockResolvedValue({ documentId: document.id, allowed: false });
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
  });
});
