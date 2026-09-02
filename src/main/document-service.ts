import { createHash, randomUUID } from "node:crypto";
import {
  accessSync,
  constants,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";

import {
  documentInputSchema,
  documentItemRuleInputSchema,
  documentItemRuleSchema,
  documentListSchema,
  documentRecordSchema,
  documentReorderSchema,
  documentUpdateSchema,
  profileItemContentPatchSchema,
  resolvedDocumentSchema,
  type DocumentInput,
  type DocumentItemRule,
  type DocumentItemRuleInput,
  type DocumentRecord,
  type DocumentReorder,
  type DocumentUpdate,
  type ProfileItem,
  type ProfileItemContentPatch,
  type ResolvedDocument,
} from "../shared/contracts";
import aaatStyle from "./latex/aaaat.sty?raw";
import coverLetterTemplate from "./latex/cover-letter.tex?raw";
import cvTemplate from "./latex/cv.tex?raw";
import { LatexRunnerError, runLatexmk } from "./latex-runner";
import { resolveProfileVariant } from "./profile-service";
import { withWorkspaceDatabase } from "./workspace";

interface DocumentRow {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly variantId: string;
  readonly language: string | null;
  readonly engine: string;
  readonly recipient: string | null;
  readonly subject: string | null;
  readonly bodyJson: string;
  readonly closing: string | null;
  readonly mode: string;
  readonly sourceHash: string | null;
}

interface RuleRow {
  readonly documentId: string;
  readonly itemId: string;
  readonly excluded: number;
  readonly contentPatchJson: string | null;
  readonly orderRank: number | null;
}

class DocumentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentServiceError";
  }
}

const activeRenders = new Set<string>();

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

function optional(value: string | null): string | undefined {
  return value === null ? undefined : value;
}

function nullable(value: string | undefined): string | null {
  return value === undefined ? null : value;
}

function pathsForProject(projectPath: string) {
  return {
    projectPath,
    sourcePath: path.join(projectPath, "main.tex"),
    contentPath: path.join(projectPath, "content.tex"),
    stylePath: path.join(projectPath, "aaaat.sty"),
    artifactPath: path.join(projectPath, "build", "main.pdf"),
  };
}

function projectPaths(rootPath: string, documentId: string) {
  return pathsForProject(path.join(rootPath, "documents", documentId));
}

function assertProjectIdle(rootPath: string, documentId: string): void {
  if (activeRenders.has(projectPaths(rootPath, documentId).projectPath)) {
    throw new DocumentServiceError("This document is currently rendering.");
  }
}

function parseBody(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      !Array.isArray(parsed) ||
      !parsed.every((item) => typeof item === "string")
    ) {
      throw new Error("invalid body");
    }
    return parsed;
  } catch {
    throw new DocumentServiceError("Stored document content is invalid.");
  }
}

function parsePatch(value: string | null): ProfileItemContentPatch | null {
  if (value === null) {
    return null;
  }
  try {
    return profileItemContentPatchSchema.parse(JSON.parse(value));
  } catch {
    throw new DocumentServiceError("Stored document item rules are invalid.");
  }
}

function readRuleRows(
  database: DatabaseSync,
  documentId?: string,
): RuleRow[] {
  const sql = `SELECT document_id AS documentId, item_id AS itemId,
                      excluded, content_patch_json AS contentPatchJson,
                      order_rank AS orderRank
                 FROM document_item_rules`;
  return (documentId
    ? database
        .prepare(sql + " WHERE document_id = ? ORDER BY item_id")
        .all(documentId)
    : database
        .prepare(sql + " ORDER BY document_id, item_id")
        .all()) as unknown as RuleRow[];
}

function toRule(row: RuleRow): DocumentItemRule {
  return documentItemRuleSchema.parse({
    itemId: row.itemId,
    excluded: row.excluded === 1,
    contentPatch: parsePatch(row.contentPatchJson),
    orderRank: row.orderRank,
  });
}

function selectDocumentRows(database: DatabaseSync): DocumentRow[] {
  return database
    .prepare(
      `SELECT id, kind, title, variant_id AS variantId, language, engine,
              recipient, subject, body_json AS bodyJson, closing, mode,
              source_hash AS sourceHash
         FROM documents
        ORDER BY created_at, id`,
    )
    .all() as unknown as DocumentRow[];
}

