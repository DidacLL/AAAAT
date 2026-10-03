import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  CoverLetterSnapshot,
  WorkingCvRecord,
} from "../shared/document-domain-contracts";

import aaatStyle from "./latex/aaaat.sty?raw";
import applicationPacketTemplate from "./latex/application-packet.tex?raw";
import documentEntrypoint from "./latex/document.tex?raw";

export interface DocumentPdfMetadata {
  readonly title: string;
  readonly author: string;
  readonly subject: string;
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

const babelLanguageByPrimaryCode: Readonly<Record<string, string>> = Object.freeze({
  ca: "catalan",
  de: "german",
  en: "english",
  es: "spanish",
  fr: "french",
  it: "italian",
  pt: "portuguese",
});

const babelLanguageByName: Readonly<Record<string, string>> = Object.freeze({
  catalan: "catalan",
  english: "english",
  french: "french",
  german: "german",
  italian: "italian",
  portuguese: "portuguese",
  spanish: "spanish",
});

const supportedLanguageNames = Object.freeze([
  "English",
  "Catalan",
  "German",
  "Spanish",
  "French",
  "Italian",
  "Portuguese",
]);

export function encodeDocumentText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\\{}$&#%_^~]/g, (character) => latexEscapes[character] ?? character)
    .replace(/\n/g, "\\AAAATLineBreak{}");
}

function encodeMetadataText(value: string): string {
  return encodeDocumentText(value.replace(/\s+/gu, " ").trim());
}

export function resolveDocumentBabelLanguage(language: string | undefined): string {
  if (language === undefined) return "english";
  const normalizedLanguage = language.trim().toLowerCase();
  const namedLanguage = babelLanguageByName[normalizedLanguage];
  if (namedLanguage) return namedLanguage;

  const primaryCode = normalizedLanguage.match(/^([a-z]{2})(?:[-_/\s]|$)/u)?.[1];
  const babelLanguage = primaryCode ? babelLanguageByPrimaryCode[primaryCode] : undefined;
  if (babelLanguage) return babelLanguage;
  throw new Error(
    `Unsupported document language "${language}". AAAAT currently supports these Latin-script languages through Babel: ${supportedLanguageNames.join(", ")}. Use a supported language name, primary ISO code, or region variant.`,
  );
}

function pdfMetadataSource(metadata: DocumentPdfMetadata): string {
  return `\\AAAATPdfMetadata{${encodeMetadataText(metadata.title)}}{${encodeMetadataText(metadata.author)}}{${encodeMetadataText(metadata.subject)}}`;
}

function documentDataHeader(
  title: string,
  language: string | undefined,
  metadata?: DocumentPdfMetadata,
): string[] {
  return [
    ...(metadata ? [pdfMetadataSource(metadata)] : []),
    `\\AAAATDocumentLanguage{${resolveDocumentBabelLanguage(language)}}`,
    `\\AAAATDocumentTitle{${encodeDocumentText(title)}}`,
  ];
}

function cvData(working: WorkingCvRecord, metadata?: DocumentPdfMetadata): string {
  const lines = documentDataHeader(working.title, working.language, metadata);
  for (const section of working.sections) {
    lines.push(
      `\\AAAATBlock{${section.presentationRole}}{${encodeDocumentText(section.name)}}{`,
    );
    for (const item of section.items) {
      const dates =
        item.content.startDate && item.content.endDate
          ? `${item.content.startDate} – ${item.content.endDate}`
          : (item.content.startDate ?? item.content.endDate ?? "");
      lines.push(
        `\\AAAATEntry{${encodeDocumentText(item.content.title)}}{${encodeDocumentText(item.content.subtitle ?? "")}}{${encodeDocumentText(dates)}}{${encodeDocumentText(item.content.description ?? "")}}{${encodeDocumentText(item.content.url ?? "")}}`,
      );
    }
    lines.push("}");
  }
  return `${lines.join("\n")}\n`;
}

function coverLetterData(
  letter: CoverLetterSnapshot,
  metadata?: DocumentPdfMetadata,
): string {
  const lines = documentDataHeader(letter.title, letter.language, metadata);
  if (letter.recipient) {
    lines.push(`\\AAAATMetadata{To}{${encodeDocumentText(letter.recipient)}}`);
  }
  if (letter.subject) {
    lines.push(`\\AAAATMetadata{Subject}{${encodeDocumentText(letter.subject)}}`);
  }
  for (const paragraph of letter.bodyParagraphs) {
    lines.push(`\\AAAATParagraph{${encodeDocumentText(paragraph)}}`);
  }
  if (letter.closing) {
    lines.push(`\\AAAATParagraph{${encodeDocumentText(letter.closing)}}`);
  }
  return `${lines.join("\n")}\n`;
}

function writePortableDocumentProject(
  projectPath: string,
  mode: "cv" | "letter",
  dataSource: string,
  blueprintSource: string,
): void {
  mkdirSync(projectPath, { recursive: true });
  writeFileSync(
    path.join(projectPath, "main.tex"),
    documentEntrypoint.replace("__AAAAT_DOCUMENT_MODE__", mode),
    "utf8",
  );
  writeFileSync(path.join(projectPath, "blueprint.tex"), blueprintSource, "utf8");
  writeFileSync(path.join(projectPath, "data.tex"), dataSource, "utf8");
  writeFileSync(path.join(projectPath, "aaaat.sty"), aaatStyle, "utf8");
}

export function writeCvLatexProject(
  projectPath: string,
  working: WorkingCvRecord,
  blueprintSource: string,
  metadata: DocumentPdfMetadata = {
    title: working.title,
    author: "AAAAT",
    subject: "Curriculum vitae",
  },
): void {
  writePortableDocumentProject(projectPath, "cv", cvData(working, metadata), blueprintSource);
}

export function writeCoverLetterLatexProject(
  projectPath: string,
  letter: CoverLetterSnapshot,
  blueprintSource: string,
  metadata: DocumentPdfMetadata = {
    title: letter.title,
    author: "AAAAT",
    subject: letter.subject?.trim() || "Cover letter",
  },
): void {
  writePortableDocumentProject(projectPath, "letter", coverLetterData(letter, metadata), blueprintSource);
}

export function writeApplicationPacketLatexProject(
  projectPath: string,
  working: WorkingCvRecord,
  letter: CoverLetterSnapshot,
  blueprintSource: string,
  metadata: DocumentPdfMetadata = {
    title: `Application · ${working.title} + ${letter.title}`,
    author: "AAAAT",
    subject: "Application documents",
  },
): void {
  mkdirSync(projectPath, { recursive: true });
  writeFileSync(path.join(projectPath, "main.tex"), applicationPacketTemplate, "utf8");
  writeFileSync(path.join(projectPath, "blueprint.tex"), blueprintSource, "utf8");
  writeFileSync(path.join(projectPath, "letter-data.tex"), coverLetterData(letter), "utf8");
  writeFileSync(path.join(projectPath, "cv-data.tex"), cvData(working), "utf8");
  writeFileSync(
    path.join(projectPath, "packet-metadata.tex"),
    `${pdfMetadataSource(metadata)}\n`,
    "utf8",
  );
  writeFileSync(path.join(projectPath, "aaaat.sty"), aaatStyle, "utf8");
}
