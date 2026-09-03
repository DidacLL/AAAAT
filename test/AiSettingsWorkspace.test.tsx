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
    });
    Object.defineProperty(window, "aaaat", {
      configurable: true,
      value: { ai: { connection, saveConnection } },
    });
  });

  afterEach(() => cleanup());

  it("configures one keyless loopback provider connection", async () => {
    const user = userEvent.setup();
    render(<AiSettingsWorkspace />);

    expect(await screen.findByText("No local AI connection is configured yet.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Connection name"), "Local model");
    await user.type(screen.getByLabelText("Model"), "fixture-model");
    await user.click(screen.getByRole("button", { name: "Save local connection" }));

    expect(saveConnection).toHaveBeenCalledWith({
      name: "Local model",
      endpoint: "http://localhost:11434/v1",
      model: "fixture-model",
    });
    expect(screen.queryByLabelText(/API key/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/Local model/)).toBeInTheDocument();
  });
});
