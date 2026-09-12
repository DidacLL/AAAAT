import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileItemAiDisclosureControl } from "../src/renderer/ProfileItemAiDisclosureControl";

const itemId = "00000000-0000-4000-8000-000000000701";
const current = vi.fn();
const update = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  current.mockResolvedValue({ itemId, aiContextMode: "expose" });
  update.mockImplementation(async (input) => input);
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { profileAiContext: { current, update } },
  });
});

afterEach(() => cleanup());

describe("professional-information AI disclosure control", () => {
  it("keeps AI disclosure independent from local storage and document reuse", async () => {
    const user = userEvent.setup();
    render(<ProfileItemAiDisclosureControl itemId={itemId} />);

    await user.click(screen.getByText("AI disclosure", { selector: "summary" }));
    expect(await screen.findByLabelText("When AI uses this professional information")).toHaveValue(
      "expose",
    );
    expect(screen.getByText(/does not hide or delete local information/i)).toBeInTheDocument();
    expect(screen.getByText(/does not change CV or letter inclusion/i)).toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("When AI uses this professional information"),
      "omit",
    );
    await user.click(screen.getByRole("button", { name: "Save AI disclosure" }));

    expect(update).toHaveBeenCalledWith({ itemId, aiContextMode: "omit" });
  });

  it("reports preference failures without blocking the surrounding editor", async () => {
    current.mockRejectedValue(new Error("read failed"));
    const user = userEvent.setup();
    render(<ProfileItemAiDisclosureControl itemId={itemId} />);

    await user.click(screen.getByText("AI disclosure", { selector: "summary" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AAAAT could not load this AI disclosure preference.",
    );
    expect(screen.getByText("AI disclosure", { selector: "summary" })).toBeVisible();
  });
});
