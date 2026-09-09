import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiSettingsWorkspace } from "../src/renderer/AiSettingsWorkspace";

const firstId = "00000000-0000-4000-8000-000000000a11";
const secondId = "00000000-0000-4000-8000-000000000a12";
const importedId = "00000000-0000-4000-8000-000000000a13";
const first = {
  id: firstId,
  name: "Fast local",
  endpoint: "http://localhost:11434/v1",
  model: "fast-model",
  isDefault: true,
  validatedOperations: [],
  defaultForOperations: [],
};
const second = {
  id: secondId,
  name: "Deep local",
  endpoint: "http://localhost:11434/v1",
  model: "deep-model",
  isDefault: false,
  validatedOperations: [],
  defaultForOperations: [],
};

const list = vi.fn();
const save = vi.fn();
const setDefault = vi.fn();
const remove = vi.fn();
const validateOperation = vi.fn();
const setOperationDefault = vi.fn();
const exportPortable = vi.fn();
const importPortable = vi.fn();

function installApi() {
  Object.defineProperty(window, "aaaat", {
    configurable: true,
    value: {
      aiConnections: {
        list,
        save,
        setDefault,
        remove,
        validateOperation,
        setOperationDefault,
        exportPortable,
        importPortable,
      },
    },
  });
}

describe("AI settings workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    list.mockResolvedValue([]);
    exportPortable.mockResolvedValue("cancelled");
    importPortable.mockResolvedValue({ status: "cancelled", connections: [] });
    installApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("adds several connections, switches the general default, and does not invent credentials", async () => {
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
    expect(await screen.findByText(/No AI connections are configured yet\./)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Connection name"), "Fast local");
    await user.type(screen.getByLabelText("Model"), "fast-model");
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    expect(save).toHaveBeenCalledWith({
      name: "Fast local",
      endpoint: "http://localhost:11434/v1",
      model: "fast-model",
    });
    expect(await screen.findByText("General default connection")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add another" }));
    await user.type(screen.getByLabelText("Connection name"), "Deep local");
    await user.type(screen.getByLabelText("Model"), "deep-model");
    await user.click(screen.getByRole("button", { name: "Add connection" }));

    await user.click(screen.getByRole("button", { name: "Use Deep local as the general default" }));
    expect(setDefault).toHaveBeenCalledWith(secondId);

    await user.click(screen.getByRole("button", { name: "Remove Deep local" }));
    expect(remove).toHaveBeenCalledWith(secondId);
    expect(
      await screen.findByText(/No general default AI connection is selected/),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/API key/i)).not.toBeInTheDocument();
  });

  it("validates operations explicitly and switches only validated operation defaults", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([first, second]);
    const firstValidated = {
      ...first,
      validatedOperations: ["opportunity_review"],
      defaultForOperations: ["opportunity_review"],
    };
    const secondValidated = {
      ...second,
      validatedOperations: ["opportunity_review"],
      defaultForOperations: [],
    };
    validateOperation
      .mockResolvedValueOnce([firstValidated, second])
      .mockResolvedValueOnce([firstValidated, secondValidated]);
    setOperationDefault.mockResolvedValue([
      { ...firstValidated, defaultForOperations: [] },
      { ...secondValidated, defaultForOperations: ["opportunity_review"] },
    ]);

    render(<AiSettingsWorkspace />);
    await screen.findByRole("button", { name: "Validate Fast local for Opportunity review" });

    await user.click(screen.getByRole("button", { name: "Validate Fast local for Opportunity review" }));
    expect(validateOperation).toHaveBeenCalledWith({
      connectionId: firstId,
      operation: "opportunity_review",
    });
    expect(await screen.findByText(/Opportunity review: validated · operation default/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Validate Deep local for Opportunity review" }));
    expect(validateOperation).toHaveBeenLastCalledWith({
      connectionId: secondId,
      operation: "opportunity_review",
    });
    await user.click(screen.getByRole("button", { name: "Use Deep local for Opportunity review" }));
    expect(setOperationDefault).toHaveBeenCalledWith({
      connectionId: secondId,
      operation: "opportunity_review",
    });
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

  it("exports portable setup and requires explicit confirmation before replacing imported connections", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([first]);
    exportPortable.mockResolvedValue("exported");
    const imported = {
      id: importedId,
      name: "Imported local",
      endpoint: "http://127.0.0.1:1234/v1",
      model: "imported-model",
      isDefault: true,
      validatedOperations: [],
      defaultForOperations: [],
    };
    importPortable.mockResolvedValue({ status: "imported", connections: [imported] });
    const confirm = vi.spyOn(window, "confirm");

    render(<AiSettingsWorkspace />);
    await screen.findByText("Fast local");

    await user.click(screen.getByRole("button", { name: "Export AI setup" }));
    expect(exportPortable).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Portable AI setup exported without local IDs or validation state.",
    );

    confirm.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Import AI setup" }));
    expect(importPortable).not.toHaveBeenCalled();
    expect(confirm).toHaveBeenLastCalledWith(expect.stringMatching(/replaces all current AI connections/i));

    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Import AI setup" }));
    expect(importPortable).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Imported local")).toBeInTheDocument();
    expect(screen.queryByText("Fast local")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate Imported local for Opportunity review" })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Validate operations again on this computer",
    );
  });

  it("keeps the current setup when the import file dialog is cancelled", async () => {
    const user = userEvent.setup();
    list.mockResolvedValue([first]);
    importPortable.mockResolvedValue({ status: "cancelled", connections: [first] });
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AiSettingsWorkspace />);
    await screen.findByText("Fast local");
    await user.click(screen.getByRole("button", { name: "Import AI setup" }));

    expect(importPortable).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Fast local")).toBeInTheDocument();
    expect(screen.queryByText(/Portable AI setup imported/)).not.toBeInTheDocument();
  });
});
