import { describe, expect, it, vi } from "vitest";

import { createAiConnectionDesktopApi } from "../src/preload/ai-connection-api";
import { aiConnectionManagementChannels } from "../src/shared/ai-connection-contracts";

const firstId = "00000000-0000-4000-8000-000000000a01";
const secondId = "00000000-0000-4000-8000-000000000a02";
const connections = [
  {
    id: firstId,
    name: "Fast local",
    endpoint: "http://localhost:11434/v1",
    model: "fast-model",
    isDefault: true,
    validatedOperations: ["fit_assessment"],
    defaultForOperations: ["fit_assessment"],
  },
  {
    id: secondId,
    name: "Deep local",
    endpoint: "http://127.0.0.1:1234/v1",
    model: "deep-model",
    isDefault: false,
    validatedOperations: [],
    defaultForOperations: [],
  },
];

describe("AI connection management preload API", () => {
  it("forwards only validated named connection, routing and portable setup intents", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === aiConnectionManagementChannels.exportPortable) return "exported";
      if (channel === aiConnectionManagementChannels.importPortable) {
        return { status: "imported", connections };
      }
      return connections;
    });
    const api = createAiConnectionDesktopApi(invoke);

    await expect(api.aiConnections.list()).resolves.toEqual(connections);
    await expect(
      api.aiConnections.save({
        name: "Third local",
        endpoint: "http://localhost:5555/v1",
        model: "third-model",
      }),
    ).resolves.toEqual(connections);
    await expect(api.aiConnections.setDefault(secondId)).resolves.toEqual(connections);
    await expect(api.aiConnections.remove(firstId)).resolves.toEqual(connections);
    await expect(
      api.aiConnections.validateOperation({
        connectionId: secondId,
        operation: "cv_tailoring",
      }),
    ).resolves.toEqual(connections);
    await expect(
      api.aiConnections.setOperationDefault({
        connectionId: firstId,
        operation: "fit_assessment",
      }),
    ).resolves.toEqual(connections);
    await expect(api.aiConnections.exportPortable()).resolves.toBe("exported");
    await expect(api.aiConnections.importPortable()).resolves.toEqual({
      status: "imported",
      connections,
    });

    expect(invoke).toHaveBeenCalledWith(aiConnectionManagementChannels.list);
    expect(invoke).toHaveBeenCalledWith(aiConnectionManagementChannels.save, {
      name: "Third local",
      endpoint: "http://localhost:5555/v1",
      model: "third-model",
    });
    expect(invoke).toHaveBeenCalledWith(aiConnectionManagementChannels.setDefault, secondId);
    expect(invoke).toHaveBeenCalledWith(aiConnectionManagementChannels.remove, firstId);
    expect(invoke).toHaveBeenCalledWith(aiConnectionManagementChannels.validateOperation, {
      connectionId: secondId,
      operation: "cv_tailoring",
    });
    expect(invoke).toHaveBeenCalledWith(aiConnectionManagementChannels.setOperationDefault, {
      connectionId: firstId,
      operation: "fit_assessment",
    });
    expect(invoke).toHaveBeenCalledWith(aiConnectionManagementChannels.exportPortable);
    expect(invoke).toHaveBeenCalledWith(aiConnectionManagementChannels.importPortable);
  });

  it("rejects malformed renderer input and malformed privileged output", async () => {
    const invalidOutput = [{ ...connections[0], id: "not-a-uuid" }];
    const invoke = vi.fn(async () => invalidOutput);
    const api = createAiConnectionDesktopApi(invoke);

    await expect(api.aiConnections.setDefault("not-a-uuid")).rejects.toThrow();
    await expect(
      api.aiConnections.validateOperation({ connectionId: firstId, operation: "not-real" as never }),
    ).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
    await expect(api.aiConnections.list()).rejects.toThrow();
  });

  it("rejects malformed portable setup results from the privileged process", async () => {
    const invoke = vi.fn(async (channel: string) =>
      channel === aiConnectionManagementChannels.exportPortable
        ? "not-a-result"
        : { status: "imported", connections: [{ ...connections[0], id: "not-a-uuid" }] },
    );
    const api = createAiConnectionDesktopApi(invoke);

    await expect(api.aiConnections.exportPortable()).rejects.toThrow();
    await expect(api.aiConnections.importPortable()).rejects.toThrow();
  });
});
