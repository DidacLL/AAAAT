// @vitest-environment node

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, it } from "vitest";

import {
  configureAiCredentialProtection,
  probeAiConnection,
  saveNamedAiConnection,
} from "../../src/main/ai-connection-service";
import {
  AI_DEFAULT_INSTRUCTIONS,
  AiProviderError,
  createOpenAiCompatibleProvider,
  type ModelProvider,
} from "../../src/main/ai-provider";
import {
  discoverCandidatureFieldFromSources,
  draftCoverLetter,
  reviewOpportunity,
  tailorCv,
} from "../../src/main/ai-service";
import {
  addCandidatureSource,
  createCandidature,
  listCandidatureSources,
} from "../../src/main/candidature-service";
import { listCandidatureFields } from "../../src/main/candidature-field-service";
import { createCoverLetter, createWorkingCv } from "../../src/main/document-domain-service";
import { addProfileItem } from "../../src/main/profile-service";
import { extractJobWithPartialOutcomes } from "../../src/main/robust-job-extraction";
import { createOrOpenWorkspace } from "../../src/main/workspace";
import type { AiOperation } from "../../src/shared/ai-connection-contracts";
import type { CandidatureRuntimeValue, CandidatureSourceKind } from "../../src/shared/contracts";

type Status = "pass" | "weak" | "fail" | "error";
type Check = { name: string; passed: boolean; detail?: string };
type Evaluation = { status: Exclude<Status, "error">; score: number; checks: Check[] };
type Exchange = {
  url: string;
  elapsedMs: number;
  httpStatus: number | null;
  structuredMode: "json_schema" | "plain_json_fallback";
  systemInstruction: string;
  userPayload: string;
  rawModelResponse: string;
  transportError: string;
};
type Trial = {
  scenarioId: string;
  title: string;
  operation: AiOperation;
  repetition: number;
  status: Status;
  score: number;
  elapsedMs: number;
  checks: Check[];
  output: unknown;
  errorCategory: string;
  errorMessage: string;
  exchanges: Exchange[];
};
type ScenarioContext = { root: string; provider: ModelProvider; signal: AbortSignal };
type Scenario = {
  id: string;
  title: string;
  operation: AiOperation;
  run: (context: ScenarioContext) => Promise<{ output: unknown; evaluation: Evaluation }>;
};

const enabled = process.env.AAAAT_AI_EVAL === "1";
const evalDescribe = enabled ? describe : describe.skip;
const endpoint = enabled
  ? requiredEnv("AAAAT_AI_EVAL_ENDPOINT")
  : "http://127.0.0.1:1/v1";
const model = enabled ? requiredEnv("AAAAT_AI_EVAL_MODEL") : "disabled";
const credential = process.env.AAAAT_AI_EVAL_CREDENTIAL?.trim() ?? "";
const repetitions = boundedInt(process.env.AAAAT_AI_EVAL_REPETITIONS, 5, 2, 20);
const timeoutMs = boundedInt(process.env.AAAAT_AI_EVAL_TIMEOUT_MS, 120_000, 10_000, 900_000);
const nativeFetch = globalThis.fetch.bind(globalThis);
let capture: Array<{
  url: string;
  elapsedMs: number;
  status: number | null;
  requestBody: string;
  responseBody: string;
  error: string;
}> | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(name + " is required. Run this suite with npm run eval:ai.");
  return value;
}

function boundedInt(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = value ? Number(value) : fallback;
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error("Invalid AI evaluation integer: " + String(value ?? ""));
  }
  return parsed;
}

function cleanUrl(value: string): string {
  const url = new URL(value);
  url.username = "";
  url.password = "";
  url.search = "";
  url.hash = "";
  return url.toString();
}

function requestUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

