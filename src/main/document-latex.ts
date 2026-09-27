import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  CoverLetterSnapshot,
  WorkingCvRecord,
} from "../shared/document-domain-contracts";

import aaatStyle from "./latex/aaaat.sty?raw";
import applicationPacketTemplate from "./latex/application-packet.tex?raw";
import documentEntrypoint from "./latex/document.tex?raw";

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

const supportedLanguageCodes = Object.freeze(Object.keys(babelLanguageByPrimaryCode).sort());

export function encodeDocumentText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\\{}$&#%_^~]/g, (character) => latexEscapes[character] ?? character)
    .replace(/\n/g, "\\AAAATLineBreak{}");
}

export function resolveDocumentBabelLanguage(language: string | undefined): string {
  if (language === undefined) return "english";
  const primaryCode = language
    .trim()
    .match(/^([A-Za-z]{2})(?:[-_/\s]|$)/u)?.[1]
    ?.toLowerCase();
  const babelLanguage = primaryCode ? babelLanguageByPrimaryCode[primaryCode] : undefined;
  if (babelLanguage) return babelLanguage;
  throw new Error(
    `Unsupported document language "${language}". AAAAT currently supports these Latin-script language codes through Babel: ${supportedLanguageCodes.join(", ")}.`,
  );
}

function documentDataHeader(
  kind: "cv" | "letter",
  title: string,
  language: string | undefined,
): string[] {
  return [
    `\\AAAATDocumentKind{${kind}}`,
    `\\AAAATDocumentLanguage{${resolveDocumentBabelLanguage(language)}}`,
    `\\AAAATDocumentTitle{${encodeDocumentText(title)}}`,
  ];
}

function cvData(working: WorkingCvRecord): string {
  const lines = documentDataHeader("cv", working.title, working.language);
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

function coverLetterData(letter: CoverLetterSnapshot): string {
  const lines = documentDataHeader("letter", letter.title, letter.language);
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
  dataSource: string,
  blueprintSource: string,
): void {
  mkdirSync(projectPath, { recursive: true });
  writeFileSync(path.join(projectPath, "main.tex"), documentEntrypoint, "utf8");
  writeFileSync(path.join(projectPath, "blueprint.tex"), blueprintSource, "utf8");
  writeFileSync(path.join(projectPath, "data.tex"), dataSource, "utf8");
  writeFileSync(path.join(projectPath, "aaaat.sty"), aaatStyle, "utf8");
}

export function writeCvLatexProject(
  projectPath: string,
  working: WorkingCvRecord,
  blueprintSource: string,
): void {
  writePortableDocumentProject(projectPath, cvData(working), blueprintSource);
}

export function writeCoverLetterLatexProject(
  projectPath: string,
  letter: CoverLetterSnapshot,
  blueprintSource: string,
): void {
  writePortableDocumentProject(projectPath, coverLetterData(letter), blueprintSource);
}

export function writeApplicationPacketEntrypoint(projectPath: string): void {
  writeFileSync(path.join(projectPath, "main.tex"), applicationPacketTemplate, "utf8");
}
