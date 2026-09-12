import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileWorkspace } from "../src/renderer/ProfileWorkspace";
import type { DesktopApi, ProfileSnapshot } from "../src/shared/contracts";

const firstItem = {
  id: "00000000-0000-4000-8000-000000000901",
  kind: "summary" as const,
  title: "Professional summary",
  description: "Reusable summary",
  sortOrder: 0,
};
const secondItem = {
  id: "00000000-0000-4000-8000-000000000902",
  kind: "skill" as const,
  title: "TypeScript",
  sortOrder: 1,
};
const profile: ProfileSnapshot = { items: [firstItem, secondItem], variants: [] };
const afterRemoval: ProfileSnapshot = { items: [secondItem], variants: [] };

const current = vi.fn<DesktopApi["profile"]["current"]>();
const removeItem = vi.fn<DesktopApi["profile"]["removeItem"]>();

function installApi() {
  const api = {
    profile: {
      current,
      addItem: vi.fn(),
      updateItem: vi.fn(),
      removeItem,
      createVariant: vi.fn(),
      updateVariant: vi.fn(),
      removeVariant: vi.fn(),
      configureVariantItem: vi.fn(),
      reorderVariant: vi.fn(),
      resolveVariant: vi.fn(),
    },
  } as unknown as DesktopApi;
  Object.defineProperty(window, "aaaat", { configurable: true, value: api });
}

function firstItemArticle(): HTMLElement {
  const article = screen.getByText(firstItem.title).closest("article");
  if (!article) throw new Error("Expected professional information item");
  return article;
}

describe("professional information removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    current.mockResolvedValue(profile);
    removeItem.mockResolvedValue(afterRemoval);
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps reusable information when removal is declined", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    await screen.findByText(firstItem.title);
    await user.click(within(firstItemArticle()).getByRole("button", { name: "Remove" }));

    expect(confirm).toHaveBeenCalledWith(
      `Remove “${firstItem.title}” from reusable professional information? Saved variations and documents that use it may change.`,
    );
    expect(removeItem).not.toHaveBeenCalled();
    expect(screen.getByText(firstItem.title)).toBeInTheDocument();
    expect(screen.getByText(secondItem.title)).toBeInTheDocument();
  });

  it("removes only after explicit confirmation and accepts the returned snapshot", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    render(<ProfileWorkspace />);

    await screen.findByText(firstItem.title);
    await user.click(within(firstItemArticle()).getByRole("button", { name: "Remove" }));

    expect(removeItem).toHaveBeenCalledWith(firstItem.id);
    await waitFor(() => expect(screen.queryByText(firstItem.title)).not.toBeInTheDocument());
    expect(screen.getByText(secondItem.title)).toBeInTheDocument();
  });
});
