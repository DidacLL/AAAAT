import {
  todoChannels,
  todoInputSchema,
  todoListSchema,
  todoRecordSchema,
  todoToggleSchema,
  todoUpdateSchema,
  type TodoDesktopApi,
} from "../shared/todo-contracts";

type Invoke = (channel: string, ...args: readonly unknown[]) => Promise<unknown>;

export function createTodoDesktopApi(invoke: Invoke): TodoDesktopApi {
  const todos = Object.freeze({
    list: async () => todoListSchema.parse(await invoke(todoChannels.list)),
    create: async (input: Parameters<TodoDesktopApi["todos"]["create"]>[0]) =>
      todoRecordSchema.parse(await invoke(todoChannels.create, todoInputSchema.parse(input))),
    update: async (input: Parameters<TodoDesktopApi["todos"]["update"]>[0]) =>
      todoRecordSchema.parse(await invoke(todoChannels.update, todoUpdateSchema.parse(input))),
    toggle: async (input: Parameters<TodoDesktopApi["todos"]["toggle"]>[0]) =>
      todoRecordSchema.parse(await invoke(todoChannels.toggle, todoToggleSchema.parse(input))),
    remove: async (todoId: string) =>
      todoListSchema.parse(
        await invoke(todoChannels.remove, todoRecordSchema.shape.id.parse(todoId)),
      ),
  });

  return Object.freeze({ todos });
}