function requireDocumentRow(
  database: DatabaseSync,
  documentId: string,
): DocumentRow {
  const row = database
    .prepare(
      `SELECT id, kind, title, variant_id AS variantId, language, engine,
              recipient, subject, body_json AS bodyJson, closing, mode,
              source_hash AS sourceHash
         FROM documents WHERE id = ?`,
    )
    .get(documentId) as unknown as DocumentRow | undefined;
  if (!row) {
    throw new DocumentServiceError("The document no longer exists.");
  }
  return row;
}

function toDocument(
  rootPath: string,
  row: DocumentRow,
  rules: readonly RuleRow[],
): DocumentRecord {
  const paths = projectPaths(rootPath, row.id);
  return documentRecordSchema.parse({
    id: row.id,
    kind: row.kind,
    title: row.title,
    variantId: row.variantId,
    language: optional(row.language),
    engine: row.engine,
    recipient: optional(row.recipient),
    subject: optional(row.subject),
    bodyParagraphs: parseBody(row.bodyJson),
    closing: optional(row.closing),
    mode: row.mode,
    rules: rules.filter((rule) => rule.documentId === row.id).map(toRule),
    projectPath: paths.projectPath,
    sourcePath: paths.sourcePath,
    artifactPath: paths.artifactPath,
  });
}

function readDocument(
  database: DatabaseSync,
  rootPath: string,
  documentId: string,
): DocumentRecord {
  return toDocument(
    rootPath,
    requireDocumentRow(database, documentId),
    readRuleRows(database, documentId),
  );
}

function recordActivity(
  database: DatabaseSync,
  documentId: string,
  action: string,
): void {
  database
    .prepare(
      "INSERT INTO document_activity(occurred_at, document_id, action) VALUES (?, ?, ?)",
    )
    .run(new Date().toISOString(), documentId, action);
}

function applyPatch(
  item: ProfileItem,
  patch: ProfileItemContentPatch | null,
): ProfileItem {
  return patch ? { ...item, ...patch } : item;
}

function normalizedPatch(
  base: ProfileItem,
  patch: ProfileItemContentPatch | null | undefined,
): ProfileItemContentPatch | null {
  if (!patch) {
    return null;
  }
  const parsed = profileItemContentPatchSchema.parse(patch);
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value !== base[key as keyof ProfileItem]) {
      kept[key] = value;
    }
  }
  return Object.keys(kept).length === 0
    ? null
    : profileItemContentPatchSchema.parse(kept);
}

function defaultCoverParagraphs(items: readonly ProfileItem[]): string[] {
  return items
    .filter(
      (item) =>
        item.kind === "summary" ||
        item.kind === "experience" ||
        item.kind === "project",
    )
    .map(
      (item) =>
        item.description?.trim() ||
        `${item.title}${item.subtitle ? ` — ${item.subtitle}` : ""}`,
    )
    .filter((value) => value.length > 0)
    .slice(0, 4);
}

export function listDocuments(rootPath: string): DocumentRecord[] {
  return withWorkspaceDatabase(rootPath, (database) => {
    const rows = selectDocumentRows(database);
    const rules = readRuleRows(database);
    return documentListSchema.parse(
      rows.map((row) => toDocument(rootPath, row, rules)),
    );
  });
}

export function getDocument(
  rootPath: string,
  documentId: string,
): DocumentRecord {
  return withWorkspaceDatabase(rootPath, (database) =>
    readDocument(database, rootPath, documentId),
  );
}

export function createDocument(
  rootPath: string,
  rawInput: DocumentInput,
): DocumentRecord {
  const input = documentInputSchema.parse(rawInput);
  resolveProfileVariant(rootPath, input.variantId);
  const id = randomUUID();
  const now = new Date().toISOString();

  withWorkspaceDatabase(rootPath, (database) => {
    transact(database, () => {
      database
        .prepare(
          `INSERT INTO documents(
             id, kind, title, variant_id, language, engine, recipient, subject,
             body_json, closing, mode, source_hash, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'managed', NULL, ?, ?)`,
        )
        .run(
          id,
          input.kind,
          input.title,
          input.variantId,
          nullable(input.language),
          input.engine,
          nullable(input.recipient),
          nullable(input.subject),
          JSON.stringify(input.bodyParagraphs),
          nullable(input.closing),
          now,
          now,
        );
      recordActivity(database, id, "document.create");
    });
  });

  try {
    return regenerateDocument(rootPath, id);
  } catch (error) {
    withWorkspaceDatabase(rootPath, (database) => {
      database.prepare("DELETE FROM documents WHERE id = ?").run(id);
    });
    rmSync(projectPaths(rootPath, id).projectPath, {
      recursive: true,
      force: true,
    });
    throw error;
  }
}

