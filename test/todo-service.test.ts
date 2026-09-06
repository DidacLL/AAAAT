// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createCandidature } from "../src/main/candidature-service";
import {
  createTodo,
  listTodos,
  removeTodo,
  toggleTodo,
  updateTodo,
} from "../src/main/todo-service";
import { createOrOpenWorkspace, openWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-todo-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("ToDo application service", () => {
  it("creates and reopens a standalone ToDo", () => {
    const root = workspace();
    const created = createTodo(root, { body: "Send portfolio", candidatureId: null });

    expect(created).toMatchObject({ body: "Send portfolio", done: false, candidatureId: null });
    openWorkspace(root);
    expect(listTodos(root)).toEqual([created]);
  });

  it("supports an optional candidature relation without changing candidature validity", () => {
    const root = workspace();
    const candidature = createCandidature(root, { values: [] });
    const created = createTodo(root, {
      body: "Check application form",
      candidatureId: candidature.id,
    });

    expect(created.candidatureId).toBe(candidature.id);
    expect(listTodos(root)).toEqual([created]);
  });

  it("updates, toggles, and removes through the service", () => {
    const root = workspace();
    const created = createTodo(root, { body: "Draft note", candidatureId: null });
    const updated = updateTodo(root, {
      id: created.id,
      body: "Draft final note",
      candidatureId: null,
    });
    const done = toggleTodo(root, { id: created.id, done: true });

    expect(updated.body).toBe("Draft final note");
    expect(done).toMatchObject({ body: "Draft final note", done: true });
    expect(removeTodo(root, created.id)).toEqual([]);
    expect(listTodos(root)).toEqual([]);
  });

  it("rejects an unknown candidature before mutation", () => {
    const root = workspace();
    expect(() =>
      createTodo(root, {
        body: "Must not persist",
        candidatureId: "00000000-0000-4000-8000-000000009999",
      }),
    ).toThrow("The related candidature no longer exists.");
    expect(listTodos(root)).toEqual([]);
  });
});
