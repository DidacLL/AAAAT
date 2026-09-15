from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace(path: str, old: str, new: str) -> None:
    target = ROOT / path
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected snippet not found in {path}: {old[:120]!r}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


write(
    "src/shared/source-text.ts",
    r'''const blockBreak = /<\/?(?:address|article|aside|blockquote|div|footer|h[1-6]|header|li|main|nav|ol|p|pre|section|table|td|th|tr|ul)\b[^>]*>/gi;
const lineBreak = /<br\s*\/?\s*>/gi;
const hiddenMarkup = /<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const comments = /<!--[\s\S]*?-->/g;
const tags = /<[^>]+>/g;
const obviousChrome = /^(?:accept(?: all)? cookies?|cookie preferences?|privacy settings?|sign in|log in|register|save job|share job|apply now|back to jobs|skip to (?:main )?content|navigation|menu)$/i;

function decodeEntity(entity: string): string {
  const named: Readonly<Record<string, string>> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&nbsp;": " ",
  };
  const direct = named[entity.toLocaleLowerCase()];
  if (direct !== undefined) return direct;
  const decimal = /^&#(\d+);$/.exec(entity);
  const hex = /^&#x([0-9a-f]+);$/i.exec(entity);
  const codePoint = decimal ? Number(decimal[1]) : hex ? Number.parseInt(hex[1] ?? "", 16) : Number.NaN;
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;
  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return entity;
  }
}

function stripMarkup(raw: string): string {
  return raw
    .replace(comments, " ")
    .replace(hiddenMarkup, " ")
    .replace(lineBreak, "\n")
    .replace(blockBreak, "\n")
    .replace(tags, " ")
    .replace(/&(?:amp|lt|gt|quot|apos|nbsp|#39|#\d+|#x[0-9a-f]+);/gi, decodeEntity)
    .replaceAll("\u00a0", " ")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n");
}

function normalizeLines(raw: string): string[] {
  return stripMarkup(raw)
    .split("\n")
    .map((line) => line.replace(/[\t ]+/g, " ").trim())
    .filter(Boolean);
}

export function readableSourceText(raw: string): string {
  return normalizeLines(raw).join("\n\n");
}

export function compactSourceText(raw: string): string {
  const seen = new Set<string>();
  const retained: string[] = [];
  for (const line of normalizeLines(raw)) {
    if (line.length <= 80 && obviousChrome.test(line)) continue;
    const key = line.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    retained.push(line);
  }
  return retained.join("\n");
}
''',
)

replace(
    "src/renderer/CandidatureSourcesPanel.tsx",
    'import type {\n  CandidatureSource,\n  CandidatureSourceInput,\n  CandidatureSourceKind,\n} from "../shared/contracts";\n',
    'import type {\n  CandidatureSource,\n  CandidatureSourceInput,\n  CandidatureSourceKind,\n} from "../shared/contracts";\nimport { readableSourceText } from "../shared/source-text";\n',
)
replace(
    "src/renderer/CandidatureSourcesPanel.tsx",
    'function sourcePreview(source: CandidatureSource): string {\n  const normalized = source.sourceText.trim().replaceAll(/\\s+/g, " ");\n  if (!normalized) return "";\n  return normalized.length > 220 ? `${normalized.slice(0, 217)}…` : normalized;\n}\n',
    'function sourcePreview(source: CandidatureSource): string {\n  const normalized = readableSourceText(source.sourceText).replaceAll(/\\s+/g, " ");\n  if (!normalized) return "";\n  return normalized.length > 220 ? `${normalized.slice(0, 217)}…` : normalized;\n}\n\nfunction primarySourceId(sources: readonly CandidatureSource[]): string | null {\n  return sources.find((source) => source.kind === "job_posting")?.id ?? sources[0]?.id ?? null;\n}\n',
)
replace(
    "src/renderer/CandidatureSourcesPanel.tsx",
    '        setSources(next);\n        setReadingId(null);\n',
    '        setSources(next);\n        setReadingId(primarySourceId(next));\n',
)
replace(
    "src/renderer/CandidatureSourcesPanel.tsx",
    '    setSources(next);\n    onSourcesChanged?.(next);\n',
    '    setSources(next);\n    setReadingId((current) => current && next.some((source) => source.id === current) ? current : primarySourceId(next));\n    onSourcesChanged?.(next);\n',
)
replace(
    "src/renderer/CandidatureSourcesPanel.tsx",
    '          <p className="eyebrow">Supplied context</p>\n          <h3>Sources</h3>\n          <p>Add only the material you actually have.</p>\n',
    '          <p className="eyebrow">Opportunity</p>\n          <h3>Offer / source</h3>\n          <p>Readable retained opportunity content, with the original Source always available.</p>\n',
)
replace(
    "src/renderer/CandidatureSourcesPanel.tsx",
    '          {readingSource.sourceText ? (\n            <p className="source-reader-content">{readingSource.sourceText}</p>\n          ) : (\n            <p className="compact-empty">This Source has no retained text.</p>\n          )}\n',
    '          {readingSource.sourceText ? (\n            <>\n              <p className="source-reader-content">{readableSourceText(readingSource.sourceText)}</p>\n              <details className="source-original-disclosure">\n                <summary>Show original Source</summary>\n                <pre>{readingSource.sourceText}</pre>\n              </details>\n            </>\n          ) : (\n            <p className="compact-empty">This Source has no retained text.</p>\n          )}\n',
)

