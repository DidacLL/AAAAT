import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ProfileItem } from "../src/shared/contracts";
import type { DocumentCollections, WorkingCvRecord, WorkingCvUpdate } from "../src/shared/document-domain-contracts";
import type { ProfileVariantRecord } from "../src/shared/profile-variant-contracts";

vi.mock("../src/renderer/contextual-handoffs", () => ({
  useContextualHandoffs: () => ({
    documentHandoff: { documentId: "00000000-0000-4000-8000-000000000904" },
    openProfessionalInformationItem: vi.fn(),
    openSettingsFor: vi.fn(),
    returnToCandidature: vi.fn(),
  }),
}));

import { WorkingCvEditor } from "../src/renderer/DocumentWork";

const now = "2026-09-27T18:30:00.000Z";
const candidatureId = "00000000-0000-4000-8000-000000000902";
const cvId = "00000000-0000-4000-8000-000000000904";
const templateId = "00000000-0000-4000-8000-000000000905";
const experienceSectionId = "00000000-0000-4000-8000-000000000906";
const skillsSectionId = "00000000-0000-4000-8000-000000000907";
const profileItemId = "00000000-0000-4000-8000-000000000908";
const secondProfileItemId = "00000000-0000-4000-8000-000000000909";
const profileWorkingItemId = "00000000-0000-4000-8000-000000000910";
const customWorkingItemId = "00000000-0000-4000-8000-000000000911";
const skillsWorkingItemId = "00000000-0000-4000-8000-000000000912";
const templateItemId = "00000000-0000-4000-8000-000000000913";
const variantId = "00000000-0000-4000-8000-000000000914";

const profileItem: ProfileItem = {
  id: profileItemId,
  sortOrder: 0,
  kind: "unanticipated-career-kind",
  title: "Platform Engineer",
  subtitle: "Acme Systems",
  description: "Built resilient internal platforms.",
};
const secondProfileItem: ProfileItem = {
  id: secondProfileItemId,
  sortOrder: 1,
  kind: "community-impact",
  title: "Mentoring",
  description: "Mentored early-career engineers.",
};
const variant: ProfileVariantRecord = {
  id: variantId,
  itemId: profileItemId,
  name: "Leadership",
  content: {
    title: "Staff Platform Engineer",
    subtitle: "Acme Systems · Platform leadership",
    description: "Led platform direction across teams.",
    url: "https://example.com/leadership",
  },
  createdAt: now,
  updatedAt: now,
};

const workingCv: WorkingCvRecord = {
  id: cvId,
  title: "Saved CV",
  language: "en",
  sourceTemplateId: templateId,
  candidatureId,
  sections: [
    {
      id: experienceSectionId,
      name: "Experience",
      presentationRole: "main",
      items: [
        {
          id: profileWorkingItemId,
          templateItemId,
          sourceMode: "current",
          profileItemId,
          profileVariantId: null,
          content: {
            kind: profileItem.kind,
            title: profileItem.title,
            subtitle: profileItem.subtitle,
            description: profileItem.description,
          },
        },
        {
          id: customWorkingItemId,
          templateItemId: null,
          sourceMode: "custom",
          profileItemId: null,
          profileVariantId: null,
          content: {
            kind: "bespoke-portfolio-evidence",
            title: "Community Work",
            description: "Maintained an open source accessibility toolkit.",
          },
        },
      ],
    },
    {
      id: skillsSectionId,
      name: "Skills",
      presentationRole: "secondary",
      items: [{
        id: skillsWorkingItemId,
        templateItemId: null,
        sourceMode: "custom",
        profileItemId: null,
        profileVariantId: null,
        content: { kind: "skills", title: "TypeScript · React · SQLite" },
      }],
    },
  ],
  createdAt: now,
  updatedAt: now,
};

const template = {
  id: templateId,
  name: "Reusable CV",
  language: "en",
  sections: [{
    id: experienceSectionId,
    name: "Experience",
    presentationRole: "main" as const,
    items: [{ id: templateItemId, sourceMode: "current" as const, profileItemId }],
  }],
  createdAt: now,
  updatedAt: now,
};

let collections: DocumentCollections;
let latestWorking: WorkingCvRecord;
const updateWorkingCv = vi.fn();
const saveWorkingItem = vi.fn();
const updateTemplate = vi.fn();
const saveWorkingAsTemplate = vi.fn();
const renderCv = vi.fn();
const openRenderedCv = vi.fn();
const tailorCv = vi.fn();

