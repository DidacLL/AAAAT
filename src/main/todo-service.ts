import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

import {
  todoInputSchema,
  todoListSchema,
  todoRecordSchema,
  todoToggleSchema,
  todoUpdateSchema,
  type TodoInput,
  type TodoRecord,
  type TodoToggle,
  type TodoUpdate,
} from "../shared/todo-contracts";
import { withWorkspaceDatabase } from "./workspace";

interface TodoRow {
  readonly id: string;
  readonly body: string;
  readonly done: number;
  readonly candidatureId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

class TodoServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TodoServiceError";
  }
}

function transact(database: DatabaseSync, action: () => void): void {
  database.exec("BEGIN IMMEDIATE");
  try {
    action();
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function toRecord(row: TodoRow): TodoRecord {
  return todoRecordSchema.parse({
    ...row,
    done: row.done === 1,
  });
}

function readTodo(database: DatabaseSync, todoId: string): TodoRecord {
  const row = database
    .prepare(
      `SELECT id, body, done, candidature_id AS candidatureId,
              created_at AS createdAt, updated_at AS updatedAt
         FROM todos
        WHERE id = ?`,
    )
    .get(todoId) as unknown as TodoRow | undefined;
  if (!row) throw new TodoServiceError("The ToDo no longer exists.");
  return toRecord(row);
}

function assertCandidatureExists(database: DatabaseSync, candidatureId: string | null): void {
  if (!candidatureId) return;
  const row = database
    .prepare("SELECT id FROM candidatures WHERE id = ?")
    .get(candidatureId) as { id: string } | undefined;
  if (!row) throw new TodoServiceError("The related candidature no longer exists.");
}

function listTodosFromDatabase(database: DatabaseSync): TodoRecord[] {
  const rows = database
    .prepare(
      `SELECT id, body, done, candidature_id AS candidatureId,
              created_at AS createdAt, updated_at AS updatedAt
         FROM todos
        ORDER BY done, updated_at DESC, id`,
    )
    .all() as unknown as TodoRow[];
  return todoListSchema.parse(rows.map(toRecord));
}

export function listTodos(rootPath: string): TodoRecord[] {
  return withWorkspaceDatabase(rootPath, listTodosFromDatabase);
}

export function createTodo(rootPath: string, input: TodoInput): TodoRecord {
  const todo = todoInputSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    transact(database, () => {
      assertCandidatureExists(database, todo.candidatureId);
      database
        .prepare(
          `INSERT INTO todos(id, body, done, candidature_id, created_at, updated_at)
           VALUES (?, ?, 0, ?, ?, ?)`,
        )
        .run(id, todo.body, todo.candidatureId, now, now);
    });
    return readTodo(database, id);
  });
}

export function updateTodo(rootPath: string, input: TodoUpdate): TodoRecord {
  const update = todoUpdateSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readTodo(database, update.id);
      assertCandidatureExists(database, update.candidatureId);
      database
        .prepare(
          `UPDATE todos
              SET body = ?, candidature_id = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(update.body, update.candidatureId, now, update.id);
    });
    return readTodo(database, update.id);
  });
}

export function toggleTodo(rootPath: string, input: TodoToggle): TodoRecord {
  const toggle = todoToggleSchema.parse(input);
  return withWorkspaceDatabase(rootPath, (database) => {
    const now = new Date().toISOString();
    transact(database, () => {
      readTodo(database, toggle.id);
      database
        .prepare("UPDATE todos SET done = ?, updated_at = ? WHERE id = ?")
        .run(toggle.done ? 1 : 0, now, toggle.id);
    });
    return readTodo(database, toggle.id);
  });
}

export function removeTodo(rootPath: string, todoId: string): TodoRecord[] {
  const id = todoRecordSchema.shape.id.parse(todoId);
  return withWorkspaceDatabase(rootPath, (database) => {
    transact(database, () => {
      readTodo(database, id);
      database.prepare("DELETE FROM todos WHERE id = ?").run(id);
    });
    return listTodosFromDatabase(database);
  });
}
