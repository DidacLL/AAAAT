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
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
  };
  const direct = named[entity.toLocaleLowerCase()];
  if (direct !== undefined) return direct;
  const decimal = /^&#(\d+);$/.exec(entity);
  const hex = /^&#x([0-9a-f]+);$/i.exec(entity);
  const codePoint = decimal ? Number(decimal[1]) : hex ? Number.parseInt(hex[1] ?? "", 16) : Number.NaN;
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return entity;
  try { return String.fromCodePoint(codePoint); } catch { return entity; }
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

write(
    "src/renderer/CandidatureOfferPanel.tsx",
    r'''import { useEffect, useMemo, useState } from "react";

import type { CandidatureSource } from "../shared/contracts";
import { readableSourceText } from "../shared/source-text";

function primarySource(sources: readonly CandidatureSource[]): CandidatureSource | null {
  return sources.find((source) => source.kind === "job_posting") ?? sources[0] ?? null;
}

export function CandidatureOfferPanel({ candidatureId }: { readonly candidatureId: string }) {
  const [sources, setSources] = useState<CandidatureSource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    void window.aaaat.candidatures.listSources(candidatureId).then((next) => {
      if (!active) return;
      setSources(next);
      setSelectedId(primarySource(next)?.id ?? null);
    }).catch(() => {
      if (active) setFailed(true);
    });
    return () => { active = false; };
  }, [candidatureId]);

  const selected = useMemo(
    () => sources.find((source) => source.id === selectedId) ?? primarySource(sources),
    [selectedId, sources],
  );

  return (
    <section className="section-surface candidature-offer-panel" aria-label="Retained offer">
      <div className="candidature-editor-heading">
        <div>
          <p className="eyebrow">Opportunity</p>
          <h3>Offer</h3>
        </div>
        {sources.length > 1 ? (
          <label className="candidature-offer-source-switcher">
            Source
            <select
              aria-label="Offer source"
              value={selected?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {sources.map((source) => (
                <option key={source.id} value={source.id}>{source.title || source.kind.replaceAll("_", " ")}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
      {failed ? <p className="error-message">AAAAT could not read the retained offer.</p> : null}
      {!failed && !selected ? <p className="compact-empty">No retained offer or Source yet.</p> : null}
      {selected ? (
        <article className="candidature-offer-body">
          <div className="source-reader-heading">
            <div>
              <p className="eyebrow">{selected.kind.replaceAll("_", " ")}</p>
              <h4>{selected.title || "Retained Source"}</h4>
            </div>
          </div>
          {selected.url ? <p className="source-reference">{selected.url}</p> : null}
          {selected.sourceText ? (
            <p className="source-reader-content">{readableSourceText(selected.sourceText)}</p>
          ) : <p className="compact-empty">This Source has no retained text.</p>}
          <details className="source-original-disclosure">
            <summary>Original Source</summary>
            <pre>{selected.sourceText}</pre>
          </details>
        </article>
      ) : null}
    </section>
  );
}
''',
)

replace(
    "src/renderer/CandidaturesWorkspace.tsx",
    'import { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";\n',
    'import { CandidatureOfferPanel } from "./CandidatureOfferPanel";\nimport { CandidatureSourcesPanel } from "./CandidatureSourcesPanel";\n',
)
replace(
    "src/renderer/CandidaturesWorkspace.tsx",
    '      <section className="section-surface candidature-information-surface" aria-label="Candidature information">\n',
    '      <CandidatureOfferPanel candidatureId={selected.id} />\n\n      <section className="section-surface candidature-information-surface" aria-label="Candidature information">\n',
)

replace(
    "src/renderer/CandidatureInferencePanel.tsx",
    '} from "../shared/contracts";\n',
    '} from "../shared/contracts";\nimport { compactSourceText } from "../shared/source-text";\n',
)
replace(
    "src/renderer/CandidatureInferencePanel.tsx",
    '      source.sourceText,\n',
    '      compactSourceText(source.sourceText),\n',
)