function renderEditor({
  document = workingCv,
  onSaved = vi.fn(),
  onDirtyChange,
}: {
  readonly document?: WorkingCvRecord;
  readonly onSaved?: (document: WorkingCvRecord) => void;
  readonly onDirtyChange?: (dirty: boolean) => void;
} = {}) {
  return render(
    <WorkingCvEditor
      document={document}
      profile={[profileItem, secondProfileItem]}
      variants={[variant]}
      collections={collections}
      onSaved={onSaved}
      onCollections={vi.fn()}
      onDirtyChange={onDirtyChange}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  latestWorking = structuredClone(workingCv);
  collections = {
    templates: [template], workingCvs: [latestWorking], renderedCvs: [], letters: [],
    renderedLetters: [], applicationPackets: [],
  };
  updateWorkingCv.mockImplementation(async (input: WorkingCvUpdate) => {
    latestWorking = { ...latestWorking, ...input, updatedAt: "2026-09-27T18:31:00.000Z" };
    return latestWorking;
  });
  saveWorkingItem.mockImplementation(async () => latestWorking);
  updateTemplate.mockResolvedValue(collections);
  saveWorkingAsTemplate.mockResolvedValue(template);
  renderCv.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000915",
    workingCvId: cvId,
    sourceTemplateId: templateId,
    candidatureId,
    title: workingCv.title,
    language: workingCv.language,
    snapshot: {
      title: workingCv.title,
      language: workingCv.language,
      sourceTemplateId: templateId,
      candidatureId,
      sections: workingCv.sections,
    },
    createdAt: now,
    hasPdf: true,
  });
  openRenderedCv.mockResolvedValue({ opened: true });
  tailorCv.mockResolvedValue({ recommendations: [] });

  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      documentDomain: {
        blueprints: vi.fn(async () => [{ id: "builtin:default", name: "AAAAT Default" }]),
        collections: vi.fn(async () => collections),
        updateWorkingCv,
        saveWorkingItem,
        updateTemplate,
        saveWorkingAsTemplate,
        renderCv,
        openRenderedCv,
      },
      ai: { tailorCv },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Working CV read-first editing", () => {
  it("reads as one ordered document outline before any item is selected", () => {
    renderEditor();

    expect(screen.getByLabelText("CV document outline")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "CV sections" })).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("list", { name: "Experience items" })).toBeInTheDocument();
    expect(screen.getByText("Platform Engineer")).toBeInTheDocument();
    expect(screen.getByText("Acme Systems")).toBeInTheDocument();
    expect(screen.getByText("Built resilient internal platforms.")).toBeInTheDocument();
    expect(screen.getByText("Community Work")).toBeInTheDocument();
    expect(screen.getByText("My information — current")).toBeInTheDocument();
    expect(screen.getAllByText("This CV only")).toHaveLength(2);
    expect(screen.queryByRole("textbox", { name: "Title" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Subtitle" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Start date" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Experience presentation role" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Edit" })).toHaveLength(3);
  });

  it("expands only the selected item and edits retained or deliberately added optional details", async () => {
    const user = userEvent.setup();
    renderEditor();
    const experienceItems = screen.getByRole("list", { name: "Experience items" });

    await user.click(within(experienceItems).getAllByRole("button", { name: "Edit" })[0]!);
    expect(screen.getByLabelText("Edit Platform Engineer")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit Community Work")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Platform Engineer");
    expect(screen.getByRole("textbox", { name: "Subtitle" })).toHaveValue("Acme Systems");
    expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Built resilient internal platforms.");
    expect(screen.queryByRole("textbox", { name: "Start date" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "End date" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Link" })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Add detail to Platform Engineer" }), "url");
    const link = screen.getByRole("textbox", { name: "Link" });
    await user.type(link, "https://example.com/platform");
    const subtitle = screen.getByRole("textbox", { name: "Subtitle" });
    await user.clear(subtitle);
    expect(subtitle).toHaveValue("");
    expect(screen.getByText("Maintained an open source accessibility toolkit.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.queryByLabelText("Edit Platform Engineer")).not.toBeInTheDocument();
    expect(screen.getByText("https://example.com/platform")).toBeInTheDocument();

    await user.click(within(experienceItems).getAllByRole("button", { name: "Edit" })[1]!);
    expect(screen.getByLabelText("Edit Community Work")).toBeInTheDocument();
    expect(screen.queryByLabelText("Edit Platform Engineer")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Community Work");

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateWorkingCv).toHaveBeenCalled());
    const saved = updateWorkingCv.mock.calls.at(-1)?.[0] as WorkingCvUpdate;
    const savedExperience = saved.sections.find((section) => section.id === experienceSectionId)!;
    expect(savedExperience.items[0]?.content).toMatchObject({
      title: "Platform Engineer",
      url: "https://example.com/platform",
    });
    expect(savedExperience.items[0]?.content.subtitle).toBeUndefined();
    expect(savedExperience.items[1]?.content).toEqual(workingCv.sections[0]?.items[1]?.content);
  });

  it("keeps current and saved-variation sources intact until an edit creates a This-CV-only override", async () => {
    const user = userEvent.setup();
    renderEditor();
    await user.click(within(screen.getByRole("list", { name: "Experience items" })).getAllByRole("button", { name: "Edit" })[0]!);

    const source = screen.getByRole("combobox", { name: "Wording source" });
    expect(source).toHaveValue("current");
    expect(within(source).getByRole("option", { name: "My information — current" })).toBeInTheDocument();
    expect(within(source).getByRole("option", { name: "Saved variation — Leadership" })).toBeInTheDocument();

    await user.selectOptions(source, variantId);
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Staff Platform Engineer");
    expect(screen.getByRole("textbox", { name: "Link" })).toHaveValue("https://example.com/leadership");
    expect(screen.getAllByText("Saved variation — Leadership").length).toBeGreaterThan(0);
    expect(screen.queryByText("These changes are only in this CV.")).not.toBeInTheDocument();

    const title = screen.getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "Targeted Platform Lead");
    expect(screen.getAllByText("This CV only").length).toBeGreaterThan(0);
    expect(screen.getByText("These changes are only in this CV.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to template" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Update My information" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save as profile variant" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Update My information" }));
    await waitFor(() => expect(saveWorkingItem).toHaveBeenCalledWith({
      workingCvId: cvId,
      itemId: profileWorkingItemId,
      target: "profile",
    }));
  });

  it("keeps composition, creation, reuse, AI, Blueprint and render controls reachable and functional", async () => {
    const user = userEvent.setup();
    renderEditor();

    await user.click(screen.getByLabelText("Experience section options"));
    const role = screen.getByRole("combobox", { name: "Experience presentation role" });
    await user.selectOptions(role, "secondary");
    expect(role).toHaveValue("secondary");
    expect(screen.getByRole("button", { name: "Move Experience section down" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();

    await user.click(screen.getByLabelText("Platform Engineer item actions"));
    await user.click(screen.getByRole("button", { name: "Move Platform Engineer down" }));
    const articles = within(screen.getByRole("list", { name: "Experience items" })).getAllByRole("article");
    expect(articles[0]).toHaveAccessibleName("Community Work CV item");
    expect(articles[1]).toHaveAccessibleName("Platform Engineer CV item");

    await user.click(screen.getByRole("button", { name: "＋ Add information" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "From My information" }), secondProfileItemId);
    expect(screen.getByText("Mentoring")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "＋ Add information" }));
    await user.click(screen.getByRole("button", { name: "Add custom content" }));
    expect(screen.getByLabelText("Edit New content")).toBeInTheDocument();

    await user.click(screen.getByText("＋ Add section", { selector: "summary" }));
    await user.type(screen.getByRole("textbox", { name: "Section name" }), "Selected work");
    await user.click(screen.getByRole("button", { name: "Add section" }));
    expect(screen.getByRole("region", { name: "Selected work section" })).toBeInTheDocument();

    await user.click(screen.getByText("Reuse this CV", { selector: "summary" }));
    await user.click(screen.getByRole("button", { name: "Save current composition to source template" }));
    await waitFor(() => expect(updateTemplate).toHaveBeenCalled());
    await user.type(screen.getByRole("textbox", { name: "Save as new template" }), "Focused template");
    await user.click(screen.getByRole("button", { name: "Save template" }));
    await waitFor(() => expect(saveWorkingAsTemplate).toHaveBeenCalledWith({ workingCvId: cvId, name: "Focused template" }));

    await user.click(screen.getByRole("button", { name: "Ask AI to tailor" }));
    await waitFor(() => expect(tailorCv).toHaveBeenCalledWith({ candidatureId, workingCvId: cvId }));
    expect(await screen.findByRole("combobox", { name: "Blueprint" })).toHaveValue("builtin:default");
    await user.click(screen.getByRole("button", { name: "Render PDF" }));
    await waitFor(() => expect(renderCv).toHaveBeenCalledWith({ cvId, blueprintId: "builtin:default" }));
    expect(openRenderedCv).toHaveBeenCalledWith("00000000-0000-4000-8000-000000000915");
  });

  it("reports dirty state for local edits and returns clean when the saved document becomes authoritative", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    const onSaved = vi.fn();
    const view = renderEditor({ onDirtyChange, onSaved });

    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
    await user.click(within(screen.getByRole("list", { name: "Experience items" })).getAllByRole("button", { name: "Edit" })[0]!);
    const title = screen.getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "Locally tailored title");
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const savedDocument = onSaved.mock.calls.at(-1)?.[0] as WorkingCvRecord;
    view.rerender(
      <WorkingCvEditor
        document={savedDocument}
        profile={[profileItem, secondProfileItem]}
        variants={[variant]}
        collections={collections}
        onSaved={onSaved}
        onCollections={vi.fn()}
        onDirtyChange={onDirtyChange}
      />,
    );
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
  });
});
