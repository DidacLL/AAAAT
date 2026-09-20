import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProfileItemAiDisclosureControl } from "../src/renderer/ProfileItemAiDisclosureControl";

const itemId = "00000000-0000-4000-8000-000000000701";
const current = vi.fn();
const update = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  current.mockResolvedValue({ itemId, aiUseAllowed: true });
  update.mockImplementation(async (input) => input);
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { profileAiContext: { current, update } },
  });
});

afterEach(() => cleanup());

describe("professional-information AI-use eye", () => {
  it("toggles one understandable AI-use permission", async () => {
    const user = userEvent.setup();
    render(<ProfileItemAiDisclosureControl itemId={itemId} />);

    const eye = await screen.findByRole("button", { name: "AI may use this information" });
    expect(eye).toHaveAttribute("aria-pressed", "true");
    await user.click(eye);

    expect(update).toHaveBeenCalledWith({ itemId, aiUseAllowed: false });
  });

  it("reports preference failures without blocking the surrounding editor", async () => {
    current.mockRejectedValue(new Error("read failed"));
    render(<ProfileItemAiDisclosureControl itemId={itemId} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "AAAAT could not load the AI-use setting.",
    );
    expect(screen.getByRole("button", { name: "AI may use this information" })).toBeDisabled();
  });
});