const recordingFetch: typeof fetch = async (input, init) => {
  const url = requestUrl(input);
  const isCompletion = /\/chat\/completions(?:\?|$)/u.test(url);
  const requestBody = typeof init?.body === "string" ? init.body : "";
  const started = Date.now();
  try {
    const response = await nativeFetch(input, init);
    if (isCompletion) {
      let responseBody = "";
      try { responseBody = await response.clone().text(); } catch { responseBody = ""; }
      capture?.push({
        url: cleanUrl(url),
        elapsedMs: Date.now() - started,
        status: response.status,
        requestBody,
        responseBody,
        error: "",
      });
    }
    return response;
  } catch (reason) {
    if (isCompletion) {
      capture?.push({
        url: cleanUrl(url),
        elapsedMs: Date.now() - started,
        status: null,
        requestBody,
        responseBody: "",
        error: reason instanceof Error ? reason.name + ": " + reason.message : String(reason),
      });
    }
    throw reason;
  }
};

function exchangeView(item: NonNullable<typeof capture>[number]): Exchange {
  let systemInstruction = "";
  let userPayload = "";
  let structuredMode: Exchange["structuredMode"] = "plain_json_fallback";
  try {
    const body = JSON.parse(item.requestBody) as {
      response_format?: unknown;
      messages?: Array<{ role?: unknown; content?: unknown }>;
    };
    structuredMode = body.response_format ? "json_schema" : "plain_json_fallback";
    systemInstruction = String(body.messages?.find((message) => message.role === "system")?.content ?? "");
    userPayload = String(body.messages?.find((message) => message.role === "user")?.content ?? "");
  } catch {}

  let rawModelResponse = "";
  try {
    const body = JSON.parse(item.responseBody) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const current = body.choices?.[0]?.message?.content;
    rawModelResponse = typeof current === "string" ? current : item.responseBody;
  } catch {
    rawModelResponse = item.responseBody;
  }

  return {
    url: item.url,
    elapsedMs: item.elapsedMs,
    httpStatus: item.status,
    structuredMode,
    systemInstruction,
    userPayload,
    rawModelResponse,
    transportError: item.error,
  };
}

function currentExchanges(): Exchange[] {
  return (capture ?? []).map(exchangeView);
}

function installCredentialProtection(): void {
  const key = randomBytes(32);
  configureAiCredentialProtection({
    isSecure: () => true,
    encryptString(value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
    },
    decryptString(value) {
      const iv = value.subarray(0, 12);
      const tag = value.subarray(12, 28);
      const encrypted = value.subarray(28);
      const decipher = createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    },
  });
}

function configure(root: string): string {
  const saved = saveNamedAiConnection(root, {
    name: "Local evaluation",
    endpoint,
    model,
    ...(credential ? { credential } : {}),
  });
  const connection = saved[0];
  if (!connection) throw new Error("AAAAT did not retain the evaluation connection.");
  return connection.id;
}

function field(root: string, systemKey: string) {
  const result = listCandidatureFields(root).find(
    (candidate) => candidate.definition.systemKey === systemKey,
  );
  if (!result) throw new Error("Missing shipped candidature field: " + systemKey);
  return result;
}

function application(
  root: string,
  sourceTitle: string,
  sourceText: string,
  values: Readonly<Record<string, CandidatureRuntimeValue>>,
  kind: CandidatureSourceKind = "job_posting",
) {
  return createCandidature(root, {
    source: { kind, title: sourceTitle, url: "", sourceText },
    values: Object.entries(values).map(([systemKey, value]) => ({
      fieldId: field(root, systemKey).definition.id,
      value,
    })),
  });
}

function seedProfile(root: string): void {
  for (const item of [
    {
      kind: "experience",
      title: "Platform Reliability Engineer — Atlas Systems",
      subtitle: "Barcelona",
      description:
        "Owned TypeScript and Node.js production services, Kubernetes operations, incident response, observability and reliability improvements.",
      startDate: "2022",
      endDate: "2026",
    },
    {
      kind: "project",
      title: "Event ingestion platform",
      description:
        "Designed a high-volume TypeScript event ingestion service with queues, retries, metrics and production runbooks.",
    },
    {
      kind: "experience",
      title: "Data Analyst — Meridian Retail",
      description:
        "Built SQL and Python reporting pipelines, dashboards and experiment analysis for commercial and operations teams.",
      startDate: "2020",
      endDate: "2022",
    },
    {
      kind: "skill",
      title: "SQL and Python analytics",
      description: "Advanced SQL, Python, data cleaning, dashboarding and statistical analysis.",
    },
    {
      kind: "experience",
      title: "Customer onboarding lead — Studio North",
      description:
        "Led customer onboarding, documentation and cross-functional delivery for a B2B product.",
    },
    {
      kind: "project",
      title: "Accessible onboarding redesign",
      description:
        "Redesigned onboarding flows with accessibility reviews and usability testing, reducing support friction.",
    },
  ]) {
    addProfileItem(root, item);
  }
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase();
}

