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
const variant: ProfileVariant = {
  id: "00000000-0000-4000-8000-000000000003",
  name: "Platform focus",
  focus: "Platform roles",
  targetTags: ["platform"],
  preferredLanguage: "en",
  rules: [],
};
const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
const canonicalProfile: ProfileSnapshot = { items: [itemA, itemB], variants: [] };
const focusedProfile: ProfileSnapshot = { items: [itemA, itemB], variants: [variant] };

const current = vi.fn<DesktopApi["profile"]["current"]>();
const addItem = vi.fn<DesktopApi["profile"]["addItem"]>();
const createVariant = vi.fn<DesktopApi["profile"]["createVariant"]>();
const configureVariantItem = vi.fn<DesktopApi["profile"]["configureVariantItem"]>();
const reorderVariant = vi.fn<DesktopApi["profile"]["reorderVariant"]>();
const resolveVariant = vi.fn<DesktopApi["profile"]["resolveVariant"]>();

function installApi() {
  const api = {
    profile: {
      current,
      addItem,
      updateItem: vi.fn(),
      removeItem: vi.fn(),
      createVariant,
      updateVariant: vi.fn(),
      removeVariant: vi.fn(),
      configureVariantItem,
      reorderVariant,
      resolveVariant,
    },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("manual profile workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current.mockResolvedValue(emptyProfile);
    addItem.mockResolvedValue({ items: [itemB], variants: [] });
    createVariant.mockResolvedValue(focusedProfile);
    configureVariantItem.mockResolvedValue(focusedProfile);
    reorderVariant.mockResolvedValue(focusedProfile);
    resolveVariant.mockResolvedValue({ variant, items: [itemA, itemB] });
    installApi();
  });

  afterEach(() => cleanup());

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
  });

  it("creates a named variant and applies focused item rules and ordering", async () => {
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
    const override = screen.getAllByLabelText("Override title")[0];
    const apply = screen.getAllByRole("button", { name: "Apply item rule" })[0];
    const down = screen.getAllByRole("button", { name: "Down" })[0];
    if (!override || !apply || !down) throw new Error("Expected variant controls");
    await user.type(override, "Focused summary");
    await user.click(apply);
    expect(configureVariantItem).toHaveBeenCalledWith({
      variantId: variant.id,
      itemId: itemA.id,
      included: true,
      contentPatch: { title: "Focused summary" },
    });
    await user.click(down);
    expect(reorderVariant).toHaveBeenCalledWith({
      variantId: variant.id,
      itemIds: [itemB.id, itemA.id],
    });
  });

  it("preserves a new variant draft through canonical item mutations", async () => {
    current.mockResolvedValueOnce(focusedProfile);
    addItem.mockResolvedValue({ items: [itemA, itemB], variants: [variant] });
    const user = userEvent.setup();
    render(<ProfileWorkspace />);
    await screen.findByDisplayValue("Platform focus");
    await user.click(screen.getByRole("button", { name: "New" }));
    await user.type(screen.getByLabelText("Name"), "New focus");
    await user.type(screen.getByLabelText("Focus"), "Unsaved new variant");
    await user.selectOptions(screen.getByLabelText("Type"), "skill");
    await user.type(screen.getByLabelText("Title"), "TypeScript");
    await user.click(screen.getByRole("button", { name: "Add item" }));
    expect(screen.getByLabelText("Name")).toHaveValue("New focus");
    expect(screen.getByLabelText("Focus")).toHaveValue("Unsaved new variant");
  });
});
