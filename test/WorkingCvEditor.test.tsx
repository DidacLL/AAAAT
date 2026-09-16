import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { WorkingCvEditor } from "../src/renderer/DocumentWork";
import type { ProfileItem } from "../src/shared/contracts";
import type { DocumentCollections, RenderedCvRecord, WorkingCvRecord } from "../src/shared/document-domain-contracts";
import type { ProfileVariantRecord } from "../src/shared/profile-variant-contracts";

const ids = {
  profile: "00000000-0000-4000-8000-000000000001",
  extraProfile: "00000000-0000-4000-8000-000000000002",
  variant: "00000000-0000-4000-8000-000000000003",
  working: "00000000-0000-4000-8000-000000000010",
  template: "00000000-0000-4000-8000-000000000011",
  candidature: "00000000-0000-4000-8000-000000000012",
  section: "00000000-0000-4000-8000-000000000020",
  profileItem: "00000000-0000-4000-8000-000000000021",
  customItem: "00000000-0000-4000-8000-000000000022",
  templateItem: "00000000-0000-4000-8000-000000000023",
  rendered: "00000000-0000-4000-8000-000000000030",
};

const profile: ProfileItem[] = [
  {
    id: ids.profile,
    sortOrder: 0,
    kind: "identity",
    title: "Alex Morgan",
    subtitle: "Software engineer",
    description: "Backend systems, developer tooling and practical ML products.",
  },
  {
    id: ids.extraProfile,
    sortOrder: 1,
    kind: "skill",
    title: "TypeScript",
    description: "Production TypeScript across desktop and service code.",
  },
];

const variants: ProfileVariantRecord[] = [
  {
    id: ids.variant,
    itemId: ids.profile,
    name: "Leadership",
    content: {
      title: "Alex Morgan",
      subtitle: "Engineering lead",
      description: "Led backend and developer-tooling work.",
    },
    createdAt: "2026-09-16T00:00:00.000Z",
    updatedAt: "2026-09-16T00:00:00.000Z",
  },
];

const working: WorkingCvRecord = {
  id: ids.working,
  title: "Demo application CV",
  language: "en",
  sourceTemplateId: ids.template,
  candidatureId: ids.candidature,
  sections: [
    {
      id: ids.section,
      name: "Profile",
      items: [
        {
          id: ids.profileItem,
          templateItemId: ids.templateItem,
          sourceMode: "current",
          profileItemId: ids.profile,
          profileVariantId: null,
          content: {
            kind: "identity",
            title: "Alex Morgan",
            subtitle: "Software engineer",
            description: "Backend systems, developer tooling and practical ML products.",
            url: "https://example.test/alex",
          },
        },
        {
          id: ids.customItem,
          templateItemId: null,
          sourceMode: "custom",
          profileItemId: null,
          profileVariantId: null,
          content: {
            kind: "project",
            title: "Selected work",
            subtitle: "Developer tools",
            description: "Built TypeScript services and local desktop tooling.",
            startDate: "2024",
            endDate: "2026",
          },
        },
      ],
    },
  ],
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-16T00:00:00.000Z",
};

const collections: DocumentCollections = {
  templates: [
    {
      id: ids.template,
      name: "Base template",
      language: "en",
      sections: [],
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
    },
  ],
  workingCvs: [working],
  renderedCvs: [],
  letters: [],
  applicationPackets: [],
};

const rendered: RenderedCvRecord = {
  id: ids.rendered,
  workingCvId: ids.working,
  sourceTemplateId: ids.template,
  candidatureId: ids.candidature,
  title: working.title,
  language: working.language,
  snapshot: {
    title: working.title,
    language: working.language,
    sourceTemplateId: working.sourceTemplateId,
    candidatureId: working.candidatureId,
    sections: working.sections,
  },
  createdAt: "2026-09-16T00:00:00.000Z",
  hasPdf: true,
};

const updateWorkingCv = vi.fn(async (input: { title: string; language?: string; sections: WorkingCvRecord["sections"] }) => ({
  ...working,
  title: input.title,
  language: input.language,
  sections: input.sections,
  updatedAt: "2026-09-16T01:00:00.000Z",
}));
const saveWorkingItem = vi.fn(async () => working);
const saveWorkingAsTemplate = vi.fn(async () => collections.templates[0]!);
const updateTemplate = vi.fn(async () => collections);
const renderCv = vi.fn(async () => rendered);
const openRenderedCv = vi.fn(async () => ({ opened: true as const }));
const loadCollections = vi.fn(async () => ({ ...collections, renderedCvs: [rendered] }));

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      documentDomain: {
        updateWorkingCv,
        saveWorkingItem,
        saveWorkingAsTemplate,
        updateTemplate,
        renderCv,
        openRenderedCv,
        collections: loadCollections,
      },
      ai: {
        tailorCv: async () => ({ recommendations: [] }),
      },
    },
  });
}