function containsAny(value: unknown, candidates: readonly string[]): boolean {
  const current = normalize(Array.isArray(value) ? value.join(" ") : value);
  return candidates.some((candidate) => current.includes(normalize(candidate)));
}

function evaluate(checks: Check[]): Evaluation {
  const passed = checks.filter((check) => check.passed).length;
  const score = checks.length === 0 ? 1 : passed / checks.length;
  return {
    status: score === 1 ? "pass" : score >= 0.5 ? "weak" : "fail",
    score,
    checks,
  };
}

function proposalMap(
  root: string,
  proposals: readonly { fieldId: string; value: CandidatureRuntimeValue }[],
): Map<string, CandidatureRuntimeValue> {
  const labels = new Map(
    listCandidatureFields(root).map((current) => [
      current.definition.id,
      current.definition.label,
    ]),
  );
  return new Map(
    proposals.map((proposal) => [
      labels.get(proposal.fieldId) ?? proposal.fieldId,
      proposal.value,
    ]),
  );
}

function extraction(input: {
  id: string;
  title: string;
  source: string;
  expected: Readonly<Record<string, readonly string[]>>;
  absent?: readonly string[];
}): Scenario {
  return {
    id: input.id,
    title: input.title,
    operation: "job_extraction",
    async run({ root, signal }) {
      const targets = [
        field(root, "candidature.organization"),
        field(root, "candidature.role"),
        field(root, "candidature.location"),
        field(root, "candidature.compensation"),
      ];
      const result = await extractJobWithPartialOutcomes(
        root,
        { sourceTitle: input.title, sourceUrl: "", sourceText: input.source },
        signal,
        targets.map((current) => current.definition.id),
      );
      const proposals = proposalMap(root, result.proposals);
      const checks: Check[] = [];
      for (const [label, expected] of Object.entries(input.expected)) {
        checks.push({
          name: "extract " + label,
          passed: containsAny(proposals.get(label), expected),
          detail: JSON.stringify(proposals.get(label) ?? null),
        });
      }
      for (const label of input.absent ?? []) {
        checks.push({
          name: "do not invent " + label,
          passed: !proposals.has(label),
          detail: JSON.stringify(proposals.get(label) ?? null),
        });
      }
      checks.push({
        name: "reuse the offered fields",
        passed: result.newFields.length === 0,
        detail: String(result.newFields.length) + " new field(s)",
      });
      checks.push({
        name: "avoid locally rejected fragments",
        passed: result.issues.length === 0,
        detail: result.issues.map((issue) => issue.reason).join(" | "),
      });
      return {
        output: {
          proposals: Object.fromEntries(proposals),
          newFields: result.newFields,
          existingTags: result.existingTags,
          newTags: result.newTags,
          issues: result.issues,
        },
        evaluation: evaluate(checks),
      };
    },
  };
}

