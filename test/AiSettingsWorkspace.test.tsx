import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AiSettingsWorkspace } from "../src/renderer/AiSettingsWorkspace";
import { clearAllAiTasks } from "../src/renderer/ai-task-store";
import { aiOperations, type AiOperation } from "../src/shared/ai-connection-contracts";
import { AI_EXCHANGE_DIAGNOSTIC_MARKER } from "../src/shared/ai-diagnostics";

const firstId = "00000000-0000-4000-8000-000000000a11";
const secondId = "00000000-0000-4000-8000-000000000a12";
const importedId = "00000000-0000-4000-8000-000000000a13";
const first = {
  id: firstId,
  name: "Fast local",
  endpoint: "http://localhost:11434/v1",
  model: "fast-model",
  isDefault: true,
  validatedOperations: [] as AiOperation[],
  defaultForOperations: [] as AiOperation[],
};
const second = {
  id: secondId,
  name: "Deep local",
  endpoint: "http://localhost:11434/v1",
  model: "deep-model",
  isDefault: false,
  validatedOperations: [] as AiOperation[],
  defaultForOperations: [] as AiOperation[],
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function incompatibleValidationError(operation: AiOperation): Error {
  const exchange = {
    id: "00000000-0000-4000-8000-000000000a99",
    operation,
    endpoint: "http://localhost:11434/v1",
    model: "fast-model",
    systemInstruction: "Exact validation system instruction",
    userPayload: "{\"synthetic\":\"validation context\"}",
    rawModelResponse: "{\"summary\":42}",
    validationError: "Capability validation failed: summary must be a string.",
    failureKind: "operation_incompatible",
    structuredOutputMode: "json_schema",
  };
  return new Error(
    `Error invoking remote method 'aaaat:ai-connections-validate-operation': AiProviderError: The endpoint is reachable, but this model is incompatible with this AAAAT operation.\n${AI_EXCHANGE_DIAGNOSTIC_MARKER}${btoa(JSON.stringify(exchange))}`,
  );
}

describe("AI settings workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAllAiTasks();
    list.mockResolvedValue([]);
    exportPortable.mockResolvedValue("cancelled");
    importPortable.mockResolvedValue({ status: "cancelled", connections: [] });
    installApi();
  });

  afterEach(() => {
    cleanup();
    clearAllAiTasks();
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
    expect(screen.getByRole("button", { name: "Validate AI capabilities" })).toBeInTheDocument();

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

  it("acknowledges validation immediately and updates all capability state when a slow task completes", async () => {
    const user = userEvent.setup();
    const firstValidation = deferred<typeof first[]>();
    const firstOperation = aiOperations[0];
    if (!firstOperation) throw new Error("Expected at least one AI operation");
    list.mockResolvedValue([first]);
    let validated: AiOperation[] = [];
    validateOperation.mockImplementation(async ({ operation }: { operation: AiOperation }) => {
      if (validated.length === 0) {
        const result = await firstValidation.promise;
        validated = [operation];
        return result;
      }
      validated = [...validated, operation];
      return [{
        ...first,
        validatedOperations: [...validated],
        defaultForOperations: [...validated],
      }];
    });

    render(<AiSettingsWorkspace />);
    await user.click(await screen.findByRole("button", { name: "Validate AI capabilities" }));

    expect(
      await screen.findByText(/Queued|Validating Opportunity review/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validation running…" })).toBeDisabled();

    firstValidation.resolve([{
      ...first,
      validatedOperations: [firstOperation],
      defaultForOperations: [firstOperation],
    }]);

    expect(await screen.findByText(/Validation completed/)).toBeInTheDocument();
    expect(screen.getByText(`${aiOperations.length}/${aiOperations.length} ready`)).toBeInTheDocument();
    expect(validateOperation).toHaveBeenCalledTimes(aiOperations.length);
    expect(screen.getByText("AI ready.", { exact: false })).toBeInTheDocument();
  });

  it("keeps the connection connected when one operation is incompatible and preserves the exchange for retry", async () => {
    const user = userEvent.setup();
    const incompatibleOperation = aiOperations[0];
    if (!incompatibleOperation) throw new Error("Expected at least one AI operation");
    list.mockResolvedValue([first]);
    let validated: AiOperation[] = [];
    validateOperation.mockImplementation(async ({ operation }: { operation: AiOperation }) => {
      if (operation === incompatibleOperation) throw incompatibleValidationError(operation);
      validated = [...validated, operation];
      return [{
        ...first,
        validatedOperations: [...validated],
        defaultForOperations: [...validated],
      }];
    });

    render(<AiSettingsWorkspace />);
    await user.click(await screen.findByRole("button", { name: "Validate AI capabilities" }));

    expect(await screen.findByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Incompatible · failed validation")).toBeInTheDocument();
    expect(screen.getByText(`${aiOperations.length - 1}/${aiOperations.length} ready`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry failed validation" })).toBeEnabled();
    expect(screen.getByText("Inspect AI exchange")).toBeInTheDocument();
    expect(screen.getByText("{\"summary\":42}")).toBeInTheDocument();
    expect(screen.getByText(/summary must be a string/)).toBeInTheDocument();
    expect(validateOperation).toHaveBeenCalledTimes(aiOperations.length);
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
      validatedOperations: [] as AiOperation[],
      defaultForOperations: [] as AiOperation[],
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

    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Import AI setup" }));
    expect(importPortable).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Imported local")).toBeInTheDocument();
    expect(screen.queryByText("Fast local")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Validate AI capabilities" })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Validate AI capabilities on this computer",
    );
  });
});
