import { z } from "zod";

export const todoChannels = Object.freeze({
  list: "aaaat:todo-list",
  create: "aaaat:todo-create",
  update: "aaaat:todo-update",
  toggle: "aaaat:todo-toggle",
  remove: "aaaat:todo-remove",
} as const);

export const todoInputSchema = z
  .object({
    body: z.string().trim().min(1).max(5000),
    candidatureId: z.string().uuid().nullable(),
  })
  .strict();
export type TodoInput = z.infer<typeof todoInputSchema>;

export const todoUpdateSchema = todoInputSchema
  .extend({ id: z.string().uuid() })
  .strict();
export type TodoUpdate = z.infer<typeof todoUpdateSchema>;

export const todoToggleSchema = z
  .object({ id: z.string().uuid(), done: z.boolean() })
  .strict();
export type TodoToggle = z.infer<typeof todoToggleSchema>;

export const todoRecordSchema = z
  .object({
    id: z.string().uuid(),
    body: z.string().min(1).max(5000),
    done: z.boolean(),
    candidatureId: z.string().uuid().nullable(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
  })
  .strict();
export type TodoRecord = z.infer<typeof todoRecordSchema>;
export const todoListSchema = z.array(todoRecordSchema);

export interface TodoDesktopApi {
  readonly todos: {
    readonly list: () => Promise<TodoRecord[]>;
    readonly create: (input: TodoInput) => Promise<TodoRecord>;
    readonly update: (input: TodoUpdate) => Promise<TodoRecord>;
    readonly toggle: (input: TodoToggle) => Promise<TodoRecord>;
    readonly remove: (todoId: string) => Promise<TodoRecord[]>;
  };
}