function historical(input: {
  id: string;
  title: string;
  fieldKey: string;
  expected: readonly string[];
  sources: readonly Array<{ title: string; text: string; kind?: CandidatureSourceKind }>;
}): Scenario {
  return {
    id: input.id,
    title: input.title,
    operation: "historical_field_discovery",
    async run({ root, provider }) {
      const first = input.sources[0];
      if (!first) throw new Error("Historical scenario has no Source.");
      const candidature = application(root, first.title, first.text, {}, first.kind);
      for (const source of input.sources.slice(1)) {
        addCandidatureSource(root, {
          candidatureId: candidature.id,
          kind: source.kind ?? "other",
          title: source.title,
          url: "",
          sourceText: source.text,
        });
      }
      const target = field(root, input.fieldKey);
      const result = await discoverCandidatureFieldFromSources(
        root,
        {
          candidatureId: candidature.id,
          fieldId: target.definition.id,
          sourceIds: listCandidatureSources(root, candidature.id).map((source) => source.id),
        },
        provider,
      );
      return {
        output: result,
        evaluation: evaluate([
          {
            name: "recover " + target.definition.label,
            passed:
              result.proposal?.fieldId === target.definition.id &&
              containsAny(result.proposal?.value, input.expected),
            detail: JSON.stringify(result.proposal?.value ?? null),
          },
          {
            name: "do not claim a pre-existing value",
            passed: !result.existingValuePresent,
          },
        ]),
      };
    },
  };
}

function review(input: {
  id: string;
  title: string;
  values: Readonly<Record<string, CandidatureRuntimeValue>>;
  anchors: readonly (readonly string[])[];
  expectUncertainty?: boolean;
}): Scenario {
  return {
    id: input.id,
    title: input.title,
    operation: "opportunity_review",
    async run({ root, provider }) {
      seedProfile(root);
      const candidature = application(
        root,
        input.title,
        "Synthetic Source retained locally; review uses the supplied candidature information and professional evidence.",
        input.values,
      );
      const result = await reviewOpportunity(root, { candidatureId: candidature.id }, provider);
      const text = [
        result.summary,
        ...result.relevantEvidence,
        ...result.uncertainties,
        ...result.questions,
      ].join(" ");
      const checks: Check[] = input.anchors.map((anchor, index) => ({
        name: "use supplied review evidence " + String(index + 1),
        passed: containsAny(text, anchor),
        detail: anchor.join(" | "),
      }));
      checks.push({
        name: "keep summary concise",
        passed: result.summary.length <= 900,
        detail: String(result.summary.length) + " characters",
      });
      if (input.expectUncertainty) {
        checks.push({
          name: "surface sparse-context uncertainty",
          passed: result.uncertainties.length > 0 || result.questions.length > 0,
        });
      }
      return { output: result, evaluation: evaluate(checks) };
    },
  };
}

function cv(input: {
  id: string;
  title: string;
  role: string;
  organisation: string;
  source: string;
  relevantTitles: readonly string[];
}): Scenario {
  return {
    id: input.id,
    title: input.title,
    operation: "cv_tailoring",
    async run({ root, provider, signal }) {
      seedProfile(root);
      const candidature = application(root, input.title, input.source, {
        "candidature.organization": input.organisation,
        "candidature.role": input.role,
      });
      const working = createWorkingCv(root, {
        title: input.role + " CV",
        candidatureId: candidature.id,
        source: { kind: "profile" },
      });
      const result = await tailorCv(
        root,
        { candidatureId: candidature.id, workingCvId: working.id },
        provider,
        signal,
      );
      const titleById = new Map(
        working.sections.flatMap((section) =>
          section.items.map((item) => [item.id, item.content.title] as const),
        ),
      );
      const titles = result.recommendations.map(
        (recommendation) => titleById.get(recommendation.itemId) ?? recommendation.itemId,
      );
      return {
        output: result.recommendations.map((recommendation) => ({
          ...recommendation,
          title: titleById.get(recommendation.itemId) ?? "",
        })),
        evaluation: evaluate([
          {
            name: "recommend supplied CV evidence",
            passed: titles.length > 0,
            detail: titles.join(" | "),
          },
          {
            name: "prioritise role-relevant CV evidence",
            passed: titles.some((title) =>
              input.relevantTitles.some((expected) =>
                normalize(title).includes(normalize(expected)),
              ),
            ),
            detail: titles.join(" | "),
          },
          {
            name: "keep recommendations focused",
            passed: titles.length > 0 && titles.length <= 6,
            detail: String(titles.length) + " recommendation(s)",
          },
        ]),
      };
    },
  };
}