export function updateDocument(
  rootPath: string,
  rawUpdate: DocumentUpdate,
): DocumentRecord {
  const update = documentUpdateSchema.parse(rawUpdate);
  return withWorkspaceDatabase(rootPath, (database) => {
    requireDocumentRow(database, update.id);
    transact(database, () => {
      database
        .prepare(
          `UPDATE documents
              SET title = ?, language = ?, engine = ?, recipient = ?, subject = ?,
                  body_json = ?, closing = ?, updated_at = ?
            WHERE id = ?`,
        )
        .run(
          update.title,
          nullable(update.language),
          update.engine,
          nullable(update.recipient),
          nullable(update.subject),
          JSON.stringify(update.bodyParagraphs),
          nullable(update.closing),
          new Date().toISOString(),
          update.id,
        );
      recordActivity(database, update.id, "document.update");
    });
    return readDocument(database, rootPath, update.id);
  });
}

export function removeDocument(
  rootPath: string,
  documentId: string,
): DocumentRecord[] {
  assertProjectIdle(rootPath, documentId);
  const paths = projectPaths(rootPath, documentId);
  const stagedPath = path.join(
    path.dirname(paths.projectPath),
    `.aaaat-delete-${documentId}-${randomUUID()}`,
  );
  let staged = false;

  if (existsSync(paths.projectPath)) {
    renameSync(paths.projectPath, stagedPath);
    staged = true;
  }

  try {
    withWorkspaceDatabase(rootPath, (database) => {
      requireDocumentRow(database, documentId);
      transact(database, () => {
        recordActivity(database, documentId, "document.remove");
        database.prepare("DELETE FROM documents WHERE id = ?").run(documentId);
      });
    });
  } catch (error) {
    if (staged && existsSync(stagedPath)) {
      renameSync(stagedPath, paths.projectPath);
    }
    throw error;
  }

  if (staged) {
    try {
      rmSync(stagedPath, { recursive: true, force: true });
    } catch (error) {
      console.warn("AAAAT preserved staged source after document removal cleanup failed.", error);
    }
  }
  return listDocuments(rootPath);
}

export function configureDocumentItem(
  rootPath: string,
  rawRule: DocumentItemRuleInput,
): DocumentRecord {
  const rule = documentItemRuleInputSchema.parse(rawRule);
  const document = getDocument(rootPath, rule.documentId);
  const resolved = resolveProfileVariant(rootPath, document.variantId);
  const base = resolved.items.find((item) => item.id === rule.itemId);
  if (!base) {
    throw new DocumentServiceError(
      "The selected variant does not contain that profile item.",
    );
  }
  const patch = normalizedPatch(base, rule.contentPatch);

  return withWorkspaceDatabase(rootPath, (database) => {
    const existing = readRuleRows(database, rule.documentId).find(
      (item) => item.itemId === rule.itemId,
    );
    const orderRank = existing?.orderRank ?? null;
    transact(database, () => {
      if (rule.included && patch === null && orderRank === null) {
        database
          .prepare(
            "DELETE FROM document_item_rules WHERE document_id = ? AND item_id = ?",
          )
          .run(rule.documentId, rule.itemId);
      } else {
        database
          .prepare(
            `INSERT INTO document_item_rules(document_id, item_id, excluded, content_patch_json, order_rank)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(document_id, item_id) DO UPDATE SET
               excluded = excluded.excluded,
               content_patch_json = excluded.content_patch_json,
               order_rank = excluded.order_rank`,
          )
          .run(
            rule.documentId,
            rule.itemId,
            rule.included ? 0 : 1,
            patch ? JSON.stringify(patch) : null,
            orderRank,
          );
      }
      recordActivity(database, rule.documentId, "document.item.configure");
    });
    return readDocument(database, rootPath, rule.documentId);
  });
}

