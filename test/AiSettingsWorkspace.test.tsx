import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiSettingsWorkspace } from "../src/renderer/AiSettingsWorkspace";

const firstId = "00000000-0000-4000-8000-000000000a11";
const secondId = "00000000-0000-4000-8000-000000000a12";
const first = {
  id: firstId,
  name: "Fast local",
  endpoint: "http://localhost:11434/v1",
  model: "fast-model",
  isDefault: true,
};
const second = {
  id: secondId,
  name: "Deep local",
  endpoint: "http://localhost:11434/v1",
  model: "deep-model",
  isDefault: false,
};

const list = vi.fn();
const save = vi.fn();
const setDefault = vi.fn();
const remove = vi.fn();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: { aiConnections: { list, save, setDefault, remove } },
  });
}

describe("AI settings workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("adds several local connections, switches the explicit default, and does not fall back after deletion", async () => {
    const user = userEvent.setup();
    save
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([first, second]);
    setDefault.mockResolvedValue([
      { ...first, isDefault: false },
      { ...second, isDefault: true },
    ]);
    remove.mockResolvedValue([{ ...first, isDefault: false }]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AiSettingsWorkspace />);
    expect(await screen.findByText("No local AI connections are configured yet.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Connection name"), "Fast local");
    await user.type(screen.getByLabelText("Model"), "fast-model");
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    expect(save).toHaveBeenCalledWith({
      name: "Fast local",
      endpoint: "http://localhost:11434/v1",
      model: "fast-model",
    });
    expect(await screen.findByText("Default connection")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add another" }));
    await user.type(screen.getByLabelText("Connection name"), "Deep local");
    await user.type(screen.getByLabelText("Model"), "deep-model");
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    expect(save).toHaveBeenLastCalledWith({
      name: "Deep local",
      endpoint: "http://localhost:11434/v1",
      model: "deep-model",
    });

    await user.click(screen.getByRole("button", { name: "Use Deep local by default" }));
    expect(setDefault).toHaveBeenCalledWith(secondId);

    await user.click(screen.getByRole("button", { name: "Remove Deep local" }));
    expect(remove).toHaveBeenCalledWith(secondId);
    expect(
      await screen.findByText(/No default AI connection is selected/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/API key/i)).not.toBeInTheDocument();
  });

  it("edits an existing named connection by stable ID", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([first]);
    save.mockResolvedValue([{ ...first, model: "fast-model-2" }]);

    render(<AiSettingsWorkspace />);
    await screen.findByRole("button", { name: "Edit Fast local" });
    await user.click(screen.getByRole("button", { name: "Edit Fast local" }));
    const model = screen.getByLabelText("Model");
    await user.clear(model);
    await user.type(model, "fast-model-2");
    await user.click(screen.getByRole("button", { name: "Save connection" }));

    expect(save).toHaveBeenCalledWith({
      id: firstId,
      name: "Fast local",
      endpoint: "http://localhost:11434/v1",
      model: "fast-model-2",
    });
  });
});
