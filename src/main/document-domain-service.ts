import {randomUUID} from 'node:crypto';
import {accessSync, constants, cpSync, existsSync, mkdirSync, renameSync, rmSync, statSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import type {DatabaseSync} from 'node:sqlite';

import type {ProfileItem, ProfileItemContent} from '../shared/contracts';
import {
  type ApplicationPacketCreate,
  applicationPacketCreateSchema,
  type ApplicationPacketRecord,
  applicationPacketRecordSchema,
  type CoverLetterInput,
  coverLetterInputSchema,
  type CoverLetterRecord,
  coverLetterRecordSchema,
  type CoverLetterUpdate,
  coverLetterUpdateSchema,
  type CvContent,
  type CvTemplateInput,
  cvTemplateInputSchema,
  type CvTemplateItem,
  type CvTemplateRecord,
  cvTemplateRecordSchema,
  type CvTemplateSection,
  cvTemplateSectionSchema,
  type CvTemplateUpdate,
  cvTemplateUpdateSchema,
  type DocumentCollections,
  documentCollectionsSchema,
  type RenderedCvRecord,
  renderedCvRecordSchema,
  renderedCvSnapshotSchema,
  type WorkingCvCreate,
  workingCvCreateSchema,
  type WorkingCvItem,
  type WorkingCvRecord,
  workingCvRecordSchema,
  type WorkingCvSaveItem,
  workingCvSaveItemSchema,
  type WorkingCvSaveTemplate,
  workingCvSaveTemplateSchema,
  type WorkingCvSection,
  type WorkingCvUpdate,
  workingCvUpdateSchema,
} from '../shared/document-domain-contracts';

import {LatexRunnerError, runLatexmk} from './latex-runner';
import aaatStyle from './latex/aaaat.sty?raw';
import coverLetterTemplate from './latex/cover-letter.tex?raw';
import cvTemplate from './latex/cv.tex?raw';
import {getProfile, getProfileItem, updateProfileItem} from './profile-service';
import {createProfileVariant, getProfileVariant, listProfileVariants} from './profile-variant-service';
import {withWorkspaceDatabase} from './workspace';

interface TemplateRow {
  readonly id: string;
  readonly name: string;
  readonly language: string|null;
  readonly compositionJson: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
interface WorkingRow {
  readonly id: string;
  readonly title: string;
  readonly language: string|null;
  readonly sourceTemplateId: string|null;
  readonly candidatureId: string|null;
  readonly compositionJson: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
interface RenderedRow {
  readonly id: string;
  readonly workingCvId: string|null;
  readonly sourceTemplateId: string|null;
  readonly candidatureId: string|null;
  readonly title: string;
  readonly language: string|null;
  readonly snapshotJson: string;
  readonly projectRelativePath: string;
  readonly createdAt: string;
}
interface LetterRow {
  readonly id: string;
  readonly candidatureId: string|null;
  readonly title: string;
  readonly language: string|null;
  readonly recipient: string|null;
  readonly subject: string|null;
  readonly bodyJson: string;
  readonly closing: string|null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
interface PacketRow {
  readonly id: string;
  readonly candidatureId: string;
  readonly renderedCvId: string;
  readonly coverLetterId: string;
  readonly title: string;
  readonly projectRelativePath: string;
  readonly createdAt: string;
}
export class DocumentDomainServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentDomainServiceError';
  }
}
function optional(value: string|null): string|undefined {
  return value === null ? undefined : value;
}
function nullable(value: string|undefined): string|null {
  return value === undefined ? null : value;
}
function parseJson<T>(raw: string, parse: (value: unknown) => T, message: string): T {
  try {
    return parse(JSON.parse(raw));
  } catch {
    throw new DocumentDomainServiceError(message);
  }
}
function requireCandidature(database: DatabaseSync, candidatureId: string): void {
  if (!database.prepare('SELECT 1 FROM candidatures WHERE id = ?').get(candidatureId))
    throw new DocumentDomainServiceError('The application no longer exists.');
}
function toTemplate(row: TemplateRow): CvTemplateRecord {
  return cvTemplateRecordSchema.parse({
    id: row.id,
    name: row.name,
    language: optional(row.language),
    sections: parseJson(
        row.compositionJson, (value) => cvTemplateSectionSchema.array().parse(value),
        'Stored CV template composition is invalid.'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}
function readTemplates(database: DatabaseSync): CvTemplateRecord[] {
  return (database
              .prepare(
                  `SELECT id, name, language, composition_json AS compositionJson, created_at AS createdAt, updated_at AS updatedAt FROM cv_templates ORDER BY name COLLATE NOCASE, id`)
              .all() as unknown as TemplateRow[])
      .map(toTemplate);
}
function requireTemplate(database: DatabaseSync, id: string): CvTemplateRecord {
  const row =
      database.prepare(
                  `SELECT id, name, language, composition_json AS compositionJson, created_at AS createdAt, updated_at AS updatedAt FROM cv_templates WHERE id = ?`)
              .get(id) as unknown as TemplateRow |
      undefined;
  if (!row) throw new DocumentDomainServiceError('The CV template no longer exists.');
  return toTemplate(row);
}
function toWorking(row: WorkingRow): WorkingCvRecord {
  return workingCvRecordSchema.parse({
    id: row.id,
    title: row.title,
    language: optional(row.language),
    sourceTemplateId: row.sourceTemplateId,
    candidatureId: row.candidatureId,
    sections: parseJson(
        row.compositionJson, (value) => workingCvRecordSchema.shape.sections.parse(value),
        'Stored Working CV composition is invalid.'),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}
function readWorkingCvs(database: DatabaseSync): WorkingCvRecord[] {
  return (database
              .prepare(
                  `SELECT id, title, language, source_template_id AS sourceTemplateId, candidature_id AS candidatureId, composition_json AS compositionJson, created_at AS createdAt, updated_at AS updatedAt FROM working_cvs ORDER BY updated_at DESC, id DESC`)
              .all() as unknown as WorkingRow[])
      .map(toWorking);
}
function requireWorkingCv(database: DatabaseSync, id: string): WorkingCvRecord {
  const row =
      database.prepare(
                  `SELECT id, title, language, source_template_id AS sourceTemplateId, candidature_id AS candidatureId, composition_json AS compositionJson, created_at AS createdAt, updated_at AS updatedAt FROM working_cvs WHERE id = ?`)
              .get(id) as unknown as WorkingRow |
      undefined;
  if (!row) throw new DocumentDomainServiceError('The Working CV no longer exists.');
  return toWorking(row);
}
function toLetter(row: LetterRow): CoverLetterRecord {
  return coverLetterRecordSchema.parse({
    id: row.id,
    candidatureId: row.candidatureId,
    title: row.title,
    language: optional(row.language),
    recipient: optional(row.recipient),
    subject: optional(row.subject),
    bodyParagraphs: parseJson(
        row.bodyJson, (value) => coverLetterRecordSchema.shape.bodyParagraphs.parse(value),
        'Stored cover letter content is invalid.'),
    closing: optional(row.closing),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  });
}
function readLetters(database: DatabaseSync): CoverLetterRecord[] {
  return (database
              .prepare(
                  `SELECT id, candidature_id AS candidatureId, title, language, recipient, subject, body_json AS bodyJson, closing, created_at AS createdAt, updated_at AS updatedAt FROM cover_letters ORDER BY updated_at DESC, id DESC`)
              .all() as unknown as LetterRow[])
      .map(toLetter);
}
function requireLetter(database: DatabaseSync, id: string): CoverLetterRecord {
  const row =
      database.prepare(
                  `SELECT id, candidature_id AS candidatureId, title, language, recipient, subject, body_json AS bodyJson, closing, created_at AS createdAt, updated_at AS updatedAt FROM cover_letters WHERE id = ?`)
              .get(id) as unknown as LetterRow |
      undefined;
  if (!row) throw new DocumentDomainServiceError('The cover letter no longer exists.');
  return toLetter(row);
}
function managedProjectPath(
    rootPath: string, managedRoot: string, id: string, relativePath: string): string {
  const expected = path.resolve(rootPath, managedRoot, id);
  if (path.resolve(rootPath, relativePath) !== expected)
    throw new DocumentDomainServiceError('Stored generated document path is invalid.');
  return expected;
}
function renderedProjectPath(rootPath: string, row: RenderedRow): string {
  return managedProjectPath(rootPath, 'rendered-cvs', row.id, row.projectRelativePath);
}
function packetProjectPath(rootPath: string, row: PacketRow): string {
  return managedProjectPath(rootPath, 'application-packets', row.id, row.projectRelativePath);
}
function retainedPdf(projectPath: string): string {
  return path.join(projectPath, 'build', 'main.pdf');
}
function toRendered(rootPath: string, row: RenderedRow): RenderedCvRecord {
  return renderedCvRecordSchema.parse({
    id: row.id,
    workingCvId: row.workingCvId,
    sourceTemplateId: row.sourceTemplateId,
    candidatureId: row.candidatureId,
    title: row.title,
    language: optional(row.language),
    snapshot: parseJson(
        row.snapshotJson, (value) => renderedCvSnapshotSchema.parse(value),
        'Stored Rendered CV snapshot is invalid.'),
    createdAt: row.createdAt,
    hasPdf: existsSync(retainedPdf(renderedProjectPath(rootPath, row)))
  });
}
function readRenderedCvs(rootPath: string, database: DatabaseSync): RenderedCvRecord[] {
  return (database
              .prepare(
                  `SELECT id, working_cv_id AS workingCvId, source_template_id AS sourceTemplateId, candidature_id AS candidatureId, title, language, snapshot_json AS snapshotJson, project_relative_path AS projectRelativePath, created_at AS createdAt FROM rendered_cvs ORDER BY created_at DESC, id DESC`)
              .all() as unknown as RenderedRow[])
      .map((row) => toRendered(rootPath, row));
}
function requireRenderedRow(database: DatabaseSync, id: string): RenderedRow {
  const row =
      database.prepare(
                  `SELECT id, working_cv_id AS workingCvId, source_template_id AS sourceTemplateId, candidature_id AS candidatureId, title, language, snapshot_json AS snapshotJson, project_relative_path AS projectRelativePath, created_at AS createdAt FROM rendered_cvs WHERE id = ?`)
              .get(id) as unknown as RenderedRow |
      undefined;
  if (!row) throw new DocumentDomainServiceError('The Rendered CV no longer exists.');
  return row;
}
function toPacket(rootPath: string, row: PacketRow): ApplicationPacketRecord {
  return applicationPacketRecordSchema.parse({
    id: row.id,
    candidatureId: row.candidatureId,
    renderedCvId: row.renderedCvId,
    coverLetterId: row.coverLetterId,
    title: row.title,
    createdAt: row.createdAt,
    hasPdf: existsSync(retainedPdf(packetProjectPath(rootPath, row)))
  });
}
function readPackets(rootPath: string, database: DatabaseSync): ApplicationPacketRecord[] {
  return (database
              .prepare(
                  `SELECT id, candidature_id AS candidatureId, rendered_cv_id AS renderedCvId, cover_letter_id AS coverLetterId, title, project_relative_path AS projectRelativePath, created_at AS createdAt FROM application_packets ORDER BY created_at DESC, id DESC`)
              .all() as unknown as PacketRow[])
      .map((row) => toPacket(rootPath, row));
}
function requirePacketRow(database: DatabaseSync, id: string): PacketRow {
  const row =
      database.prepare(
                  `SELECT id, candidature_id AS candidatureId, rendered_cv_id AS renderedCvId, cover_letter_id AS coverLetterId, title, project_relative_path AS projectRelativePath, created_at AS createdAt FROM application_packets WHERE id = ?`)
              .get(id) as unknown as PacketRow |
      undefined;
  if (!row) throw new DocumentDomainServiceError('The Application packet no longer exists.');
  return row;
}
function contentFromProfile(item: ProfileItem, content?: ProfileItemContent): CvContent {
  const source = content ?? item;
  return {
    kind: item.kind,
    title: source.title,
    ...(source.subtitle ? {subtitle: source.subtitle} : {}),
    ...(source.description ? {description: source.description} : {}),
    ...(source.startDate ? {startDate: source.startDate} : {}),
    ...(source.endDate ? {endDate: source.endDate} : {}),
    ...(source.url ? {url: source.url} : {})
  };
}
function profileContent(content: CvContent): ProfileItemContent {
  return {
    title: content.title,
    ...(content.subtitle ? {subtitle: content.subtitle} : {}),
    ...(content.description ? {description: content.description} : {}),
    ...(content.startDate ? {startDate: content.startDate} : {}),
    ...(content.endDate ? {endDate: content.endDate} : {}),
    ...(content.url ? {url: content.url} : {})
  };
}
function validateTemplateItems(rootPath: string, sections: readonly CvTemplateSection[]): void {
  const profile = new Map(getProfile(rootPath).items.map((item) => [item.id, item]));
  const variants = new Map(listProfileVariants(rootPath).map((variant) => [variant.id, variant]));
  for (const section of sections)
    for (const item of section.items) {
      if (item.sourceMode === 'custom') continue;
      const base = profile.get(item.profileItemId);
      if (!base)
        throw new DocumentDomainServiceError(
            'A CV template references My information that no longer exists.');
      if (item.sourceMode === 'variant') {
        const variant = variants.get(item.profileVariantId);
        if (!variant || variant.itemId !== base.id)
          throw new DocumentDomainServiceError(
              'A CV template variant must belong to the selected My information item.');
      }
    }
}
function resolveTemplateItem(rootPath: string, item: CvTemplateItem): WorkingCvItem {
  if (item.sourceMode === 'custom')
    return {
      id: randomUUID(),
      templateItemId: item.id,
      sourceMode: 'custom',
      profileItemId: null,
      profileVariantId: null,
      content: item.content
    };
  const profileItem = getProfileItem(rootPath, item.profileItemId);
  if (item.sourceMode === 'current')
    return {
      id: randomUUID(),
      templateItemId: item.id,
      sourceMode: 'current',
      profileItemId: profileItem.id,
      profileVariantId: null,
      content: contentFromProfile(profileItem)
    };
  if (item.sourceMode === 'variant') {
    const variant = getProfileVariant(rootPath, item.profileVariantId);
    if (variant.itemId !== profileItem.id)
      throw new DocumentDomainServiceError(
          'The selected saved variant belongs to another My information item.');
    return {
      id: randomUUID(),
      templateItemId: item.id,
      sourceMode: 'variant',
      profileItemId: profileItem.id,
      profileVariantId: variant.id,
      content: contentFromProfile(profileItem, variant.content)
    };
  }
  return {
    id: randomUUID(),
    templateItemId: item.id,
    sourceMode: 'override',
    profileItemId: profileItem.id,
    profileVariantId: null,
    content: item.content
  };
}
const sectionNameByKind: Readonly<Record<string, string>> = Object.freeze({
  identity: 'Profile',
  contact: 'Profile',
  summary: 'Profile',
  experience: 'Experience',
  project: 'Projects / Selected work',
  education: 'Education',
  certification: 'Education',
  skill: 'Skills',
  language: 'Languages',
  link: 'Links'
});
function sectionsFromProfile(items: readonly ProfileItem[]): WorkingCvSection[] {
  const order = [
    'Profile', 'Experience', 'Projects / Selected work', 'Education', 'Skills', 'Languages',
    'Links', 'Other'
  ];
  const grouped = new Map<string, WorkingCvItem[]>();
  for (const item of items) {
    const name = sectionNameByKind[item.kind] ?? 'Other';
    const current = grouped.get(name) ?? [];
    current.push({
      id: randomUUID(),
      templateItemId: null,
      sourceMode: 'current',
      profileItemId: item.id,
      profileVariantId: null,
      content: contentFromProfile(item)
    });
    grouped.set(name, current);
  }
  return order.flatMap((name) => {
    const groupedItems = grouped.get(name);
    return groupedItems && groupedItems.length > 0 ?
        [{id: randomUUID(), name, items: groupedItems}] :
        [];
  });
}
export function listDocumentCollections(rootPath: string): DocumentCollections {
  return withWorkspaceDatabase(rootPath, (database) => documentCollectionsSchema.parse({
    templates: readTemplates(database),
    workingCvs: readWorkingCvs(database),
    renderedCvs: readRenderedCvs(rootPath, database),
    letters: readLetters(database),
    applicationPackets: readPackets(rootPath, database)
  }));
}
export function createCvTemplate(rootPath: string, rawInput: CvTemplateInput): DocumentCollections {
  const input = cvTemplateInputSchema.parse(rawInput);
  validateTemplateItems(rootPath, input.sections);
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    database
        .prepare(
            `INSERT INTO cv_templates(id, name, language, composition_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`)
        .run(id, input.name, nullable(input.language), JSON.stringify(input.sections), now, now);
    return documentCollectionsSchema.parse({
      templates: readTemplates(database),
      workingCvs: readWorkingCvs(database),
      renderedCvs: readRenderedCvs(rootPath, database),
      letters: readLetters(database),
      applicationPackets: readPackets(rootPath, database)
    });
  });
}
export function updateCvTemplate(
    rootPath: string, rawInput: CvTemplateUpdate): DocumentCollections {
  const input = cvTemplateUpdateSchema.parse(rawInput);
  validateTemplateItems(rootPath, input.sections);
  return withWorkspaceDatabase(rootPath, (database) => {
    requireTemplate(database, input.id);
    database
        .prepare(
            `UPDATE cv_templates SET name = ?, language = ?, composition_json = ?, updated_at = ? WHERE id = ?`)
        .run(
            input.name, nullable(input.language), JSON.stringify(input.sections),
            new Date().toISOString(), input.id);
    return documentCollectionsSchema.parse({
      templates: readTemplates(database),
      workingCvs: readWorkingCvs(database),
      renderedCvs: readRenderedCvs(rootPath, database),
      letters: readLetters(database),
      applicationPackets: readPackets(rootPath, database)
    });
  });
}
export function removeCvTemplate(rootPath: string, templateId: string): DocumentCollections {
  return withWorkspaceDatabase(rootPath, (database) => {
    requireTemplate(database, templateId);
    database.prepare('DELETE FROM cv_templates WHERE id = ?').run(templateId);
    return documentCollectionsSchema.parse({
      templates: readTemplates(database),
      workingCvs: readWorkingCvs(database),
      renderedCvs: readRenderedCvs(rootPath, database),
      letters: readLetters(database),
      applicationPackets: readPackets(rootPath, database)
    });
  });
}
export function createWorkingCv(rootPath: string, rawInput: WorkingCvCreate): WorkingCvRecord {
  const input = workingCvCreateSchema.parse(rawInput);
  let sourceTemplateId: string|null = null;
  let language = input.language;
  let sections: WorkingCvSection[] = [];
  if (input.source.kind === 'profile')
    sections = sectionsFromProfile(getProfile(rootPath).items);
  else if (input.source.kind === 'template') {
    const templateId = input.source.templateId;
    const template =
        withWorkspaceDatabase(rootPath, (database) => requireTemplate(database, templateId));
    validateTemplateItems(rootPath, template.sections);
    sourceTemplateId = template.id;
    language ??= template.language;
    sections = template.sections.map(
        (section) => ({
          id: randomUUID(),
          name: section.name,
          items: section.items.map((item) => resolveTemplateItem(rootPath, item))
        }));
  }
  return withWorkspaceDatabase(rootPath, (database) => {
    if (input.candidatureId) requireCandidature(database, input.candidatureId);
    const id = randomUUID();
    const now = new Date().toISOString();
    database
        .prepare(
            `INSERT INTO working_cvs(id, title, language, source_template_id, candidature_id, composition_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
            id, input.title, nullable(language), sourceTemplateId, input.candidatureId,
            JSON.stringify(sections), now, now);
    return requireWorkingCv(database, id);
  });
}
export function updateWorkingCv(rootPath: string, rawInput: WorkingCvUpdate): WorkingCvRecord {
  const input = workingCvUpdateSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    requireWorkingCv(database, input.id);
    database
        .prepare(
            `UPDATE working_cvs SET title = ?, language = ?, composition_json = ?, updated_at = ? WHERE id = ?`)
        .run(
            input.title, nullable(input.language), JSON.stringify(input.sections),
            new Date().toISOString(), input.id);
    return requireWorkingCv(database, input.id);
  });
}
export function removeWorkingCv(rootPath: string, workingCvId: string): DocumentCollections {
  return withWorkspaceDatabase(rootPath, (database) => {
    requireWorkingCv(database, workingCvId);
    database.prepare('DELETE FROM working_cvs WHERE id = ?').run(workingCvId);
    return documentCollectionsSchema.parse({
      templates: readTemplates(database),
      workingCvs: readWorkingCvs(database),
      renderedCvs: readRenderedCvs(rootPath, database),
      letters: readLetters(database),
      applicationPackets: readPackets(rootPath, database)
    });
  });
}
function findWorkingItem(working: WorkingCvRecord, itemId: string): WorkingCvItem {
  for (const section of working.sections) {
    const item = section.items.find((candidate) => candidate.id === itemId);
    if (item) return item;
  }
  throw new DocumentDomainServiceError('The Working CV item no longer exists.');
}
export function saveWorkingCvItem(rootPath: string, rawInput: WorkingCvSaveItem): WorkingCvRecord {
  const input = workingCvSaveItemSchema.parse(rawInput);
  const working =
      withWorkspaceDatabase(rootPath, (database) => requireWorkingCv(database, input.workingCvId));
  const item = findWorkingItem(working, input.itemId);
  if (input.target === 'profile') {
    if (!item.profileItemId)
      throw new DocumentDomainServiceError(
          'Custom CV content has no My information item to update.');
    const base = getProfileItem(rootPath, item.profileItemId);
    updateProfileItem(
        rootPath, {id: base.id, item: {kind: base.kind, ...profileContent(item.content)}});
  } else if (input.target === 'profile_variant') {
    if (!item.profileItemId)
      throw new DocumentDomainServiceError(
          'Custom CV content cannot become a profile variant without a My information item.');
    if (!input.variantName) throw new DocumentDomainServiceError('Name the new profile variant.');
    createProfileVariant(rootPath, {
      itemId: item.profileItemId,
      name: input.variantName,
      content: profileContent(item.content)
    });
  } else {
    if (!working.sourceTemplateId || !item.templateItemId)
      throw new DocumentDomainServiceError('This Working CV item was not derived from a template.');
    const template = withWorkspaceDatabase(
        rootPath, (database) => requireTemplate(database, working.sourceTemplateId ?? ''));
    const sections = template.sections.map(
        (section) => ({
          ...section,
          items: section.items.map(
              (candidate):
                  CvTemplateItem => {
                    if (candidate.id !== item.templateItemId) return candidate;
                    if (!item.profileItemId)
                      return {id: candidate.id, sourceMode: 'custom', content: item.content};
                    return {
                      id: candidate.id,
                      sourceMode: 'override',
                      profileItemId: item.profileItemId,
                      content: item.content
                    };
                  })
        }));
    updateCvTemplate(rootPath, {
      id: template.id,
      name: template.name,
      ...(template.language ? {language: template.language} : {}),
      sections
    });
  }
  return withWorkspaceDatabase(rootPath, (database) => requireWorkingCv(database, working.id));
}
function templateSectionsFromWorking(working: WorkingCvRecord): CvTemplateSection[] {
  return working.sections.map(
      (section) => ({
        id: randomUUID(),
        name: section.name,
        items: section.items.map(
            (item):
                CvTemplateItem => {
                  const id = randomUUID();
                  if (item.sourceMode === 'custom' || !item.profileItemId)
                    return {id, sourceMode: 'custom', content: item.content};
                  if (item.sourceMode === 'variant' && item.profileVariantId)
                    return {
                      id,
                      sourceMode: 'variant',
                      profileItemId: item.profileItemId,
                      profileVariantId: item.profileVariantId
                    };
                  if (item.sourceMode === 'current')
                    return {id, sourceMode: 'current', profileItemId: item.profileItemId};
                  return {
                    id,
                    sourceMode: 'override',
                    profileItemId: item.profileItemId,
                    content: item.content
                  };
                })
      }));
}
export function saveWorkingCvAsTemplate(
    rootPath: string, rawInput: WorkingCvSaveTemplate): CvTemplateRecord {
  const input = workingCvSaveTemplateSchema.parse(rawInput);
  const working =
      withWorkspaceDatabase(rootPath, (database) => requireWorkingCv(database, input.workingCvId));
  createCvTemplate(rootPath, {
    name: input.name,
    ...(working.language ? {language: working.language} : {}),
    sections: templateSectionsFromWorking(working)
  });
  return withWorkspaceDatabase(rootPath, (database) => {
    const created = readTemplates(database).find(
        (template) => template.name.toLocaleLowerCase() === input.name.toLocaleLowerCase());
    if (!created) throw new DocumentDomainServiceError('AAAAT could not save the new CV template.');
    return created;
  });
}
const latexEscapes: Readonly<Record<string, string>> = Object.freeze({
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '$': '\\$',
  '&': '\\&',
  '#': '\\#',
  '%': '\\%',
  '_': '\\_',
  '^': '\\textasciicircum{}',
  '~': '\\textasciitilde{}'
});
function escapeLatex(value: string): string {
  return value.replace(/[\\{}$&#%_^~]/g, (character) => latexEscapes[character] ?? character)
      .replace(/\r?\n/g, ' \\\\ ');
}
function cvData(working: WorkingCvRecord): string {
  const lines = [`\\AAAATDocumentTitle{${escapeLatex(working.title)}}`];
  if (working.language) lines.push(`\\AAAATMeta{Language: ${escapeLatex(working.language)}}`);
  for (const section of working.sections) {
    lines.push(`\\AAAATMeta{${escapeLatex(section.name)}}`);
    for (const item of section.items) {
      const details =
          [
            item.content.subtitle,
            item.content.startDate && item.content.endDate ?
                `${item.content.startDate} -- ${item.content.endDate}` :
                (item.content.startDate ?? item.content.endDate)
          ].filter((value): value is string => Boolean(value))
              .join(' | ');
      lines.push(
          `\\AAAATEntry{${escapeLatex(item.content.kind)}}{${escapeLatex(item.content.title)}}{${
              escapeLatex(details)}}{${escapeLatex(item.content.description ?? '')}}`);
    }
  }
  return `${lines.join('\n')}\n`;
}
function coverLetterData(letter: CoverLetterRecord): string {
  const lines = [`\\AAAATDocumentTitle{${escapeLatex(letter.title)}}`];
  if (letter.recipient) lines.push(`\\AAAATMeta{To: ${escapeLatex(letter.recipient)}}`);
  if (letter.subject) lines.push(`\\AAAATMeta{Subject: ${escapeLatex(letter.subject)}}`);
  for (const paragraph of letter.bodyParagraphs)
    lines.push(`\\AAAATParagraph{${escapeLatex(paragraph)}}`);
  if (letter.closing) lines.push(`\\AAAATParagraph{${escapeLatex(letter.closing)}}`);
  return `${lines.join('\n')}\n`;
}
function writeProject(projectPath: string, mainSource: string, dataSource: string): void {
  mkdirSync(projectPath, {recursive: true});
  writeFileSync(path.join(projectPath, 'main.tex'), mainSource, 'utf8');
  writeFileSync(path.join(projectPath, 'data.tex'), dataSource, 'utf8');
  writeFileSync(path.join(projectPath, 'aaaat.sty'), aaatStyle, 'utf8');
}
async function compileProject(projectPath: string, timeoutMs: number): Promise<void> {
  try {
    await runLatexmk(projectPath, timeoutMs);
  } catch (error) {
    if (error instanceof LatexRunnerError)
      throw new DocumentDomainServiceError(
          `${error.message} Check that latexmk and pdflatex are installed and compatible.`);
    throw error;
  }
  if (!existsSync(path.join(projectPath, 'build', 'main.pdf')))
    throw new DocumentDomainServiceError('TeX rendering did not produce a PDF.');
}
export async function renderWorkingCv(
    rootPath: string, workingCvId: string, timeoutMs = 30000): Promise<RenderedCvRecord> {
  const working =
      withWorkspaceDatabase(rootPath, (database) => requireWorkingCv(database, workingCvId));
  const id = randomUUID();
  const relativePath = path.join('rendered-cvs', id);
  const projectPath = path.join(rootPath, relativePath);
  const snapshot = renderedCvSnapshotSchema.parse({
    title: working.title,
    ...(working.language ? {language: working.language} : {}),
    sourceTemplateId: working.sourceTemplateId,
    candidatureId: working.candidatureId,
    sections: working.sections
  });
  try {
    writeProject(projectPath, cvTemplate, cvData(working));
    await compileProject(projectPath, timeoutMs);
    const createdAt = new Date().toISOString();
    withWorkspaceDatabase(rootPath, (database) => {
      database
          .prepare(
              `INSERT INTO rendered_cvs(id, working_cv_id, source_template_id, candidature_id, title, language, snapshot_json, project_relative_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(
              id, working.id, working.sourceTemplateId, working.candidatureId, working.title,
              nullable(working.language), JSON.stringify(snapshot), relativePath, createdAt);
    });
    return withWorkspaceDatabase(
        rootPath, (database) => toRendered(rootPath, requireRenderedRow(database, id)));
  } catch (error) {
    rmSync(projectPath, {recursive: true, force: true});
    throw error;
  }
}
export function renderedCvPdfPath(rootPath: string, renderedCvId: string): string {
  return withWorkspaceDatabase(rootPath, (database) => {
    const pdf =
        retainedPdf(renderedProjectPath(rootPath, requireRenderedRow(database, renderedCvId)));
    if (!existsSync(pdf))
      throw new DocumentDomainServiceError('The retained Rendered CV PDF is missing.');
    return pdf;
  });
}
export function duplicateRenderedCv(rootPath: string, renderedCvId: string): WorkingCvRecord {
  const row =
      withWorkspaceDatabase(rootPath, (database) => requireRenderedRow(database, renderedCvId));
  const snapshot = parseJson(
      row.snapshotJson, (value) => renderedCvSnapshotSchema.parse(value),
      'Stored Rendered CV snapshot is invalid.');
  const liveProfileItemIds = new Set(getProfile(rootPath).items.map((item) => item.id));
  return withWorkspaceDatabase(rootPath, (database) => {
    const id = randomUUID();
    const now = new Date().toISOString();
    const sections = snapshot.sections.map(
        (section) => ({
          ...section,
          id: randomUUID(),
          items: section.items.map(
              (item):
                  WorkingCvItem => {
                    const retainedProfileItemId =
                        item.profileItemId && liveProfileItemIds.has(item.profileItemId) ?
                        item.profileItemId :
                        null;
                    return {
                      ...item,
                      id: randomUUID(),
                      templateItemId: null,
                      sourceMode: retainedProfileItemId ? 'override' : 'custom',
                      profileItemId: retainedProfileItemId,
                      profileVariantId: null
                    };
                  })
        }));
    database
        .prepare(
            `INSERT INTO working_cvs(id, title, language, source_template_id, candidature_id, composition_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
            id, `${snapshot.title} copy`, nullable(snapshot.language), row.sourceTemplateId,
            row.candidatureId, JSON.stringify(sections), now, now);
    return requireWorkingCv(database, id);
  });
}
function safeProjectName(title: string, id: string): string {
  const slug =
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'cv';
  return `${slug}-${id.slice(0, 8)}`;
}
export function exportRenderedCvProject(
    rootPath: string, renderedCvId: string, targetParent: string): string {
  const row =
      withWorkspaceDatabase(rootPath, (database) => requireRenderedRow(database, renderedCvId));
  try {
    if (!statSync(targetParent).isDirectory()) throw new Error('not directory');
    accessSync(targetParent, constants.R_OK | constants.W_OK);
  } catch {
    throw new DocumentDomainServiceError('The selected export folder is not writable.');
  }
  const source = renderedProjectPath(rootPath, row);
  const destination = path.join(targetParent, safeProjectName(row.title, row.id));
  if (existsSync(destination))
    throw new DocumentDomainServiceError('A portable project with that name already exists.');
  cpSync(source, destination, {recursive: true, errorOnExist: true});
  return destination;
}
export function createCoverLetter(rootPath: string, rawInput: CoverLetterInput): CoverLetterRecord {
  const input = coverLetterInputSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    if (input.candidatureId) requireCandidature(database, input.candidatureId);
    const id = randomUUID();
    const now = new Date().toISOString();
    database
        .prepare(
            `INSERT INTO cover_letters(id, candidature_id, title, language, recipient, subject, body_json, closing, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
            id, input.candidatureId, input.title, nullable(input.language),
            nullable(input.recipient), nullable(input.subject),
            JSON.stringify(input.bodyParagraphs), nullable(input.closing), now, now);
    return requireLetter(database, id);
  });
}
export function updateCoverLetter(
    rootPath: string, rawInput: CoverLetterUpdate): CoverLetterRecord {
  const input = coverLetterUpdateSchema.parse(rawInput);
  return withWorkspaceDatabase(rootPath, (database) => {
    requireLetter(database, input.id);
    database
        .prepare(
            `UPDATE cover_letters SET title = ?, language = ?, recipient = ?, subject = ?, body_json = ?, closing = ?, updated_at = ? WHERE id = ?`)
        .run(
            input.title, nullable(input.language), nullable(input.recipient),
            nullable(input.subject), JSON.stringify(input.bodyParagraphs), nullable(input.closing),
            new Date().toISOString(), input.id);
    return requireLetter(database, input.id);
  });
}
export function removeCoverLetter(rootPath: string, letterId: string): DocumentCollections {
  return withWorkspaceDatabase(rootPath, (database) => {
    requireLetter(database, letterId);
    if (database.prepare('SELECT 1 FROM application_packets WHERE cover_letter_id = ? LIMIT 1')
            .get(letterId))
      throw new DocumentDomainServiceError(
          'This cover letter belongs to a retained Application packet and cannot be removed.');
    database.prepare('DELETE FROM cover_letters WHERE id = ?').run(letterId);
    return documentCollectionsSchema.parse({
      templates: readTemplates(database),
      workingCvs: readWorkingCvs(database),
      renderedCvs: readRenderedCvs(rootPath, database),
      letters: readLetters(database),
      applicationPackets: readPackets(rootPath, database)
    });
  });
}
const packetTemplate = String.raw`\documentclass{article}
\usepackage{graphicx}
\pagestyle{empty}
\setlength{\oddsidemargin}{-1in}
\setlength{\evensidemargin}{-1in}
\setlength{\topmargin}{-1in}
\setlength{\headheight}{0pt}
\setlength{\headsep}{0pt}
\setlength{\footskip}{0pt}
\setlength{\textwidth}{\paperwidth}
\setlength{\textheight}{\paperheight}
\setlength{\topskip}{0pt}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}
\newcount\AAAATPage
\newcount\AAAATPageCount
\newcommand{\AAAATIncludePDF}[1]{\pdfximage{#1}\AAAATPageCount=\pdflastximagepages\AAAATPage=1\AAAATIncludePDFPage{#1}}
\newcommand{\AAAATIncludePDFPage}[1]{\vbox to \textheight{\vfil\hbox to \textwidth{\hfil\includegraphics[page=\the\AAAATPage,width=\textwidth,height=\textheight,keepaspectratio]{#1}\hfil}\vfil}\ifnum\AAAATPage<\AAAATPageCount\newpage\advance\AAAATPage by 1\expandafter\AAAATIncludePDFPage\expandafter{#1}\fi}
\begin{document}
\AAAATIncludePDF{cover-letter/build/main.pdf}
\newpage
\AAAATIncludePDF{cv/build/main.pdf}
\end{document}
`;
export async function createApplicationPacket(
    rootPath: string, rawInput: ApplicationPacketCreate,
    timeoutMs = 30000): Promise<ApplicationPacketRecord> {
  const input = applicationPacketCreateSchema.parse(rawInput);
  const {cvRow, letter} = withWorkspaceDatabase(rootPath, (database) => {
    requireCandidature(database, input.candidatureId);
    const rendered = requireRenderedRow(database, input.renderedCvId);
    const currentLetter = requireLetter(database, input.coverLetterId);
    if (rendered.candidatureId !== input.candidatureId)
      throw new DocumentDomainServiceError('Choose a Rendered CV owned by this application.');
    if (currentLetter.candidatureId !== input.candidatureId)
      throw new DocumentDomainServiceError('Choose a cover letter owned by this application.');
    return {cvRow: rendered, letter: currentLetter};
  });
  const id = randomUUID();
  const relativePath = path.join('application-packets', id);
  const projectPath = path.join(rootPath, relativePath);
  const stagePath = `${projectPath}.stage-${randomUUID()}`;
  try {
    mkdirSync(stagePath, {recursive: true});
    const letterPath = path.join(stagePath, 'cover-letter');
    writeProject(letterPath, coverLetterTemplate, coverLetterData(letter));
    await compileProject(letterPath, timeoutMs);
    cpSync(
        renderedProjectPath(rootPath, cvRow), path.join(stagePath, 'cv'),
        {recursive: true, errorOnExist: true});
    writeFileSync(path.join(stagePath, 'main.tex'), packetTemplate, 'utf8');
    await compileProject(stagePath, timeoutMs);
    renameSync(stagePath, projectPath);
    const createdAt = new Date().toISOString();
    const title = input.title ?? `Application packet · ${letter.title} + ${cvRow.title}`;
    withWorkspaceDatabase(rootPath, (database) => {
      database
          .prepare(
              `INSERT INTO application_packets(id, candidature_id, rendered_cv_id, cover_letter_id, title, letter_snapshot_json, project_relative_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(
              id, input.candidatureId, input.renderedCvId, input.coverLetterId, title,
              JSON.stringify(letter), relativePath, createdAt);
    });
    return withWorkspaceDatabase(
        rootPath, (database) => toPacket(rootPath, requirePacketRow(database, id)));
  } catch (error) {
    rmSync(stagePath, {recursive: true, force: true});
    rmSync(projectPath, {recursive: true, force: true});
    throw error;
  }
}
export function applicationPacketPdfPath(rootPath: string, packetId: string): string {
  return withWorkspaceDatabase(rootPath, (database) => {
    const pdf = retainedPdf(packetProjectPath(rootPath, requirePacketRow(database, packetId)));
    if (!existsSync(pdf))
      throw new DocumentDomainServiceError('The retained Application packet PDF is missing.');
    return pdf;
  });
}
