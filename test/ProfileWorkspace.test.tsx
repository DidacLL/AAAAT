import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileWorkspace } from "../src/renderer/ProfileWorkspace";
import type { DesktopApi, ProfileSnapshot, ProfileVariant } from "../src/shared/contracts";

const itemA = {
  id: "00000000-0000-4000-8000-000000000001",
  kind: "summary" as const,
  title: "Canonical summary",
  description: "General experience",
  sortOrder: 0,
};
const itemB = {
  id: "00000000-0000-4000-8000-000000000002",
  kind: "skill" as const,
  title: "TypeScript",
  sortOrder: 1,
};
const itemC = {
  id: "00000000-0000-4000-8000-000000000004",
  kind: "skill" as const,
  title: "React",
  sortOrder: 2,
};
const variant: ProfileVariant = {
  id: "00000000-0000-4000-8000-000000000003",
  name: "Platform focus",
  focus: "Platform roles",
  targetTags: ["platform"],
  preferredLanguage: "en",
  rules: [],
};
const secondVariant: ProfileVariant = {
  id: "00000000-0000-4000-8000-000000000005",
  name: "Backend focus",
  focus: "Backend roles",
  targetTags: ["backend"],
  preferredLanguage: "en",
  rules: [],
};
const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
const canonicalProfile: ProfileSnapshot = { items: [itemA, itemB], variants: [] };
const focusedProfile: ProfileSnapshot = { items: [itemA, itemB], variants: [variant] };

const current = vi.fn<DesktopApi["profile"]["current"]>();
const addItem = vi.fn<DesktopApi["profile"]["addItem"]>();
const updateItem = vi.fn<DesktopApi["profile"]["updateItem"]>();
const removeItem = vi.fn<DesktopApi["profile"]["removeItem"]>();
const createVariant = vi.fn<DesktopApi["profile"]["createVariant"]>();
const updateVariant = vi.fn<DesktopApi["profile"]["updateVariant"]>();
const removeVariant = vi.fn<DesktopApi["profile"]["removeVariant"]>();
const configureVariantItem = vi.fn<DesktopApi["profile"]["configureVariantItem"]>();
const reorderVariant = vi.fn<DesktopApi["profile"]["reorderVariant"]>();
const resolveVariant = vi.fn<DesktopApi["profile"]["resolveVariant"]>();
const unavailable = async (): Promise<never> => {
  throw new Error("Unavailable in profile test");
};

const desktopApi: DesktopApi = {
  system: {
    info: async () => ({ appVersion: "2.0.0", electronVersion: "44.1.1", nodeVersion: "24.19.0" }),
  },
  workspace: {
    current: async () => ({ rootPath: "/tmp/aaaat" }),
    choose: async () => ({ rootPath: "/tmp/aaaat" }),
  },
  profile: {
    current,
    addItem,
    updateItem,
    removeItem,
    createVariant,
    updateVariant,
    removeVariant,
    configureVariantItem,
    reorderVariant,
    resolveVariant,
  },
  careerContext: {
    current: async () => ({
      careerDirection: "",
      objectives: "",
      constraints: "",
      targetRoles: "",
      targetMarketsLocations: "",
      workPreferences: "",
      applicationWritingPreferences: "",
    }),
    update: async (value) => value,
  },
  documents: {
    list: async () => [],
    create: unavailable,
    update: unavailable,
    remove: async () => [],
    configureItem: unavailable,
    reorder: unavailable,
    resolve: unavailable,
    render: unavailable,
    regenerate: unavailable,
    exportProject: async () => null,
  },
  candidatures: {
    list: async () => [],
    create: unavailable,
    update: unavailable,
    setDocuments: unavailable,
    listConcepts: async () => [],
    createConcept: unavailable,
    updateConcept: unavailable,
    setConcepts: unavailable,
  },
};

