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
const probe = vi.fn();
const setOperationDefault = vi.fn();
const exportPortable = vi.fn();
const importPortable = vi.fn();
const listPrompts = vi.fn();
const savePrompt = vi.fn();
const resetPrompt = vi.fn();

const promptDisclosure = {
  operation: "job_extraction" as const,
  label: "Job extraction",
  defaultInstruction: "Extract supported facts.",
  instruction: "Extract supported facts.",
  isDefault: true,
  contextSummary: "The supplied Source and eligible fields.",
  responseExpectation: "A small JSON extraction envelope.",
};

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
        probe,
        setOperationDefault,
        exportPortable,
        importPortable,
      },
      aiPrompts: {
        list: listPrompts,
        save: savePrompt,
        reset: resetPrompt,
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
    probe.mockResolvedValue(true);
    exportPortable.mockResolvedValue("cancelled");
    importPortable.mockResolvedValue({ status: "cancelled", connections: [] });
    listPrompts.mockResolvedValue([promptDisclosure]);
    savePrompt.mockResolvedValue([{ ...promptDisclosure, instruction: "My complete extraction instruction.", isDefault: false }]);
    resetPrompt.mockResolvedValue([promptDisclosure]);
    installApi();
  });

  afterEach(() => {
    cleanup();
    clearAllAiTasks();
    vi.restoreAllMocks();
  });

  it("keeps full AI instructions visible and editable in the main AI Settings surface", async () => {
    const user = userEvent.setup();
    render(<AiSettingsWorkspace />);

    const guidance = await screen.findByRole("region", { name: "AI instructions" });
    expect(guidance).toBeVisible();
    expect(screen.queryByText("Advanced: AI instructions and context")).not.toBeInTheDocument();
    expect(screen.getByText("Job extraction")).toBeVisible();
    const input = screen.getByRole("textbox", { name: "Instruction" });
    await user.clear(input);
    await user.type(input, "My complete extraction instruction.");
    await user.click(screen.getByRole("button", { name: "Save instruction" }));

    expect(savePrompt).toHaveBeenCalledWith({
      operation: "job_extraction",
      instruction: "My complete extraction instruction.",
    });
  });

  it("keeps an empty custom instruction resettable to the shipped default", async () => {
    const user = userEvent.setup();
    savePrompt.mockResolvedValueOnce([{
      ...promptDisclosure,
      instruction: "",
      isDefault: false,
    }]);
    render(<AiSettingsWorkspace />);

    const input = await screen.findByRole("textbox", { name: "Instruction" });
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "Save instruction" }));

    const reset = screen.getByRole("button", { name: "Reset to default" });
    expect(reset).toBeEnabled();
    await user.click(reset);
    expect(resetPrompt).toHaveBeenCalledWith("job_extraction");
  });

  it("adds several connections, switches the general default, and does not invent credentials", async () => {
    const user = userEvent.setup();
    save
      .mockResolvedValueOnce([first])
      .mockResolvedValueOnce([first, second]);
    list.mockImplementation(async () => save.mock.calls.length < 1 ? [] : save.mock.calls.length < 2 ? [first] : [first, second]);
    setDefault.mockResolvedValue([
      { ...first, isDefault: false },
      { ...second, isDefault: true },
    ]);
    remove.mockResolvedValue([{ ...first, isDefault: false }]);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AiSettingsWorkspace />);
    expect(await screen.findByText("No saved connections.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Connection name"), "Fast local");
    await user.type(screen.getByLabelText("Model"), "fast-model");
    await user.type(screen.getByLabelText("Model server address"), "http://localhost:11434/v1");
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    expect(save).toHaveBeenCalledWith({
      name: "Fast local",
      endpoint: "http://localhost:11434/v1",
      model: "fast-model",
    });
    expect(await screen.findByText("General default connection")).toBeInTheDocument();
    expect(screen.getByText(/Connection saved. AAAAT is checking/)).toBeInTheDocument();
    expect(validateOperation).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Add connection" }));
    await user.type(screen.getByLabelText("Connection name"), "Deep local");
    await user.type(screen.getByLabelText("Model"), "deep-model");
    await user.type(screen.getByLabelText("Model server address"), "http://localhost:11434/v1");
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
    await user.click(await screen.findByRole("button", { name: "Check all AI features" }));

    expect(
      await screen.findByText(/Queued|Validating Opportunity review/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Checking AI features…" })).toBeDisabled();

    firstValidation.resolve([{
      ...first,
      validatedOperations: [firstOperation],
      defaultForOperations: [firstOperation],
    }]);

    expect(await screen.findByText(/Validation completed/)).toBeInTheDocument();
    expect(screen.getByText(`${aiOperations.length}/${aiOperations.length} checked`)).toBeInTheDocument();
    expect(validateOperation).toHaveBeenCalledTimes(aiOperations.length);
    expect(screen.getByText("Compatibility checked.", { exact: false })).toBeInTheDocument();
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
    await user.click(await screen.findByRole("button", { name: "Check all AI features" }));

    expect(await screen.findByText("Connected now")).toBeInTheDocument();
    await user.click(screen.getByText(/AI feature checks/));
    expect(screen.getByText("Incompatible · failed validation")).toBeInTheDocument();
    expect(screen.getByText(`${aiOperations.length - 1}/${aiOperations.length} checked`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry failed AI feature checks" })).toBeEnabled();
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

  it("shows a wrong address inline and probes a saved address without spending capability inference", async () => {
    const user = userEvent.setup();
    save.mockResolvedValue([first]);
    list.mockResolvedValue([first]);
    probe.mockResolvedValue(false);

    render(<AiSettingsWorkspace />);
    await user.type(screen.getByLabelText("Connection name"), "Fast local");
    await user.type(screen.getByLabelText("Model"), "fast-model");
    await user.type(screen.getByLabelText("Model server address"), "localhost:11434/v1");
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Start the address with http:// or https://.");
    expect(save).not.toHaveBeenCalled();

    await user.clear(screen.getByRole("textbox", { name: /Model server address/ }));
    await user.type(screen.getByRole("textbox", { name: /Model server address/ }), first.endpoint);
    await user.click(screen.getByRole("button", { name: "Add connection" }));
    expect(save).toHaveBeenCalledOnce();
    expect(await screen.findByText(/Connection saved. AAAAT is checking reachability/)).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Connection saved, but AAAAT could not reach this AI service.",
    );
    expect(probe).toHaveBeenCalledWith(firstId);
    expect(validateOperation).not.toHaveBeenCalled();
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
    expect(screen.getByRole("button", { name: "Check all AI features" })).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Validate AI capabilities on this computer",
    );
  });
});
