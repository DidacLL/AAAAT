import { cleanup, render, screen, waitFor } from "@testing-library/react";
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
const allShared = {
  careerDirection: true,
  objectives: true,
  constraints: true,
  targetRoles: true,
  targetMarketsLocations: true,
  workPreferences: true,
  applicationWritingPreferences: true,
};

const current = vi.fn();
const update = vi.fn();
const currentDisclosure = vi.fn();
const updateDisclosure = vi.fn();

describe("CareerContextPanel", () => {
  beforeEach(() => {
    current.mockReset();
    update.mockReset();
    currentDisclosure.mockReset();
    updateDisclosure.mockReset();
    current.mockResolvedValue(emptyContext);
    update.mockImplementation(async (value) => value);
    currentDisclosure.mockResolvedValue(allShared);
    updateDisclosure.mockImplementation(async (value) => value);
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: {
        careerContext: { current, update },
        careerContextAiDisclosure: {
          current: currentDisclosure,
          update: updateDisclosure,
        },
      },
    });
  });

  afterEach(() => cleanup());

  it("keeps missing context compact until the user chooses to edit", async () => {
    const user = userEvent.setup();
    render(<CareerContextPanel />);

    expect(
      await screen.findByRole("heading", { name: "Career preferences" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Add only preferences or constraints/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /^Career direction/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add career preferences" }));
    expect(screen.getByRole("textbox", { name: /^Career direction/ })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Constraints/ })).toBeInTheDocument();
  });

  it("saves fictional current context and returns to a non-empty summary", async () => {
    const user = userEvent.setup();
    render(<CareerContextPanel />);
    await screen.findByRole("button", { name: "Add career preferences" });

    await user.click(screen.getByRole("button", { name: "Add career preferences" }));
    await user.type(
      screen.getByRole("textbox", { name: /^Career direction/ }),
      "Move toward staff-level platform work",
    );
    await user.type(screen.getByRole("textbox", { name: /^Constraints/ }), "No relocation");
    await user.type(
      screen.getByRole("textbox", { name: /^Target markets \/ locations/ }),
      "Spain / EU remote or hybrid",
    );
    await user.click(screen.getByRole("button", { name: "Save career preferences" }));

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

  it("keeps external disclosure secondary and independent from local Career preference text", async () => {
    current.mockResolvedValueOnce({
      ...emptyContext,
      constraints: "Private local constraint",
      targetRoles: "Staff engineer",
    });
    const onDirtyChange = vi.fn();
    const user = userEvent.setup();
    render(<CareerContextPanel onDirtyChange={onDirtyChange} />);

    expect(await screen.findByText("Private local constraint")).toBeInTheDocument();
    const disclosureSummary = screen.getByText("External AI disclosure");
    const disclosureDetails = disclosureSummary.closest("details");
    expect(disclosureDetails).not.toBeNull();
    expect(disclosureDetails).not.toHaveAttribute("open");

    await user.click(disclosureSummary);
    expect(disclosureDetails).toHaveAttribute("open");
    const constraints = await screen.findByRole("checkbox", { name: "Share Constraints" });
    expect(constraints).toBeChecked();
    await user.click(constraints);

    expect(screen.getByText("Private local constraint")).toBeInTheDocument();
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(true));
    expect(update).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save external AI disclosure" }));
    expect(updateDisclosure).toHaveBeenCalledWith({ ...allShared, constraints: false });
    await waitFor(() => expect(onDirtyChange).toHaveBeenLastCalledWith(false));
    expect(screen.getByText("Private local constraint")).toBeInTheDocument();
  });
});