replace(
    "src/main/ai-service.ts",
    '} from "../shared/contracts";\n',
    '} from "../shared/contracts";\nimport { compactSourceText } from "../shared/source-text";\n',
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
    '} from "../shared/contracts";\n',
    '} from "../shared/contracts";\nimport { compactSourceText } from "../shared/source-text";\n',
)
replace(
    "src/main/robust-job-extraction.ts",
    'function operationScope(): string {\n  return `aaaat_discovery_${randomUUID()}`;\n}\n',
    'function operationScope(): string {\n  return "aaaat_discovery";\n}\n',
)
replace(
    "src/main/robust-job-extraction.ts",
    '    request: providerJobExtractionRequestSchema.parse({ ...request, fields: providerFields }),\n',
    '    request: providerJobExtractionRequestSchema.parse({\n      ...request,\n      sourceContext: compactSourceText(request.sourceContext),\n      fields: providerFields,\n    }),\n',
)

old_validate = r'''function validateNewFields(
  rawFields: readonly unknown[],
  existingFields: readonly CandidatureFieldConfiguration[],
): {
  readonly fields: JobExtractionNewField[];
  readonly issues: JobExtractionProposalIssue[];
} {
  const fields: JobExtractionNewField[] = [];
  const issues: JobExtractionProposalIssue[] = [];
  const labels = new Set(
    existingFields.map((field) => field.definition.label.trim().toLocaleLowerCase()),
  );
  for (const rawField of rawFields) {
    const normalized = normalizeNewField(rawField);
    if (!normalized.field) {
      issues.push(
        issue(
          "new_field_invalid",
          null,
          normalized.label,
          proposedValue(rawField),
          normalized.reason ?? "AAAAT could not use this proposed information definition.",
        ),
      );
      continue;
    }
    const key = normalized.field.label.trim().toLocaleLowerCase();
    if (labels.has(key)) {
      issues.push(
        issue(
          "new_field_invalid",
          null,
          normalized.field.label,
          normalized.field.value,
          "AI proposed a new information definition that duplicates existing information.",
        ),
      );
      continue;
    }
    labels.add(key);
    fields.push(normalized.field);
  }
  return { fields, issues };
}
'''
new_validate = r'''const fieldAliasGroups = [
  ["language", "languages", "idioma", "idiomas", "language required", "languages required", "required language", "required languages", "language requirement", "language requirements"],
  ["organisation", "organization", "company", "employer"],
  ["role", "position", "job role", "job title", "position title"],
  ["location", "work location", "job location"],
  ["compensation", "salary", "pay", "remuneration"],
] as const;

function normalizedFieldMeaning(label: string): string {
  const normalized = label.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  for (const group of fieldAliasGroups) {
    if (group.some((alias) => alias === normalized)) return group[0];
  }
  return normalized;
}

function valueForExistingField(
  field: CandidatureFieldConfiguration,
  proposed: CandidatureRuntimeValue,
): unknown {
  if (field.definition.valueType !== "choice") return proposed;
  const mapOne = (value: unknown): unknown => {
    if (typeof value !== "string") return value;
    const choice = field.definition.choices.find(
      (candidate) => candidate.label.trim().toLocaleLowerCase() === value.trim().toLocaleLowerCase(),
    );
    return choice?.id ?? value;
  };
  return Array.isArray(proposed) ? proposed.map(mapOne) : mapOne(proposed);
}

function validateNewFields(
  rootPath: string,
  rawFields: readonly unknown[],
  existingFields: readonly CandidatureFieldConfiguration[],
): {
  readonly fields: JobExtractionNewField[];
  readonly reused: Array<{ fieldId: string; value: CandidatureRuntimeValue }>;
  readonly issues: JobExtractionProposalIssue[];
} {
  const fields: JobExtractionNewField[] = [];
  const reused: Array<{ fieldId: string; value: CandidatureRuntimeValue }> = [];
  const issues: JobExtractionProposalIssue[] = [];
  const meanings = new Set(existingFields.map((field) => normalizedFieldMeaning(field.definition.label)));
  for (const rawField of rawFields) {
    const normalized = normalizeNewField(rawField);
    if (!normalized.field) {
      issues.push(issue("new_field_invalid", null, normalized.label, proposedValue(rawField),
        normalized.reason ?? "AAAAT could not use this proposed information definition."));
      continue;
    }
    const meaning = normalizedFieldMeaning(normalized.field.label);
    const existing = existingFields.find(
      (field) => normalizedFieldMeaning(field.definition.label) === meaning,
    );
    if (existing) {
      try {
        const cardinality = normalizeCardinality(
          existing,
          valueForExistingField(existing, normalized.field.value),
        );
        if (cardinality.reason) throw new Error(cardinality.reason);
        const runtime = candidatureRuntimeValueSchema.parse(cardinality.value);
        const value = withWorkspaceDatabase(rootPath, (database) =>
          validateCandidatureFieldValueInDatabase(database, existing.definition.id, runtime),
        );
        if (value === null) throw new Error(`${existing.definition.label} did not contain a usable value.`);
        reused.push({ fieldId: existing.definition.id, value });
      } catch (reason) {
        issues.push(issue("new_field_invalid", existing.definition.id, existing.definition.label,
          normalized.field.value, reason instanceof Error ? reason.message :
            "AI proposed duplicate information that could not be reused safely."));
      }
      continue;
    }
    if (meanings.has(meaning)) continue;
    meanings.add(meaning);
    fields.push(normalized.field);
  }
  return { fields, reused, issues };
}
'''
replace("src/main/robust-job-extraction.ts", old_validate, new_validate)
replace(
    "src/main/robust-job-extraction.ts",
    '  const discovered = validateNewFields(envelope.newFields, listCandidatureFields(rootPath));\n',
    '  const discovered = validateNewFields(rootPath, envelope.newFields, listCandidatureFields(rootPath));\n',
)
replace(
    "src/main/robust-job-extraction.ts",
    '    proposals: existing.proposals,\n',
    '    proposals: [\n      ...existing.proposals,\n      ...discovered.reused.filter(\n        (proposal) => !existing.proposals.some((existingProposal) => existingProposal.fieldId === proposal.fieldId),\n      ),\n    ],\n',
)

