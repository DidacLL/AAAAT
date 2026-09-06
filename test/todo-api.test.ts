// @vitest-environment node

import { describe, expect, it, vi } from "vitest";

import { createTodoDesktopApi } from "../src/preload/todo-api";
import { todoChannels } from "../src/shared/todo-contracts";

const record = {
  id: "00000000-0000-4000-8000-000000000401",
  body: "Send portfolio",
  done: false,
  candidatureId: null,
  createdAt: "2026-09-06T10:00:00.000Z",
  updatedAt: "2026-09-06T10:00:00.000Z",
};

describe("ToDo preload API", () => {
  it("uses only named ToDo channels with validated inputs", async () => {
    const invoke = vi.fn(async (channel: string) => (channel === todoChannels.list ? [record] : record));
    const api = createTodoDesktopApi(invoke);

    await expect(api.todos.list()).resolves.toEqual([record]);
    await api.todos.create({ body: "Send portfolio", candidatureId: null });
    await api.todos.update({ id: record.id, body: record.body, candidatureId: null });
    await api.todos.toggle({ id: record.id, done: true });
    await api.todos.remove(record.id);

    expect(invoke.mock.calls.map(([channel]) => channel)).toEqual([
      todoChannels.list,
      todoChannels.create,
      todoChannels.update,
      todoChannels.toggle,
      todoChannels.remove,
    ]);
  });

  it("rejects invalid input before invoking IPC", async () => {
    const invoke = vi.fn();
    const api = createTodoDesktopApi(invoke);

    await expect(api.todos.create({ body: "   ", candidatureId: null })).rejects.toThrow();
    expect(invoke).not.toHaveBeenCalled();
  });
});