function letter(input: {
  id: string;
  title: string;
  application?: { role: string; organisation: string; source: string };
  anchors: readonly (readonly string[])[];
}): Scenario {
  return {
    id: input.id,
    title: input.title,
    operation: "cover_letter_draft",
    async run({ root, provider, signal }) {
      seedProfile(root);
      const candidature = input.application
        ? application(root, input.title, input.application.source, {
            "candidature.organization": input.application.organisation,
            "candidature.role": input.application.role,
          })
        : null;
      const coverLetter = createCoverLetter(root, {
        candidatureId: candidature?.id ?? null,
        title: input.title,
        bodyParagraphs: [],
      });
      const result = await draftCoverLetter(
        root,
        { coverLetterId: coverLetter.id },
        provider,
        signal,
      );
      const text = [
        result.recipient,
        result.subject,
        ...result.bodyParagraphs,
        result.closing,
      ].join(" ");
      const checks: Check[] = input.anchors.map((anchor, index) => ({
        name: "use supplied letter evidence " + String(index + 1),
        passed: containsAny(text, anchor),
        detail: anchor.join(" | "),
      }));
      const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
      checks.push({
        name: "keep letter concise",
        passed: words <= 400,
        detail: String(words) + " words",
      });
      checks.push({
        name: "avoid unsupported credential inventions",
        passed: !containsAny(text, [
          "master's degree",
          "masters degree",
          "phd",
          "certified kubernetes",
          "10 years",
          "ten years",
        ]),
      });
      return { output: result, evaluation: evaluate(checks) };
    },
  };
}