replace(
    "src/main/ai-provider.ts",
    'newFields is optional discovery for useful facts that clearly do not fit any supplied field: suggest at most 8 concise reusable candidature information kinds, never duplicate an existing field by meaning or name, use choices only for choice fields, and omit speculative or weakly supported facts. Return an empty array when there are no genuinely useful new fields.',
    'Reuse supplied fields first. Their label, description, type, cardinality, and choices define what each can hold. newFields is optional discovery only for useful facts that genuinely cannot fit any supplied field: suggest at most 8 concise reusable candidature information kinds, never duplicate an existing field by meaning or name (for example Languages/Idiomas vs Language Required), use choices only for choice fields, and omit speculative or weakly supported facts. Return an empty array when there are no genuinely useful new fields.',
)

css = ROOT / "src/renderer/candidatures.css"
css.write_text(css.read_text(encoding="utf-8") + r'''

.candidature-offer-panel {
  display: grid;
  gap: 0.8rem;
}

.candidature-offer-source-switcher {
  display: grid;
  gap: 0.25rem;
  min-width: min(18rem, 100%);
}

.candidature-offer-body {
  min-width: 0;
}

.candidature-offer-body .source-reader-content {
  max-height: 34rem;
  overflow: auto;
  white-space: pre-wrap;
  line-height: 1.55;
}

.source-original-disclosure pre {
  max-height: 24rem;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
''', encoding="utf-8")

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
    expect(compactSourceText(raw)).toBe("English required\nSalary: €55,000\nhttps://example.test/jobs/42");
    expect(compactSourceText(raw)).toBe(compactSourceText(raw));
  });
});
''',
)

write(
    "test/CandidatureOfferPanel.test.tsx",
    r'''import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CandidatureOfferPanel } from "../src/renderer/CandidatureOfferPanel";

const sourceText = "<h2>Platform Engineer</h2>\n<div>English required</div>\nRAW-MARKER";

describe("CandidatureOfferPanel", () => {
  it("shows a readable primary offer and retains access to the exact original Source", async () => {
    Object.defineProperty(window, "aaaat", { configurable: true, value: {
      candidatures: { listSources: vi.fn().mockResolvedValue([{ id: crypto.randomUUID(), candidatureId: crypto.randomUUID(), kind: "job_posting", title: "Platform Engineer", url: "https://example.test/job", sourceText, createdAt: "2026-09-15", updatedAt: "2026-09-15" }]) },
    }});
    render(<CandidatureOfferPanel candidatureId={crypto.randomUUID()} />);
    expect(await screen.findByText("English required")).toBeInTheDocument();
    expect(screen.getByText("Platform Engineer", { selector: "h4" })).toBeInTheDocument();
    expect(screen.getByText("Original Source")).toBeInTheDocument();
    expect(sourceText).toContain("<h2>");
  });
});
''',
)
