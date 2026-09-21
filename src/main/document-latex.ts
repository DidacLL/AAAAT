import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  CoverLetterSnapshot,
  WorkingCvRecord,
} from "../shared/document-domain-contracts";

import aaatStyle from "./latex/aaaat.sty?raw";
import applicationPacketTemplate from "./latex/application-packet.tex?raw";
import coverLetterTemplate from "./latex/cover-letter.tex?raw";
import cvTemplate from "./latex/cv.tex?raw";

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

export function encodeDocumentText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\\{}$&#%_^~]/g, (character) => latexEscapes[character] ?? character)
    .replace(/\n/g, "\\AAAATLineBreak{}");
}

function cvData(working: WorkingCvRecord): string {
  const lines = [`\\AAAATDocumentTitle{${encodeDocumentText(working.title)}}`];
  if (working.language) {
    lines.push(`\\AAAATMetadata{Language}{${encodeDocumentText(working.language)}}`);
  }
  for (const section of working.sections) {
    lines.push(`\\AAAATSection{${encodeDocumentText(section.name)}}`);
    for (const item of section.items) {
      const dates =
        item.content.startDate && item.content.endDate
          ? `${item.content.startDate} – ${item.content.endDate}`
          : (item.content.startDate ?? item.content.endDate ?? "");
      lines.push(
        `\\AAAATEntry{${encodeDocumentText(item.content.title)}}{${encodeDocumentText(item.content.subtitle ?? "")}}{${encodeDocumentText(dates)}}{${encodeDocumentText(item.content.description ?? "")}}{${encodeDocumentText(item.content.url ?? "")}}`,
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

function coverLetterData(letter: CoverLetterSnapshot): string {
  const lines = [`\\AAAATDocumentTitle{${encodeDocumentText(letter.title)}}`];
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
  mainSource: string,
  dataSource: string,
): void {
  mkdirSync(projectPath, { recursive: true });
  writeFileSync(path.join(projectPath, "main.tex"), mainSource, "utf8");
  writeFileSync(path.join(projectPath, "data.tex"), dataSource, "utf8");
  writeFileSync(path.join(projectPath, "aaaat.sty"), aaatStyle, "utf8");
}

export function writeCvLatexProject(projectPath: string, working: WorkingCvRecord): void {
  writePortableDocumentProject(projectPath, cvTemplate, cvData(working));
}

export function writeCoverLetterLatexProject(
  projectPath: string,
  letter: CoverLetterSnapshot,
): void {
  writePortableDocumentProject(projectPath, coverLetterTemplate, coverLetterData(letter));
}

export function writeApplicationPacketEntrypoint(projectPath: string): void {
  writeFileSync(path.join(projectPath, "main.tex"), applicationPacketTemplate, "utf8");
}
