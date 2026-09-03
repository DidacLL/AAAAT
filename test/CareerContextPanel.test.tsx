import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CareerContextPanel } from "../src/renderer/CareerContextPanel";

const emptyContext = {
  careerDirection: "",
  objectives: "",
  constraints: "",
  targetRoles: "",
  targetMarketsLocations: "",
  workPreferences: "",
  applicationWritingPreferences: "",
};

const current = vi.fn();
const update = vi.fn();

describe("CareerContextPanel", () => {
  beforeEach(() => {
    current.mockReset();
    update.mockReset();
    current.mockResolvedValue(emptyContext);
    update.mockImplementation(async (value) => value);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { careerContext: { current, update } },
    });
  });

  afterEach(() => cleanup());

  it("keeps missing context compact until the user chooses to edit", async () => {
    const user = userEvent.setup();
    render(<CareerContextPanel />);

    expect(
      await screen.findByRole("heading", { name: "Current career context" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Add only the current direction and constraints/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Career direction")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add career context" }));
    expect(screen.getByLabelText(/Career direction/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Constraints/)).toBeInTheDocument();
  });

  it("saves fictional current context and returns to a non-empty summary", async () => {
    const user = userEvent.setup();
    render(<CareerContextPanel />);
    await screen.findByRole("button", { name: "Add career context" });

    await user.click(screen.getByRole("button", { name: "Add career context" }));
    await user.type(
      screen.getByLabelText(/Career direction/),
      "Move toward staff-level platform work",
    );
    await user.type(screen.getByLabelText(/Constraints/), "No relocation");
    await user.type(
      screen.getByLabelText(/Target markets \/ locations/),
      "Spain / EU remote or hybrid",
    );
    await user.click(screen.getByRole("button", { name: "Save career context" }));

    expect(update).toHaveBeenCalledWith({
      ...emptyContext,
      careerDirection: "Move toward staff-level platform work",
      constraints: "No relocation",
      targetMarketsLocations: "Spain / EU remote or hybrid",
    });
    expect(await screen.findByText("Move toward staff-level platform work")).toBeInTheDocument();
    expect(screen.getByText("No relocation")).toBeInTheDocument();
    expect(screen.getByText("Spain / EU remote or hybrid")).toBeInTheDocument();
    expect(screen.queryByText("Objectives")).not.toBeInTheDocument();
  });
});
