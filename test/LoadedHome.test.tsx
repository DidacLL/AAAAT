import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CandidatureFieldConfiguration, CandidatureRecord } from "../src/shared/contracts";
import type { DocumentCollections } from "../src/shared/document-domain-contracts";
import { LoadedHome } from "../src/renderer/LoadedHome";

const fieldId = "00000000-0000-4000-8000-000000000901";
const now = "2026-09-29T12:00:00.000Z";

const field: CandidatureFieldConfiguration = {
  definition: {
    id: fieldId,
    systemKey: null,
    label: "Mission signal",
    description: "",
    valueType: "text",
    cardinality: "one",
    choices: [],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  preferences: {
    fieldId,
    favourite: true,
    favouriteOrder: 0,
    presentationSize: "normal",
    aiUseAllowed: true,
  },
};

function record(
  id: string,
  updatedAt: string,
  value?: string,
  sourceSearchText = "",
): CandidatureRecord {
  return {
    id,
    archived: false,
    createdAt: updatedAt,
    updatedAt,
    sourceSearchText,
    values: value ? [{ candidatureId: id, fieldId, value, createdAt: updatedAt, updatedAt }] : [],
    tagIds: [],
  };
}

const emptyDocuments: DocumentCollections = {
  templates: [],
  workingCvs: [],
  renderedCvs: [],
  letters: [],
  renderedLetters: [],
  applicationPackets: [],
};

let candidatures: CandidatureRecord[];
let documents: DocumentCollections;

beforeEach(() => {
  candidatures = [];
  documents = emptyDocuments;
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      candidatures: {
        list: async () => candidatures,
        listFields: async () => [field],
      },
      documentDomain: {
        collections: async () => documents,
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("LoadedHome", () => {
  it("shows bounded dynamic application recognition, sparse Source fallback, and exact continuations", async () => {
    const user = userEvent.setup();
    const openApplication = vi.fn();
    const openDocument = vi.fn();
    candidatures = [
      record("00000000-0000-4000-8000-000000000911", "2026-09-29T08:00:00.000Z", "Oldest ignored"),
      record("00000000-0000-4000-8000-000000000912", "2026-09-29T09:00:00.000Z", "Third recent"),
      record("00000000-0000-4000-8000-000000000913", "2026-09-29T10:00:00.000Z", "Orbital logistics"),
      record(
        "00000000-0000-4000-8000-000000000914",
        "2026-09-29T11:00:00.000Z",
        undefined,
        "Recruiter note about an unusual operations position.",
      ),
    ];
    documents = {
      ...emptyDocuments,
      workingCvs: [{
        id: "00000000-0000-4000-8000-000000000921",
        title: "Field operations CV",
        sourceTemplateId: null,
        candidatureId: null,
        sections: [],
        createdAt: "2026-09-29T10:00:00.000Z",
        updatedAt: "2026-09-29T12:00:00.000Z",
      }],
      letters: [{
        id: "00000000-0000-4000-8000-000000000922",
        candidatureId: null,
        title: "Local cover letter",
        bodyParagraphs: [],
        createdAt: "2026-09-29T09:00:00.000Z",
        updatedAt: "2026-09-29T11:00:00.000Z",
      }],
    };

    render(
      <LoadedHome
        workspaceName="field-kit"
        demoWorkspace={false}
        onOpenApplication={openApplication}
        onOpenDocument={openDocument}
        onOpenApplications={vi.fn()}
        onOpenDocuments={vi.fn()}
      />,
    );

    const applications = await screen.findByRole("region", { name: "Recent applications" });
    expect(within(applications).getByText("Mission signal")).toBeInTheDocument();
    expect(within(applications).getByText("Orbital logistics")).toBeInTheDocument();
    expect(within(applications).getByText("Retained source")).toBeInTheDocument();
    expect(within(applications).getByText(/Recruiter note about an unusual operations position/)).toBeInTheDocument();
    expect(within(applications).queryByText("Oldest ignored")).not.toBeInTheDocument();

    await user.click(within(applications).getByRole("button", { name: /Orbital logistics/ }));
    expect(openApplication).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000913");

    const documentWork = screen.getByRole("region", { name: "Recent document work" });
    await user.click(within(documentWork).getByRole("button", { name: /Field operations CV/ }));
    expect(openDocument).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000921");
  });

  it("provides intentional empty continuations without workspace administration", async () => {
    const user = userEvent.setup();
    const openApplications = vi.fn();
    const openDocuments = vi.fn();

    render(
      <LoadedHome
        workspaceName="empty-workspace"
        demoWorkspace
        onOpenApplication={vi.fn()}
        onOpenDocument={vi.fn()}
        onOpenApplications={openApplications}
        onOpenDocuments={openDocuments}
      />,
    );

    const home = await screen.findByRole("region", { name: "Home" });
    expect(within(home).getByText("Demo workspace")).toBeInTheDocument();
    expect(within(home).getByText("No applications retained yet.")).toBeInTheDocument();
    expect(within(home).getByText("No Working CVs or editable letters yet.")).toBeInTheDocument();
    expect(within(home).queryByRole("button", { name: "New workspace" })).not.toBeInTheDocument();
    expect(within(home).queryByRole("button", { name: "Open existing workspace" })).not.toBeInTheDocument();
    expect(within(home).queryByRole("button", { name: "Open demo" })).not.toBeInTheDocument();

    await user.click(within(home).getByRole("button", { name: "Open Applications" }));
    await user.click(within(home).getByRole("button", { name: "Open CVs" }));
    expect(openApplications).toHaveBeenCalledOnce();
    expect(openDocuments).toHaveBeenCalledOnce();
  });
});