export function reorderDocument(
  rootPath: string,
  rawReorder: DocumentReorder,
): DocumentRecord {
  const reorder = documentReorderSchema.parse(rawReorder);
  const document = getDocument(rootPath, reorder.documentId);
  const baseIds = resolveProfileVariant(rootPath, document.variantId).items.map(
    (item) => item.id,
  );
  if (
    reorder.itemIds.length !== baseIds.length ||
    new Set(reorder.itemIds).size !== baseIds.length ||
    baseIds.some((id) => !reorder.itemIds.includes(id))
  ) {
    throw new DocumentServiceError(
      "Document ordering must contain every selected profile item exactly once.",
    );
  }

  return withWorkspaceDatabase(rootPath, (database) => {
    const existing = new Map(
      readRuleRows(database, reorder.documentId).map((rule) => [
        rule.itemId,
        rule,
      ]),
    );
    transact(database, () => {
      reorder.itemIds.forEach((itemId, rank) => {
        const row = existing.get(itemId);
        const baseRank = baseIds.indexOf(itemId);
        const orderRank = rank === baseRank ? null : rank;
        const excluded = row?.excluded ?? 0;
        const contentPatchJson = row?.contentPatchJson ?? null;
        if (
          excluded === 0 &&
          contentPatchJson === null &&
          orderRank === null
        ) {
          database
            .prepare(
              "DELETE FROM document_item_rules WHERE document_id = ? AND item_id = ?",
            )
            .run(reorder.documentId, itemId);
        } else {
          database
            .prepare(
              `INSERT INTO document_item_rules(document_id, item_id, excluded, content_patch_json, order_rank)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(document_id, item_id) DO UPDATE SET order_rank = excluded.order_rank`,
            )
            .run(
              reorder.documentId,
              itemId,
              excluded,
              contentPatchJson,
              orderRank,
            );
        }
      });
      recordActivity(database, reorder.documentId, "document.reorder");
    });
    return readDocument(database, rootPath, reorder.documentId);
  });
}

export function resolveDocument(
  rootPath: string,
  documentId: string,
): ResolvedDocument {
  const document = getDocument(rootPath, documentId);
  const base = resolveProfileVariant(rootPath, document.variantId).items;
  const rules = new Map(document.rules.map((rule) => [rule.itemId, rule]));
  const baseRank = new Map(base.map((item, index) => [item.id, index]));
  const items = base
    .filter((item) => !rules.get(item.id)?.excluded)
    .map((item) =>
      applyPatch(item, rules.get(item.id)?.contentPatch ?? null),
    )
    .sort((left, right) => {
      const leftRank =
        rules.get(left.id)?.orderRank ?? baseRank.get(left.id) ?? 0;
      const rightRank =
        rules.get(right.id)?.orderRank ?? baseRank.get(right.id) ?? 0;
      return leftRank - rightRank;
    });
  return resolvedDocumentSchema.parse({ document, items });
}

const latexEscapes: Readonly<Record<string, string>> = Object.freeze({
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  "$": "\\$",
  "&": "\\&",
  "#": "\\#",
  "%": "\\%",
  "_": "\\_",
  "^": "\\textasciicircum{}",
  "~": "\\textasciitilde{}",
});