describe("manual profile workspace", () => {
  beforeEach(() => {
    for (const mock of [
      current,
      addItem,
      updateItem,
      removeItem,
      createVariant,
      updateVariant,
      removeVariant,
      configureVariantItem,
      reorderVariant,
      resolveVariant,
    ]) {
      mock.mockReset();
    }
    current.mockResolvedValue(emptyProfile);
    addItem.mockResolvedValue({ items: [itemB], variants: [] });
    createVariant.mockResolvedValue(focusedProfile);
    updateVariant.mockResolvedValue(focusedProfile);
    removeVariant.mockResolvedValue(canonicalProfile);
    configureVariantItem.mockResolvedValue(focusedProfile);
    reorderVariant.mockResolvedValue(focusedProfile);
    resolveVariant.mockResolvedValue({ variant, items: [itemA, itemB] });
    Object.defineProperty(window, "aaaat", { configurable: true, value: desktopApi });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("adds structured canonical career data without JSON entry", async () => {
    const user = userEvent.setup();
    render(<ProfileWorkspace />);
    expect(await screen.findByRole("heading", { name: "Canonical profile" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Type"), "skill");
    await user.type(screen.getByLabelText("Title"), "TypeScript");
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(addItem).toHaveBeenCalledWith({
      kind: "skill",
      title: "TypeScript",
      subtitle: undefined,
      description: undefined,
      startDate: undefined,
      endDate: undefined,
      url: undefined,
    });
    expect(await screen.findByText("TypeScript")).toBeInTheDocument();
  });

  it("creates a named variant and exposes focused item rules", async () => {
    current.mockResolvedValueOnce(canonicalProfile);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);
    await screen.findByText("Canonical summary");
    await user.type(screen.getByLabelText("Name"), "Platform focus");
    await user.type(screen.getByLabelText("Focus"), "Platform roles");
    await user.type(screen.getByLabelText("Target tags"), "platform");
    await user.type(screen.getByLabelText("Preferred language"), "en");
    await user.click(screen.getByRole("button", { name: "Create variant" }));
    expect(createVariant).toHaveBeenCalledWith({
      name: "Platform focus",
      focus: "Platform roles",
      targetTags: ["platform"],
      preferredLanguage: "en",
    });
    expect(resolveVariant).toHaveBeenCalledWith(variant.id);

    const rules = screen.getAllByRole("button", { name: "Apply item rule" });
    const overrideTitles = screen.getAllByLabelText("Override title");
    const downButtons = screen.getAllByRole("button", { name: "Down" });
    expect(rules).toHaveLength(2);
    expect(overrideTitles).toHaveLength(2);
    expect(downButtons).toHaveLength(2);
    const firstRule = rules[0];
    const firstOverrideTitle = overrideTitles[0];
    const firstDown = downButtons[0];
    if (!firstRule || !firstOverrideTitle || !firstDown) {
      throw new Error("Expected variant rule controls are missing");
    }
    await user.type(firstOverrideTitle, "Focused summary");
    await user.click(firstRule);
    expect(configureVariantItem).toHaveBeenCalledWith({
      variantId: variant.id,
      itemId: itemA.id,
      included: true,
      contentPatch: { title: "Focused summary" },
    });
    await user.click(firstDown);
    expect(reorderVariant).toHaveBeenCalledWith({
      variantId: variant.id,
      itemIds: [itemB.id, itemA.id],
    });
  });

  it("preserves dirty variant metadata through canonical item and variant rule mutations", async () => {
    current.mockResolvedValueOnce(focusedProfile);
    addItem.mockResolvedValue({ items: [itemA, itemB, itemC], variants: [variant] });
    configureVariantItem.mockResolvedValue({
      items: [itemA, itemB, itemC],
      variants: [{
        ...variant,
        rules: [{
          itemId: itemA.id,
          excluded: false,
          contentPatch: { title: "Focused summary" },
          orderRank: null,
        }],
      }],
    });
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const focus = await screen.findByLabelText("Focus");
    await user.clear(focus);
    await user.type(focus, "Unsaved platform metadata");

    await user.selectOptions(screen.getByLabelText("Type"), "skill");
    await user.type(screen.getByLabelText("Title"), "React");
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(screen.getByLabelText("Focus")).toHaveValue("Unsaved platform metadata");

    const firstRule = screen.getAllByRole("button", { name: "Apply item rule" })[0];
    const firstOverride = screen.getAllByLabelText("Override title")[0];
    if (!firstRule || !firstOverride) throw new Error("Expected variant rule controls");
    await user.type(firstOverride, "Focused summary");
    await user.click(firstRule);
    expect(screen.getByLabelText("Focus")).toHaveValue("Unsaved platform metadata");
  });

  it("preserves a new variant draft through canonical item mutations", async () => {
    current.mockResolvedValueOnce(focusedProfile);
    addItem.mockResolvedValue({ items: [itemA, itemB, itemC], variants: [variant] });
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    await screen.findByDisplayValue("Platform focus");
    await user.click(screen.getByRole("button", { name: "New" }));
    await user.type(screen.getByLabelText("Name"), "New focus");
    await user.type(screen.getByLabelText("Focus"), "Unsaved new variant");

    await user.selectOptions(screen.getByLabelText("Type"), "skill");
    await user.type(screen.getByLabelText("Title"), "React");
    await user.click(screen.getByRole("button", { name: "Add item" }));

    expect(screen.getByLabelText("Name")).toHaveValue("New focus");
    expect(screen.getByLabelText("Focus")).toHaveValue("Unsaved new variant");
    expect(screen.getByRole("button", { name: "Create variant" })).toBeInTheDocument();
  });

  it("cancels dirty variant selection and removal until discard is confirmed", async () => {
    const twoVariants: ProfileSnapshot = {
      items: [itemA, itemB],
      variants: [variant, secondVariant],
    };
    current.mockResolvedValueOnce(twoVariants);
    resolveVariant.mockImplementation(async (variantId) => ({
      variant: variantId === variant.id ? variant : secondVariant,
      items: [itemA, itemB],
    }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const focus = await screen.findByLabelText("Focus");
    await user.clear(focus);
    await user.type(focus, "Unsaved focus");
    await user.click(screen.getByRole("button", { name: "Backend focus" }));

    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveValue("Platform focus");
    expect(screen.getByLabelText("Focus")).toHaveValue("Unsaved focus");

    await user.click(screen.getByRole("button", { name: "Remove variant" }));
    expect(removeVariant).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Backend focus" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Backend focus");
    expect(screen.getByLabelText("Focus")).toHaveValue("Backend roles");
  });
});
