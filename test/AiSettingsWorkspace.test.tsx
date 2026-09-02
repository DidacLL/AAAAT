import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiSettingsWorkspace } from "../src/renderer/AiSettingsWorkspace";

const connection = vi.fn();
const saveConnection = vi.fn();

describe("AI settings workspace", () => {
  beforeEach(() => {
    connection.mockReset();
    saveConnection.mockReset();
    connection.mockResolvedValue(null);
    saveConnection.mockResolvedValue({
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "fixture-model",
      classification: "local",
      hasCredential: false,
      secureStorageAvailable: true,
    });
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { ai: { connection, saveConnection } },
    });
  });

  afterEach(() => cleanup());

  it("configures one typed provider connection without reading a stored secret back", async () => {
    const user = userEvent.setup();
    render(<AiSettingsWorkspace />);

    expect(await screen.findByText("No AI connection is configured yet.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Connection name"), "Local model");
    await user.type(screen.getByLabelText("Provider base URL"), "http://localhost:11434/v1");
    await user.type(screen.getByLabelText("Model"), "fixture-model");
    await user.click(screen.getByRole("button", { name: "Save connection" }));

    expect(saveConnection).toHaveBeenCalledWith({
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "fixture-model",
      classification: "local",
    });
    expect(await screen.findByText(/Credential: not stored/)).toBeInTheDocument();
  });
});
