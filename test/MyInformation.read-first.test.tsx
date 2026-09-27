import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CareerContext, ProfileItem, ProfileItemInput, ProfileSnapshot } from "../src/shared/contracts";
import type { CareerContextAiDisclosure } from "../src/shared/career-context-ai-disclosure-contracts";
import type { ProfileVariantInput, ProfileVariantRecord, ProfileVariantUpdate } from "../src/shared/profile-variant-contracts";
import { CareerContextAiDisclosureControl } from "../src/renderer/CareerContextAiDisclosureControl";
import { CareerContextPanel } from "../src/renderer/CareerContextPanel";
import { ProfileItemAiDisclosureControl } from "../src/renderer/ProfileItemAiDisclosureControl";
import { ProfileWorkspace } from "../src/renderer/ProfileWorkspace";

const itemId = "00000000-0000-4000-8000-000000000a01";
const secondItemId = "00000000-0000-4000-8000-000000000a02";
const variantId = "00000000-0000-4000-8000-000000000a03";
const createdItemId = "00000000-0000-4000-8000-000000000a04";
const createdVariantId = "00000000-0000-4000-8000-000000000a05";
const now = "2026-09-27T19:30:00.000Z";

const primaryItem: ProfileItem = {
  id: itemId,
  sortOrder: 0,
  kind: "unanticipated-research-practice",
  title: "Principal Researcher",
  subtitle: "Open systems group",
  description: "Built a reusable evaluation practice.",
  startDate: "2022",
};

const secondItem: ProfileItem = {
  id: secondItemId,
  sortOrder: 1,
  kind: "community-craft",
  title: "Accessibility maintainer",
  description: "Maintains an accessibility toolkit.",
  url: "https://example.com/a11y",
};

const savedVariant: ProfileVariantRecord = {
  id: variantId,
  itemId,
  name: "Leadership",
  content: {
    title: "Research Platform Lead",
    subtitle: "Open systems group · leadership",
    description: "Led the evaluation practice across teams.",
    startDate: "2021",
    endDate: "2026",
    url: "https://example.com/leadership",
  },
  createdAt: now,
  updatedAt: now,
};

const initialCareerContext: CareerContext = {
  careerDirection: "",
  objectives: "",
  constraints: "",
  targetRoles: "Platform engineering leadership",
  targetMarketsLocations: "Barcelona or remote EU",
  workPreferences: "",
  applicationWritingPreferences: "",
};

const initialDisclosure: CareerContextAiDisclosure = {
  careerDirection: true,
  objectives: true,
  constraints: true,
  targetRoles: true,
  targetMarketsLocations: false,
  workPreferences: true,
  applicationWritingPreferences: true,
};

let snapshot: ProfileSnapshot;
let variants: ProfileVariantRecord[];
let careerContext: CareerContext;
let careerDisclosure: CareerContextAiDisclosure;

const addItem = vi.fn();
const updateItem = vi.fn();
const removeItem = vi.fn();
const createVariant = vi.fn();
const updateVariant = vi.fn();
const removeVariant = vi.fn();
const updateProfileDisclosure = vi.fn();
const updateCareerContext = vi.fn();
const updateCareerDisclosure = vi.fn();

function installDesktopApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      profile: {
        current: vi.fn(async () => snapshot),
        addItem,
        updateItem,
        removeItem,
      },
      profileVariants: {
        list: vi.fn(async () => variants),
        create: createVariant,
        update: updateVariant,
        remove: removeVariant,
      },
      profileAiContext: {
        current: vi.fn(async (requestedItemId: string) => ({ itemId: requestedItemId, aiUseAllowed: true })),
        update: updateProfileDisclosure,
      },
      careerContext: {
        current: vi.fn(async () => careerContext),
        update: updateCareerContext,
      },
      careerContextAiDisclosure: {
        current: vi.fn(async () => careerDisclosure),
        update: updateCareerDisclosure,
      },
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  snapshot = { items: [primaryItem, secondItem] };
  variants = [savedVariant];
  careerContext = { ...initialCareerContext };
  careerDisclosure = { ...initialDisclosure };

  addItem.mockImplementation(async (input: ProfileItemInput) => {
    snapshot = {
      items: [...snapshot.items, { id: createdItemId, sortOrder: snapshot.items.length, ...input }],
    };
    return snapshot;
  });
  updateItem.mockImplementation(async ({ id, item }: { id: string; item: ProfileItemInput }) => {
    snapshot = {
      items: snapshot.items.map((candidate) => candidate.id === id ? { id, sortOrder: candidate.sortOrder, ...item } : candidate),
    };
    return snapshot;
  });
  removeItem.mockImplementation(async (requestedId: string) => {
    snapshot = { items: snapshot.items.filter((candidate) => candidate.id !== requestedId) };
    return snapshot;
  });
  createVariant.mockImplementation(async (input: ProfileVariantInput) => {
    variants = [...variants, { id: createdVariantId, ...input, createdAt: now, updatedAt: now }];
    return variants;
  });
  updateVariant.mockImplementation(async (input: ProfileVariantUpdate) => {
    variants = variants.map((candidate) => candidate.id === input.id ? { ...candidate, name: input.name, content: input.content, updatedAt: now } : candidate);
    return variants;
  });
  removeVariant.mockImplementation(async (requestedId: string) => {
    variants = variants.filter((candidate) => candidate.id !== requestedId);
    return variants;
  });
  updateProfileDisclosure.mockImplementation(async (input: { itemId: string; aiUseAllowed: boolean }) => input);
  updateCareerContext.mockImplementation(async (input: CareerContext) => {
    careerContext = input;
    return careerContext;
  });
  updateCareerDisclosure.mockImplementation(async (input: CareerContextAiDisclosure) => {
    careerDisclosure = input;
    return careerDisclosure;
  });

  installDesktopApi();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("My information read-first interaction", () => {
  it("shows one readable professional record before exposing item forms", async () => {
    render(<ProfileWorkspace />);

    const details = await screen.findByRole("region", { name: "Principal Researcher details" });
    expect(within(details).getByText("Open systems group")).toBeInTheDocument();
    expect(within(details).getByText("Built a reusable evaluation practice.")).toBeInTheDocument();
    expect(within(details).getByText("2022")).toBeInTheDocument();
    expect(within(details).queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "unanticipated-research-practice group" })).toBeInTheDocument();

    const variations = screen.getByLabelText("Saved variations") as HTMLDetailsElement;
    expect(variations.open).toBe(false);
    expect(within(variations).getByText("Leadership")).toBeInTheDocument();
    expect(within(variations).getByText("Research Platform Lead")).toBeInTheDocument();

    const aiUse = within(details).getByRole("button", { name: "AI may use this information" });
    await waitFor(() => expect(aiUse).toBeEnabled());
    expect(aiUse).toHaveAttribute("aria-pressed", "true");
  });

  it("edits only the selected item, keeps arbitrary groups, and adds or clears optional details without losing other content", async () => {
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const details = await screen.findByRole("region", { name: "Principal Researcher details" });
    await user.click(within(details).getByRole("button", { name: "Edit" }));
    const editor = screen.getByLabelText("Edit Principal Researcher");

    expect(within(editor).getByRole("textbox", { name: "Group" })).toHaveValue("unanticipated-research-practice");
    expect(within(editor).getByRole("textbox", { name: "Title" })).toHaveValue("Principal Researcher");
    expect(within(editor).getByRole("textbox", { name: "Subtitle" })).toHaveValue("Open systems group");
    expect(within(editor).getByRole("textbox", { name: "Description" })).toHaveValue("Built a reusable evaluation practice.");
    expect(within(editor).getByRole("textbox", { name: "Start date" })).toHaveValue("2022");
    expect(within(editor).queryByRole("textbox", { name: "End date" })).not.toBeInTheDocument();
    expect(within(editor).queryByRole("textbox", { name: "Link" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Edit Accessibility maintainer")).not.toBeInTheDocument();

    await user.selectOptions(within(editor).getByRole("combobox", { name: "Add information detail" }), "url");
    const link = within(editor).getByRole("textbox", { name: "Link" });
    await user.type(link, "https://example.com/research");
    await user.clear(within(editor).getByRole("textbox", { name: "Subtitle" }));
    await user.click(within(editor).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateItem).toHaveBeenCalledOnce());
    expect(updateItem).toHaveBeenCalledWith({
      id: itemId,
      item: {
        kind: "unanticipated-research-practice",
        title: "Principal Researcher",
        description: "Built a reusable evaluation practice.",
        startDate: "2022",
        url: "https://example.com/research",
      },
    });
    expect(screen.getByText("Built a reusable evaluation practice.")).toBeInTheDocument();
    expect(screen.getByText("Accessibility maintainer")).toBeInTheDocument();
  });

  it("keeps saved variations secondary while exposing every retained variation content property through existing API shapes", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProfileWorkspace />);
    await screen.findByRole("region", { name: "Principal Researcher details" });

    const variationsRegion = screen.getByLabelText("Saved variations");
    await user.click(within(variationsRegion).getByText("Saved variations"));
    await user.click(within(variationsRegion).getByRole("button", { name: "Edit variation" }));

    const editor = screen.getByLabelText("Edit Leadership variation");
    expect(within(editor).getByRole("textbox", { name: "Title" })).toHaveValue("Research Platform Lead");
    expect(within(editor).getByRole("textbox", { name: "Subtitle" })).toHaveValue("Open systems group · leadership");
    expect(within(editor).getByRole("textbox", { name: "Description" })).toHaveValue("Led the evaluation practice across teams.");
    expect(within(editor).getByRole("textbox", { name: "Start date" })).toHaveValue("2021");
    expect(within(editor).getByRole("textbox", { name: "End date" })).toHaveValue("2026");
    expect(within(editor).getByRole("textbox", { name: "Link" })).toHaveValue("https://example.com/leadership");

    const endDate = within(editor).getByRole("textbox", { name: "End date" });
    await user.clear(endDate);
    await user.type(endDate, "2027");
    await user.click(within(editor).getByRole("button", { name: "Save variation" }));

    await waitFor(() => expect(updateVariant).toHaveBeenCalledOnce());
    expect(updateVariant).toHaveBeenCalledWith({
      id: variantId,
      name: "Leadership",
      content: {
        title: "Research Platform Lead",
        subtitle: "Open systems group · leadership",
        description: "Led the evaluation practice across teams.",
        startDate: "2021",
        endDate: "2027",
        url: "https://example.com/leadership",
      },
    });

    await user.click(within(editor).getByRole("button", { name: "Remove variation" }));
    await waitFor(() => expect(removeVariant).toHaveBeenCalledWith(variantId));
  });

  it("creates information and variations with the existing contracts and preserves deliberate removal failures", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<ProfileWorkspace />);
    await screen.findByRole("region", { name: "Principal Researcher details" });

    await user.click(screen.getByRole("button", { name: "＋ Add information" }));
    const newEditor = screen.getByLabelText("Edit new information");
    await user.clear(within(newEditor).getByRole("textbox", { name: "Group" }));
    await user.type(within(newEditor).getByRole("textbox", { name: "Group" }), "bespoke-practice");
    await user.type(within(newEditor).getByRole("textbox", { name: "Title" }), "Portfolio architecture");
    await user.click(within(newEditor).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(addItem).toHaveBeenCalledWith({ kind: "bespoke-practice", title: "Portfolio architecture" }));

    await user.click(screen.getByRole("button", { name: /Principal Researcher/ }));
    const baseDetails = await screen.findByRole("region", { name: "Principal Researcher details" });
    const variationsRegion = within(baseDetails).getByLabelText("Saved variations");
    await user.click(within(variationsRegion).getByText("Saved variations"));
    await user.click(within(variationsRegion).getByRole("button", { name: "New variation" }));
    const variationEditor = screen.getByLabelText("Edit new variation");
    await user.type(within(variationEditor).getByRole("textbox", { name: "Variation name" }), "Consulting");
    await user.click(within(variationEditor).getByRole("button", { name: "Save variation" }));
    await waitFor(() => expect(createVariant).toHaveBeenCalledOnce());
    expect(createVariant.mock.calls[0]?.[0]).toMatchObject({
      itemId,
      name: "Consulting",
      content: {
        title: "Principal Researcher",
        subtitle: "Open systems group",
        description: "Built a reusable evaluation practice.",
        startDate: "2022",
      },
    });

    removeItem.mockRejectedValueOnce(new Error("This information is still referenced by a reusable CV template."));
    await user.click(screen.getByRole("button", { name: /Principal Researcher/ }));
    await user.click(within(await screen.findByRole("region", { name: "Principal Researcher details" })).getByRole("button", { name: "Remove" }));
    expect(confirm).toHaveBeenCalled();
    expect(await screen.findByRole("alert")).toHaveTextContent("still referenced by a reusable CV template");
  });

  it("protects dirty item and variation work before switching or closing scopes", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ProfileWorkspace />);
    const details = await screen.findByRole("region", { name: "Principal Researcher details" });

    await user.click(within(details).getByRole("button", { name: "Edit" }));
    const title = within(screen.getByLabelText("Edit Principal Researcher")).getByRole("textbox", { name: "Title" });
    await user.clear(title);
    await user.type(title, "Unsaved title");
    await user.click(screen.getByRole("button", { name: "Accessibility maintainer" }));
    expect(confirm).toHaveBeenCalled();
    expect(screen.getByLabelText("Edit Principal Researcher")).toBeInTheDocument();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "Accessibility maintainer" }));
    expect(await screen.findByRole("region", { name: "Accessibility maintainer details" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Principal Researcher/ }));
    const baseDetails = await screen.findByRole("region", { name: "Principal Researcher details" });
    const variationsRegion = within(baseDetails).getByLabelText("Saved variations");
    await user.click(within(variationsRegion).getByText("Saved variations"));
    await user.click(within(variationsRegion).getByRole("button", { name: "Edit variation" }));
    const variantTitle = within(screen.getByLabelText("Edit Leadership variation")).getByRole("textbox", { name: "Title" });
    await user.clear(variantTitle);
    await user.type(variantTitle, "Unsaved variant");

    confirm.mockReturnValue(false);
    await user.click(within(screen.getByLabelText("Edit Leadership variation")).getByRole("button", { name: "Close" }));
    expect(screen.getByLabelText("Edit Leadership variation")).toBeInTheDocument();
    confirm.mockReturnValue(true);
    await user.click(within(screen.getByLabelText("Edit Leadership variation")).getByRole("button", { name: "Close" }));
    expect(screen.queryByLabelText("Edit Leadership variation")).not.toBeInTheDocument();
  });

  it("keeps career preferences sparse and edits one field at a time without clearing unrelated values", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    render(<CareerContextPanel onDirtyChange={onDirtyChange} />);

    const panel = await screen.findByRole("region", { name: "Career preferences" });
    expect(within(panel).getByRole("article", { name: "Target roles preference" })).toHaveTextContent("Platform engineering leadership");
    expect(within(panel).getByRole("article", { name: "Target markets / locations preference" })).toHaveTextContent("Barcelona or remote EU");
    expect(within(panel).queryByRole("textbox")).not.toBeInTheDocument();

    await user.selectOptions(within(panel).getByRole("combobox", { name: "Add career preference" }), "objectives");
    const editor = within(panel).getByRole("form", { name: "Edit Objectives" });
    expect(within(editor).getAllByRole("textbox")).toHaveLength(1);
    expect(within(editor).getByRole("textbox", { name: "Objectives" })).toBeInTheDocument();
    expect(within(editor).queryByRole("textbox", { name: "Career direction" })).not.toBeInTheDocument();

    await user.type(within(editor).getByRole("textbox", { name: "Objectives" }), "Own a product-facing platform area");
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    await user.click(within(editor).getByRole("button", { name: "Save preference" }));

    await waitFor(() => expect(updateCareerContext).toHaveBeenCalledOnce());
    expect(updateCareerContext).toHaveBeenCalledWith({
      ...initialCareerContext,
      objectives: "Own a product-facing platform area",
    });
    expect(within(panel).getByText("Platform engineering leadership")).toBeInTheDocument();
    expect(within(panel).getByText("Barcelona or remote EU")).toBeInTheDocument();
  });

  it("protects dirty preference transitions and gives item/preferences the same explicit AI-use contract with rollback", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { unmount } = render(<CareerContextPanel />);
    const panel = await screen.findByRole("region", { name: "Career preferences" });

    const targetRolesReadout = within(panel).getByRole("article", { name: "Target roles preference" });
    await user.click(within(targetRolesReadout).getByRole("button", { name: "Edit" }));
    const targetRolesEditor = within(panel).getByRole("form", { name: "Edit Target roles" });
    await user.type(within(targetRolesEditor).getByRole("textbox", { name: "Target roles" }), " / staff");
    const locationsReadout = within(panel).getByRole("article", { name: "Target markets / locations preference" });
    await user.click(within(locationsReadout).getByRole("button", { name: "Edit" }));
    expect(confirm).toHaveBeenCalled();
    expect(within(panel).getByRole("form", { name: "Edit Target roles" })).toBeInTheDocument();

    const preferenceEye = within(targetRolesEditor).getByRole("button", { name: "AI may use this information" });
    await waitFor(() => expect(preferenceEye).toBeEnabled());
    updateCareerDisclosure.mockRejectedValueOnce(new Error("save failed"));
    await user.click(preferenceEye);
    expect(await within(targetRolesEditor).findByRole("alert")).toHaveTextContent("could not save the AI-use setting");
    expect(preferenceEye).toHaveAttribute("aria-pressed", "true");

    unmount();
    render(<ProfileItemAiDisclosureControl itemId={itemId} />);
    const itemEye = screen.getByRole("button", { name: "AI may use this information" });
    await waitFor(() => expect(itemEye).toBeEnabled());
    updateProfileDisclosure.mockRejectedValueOnce(new Error("save failed"));
    await user.click(itemEye);
    expect(await screen.findByRole("alert")).toHaveTextContent("could not save the AI-use setting");
    expect(itemEye).toHaveAttribute("aria-pressed", "true");

    cleanup();
    render(<CareerContextAiDisclosureControl fieldKey="targetMarketsLocations" />);
    const standalonePreferenceEye = screen.getByRole("button", { name: "AI may use this information" });
    await waitFor(() => expect(standalonePreferenceEye).toBeEnabled());
    expect(standalonePreferenceEye).toHaveAttribute("aria-pressed", "false");
  });
});