function renderEditor() {
  return render(
    <WorkingCvEditor
      document={working}
      profile={profile}
      variants={variants}
      collections={collections}
      onSaved={() => undefined}
      onCollections={() => undefined}
    />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  installApi();
});

afterEach(() => cleanup());

describe("Working CV editor", () => {
  it("opens as a readable CV outline and edits only the selected item", async () => {
    const user = userEvent.setup();
    renderEditor();

    const alex = screen.getByRole("article", { name: "Alex Morgan CV item" });
    const selectedWork = screen.getByRole("article", { name: "Selected work CV item" });

    expect(alex).toHaveTextContent("Backend systems, developer tooling and practical ML products.");
    expect(alex).toHaveTextContent("My information — current");
    expect(selectedWork).toHaveTextContent("2024 – 2026");
    expect(within(alex).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(selectedWork).queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Kind")).not.toBeInTheDocument();
    expect(screen.queryByText("These changes are only in this CV.")).not.toBeInTheDocument();

    await user.click(within(alex).getByRole("button", { name: "Edit" }));

    expect(within(alex).getByRole("combobox", { name: "Wording source" })).toHaveDisplayValue("My information — current");
    expect(within(alex).getByRole("option", { name: "Saved variation — Leadership" })).toBeInTheDocument();
    expect(within(alex).getByRole("option", { name: "This CV only" })).toBeInTheDocument();
    expect(within(alex).getByRole("textbox", { name: "Title" })).toHaveValue("Alex Morgan");
    expect(within(selectedWork).queryByRole("textbox")).not.toBeInTheDocument();

    const description = within(alex).getByRole("textbox", { name: "Description" });
    await user.clear(description);
    await user.type(description, "Backend systems with product ownership.");

    expect(within(alex).getByText("These changes are only in this CV.")).toBeInTheDocument();
    expect(within(alex).getByRole("button", { name: "Save to template" })).toBeInTheDocument();
    expect(within(alex).getByRole("button", { name: "Save as profile variant" })).toBeInTheDocument();
    expect(within(alex).getByRole("button", { name: "Update My information" })).toBeInTheDocument();
    expect(within(alex).getByRole("combobox", { name: "Wording source" })).toHaveDisplayValue("This CV only");
  });

  it("keeps reorder, add, save and render behavior wired behind the simpler presentation", async () => {
    const user = userEvent.setup();
    renderEditor();

    const section = screen.getByRole("region", { name: "Profile section" });
    await user.click(screen.getByRole("button", { name: "Move Alex Morgan down" }));
    expect(section.textContent!.indexOf("Selected work")).toBeLessThan(section.textContent!.indexOf("Alex Morgan"));

    await user.click(within(section).getByRole("button", { name: "＋ Add information" }));
    await user.selectOptions(within(section).getByRole("combobox", { name: "From My information" }), ids.extraProfile);
    expect(within(section).getByRole("article", { name: "TypeScript CV item" })).toBeInTheDocument();

    await user.click(within(section).getByRole("button", { name: "＋ Add information" }));
    await user.click(within(section).getByRole("button", { name: "Add custom content" }));
    expect(within(section).getByRole("article", { name: "New content CV item" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateWorkingCv).toHaveBeenCalled());

    await user.click(screen.getByRole("button", { name: "Render PDF" }));
    await waitFor(() => expect(renderCv).toHaveBeenCalledWith(ids.working));
    expect(openRenderedCv).toHaveBeenCalledWith(ids.rendered);
  });

  it("keeps whole-CV template reuse secondary instead of a permanent ownership panel", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.queryByRole("button", { name: "Save current composition to source template" })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Save as new template" })).not.toBeInTheDocument();

    await user.click(screen.getByText("Reuse this CV"));

    expect(screen.getByRole("button", { name: "Save current composition to source template" })).toBeVisible();
    const templateName = screen.getByRole("textbox", { name: "Save as new template" });
    await user.type(templateName, "Application base");
    await user.click(screen.getByRole("button", { name: "Save template" }));
    await waitFor(() => expect(saveWorkingAsTemplate).toHaveBeenCalledWith({
      workingCvId: ids.working,
      name: "Application base",
    }));
  });
});
