import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CombinedDocumentExportPanel } from "../src/renderer/CombinedDocumentExportPanel";
import type { CombinedDocumentDesktopApi } from "../src/shared/combined-document-contracts";
import type { DocumentRecord } from "../src/shared/contracts";

function record(id: string, kind: "cv" | "cover_letter", title: string): DocumentRecord {
  return {
    id,
    kind,
    title,
    variantId: null,
    engine: "pdflatex",
    bodyParagraphs: [],
    mode: "managed",
    rules: [],
    projectPath: `/tmp/${id}`,
    sourcePath: `/tmp/${id}/main.tex`,
    artifactPath: `/tmp/${id}/build/main.pdf`,
  };
}

const cv = record("00000000-0000-4000-8000-000000000801", "cv", "Platform CV");
const coverLetter = record(
  "00000000-0000-4000-8000-000000000802",
  "cover_letter",
  "Platform cover letter",
);
const exportPacket = vi.fn<CombinedDocumentDesktopApi["combinedDocuments"]["exportPacket"]>();

describe("combined document export panel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exportPacket.mockResolvedValue({ exportedPath: "/tmp/application-packet" });
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { combinedDocuments: { exportPacket } },
    });
  });

  afterEach(() => cleanup());

  it("exports the selected CV and cover letter through the named desktop operation", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const onNotice = vi.fn();
    render(
      <CombinedDocumentExportPanel
        documents={[cv, coverLetter]}
        disabled={false}
        onError={onError}
        onNotice={onNotice}
      />,
    );

    expect(screen.getByLabelText("Combined CV")).toHaveValue(cv.id);
    expect(screen.getByLabelText("Combined cover letter")).toHaveValue(coverLetter.id);
    await user.click(screen.getByRole("button", { name: "Export combined packet" }));

    expect(exportPacket).toHaveBeenCalledWith({
      cvDocumentId: cv.id,
      coverLetterDocumentId: coverLetter.id,
    });
    expect(onNotice).toHaveBeenCalledWith(
      "Combined application packet exported: /tmp/application-packet",
    );
  });

  it("requires both working-document kinds", () => {
    render(
      <CombinedDocumentExportPanel
        documents={[cv]}
        disabled={false}
        onError={vi.fn()}
        onNotice={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/Create at least one CV and one cover letter/),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export combined packet" })).not.toBeInTheDocument();
  });
});