replace(
    "src/renderer/CandidatureInferencePanel.tsx",
    'import type {\n  CandidatureFieldConfiguration,\n  CandidatureRecord,\n  CandidatureRuntimeValue,\n  CandidatureSource,\n} from "../shared/contracts";\n',
    'import type {\n  CandidatureFieldConfiguration,\n  CandidatureRecord,\n  CandidatureRuntimeValue,\n  CandidatureSource,\n} from "../shared/contracts";\nimport { compactSourceText } from "../shared/source-text";\n',
)
replace(
    "src/renderer/CandidatureInferencePanel.tsx",
    '      source.sourceText,\n',
    '      compactSourceText(source.sourceText),\n',
)

replace(
    "src/main/ai-service.ts",
    'import type {\n  CandidatureFieldConfiguration,\n  CandidatureRuntimeValue,\n  DocumentRecord,\n  ProfileItem,\n} from "../shared/contracts";\n',
    'import type {\n  CandidatureFieldConfiguration,\n  CandidatureRuntimeValue,\n  DocumentRecord,\n  ProfileItem,\n} from "../shared/contracts";\nimport { compactSourceText } from "../shared/source-text";\n',
)
replace(
    "src/main/ai-service.ts",
    '      sources: [],\n',
    '      sources: retainedSources.slice(0, 4).map((source) => ({\n        title: source.title.trim(),\n        url: source.url.trim(),\n        sourceText: compactSourceText(source.sourceText).slice(0, 6000),\n      })).filter((source) => source.title || source.url || source.sourceText),\n',
)
replace(
    "src/main/ai-service.ts",
    'function operationScope(kind: string): string {\n  return `aaaat_${kind.replace(/[^a-z]/g, "")}_${randomUUID()}`;\n}\n',
    'function operationScope(kind: string): string {\n  return `aaaat_${kind.replace(/[^a-z]/g, "")}`;\n}\n',
)
replace(
    "src/main/ai-service.ts",
    '      (source) =>\n        `Source: ${source.title}\\nURL: ${source.url}\\n${source.sourceText}`,\n',
    '      (source) =>\n        `Source: ${source.title}\\nURL: ${source.url}\\n${compactSourceText(source.sourceText)}`,\n',
)

replace(
    "src/main/robust-job-extraction.ts",
    'import { randomUUID } from "node:crypto";\n\n',
    '',
)
replace(
    "src/main/robust-job-extraction.ts",
    'function operationScope(): string {\n  return `aaaat_discovery_${randomUUID()}`;\n}\n',
    'function operationScope(): string {\n  return "aaaat_discovery";\n}\n',
)

needle = '''function validateNewFields(\n  rawFields: readonly unknown[],\n  existingFields: readonly CandidatureFieldConfiguration[],\n): {'''
semantic_helpers = r'''const fieldAliasGroups = [
  ["language", "languages", "idioma", "idiomas", "language required", "languages required", "required language", "required languages", "language requirement", "language requirements"],
  ["organisation", "organization", "company", "employer"],
  ["role", "position", "job role", "job title", "position title"],
  ["location", "work location", "job location"],
  ["compensation", "salary", "pay", "remuneration"],
] as const;

function normalizedFieldMeaning(label: string): string {
  const normalized = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  for (const [canonical, ...aliases] of fieldAliasGroups) {
    if (normalized === canonical || aliases.includes(normalized as never)) return canonical;
  }
  return normalized;
}

function validateNewFields(
  rawFields: readonly unknown[],
  existingFields: readonly CandidatureFieldConfiguration[],
): {'''
replace("src/main/robust-job-extraction.ts", needle, semantic_helpers)
replace(
    "src/main/robust-job-extraction.ts",
    '  const labels = new Set(\n    existingFields.map((field) => field.definition.label.trim().toLocaleLowerCase()),\n  );\n',
    '  const labels = new Set(\n    existingFields.map((field) => normalizedFieldMeaning(field.definition.label)),\n  );\n',
)
replace(
    "src/main/robust-job-extraction.ts",
    '    const key = normalized.field.label.trim().toLocaleLowerCase();\n',
    '    const key = normalizedFieldMeaning(normalized.field.label);\n',
)

write(
    "test/source-text.test.ts",
    r'''import { describe, expect, it } from "vitest";

import { compactSourceText, readableSourceText } from "../src/shared/source-text";

describe("Source text projections", () => {
  it("derives readable text without mutating retained raw Source", () => {
    const raw = "<h1>Backend Engineer</h1>\n<div>Build APIs &amp; tools.</div>\n\n<div>Remote: Spain</div>";
    const retained = raw;
    expect(readableSourceText(raw)).toBe("Backend Engineer\n\nBuild APIs & tools.\n\nRemote: Spain");
    expect(raw).toBe(retained);
  });

  it("compacts deterministic chrome and repeated fragments", () => {
    const raw = "<nav>Navigation</nav>\n<p>English required</p>\n<p>English required</p>\nAccept all cookies\nSalary: €55,000\nhttps://example.test/jobs/42";
    expect(compactSourceText(raw)).toBe(
      "English required\nSalary: €55,000\nhttps://example.test/jobs/42",
    );
    expect(compactSourceText(raw)).toBe(compactSourceText(raw));
  });
});
''',
)
