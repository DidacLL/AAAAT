import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileWorkspace } from "../src/renderer/ProfileWorkspace";
import type { DesktopApi, ProfileSnapshot, ProfileVariant } from "../src/shared/contracts";
import type { ProfileAiContextDesktopApi } from "../src/shared/profile-ai-context-contracts";

const itemA = {
  id: "00000000-0000-4000-8000-000000000001",
  kind: "summary" as const,
  title: "Professional summary",
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
const baseProfile: ProfileSnapshot = { items: [itemA, itemB], variants: [] };
const variedProfile: ProfileSnapshot = { items: [itemA, itemB], variants: [variant] };

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
const currentAiContext = vi.fn<ProfileAiContextDesktopApi["profileAiContext"]["current"]>();
const updateAiContext = vi.fn<ProfileAiContextDesktopApi["profileAiContext"]["update"]>();

function installApi() {
  const api = {
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
    profileAiContext: {
      current: currentAiContext,
      update: updateAiContext,
    },
  } as unknown as DesktopApi & ProfileAiContextDesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

describe("My information workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current.mockResolvedValue(emptyProfile);
    addItem.mockResolvedValue({ items: [itemB], variants: [] });
    updateItem.mockResolvedValue(baseProfile);
    removeItem.mockResolvedValue(emptyProfile);
    createVariant.mockResolvedValue(variedProfile);
    updateVariant.mockResolvedValue(variedProfile);
    removeVariant.mockResolvedValue(baseProfile);
    configureVariantItem.mockResolvedValue(variedProfile);
    reorderVariant.mockResolvedValue(variedProfile);
    resolveVariant.mockResolvedValue({ variant, items: [itemA, itemB] });
    currentAiContext.mockImplementation(async (itemId) => ({ itemId, aiUseAllowed: true }));
    updateAiContext.mockImplementation(async (input) => input);
    installApi();
  });

  afterEach(() => cleanup());

  it("starts read-first and adds reusable information deliberately", async () => {
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    expect(await screen.findByRole("heading", { name: "My information" })).toBeInTheDocument();
    expect(screen.getByText(/career profile is empty/i)).toBeInTheDocument();
    expect(screen.queryByLabelText("What information do you want to keep?")).not.toBeInTheDocument();
    expect(screen.queryByText("Canonical profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Focused variants")).not.toBeInTheDocument();

    await user.click(screen.getByText("+ Add"));
    await user.click(screen.getByRole("button", { name: "Skill" }));
    expect(screen.getByRole("heading", { name: "Add skill" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("Skill"), "TypeScript");
    expect(screen.queryByRole("button", { name: "AI may use this information" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add skill" }));

    expect(addItem).toHaveBeenCalledWith({
      kind: "skill",
      title: "TypeScript",
      subtitle: undefined,
      description: undefined,
      startDate: undefined,
      endDate: undefined,
      url: undefined,
    });
    expect(await screen.findByRole("heading", { name: "My information" })).toBeInTheDocument();
  });

  it("uses one eye for reusable information without changing local content", async () => {
    current.mockResolvedValueOnce(baseProfile);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const list = await screen.findByRole("region", { name: "My information" });
    const firstItem = within(list).getByText("Professional summary").closest("article");
    if (!firstItem) throw new Error("Expected My information item");
    await user.click(within(firstItem).getByRole("button", { name: "Edit Professional summary" }));

    expect(screen.getByLabelText("Heading")).toHaveValue("Professional summary");
    await user.click(screen.getByText("AI use", { selector: "summary" }));
    const eye = await screen.findByRole("button", { name: "AI may use this information" });
    expect(eye).toHaveAttribute("aria-pressed", "true");
    await user.click(eye);

    expect(updateAiContext).toHaveBeenCalledWith({ itemId: itemA.id, aiUseAllowed: false });
    expect(updateItem).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Heading")).toHaveValue("Professional summary");
  });

  it("keeps saved variations optional and applies differences in ordinary terms", async () => {
    current.mockResolvedValueOnce(baseProfile);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    await screen.findByText("Professional summary");
    await user.click(screen.getByRole("button", { name: "Create saved variation" }));
    expect(screen.getByRole("heading", { name: "Saved variations" })).toBeInTheDocument();
    expect(screen.queryByText("Difference-only")).not.toBeInTheDocument();
    expect(screen.queryByText("Override title")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "Platform focus");
    await user.type(screen.getByLabelText("Intended focus"), "Platform roles");
    await user.type(screen.getByLabelText("Context tags"), "platform");
    await user.type(screen.getByLabelText("Writing language (optional)"), "en");
    await user.click(screen.getByRole("button", { name: "Create saved variation" }));

    expect(createVariant).toHaveBeenCalledWith({
      name: "Platform focus",
      focus: "Platform roles",
      targetTags: ["platform"],
      preferredLanguage: "en",
    });

    const alternateTitle = screen.getAllByLabelText("Alternate title")[0];
    const applyDifference = screen.getAllByRole("button", { name: "Apply difference" })[0];
    const moveLater = screen.getAllByRole("button", { name: "Move later" })[0];
    if (!alternateTitle || !applyDifference || !moveLater) {
      throw new Error("Expected saved variation difference controls");
    }
    await user.type(alternateTitle, "Platform summary");
    await user.click(applyDifference);
    expect(configureVariantItem).toHaveBeenCalledWith({
      variantId: variant.id,
      itemId: itemA.id,
      included: true,
      contentPatch: { title: "Platform summary" },
    });
    await user.click(moveLater);
    expect(reorderVariant).toHaveBeenCalledWith({
      variantId: variant.id,
      itemIds: [itemB.id, itemA.id],
    });
  });

  it("preserves an unsaved saved-variation draft through base information changes", async () => {
    current.mockResolvedValueOnce(variedProfile);
    addItem.mockResolvedValue({ items: [itemA, itemB], variants: [variant] });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    await screen.findByText("Professional summary");
    await user.click(screen.getByRole("button", { name: "Saved variations (1)" }));
    await user.click(screen.getByRole("button", { name: "New saved variation" }));
    await user.type(screen.getByLabelText("Name"), "New focus");
    await user.type(screen.getByLabelText("Intended focus"), "Unsaved new variation");

    await user.click(screen.getByRole("button", { name: "← Career profile" }));
    expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByText("+ Add"));
    await user.click(screen.getByRole("button", { name: "Skill" }));
    await user.type(screen.getByLabelText("Skill"), "TypeScript");
    await user.click(screen.getByRole("button", { name: "Add skill" }));

    await user.click(screen.getByRole("button", { name: /Saved variations/ }));
    expect(screen.getByLabelText("Name")).toHaveValue("New focus");
    expect(screen.getByLabelText("Intended focus")).toHaveValue("Unsaved new variation");
    expect(confirm).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("guards a dirty information editor before returning to the overview", async () => {
    current.mockResolvedValueOnce(baseProfile);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const list = await screen.findByRole("region", { name: "My information" });
    const firstItem = within(list).getByText("Professional summary").closest("article");
    if (!firstItem) throw new Error("Expected My information item");
    await user.click(within(firstItem).getByRole("button", { name: "Edit Professional summary" }));
    const title = screen.getByLabelText("Heading");
    await user.clear(title);
    await user.type(title, "Unsaved professional edit");

    await user.click(screen.getByRole("button", { name: "← All information" }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved information edits?");
    expect(screen.getByLabelText("Heading")).toHaveValue("Unsaved professional edit");
    expect(screen.getByRole("heading", { name: "Edit Unsaved professional edit" })).toBeInTheDocument();
    confirm.mockRestore();
  });
});