const scenarios: Scenario[] = [
  extraction({
    id: "extract-platform",
    title: "Platform posting",
    source:
      "Northstar Robotics is hiring a Platform Engineer in Barcelona. Compensation is EUR 52,000 per year. Permanent position working on robotics infrastructure.",
    expected: {
      Organisation: ["Northstar Robotics"],
      Role: ["Platform Engineer"],
      Location: ["Barcelona"],
      Compensation: ["52000", "52,000"],
    },
  }),
  extraction({
    id: "extract-spanish",
    title: "Spanish data posting",
    source:
      "Lumen Salud busca una Ingeniera de Datos para Madrid. Salario bruto anual: 58.000 EUR. El puesto trabaja con Python, SQL y analítica clínica.",
    expected: {
      Organisation: ["Lumen Salud"],
      Role: ["Ingeniera de Datos"],
      Location: ["Madrid"],
      Compensation: ["58000", "58.000"],
    },
  }),
  extraction({
    id: "extract-sparse",
    title: "Sparse recruiter fragment",
    source:
      "Remote within Spain. Six-month contract. The team is improving onboarding and internal tooling.",
    expected: { Location: ["Spain", "España"] },
    absent: ["Organisation", "Role", "Compensation"],
  }),

  historical({
    id: "discover-role",
    title: "Recover role from recruiter Source",
    fieldKey: "candidature.role",
    expected: ["Senior Backend Engineer"],
    sources: [
      {
        title: "Recruiter follow-up",
        kind: "recruiter_message",
        text: "Confirming the title: Senior Backend Engineer. The team owns internal platform services.",
      },
    ],
  }),
  historical({
    id: "discover-compensation",
    title: "Recover compensation from retained Sources",
    fieldKey: "candidature.compensation",
    expected: ["60000", "60,000", "70000", "70,000"],
    sources: [
      {
        title: "Original posting",
        text: "The salary range is EUR 60,000 to EUR 70,000 gross per year.",
      },
      {
        title: "Recruiter note",
        kind: "recruiter_message",
        text: "Benefits are separate; the salary range in the posting remains current.",
      },
    ],
  }),
  historical({
    id: "discover-location",
    title: "Recover later location clarification",
    fieldKey: "candidature.location",
    expected: ["Valencia"],
    sources: [
      { title: "Job page", text: "Location to be confirmed during interviews." },
      {
        title: "Recruiter clarification",
        kind: "conversation",
        text: "The position is hybrid in Valencia, with two office days each week.",
      },
    ],
  }),

  review({
    id: "review-platform",
    title: "Review platform opportunity",
    values: {
      "candidature.organization": "Northstar Robotics",
      "candidature.role": "Platform Engineer",
      "candidature.location": "Barcelona",
    },
    anchors: [
      ["Platform Engineer"],
      ["Northstar Robotics"],
      ["TypeScript", "Kubernetes", "reliability", "event ingestion"],
    ],
  }),
  review({
    id: "review-analytics",
    title: "Review analytics opportunity",
    values: {
      "candidature.organization": "Lumen Salud",
      "candidature.role": "Data Analyst",
      "candidature.location": "Madrid",
    },
    anchors: [
      ["Data Analyst"],
      ["Lumen Salud"],
      ["SQL", "Python", "analytics", "dashboards"],
    ],
  }),
  review({
    id: "review-sparse",
    title: "Review sparse opportunity",
    values: {
      "candidature.role": "Technical Operations Specialist",
      "candidature.location": "Remote",
    },
    anchors: [["Technical Operations Specialist"], ["Remote"]],
    expectUncertainty: true,
  }),

  cv({
    id: "cv-platform",
    title: "Tailor platform CV",
    role: "Platform Engineer",
    organisation: "Northstar Robotics",
    source:
      "Seeking a Platform Engineer for TypeScript services, Kubernetes, observability and incident-response ownership.",
    relevantTitles: ["Platform Reliability Engineer", "Event ingestion platform"],
  }),
  cv({
    id: "cv-analytics",
    title: "Tailor analytics CV",
    role: "Data Analyst",
    organisation: "Lumen Salud",
    source:
      "Seeking a Data Analyst with SQL, Python, dashboards and experiment analysis experience.",
    relevantTitles: ["Data Analyst", "SQL and Python analytics"],
  }),
  cv({
    id: "cv-onboarding",
    title: "Tailor onboarding CV",
    role: "Customer Onboarding Manager",
    organisation: "Harbor Product",
    source:
      "Seeking a customer onboarding manager to improve onboarding, documentation, usability and accessibility.",
    relevantTitles: ["Customer onboarding lead", "Accessible onboarding redesign"],
  }),

  letter({
    id: "letter-platform",
    title: "Platform application letter",
    application: {
      role: "Platform Engineer",
      organisation: "Northstar Robotics",
      source:
        "Platform role focused on TypeScript production services, Kubernetes, observability and incident response.",
    },
    anchors: [
      ["Platform Engineer"],
      ["Northstar Robotics"],
      ["TypeScript", "Kubernetes", "reliability", "event ingestion"],
    ],
  }),
  letter({
    id: "letter-analytics",
    title: "Analytics application letter",
    application: {
      role: "Data Analyst",
      organisation: "Lumen Salud",
      source: "Data Analyst role using SQL, Python, dashboards and analytical communication.",
    },
    anchors: [
      ["Data Analyst"],
      ["Lumen Salud"],
      ["SQL", "Python", "dashboards", "analytics"],
    ],
  }),
  letter({
    id: "letter-standalone",
    title: "Standalone professional letter",
    anchors: [
      ["TypeScript", "SQL", "Python", "onboarding"],
      ["Atlas Systems", "Meridian Retail", "Studio North", "event ingestion"],
    ],
  }),
];

function errorInfo(reason: unknown): { category: string; message: string } {
  if (reason instanceof AiProviderError) {
    return {
      category: reason.diagnostic?.failureKind ?? "provider_error",
      message: reason.message.split("\n", 1)[0] ?? reason.message,
    };
  }
  if (reason instanceof Error) return { category: reason.name, message: reason.message };
  return { category: "unknown_error", message: String(reason) };
}

function percent(value: number): string {
  return String(Math.round(value * 100)) + "%";
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 12);
}

function promptWords(value: string): number {
  return value.trim() ? value.trim().split(/\s+/u).length : 0;
}

