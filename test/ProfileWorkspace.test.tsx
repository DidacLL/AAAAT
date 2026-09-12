import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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

describe("professional information workspace", () => {
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
    currentAiContext.mockImplementation(async (itemId) => ({ itemId, aiContextMode: "expose" }));
    updateAiContext.mockImplementation(async (input) => input);
    installApi();
  });

  afterEach(() => cleanup());

  it("starts read-first and adds reusable information with a user-maintained category", async () => {
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    expect(await screen.findByRole("heading", { name: "Professional information" })).toBeInTheDocument();
    expect(screen.getByText(/No professional information yet/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument();
    expect(screen.queryByText("Canonical profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Focused variants")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add information" }));
    expect(screen.getByRole("heading", { name: "Add information" })).toBeInTheDocument();
    const category = screen.getByLabelText("Category");
    await user.clear(category);
    await user.type(category, "publication");
    await user.type(screen.getByLabelText("Title"), "Distributed systems paper");
    expect(screen.queryByText("AI disclosure")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add information" }));

    expect(addItem).toHaveBeenCalledWith({
      kind: "publication",
      title: "Distributed systems paper",
      subtitle: undefined,
      description: undefined,
      startDate: undefined,
      endDate: undefined,
      url: undefined,
    });
    expect(await screen.findByRole("heading", { name: "Professional information" })).toBeInTheDocument();
  });

  it("keeps AI disclosure secondary and independent from local reusable content", async () => {
    current.mockResolvedValueOnce(baseProfile);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const list = await screen.findByRole("region", { name: "Professional information" });
    const firstItem = within(list).getByText("Professional summary").closest("article");
    if (!firstItem) throw new Error("Expected professional information item");
    await user.click(within(firstItem).getByRole("button", { name: "Edit" }));

    expect(await screen.findByText("AI disclosure")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Professional summary");
    await user.click(screen.getByText("AI disclosure"));
    expect(await screen.findByText(/does not hide or delete local information/i)).toBeInTheDocument();
    await user.selectOptions(
      screen.getByLabelText("When AI uses this professional information"),
      "omit",
    );
    await user.click(screen.getByRole("button", { name: "Save AI disclosure" }));

    expect(updateAiContext).toHaveBeenCalledWith({ itemId: itemA.id, aiContextMode: "omit" });
    expect(updateItem).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Title")).toHaveValue("Professional summary");
  });

  it("protects an unsaved AI disclosure draft and clears that protection after save", async () => {
    current.mockResolvedValueOnce(baseProfile);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const list = await screen.findByRole("region", { name: "Professional information" });
    const firstItem = within(list).getByText("Professional summary").closest("article");
    if (!firstItem) throw new Error("Expected professional information item");
    await user.click(within(firstItem).getByRole("button", { name: "Edit" }));
    await user.click(await screen.findByText("AI disclosure"));
    const disclosure = screen.getByLabelText("When AI uses this professional information");
    await user.selectOptions(disclosure, "omit");

    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to professional information" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledWith("Discard unsaved information edits?");
    expect(screen.getByRole("heading", { name: "Edit information" })).toBeInTheDocument();
    expect(disclosure).toHaveValue("omit");

    await user.click(screen.getByRole("button", { name: "Save AI disclosure" }));
    expect(updateAiContext).toHaveBeenCalledWith({ itemId: itemA.id, aiContextMode: "omit" });
    await waitFor(() => expect(screen.queryByText("Unsaved changes")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Back to professional information" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("heading", { name: "Professional information" })).toBeInTheDocument();
    confirm.mockRestore();
  });

  it("keeps saved variations optional and applies differences in ordinary terms", async () => {
    current.mockResolvedValueOnce(baseProfile);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    await screen.findByText("Professional summary");
    expect(screen.getByText(/default professional information already works without one/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create saved variation" }));
    expect(screen.getByRole("heading", { name: "Saved variations" })).toBeInTheDocument();
    expect(screen.queryByText("Difference-only")).not.toBeInTheDocument();
    expect(screen.queryByText("Override title")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Name"), "Platform focus");
    await user.type(screen.getByLabelText("Intended focus"), "Platform roles");
    await user.type(screen.getByLabelText("Context tags"), "platform");
    await user.type(screen.getByLabelText("Preferred language"), "en");
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

    await user.click(screen.getByRole("button", { name: "Back to professional information" }));
    expect(confirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Add information" }));
    const category = screen.getByLabelText("Category");
    await user.clear(category);
    await user.type(category, "skill");
    await user.type(screen.getByLabelText("Title"), "TypeScript");
    await user.click(screen.getByRole("button", { name: "Add information" }));

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

    const list = await screen.findByRole("region", { name: "Professional information" });
    const firstItem = within(list).getByText("Professional summary").closest("article");
    if (!firstItem) throw new Error("Expected professional information item");
    await user.click(within(firstItem).getByRole("button", { name: "Edit" }));
    const title = screen.getByLabelText("Title");
    await user.clear(title);
    await user.type(title, "Unsaved professional edit");
    await user.click(screen.getByRole("button", { name: "Back to professional information" }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved information edits?");
    expect(screen.getByLabelText("Title")).toHaveValue("Unsaved professional edit");
    expect(screen.getByRole("heading", { name: "Edit information" })).toBeInTheDocument();
    confirm.mockRestore();
  });
});