function escapeLatex(value: string): string {
  return value
    .replace(/[\\{}$&#%_^~]/g, (character) => latexEscapes[character] ?? character)
    .replace(/\r?\n/g, " \\\\ ");
}

function cvContent(resolved: ResolvedDocument): string {
  const lines = [
    `\\AAAATDocumentTitle{${escapeLatex(resolved.document.title)}}`,
  ];
  if (resolved.document.language) {
    lines.push(
      `\\AAAATMeta{Language: ${escapeLatex(resolved.document.language)}}`,
    );
  }
  for (const item of resolved.items) {
    const details = [
      item.subtitle,
      item.startDate && item.endDate
        ? `${item.startDate} -- ${item.endDate}`
        : (item.startDate ?? item.endDate),
    ]
      .filter((value): value is string => Boolean(value))
      .join(" | ");
    lines.push(
      `\\AAAATEntry{${escapeLatex(item.kind)}}{${escapeLatex(item.title)}}{${escapeLatex(details)}}{${escapeLatex(item.description ?? "")}}`,
    );
  }
  return lines.join("\n") + "\n";
}

function coverLetterContent(resolved: ResolvedDocument): string {
  const document = resolved.document;
  const lines = [`\\AAAATDocumentTitle{${escapeLatex(document.title)}}`];
  if (document.recipient) {
    lines.push(`\\AAAATMeta{To: ${escapeLatex(document.recipient)}}`);
  }
  if (document.subject) {
    lines.push(`\\AAAATMeta{Subject: ${escapeLatex(document.subject)}}`);
  }
  const paragraphs =
    document.bodyParagraphs.length > 0
      ? document.bodyParagraphs
      : defaultCoverParagraphs(resolved.items);
  for (const paragraph of paragraphs) {
    lines.push(`\\AAAATParagraph{${escapeLatex(paragraph)}}`);
  }
  if (document.closing) {
    lines.push(`\\AAAATParagraph{${escapeLatex(document.closing)}}`);
  }
  return lines.join("\n") + "\n";
}

function sourceHash(paths: ReturnType<typeof projectPaths>): string | null {
  const files = [paths.sourcePath, paths.contentPath, paths.stylePath];
  if (files.some((file) => !existsSync(file))) {
    return null;
  }
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(path.basename(file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

function writeManagedProject(rootPath: string, documentId: string): string {
  const resolved = resolveDocument(rootPath, documentId);
  const paths = projectPaths(rootPath, documentId);
  const stagePaths = pathsForProject(`${paths.projectPath}.stage-${randomUUID()}`);
  const backupPaths = pathsForProject(`${paths.projectPath}.backup-${randomUUID()}`);
  const replacements = [
    [stagePaths.sourcePath, paths.sourcePath, backupPaths.sourcePath],
    [stagePaths.contentPath, paths.contentPath, backupPaths.contentPath],
    [stagePaths.stylePath, paths.stylePath, backupPaths.stylePath],
  ] as const;
  const installed: string[] = [];
  const backedUp: Array<readonly [string, string]> = [];
  let hash: string | null = null;

  try {
    mkdirSync(stagePaths.projectPath, { recursive: true });
    writeFileSync(
      stagePaths.sourcePath,
      resolved.document.kind === "cv" ? cvTemplate : coverLetterTemplate,
      "utf8",
    );
    writeFileSync(
      stagePaths.contentPath,
      resolved.document.kind === "cv"
        ? cvContent(resolved)
        : coverLetterContent(resolved),
      "utf8",
    );
    writeFileSync(stagePaths.stylePath, aaatStyle, "utf8");
    hash = sourceHash(stagePaths);
    if (!hash) {
      throw new Error("staged source incomplete");
    }

    mkdirSync(paths.projectPath, { recursive: true });
    mkdirSync(backupPaths.projectPath, { recursive: true });
    for (const [stagedFile, targetFile, backupFile] of replacements) {
      if (existsSync(targetFile)) {
        renameSync(targetFile, backupFile);
        backedUp.push([backupFile, targetFile]);
      }
      renameSync(stagedFile, targetFile);
      installed.push(targetFile);
    }
  } catch {
    let recoveryFailed = false;
    for (const targetFile of [...installed].reverse()) {
      try {
        rmSync(targetFile, { force: true });
      } catch {
        recoveryFailed = true;
      }
    }
    for (const [backupFile, targetFile] of [...backedUp].reverse()) {
      if (!existsSync(backupFile)) continue;
      try {
        renameSync(backupFile, targetFile);
      } catch {
        recoveryFailed = true;
      }
    }
    try {
      rmSync(stagePaths.projectPath, { recursive: true, force: true });
      rmSync(backupPaths.projectPath, { recursive: true, force: true });
    } catch {
      recoveryFailed = true;
    }
    throw new DocumentServiceError(
      recoveryFailed
        ? "AAAAT could not replace managed source or fully restore the previous files."
        : "AAAAT could not safely replace the managed document source.",
    );
  }

  if (!hash) {
    throw new DocumentServiceError("AAAAT could not create the managed document source.");
  }
  for (const directory of [stagePaths.projectPath, backupPaths.projectPath]) {
    try {
      rmSync(directory, { recursive: true, force: true });
    } catch (error) {
      console.warn("AAAAT preserved staged managed-source files after cleanup failed.", error);
    }
  }
  return hash;
}

function setSourceState(
  rootPath: string,
  documentId: string,
  mode: "managed" | "manual",
  hash: string | null,
  action: string,
): DocumentRecord {
  return withWorkspaceDatabase(rootPath, (database) => {
    requireDocumentRow(database, documentId);
    transact(database, () => {
      database
        .prepare(
          "UPDATE documents SET mode = ?, source_hash = ?, updated_at = ? WHERE id = ?",
        )
        .run(mode, hash, new Date().toISOString(), documentId);
      recordActivity(database, documentId, action);
    });
    return readDocument(database, rootPath, documentId);
  });
}

function prepareProject(
  rootPath: string,
  documentId: string,
): DocumentRecord {
  const document = getDocument(rootPath, documentId);
  const row = withWorkspaceDatabase(rootPath, (database) =>
    requireDocumentRow(database, documentId),
  );
  const paths = projectPaths(rootPath, documentId);
  if (document.mode === "managed" && row.sourceHash) {
    const current = sourceHash(paths);
    if (current !== row.sourceHash) {
      return setSourceState(
        rootPath,
        documentId,
        "manual",
        row.sourceHash,
        "document.source.manual",
      );
    }
  }
  if (document.mode === "managed") {
    const hash = writeManagedProject(rootPath, documentId);
    return setSourceState(
      rootPath,
      documentId,
      "managed",
      hash,
      "document.source.sync",
    );
  }
  if (!existsSync(paths.sourcePath)) {
    throw new DocumentServiceError("The manual document source is missing.");
  }
  return document;
}

export function regenerateDocument(
  rootPath: string,
  documentId: string,
): DocumentRecord {
  assertProjectIdle(rootPath, documentId);
  getDocument(rootPath, documentId);
  const hash = writeManagedProject(rootPath, documentId);
  return setSourceState(
    rootPath,
    documentId,
    "managed",
    hash,
    "document.source.regenerate",
  );
}

export async function renderDocument(
  rootPath: string,
  documentId: string,
  timeoutMs = 30_000,
): Promise<DocumentRecord> {
  const paths = projectPaths(rootPath, documentId);
  if (activeRenders.has(paths.projectPath)) {
    throw new DocumentServiceError("This document is already rendering.");
  }
  activeRenders.add(paths.projectPath);

  try {
    const document = prepareProject(rootPath, documentId);
    mkdirSync(path.dirname(paths.artifactPath), { recursive: true });
    try {
      await runLatexmk(paths.projectPath, document.engine, timeoutMs);
    } catch (error) {
      if (error instanceof LatexRunnerError) {
        throw new DocumentServiceError(error.message);
      }
      throw error;
    }
    if (!existsSync(paths.artifactPath)) {
      throw new DocumentServiceError(
        `TeX rendering failed. Check that latexmk and ${document.engine} are installed and compatible.`,
      );
    }
    withWorkspaceDatabase(rootPath, (database) => {
      transact(database, () =>
        recordActivity(database, documentId, "document.render"),
      );
    });
    return getDocument(rootPath, documentId);
  } finally {
    activeRenders.delete(paths.projectPath);
  }
}

function safeProjectName(document: DocumentRecord): string {
  const slug =
    document.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "document";
  return `${slug}-${document.id.slice(0, 8)}`;
}

export function exportDocumentProject(
  rootPath: string,
  documentId: string,
  targetParent: string,
): string {
  assertProjectIdle(rootPath, documentId);
  const document = prepareProject(rootPath, documentId);
  try {
    if (!statSync(targetParent).isDirectory()) {
      throw new Error("not directory");
    }
    accessSync(targetParent, constants.R_OK | constants.W_OK);
  } catch {
    throw new DocumentServiceError(
      "The selected export folder is not writable.",
    );
  }
  const destination = path.join(targetParent, safeProjectName(document));
  if (existsSync(destination)) {
    throw new DocumentServiceError(
      "A document export with that name already exists in the selected folder.",
    );
  }
  cpSync(document.projectPath, destination, {
    recursive: true,
    errorOnExist: true,
  });
  withWorkspaceDatabase(rootPath, (database) => {
    transact(database, () =>
      recordActivity(database, documentId, "document.export"),
    );
  });
  return destination;
}