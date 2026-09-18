import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProfileWorkspace } from "../src/renderer/ProfileWorkspace";
import type { ProfileItem, ProfileItemInput, ProfileSnapshot } from "../src/shared/contracts";

vi.mock("../src/renderer/ProfileItemAiDisclosureControl", () => ({
  ProfileItemAiDisclosureControl: () => (
    <button type="button" aria-label="AI may use this information">◉</button>
  ),
}));

const item: ProfileItem = {
  id: "00000000-0000-4000-8000-000000000d01",
  sortOrder: 0,
  kind: "experience",
  title: "Platform Engineer",
  subtitle: "Infrastructure",
  description: "Built and operated production systems.",
  startDate: "2023",
  endDate: "2026",
  url: "https://example.invalid/work",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("My information workspace", () => {
  it("treats edits to a new variation as dirty even before it has a name", async () => {
    const snapshot: ProfileSnapshot = { items: [item] };
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        profile: {
          current: vi.fn(async () => snapshot),
          addItem: vi.fn(async () => snapshot),
          updateItem: vi.fn(async () => snapshot),
          removeItem: vi.fn(async () => snapshot),
        },
        profileVariants: {
          list: vi.fn(async () => []),
          create: vi.fn(async () => []),
          update: vi.fn(async () => []),
          remove: vi.fn(async () => []),
        },
      },
    });
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const variations = await screen.findByRole("region", { name: "Saved variations" });
    await user.click(within(variations).getByRole("button", { name: "New variation" }));
    const description = within(variations).getByRole("textbox", { name: "Description" });
    await user.clear(description);
    await user.type(description, "Unsaved alternate wording.");

    await user.click(screen.getByRole("button", { name: /Add information/ }));
    expect(confirm).toHaveBeenCalledWith("Discard unsaved My information edits?");
    expect(within(variations).getByDisplayValue("Unsaved alternate wording.")).toBeVisible();
  });

  it("opens retained information as readable content and edits only on demand", async () => {
    let snapshot: ProfileSnapshot = { items: [item] };
    const updateItem = vi.fn(async ({ id, item: input }: { id: string; item: ProfileItemInput }) => {
      snapshot = {
        items: snapshot.items.map((current) =>
          current.id === id ? { ...current, ...input } : current,
        ),
      };
      return snapshot;
    });

    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        profile: {
          current: vi.fn(async () => snapshot),
          addItem: vi.fn(async () => snapshot),
          updateItem,
          removeItem: vi.fn(async () => snapshot),
        },
        profileVariants: {
          list: vi.fn(async () => []),
          create: vi.fn(async () => []),
          update: vi.fn(async () => []),
          remove: vi.fn(async () => []),
        },
      },
    });

    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    const description = await screen.findByText("Built and operated production systems.");
    expect(description).toBeVisible();
    const readout = description.closest<HTMLElement>(".professional-information-item");
    expect(readout).not.toBeNull();
    expect(within(readout!).getByText("Infrastructure")).toBeVisible();
    expect(within(readout!).getByText("2023 – 2026")).toBeVisible();
    expect(screen.queryByRole("textbox", { name: "Title" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Platform Engineer");
    const descriptionInput = screen.getByRole("textbox", { name: "Description" });
    await user.clear(descriptionInput);
    await user.type(descriptionInput, "Built reliable production systems.");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(updateItem).toHaveBeenCalled());
    expect(screen.queryByRole("textbox", { name: "Title" })).not.toBeInTheDocument();
    expect(screen.getByText("Built reliable production systems.")).toBeVisible();
  });
});