function reportMarkdown(trials: Trial[], directory: string): string {
  const operations = Object.keys(AI_DEFAULT_INSTRUCTIONS) as AiOperation[];
  const lines = [
    "# AAAAT local AI journey evaluation",
    "",
    "- Model: " + model,
    "- Endpoint: " + cleanUrl(endpoint),
    "- Scenarios: " + String(scenarios.length),
    "- Repetitions per scenario: " + String(repetitions),
    "- Trials: " + String(trials.length),
    "- Request timeout: " + String(Math.round(timeoutMs / 1000)) + " seconds",
    "- Report directory: " + directory,
    "",
    "Individual model misses do not stop or fail the suite. They are observations.",
    "",
    "## Operation summary",
    "",
    "| Operation | Pass | Weak | Fail | Error | Average score |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];

  for (const operation of operations) {
    const current = trials.filter((trial) => trial.operation === operation);
    if (current.length === 0) continue;
    const count = (status: Status) =>
      current.filter((trial) => trial.status === status).length;
    const average =
      current.reduce((sum, trial) => sum + trial.score, 0) / current.length;
    lines.push(
      "| " + operation +
        " | " + count("pass") +
        " | " + count("weak") +
        " | " + count("fail") +
        " | " + count("error") +
        " | " + percent(average) + " |",
    );
  }

  lines.push(
    "",
    "## Scenario stability",
    "",
    "| Scenario | Operation | Pass/total | Distinct outputs | Average score |",
    "| --- | --- | ---: | ---: | ---: |",
  );
  for (const scenario of scenarios) {
    const current = trials.filter((trial) => trial.scenarioId === scenario.id);
    const pass = current.filter((trial) => trial.status === "pass").length;
    const distinct = new Set(
      current
        .filter((trial) => trial.status !== "error")
        .map((trial) => fingerprint(trial.output)),
    ).size;
    const average =
      current.reduce((sum, trial) => sum + trial.score, 0) / current.length;
    lines.push(
      "| " + scenario.title +
        " | " + scenario.operation +
        " | " + pass + "/" + current.length +
        " | " + distinct +
        " | " + percent(average) + " |",
    );
  }

  lines.push(
    "",
    "## Current default prompt size",
    "",
    "| Operation | Words | Characters |",
    "| --- | ---: | ---: |",
  );
  for (const operation of operations) {
    const instruction = AI_DEFAULT_INSTRUCTIONS[operation];
    lines.push(
      "| " + operation +
        " | " + promptWords(instruction) +
        " | " + instruction.length + " |",
    );
  }

  const signals = new Map<string, number>();
  for (const trial of trials) {
    if (trial.errorCategory) {
      const key = "error: " + trial.errorCategory;
      signals.set(key, (signals.get(key) ?? 0) + 1);
    }
    for (const check of trial.checks) {
      if (!check.passed) signals.set(check.name, (signals.get(check.name) ?? 0) + 1);
    }
  }
  lines.push("", "## Repeated signals to inspect before changing prompts", "");
  if (signals.size === 0) {
    lines.push("No repeated quality or contract signal was observed.");
  } else {
    for (const [signal, count] of [...signals.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push("- " + count + "x " + signal);
    }
  }

  lines.push(
    "",
    "## Prompt text",
    "",
    "The exact effective prompt, user payload, raw model response and structured-output mode for every call are retained in report.json.",
    "",
  );
  for (const operation of operations) {
    lines.push("### " + operation, "", AI_DEFAULT_INSTRUCTIONS[operation], "");
  }

  return lines.join("\n") + "\n";
}

evalDescribe("local AI journey evaluation", () => {
  it("runs all stochastic journeys and records model misses instead of failing fast", async () => {
    installCredentialProtection();
    globalThis.fetch = recordingFetch;

    const stamp =
      process.env.AAAAT_AI_EVAL_RUN_ID?.trim() ||
      new Date().toISOString().replace(/[:.]/gu, "-");
    const reportDir = path.resolve("ai-eval-results", stamp);
    mkdirSync(reportDir, { recursive: true });
    const trials: Trial[] = [];

    const preflightRoot = mkdtempSync(path.join(tmpdir(), "aaaat-ai-eval-preflight-"));
    try {
      createOrOpenWorkspace(preflightRoot);
      const connectionId = configure(preflightRoot);
      const reachable = await probeAiConnection(preflightRoot, connectionId, recordingFetch, 8_000);
      if (!reachable) {
        throw new Error(
          "The configured connection did not pass AAAAT's /models probe. Check endpoint, model service and credential.",
        );
      }
    } finally {
      rmSync(preflightRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
    }

    try {
      for (const scenario of scenarios) {
        for (let repetition = 1; repetition <= repetitions; repetition += 1) {
          const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-eval-"));
          const started = Date.now();
          capture = [];
          let trial: Trial;
          try {
            createOrOpenWorkspace(root);
            configure(root);
            const provider = createOpenAiCompatibleProvider(recordingFetch, timeoutMs);
            const controller = new AbortController();
            const timer = setTimeout(
              () => controller.abort(new Error("Local AI evaluation timeout.")),
              timeoutMs,
            );
            try {
              const result = await scenario.run({
                root,
                provider,
                signal: controller.signal,
              });
              trial = {
                scenarioId: scenario.id,
                title: scenario.title,
                operation: scenario.operation,
                repetition,
                status: result.evaluation.status,
                score: result.evaluation.score,
                elapsedMs: Date.now() - started,
                checks: result.evaluation.checks,
                output: result.output,
                errorCategory: "",
                errorMessage: "",
                exchanges: currentExchanges(),
              };
            } finally {
              clearTimeout(timer);
            }
          } catch (reason) {
            const error = errorInfo(reason);
            trial = {
              scenarioId: scenario.id,
              title: scenario.title,
              operation: scenario.operation,
              repetition,
              status: "error",
              score: 0,
              elapsedMs: Date.now() - started,
              checks: [],
              output: null,
              errorCategory: error.category,
              errorMessage: error.message,
              exchanges: currentExchanges(),
            };
          } finally {
            capture = null;
            rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
          }
          trials.push(trial);
          console.log(
            "[" + trial.status.toUpperCase() + "] " +
              trial.scenarioId + " #" + repetition +
              " " + (trial.elapsedMs / 1000).toFixed(1) + "s" +
              " score=" + percent(trial.score) +
              (trial.errorCategory ? " " + trial.errorCategory : ""),
          );
        }
      }
    } finally {
      globalThis.fetch = nativeFetch;
    }

    const expected = scenarios.length * repetitions;
    if (trials.length !== expected) {
      throw new Error(
        "Evaluation harness stopped early: " + trials.length + " of " + expected + " trials completed.",
      );
    }

    const report = {
      generatedAt: new Date().toISOString(),
      connection: {
        endpoint: cleanUrl(endpoint),
        model,
        credentialConfigured: Boolean(credential),
      },
      configuration: {
        repetitions,
        timeoutMs,
        scenarioCount: scenarios.length,
        trialCount: trials.length,
      },
      prompts: Object.fromEntries(
        (Object.keys(AI_DEFAULT_INSTRUCTIONS) as AiOperation[]).map((operation) => [
          operation,
          {
            instruction: AI_DEFAULT_INSTRUCTIONS[operation],
            words: promptWords(AI_DEFAULT_INSTRUCTIONS[operation]),
            characters: AI_DEFAULT_INSTRUCTIONS[operation].length,
          },
        ]),
      ),
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
        operation: scenario.operation,
      })),
      trials,
    };

    writeFileSync(
      path.join(reportDir, "report.json"),
      JSON.stringify(report, null, 2) + "\n",
      "utf8",
    );
    writeFileSync(
      path.join(reportDir, "report.md"),
      reportMarkdown(trials, reportDir),
      "utf8",
    );

    console.log("");
    console.log(
      "Completed " + trials.length +
        " trials: " +
        trials.filter((trial) => trial.status === "pass").length + " pass, " +
        trials.filter((trial) => trial.status === "weak").length + " weak, " +
        trials.filter((trial) => trial.status === "fail").length + " fail, " +
        trials.filter((trial) => trial.status === "error").length + " error.",
    );
    console.log("Report: " + path.join(reportDir, "report.md"));
    console.log("Model misses are retained in the report and do not fail the evaluation run.");
  }, 14_400_000);
});
