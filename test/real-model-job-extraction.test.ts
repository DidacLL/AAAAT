// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { saveNamedAiConnection } from "../src/main/ai-connection-service";
import { listCandidatureFields } from "../src/main/candidature-field-service";
import { extractJobWithPartialOutcomes } from "../src/main/robust-job-extraction";
import { createOrOpenWorkspace } from "../src/main/workspace";

const endpoint = "http://127.0.0.1:11434/v1";
const model = "qwen2.5:0.5b-instruct";
const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-real-model-extraction-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const realModelDescribe = process.env.AAAAT_REAL_MODEL === "1" ? describe : describe.skip;

realModelDescribe("real constrained-model job extraction", () => {
  it("accepts source-supported candidature information through the production job_extraction path", async () => {
    const root = workspace();
    const connections = saveNamedAiConnection(root, {
      name: "Real-model evidence",
      endpoint,
      model,
    });
    const configured = connections.find((connection) => connection.isDefault);
    expect(configured).toMatchObject({ endpoint, model });

    const sourceText = [
      "Northstar Robotics is hiring a Platform Engineer in Barcelona.",
      "The compensation is EUR 52000 per year.",
      "This is a permanent position working on robotics infrastructure.",
    ].join(" ");

    const result = await extractJobWithPartialOutcomes(root, {
      sourceTitle: "Platform Engineer at Northstar Robotics",
      sourceUrl: "",
      sourceText,
    });

    expect(result.exchange).toBeDefined();
    const exchange = result.exchange!;
    expect(exchange.endpoint).toBe(endpoint);
    expect(exchange.model).toBe(model);
    expect(["json_schema", "plain_json_fallback"]).toContain(exchange.structuredOutputMode);
    expect(exchange.rawModelResponse.trim()).not.toBe("");

    const fields = new Map(
      listCandidatureFields(root).map((field) => [field.definition.id, field.definition.label]),
    );
    const proposals = result.proposals.map((proposal) => ({
      fieldId: proposal.fieldId,
      label: fields.get(proposal.fieldId) ?? "Unknown",
      value: proposal.value,
    }));
    const supported = new Set([
      JSON.stringify(["Organisation", "Northstar Robotics"]),
      JSON.stringify(["Role", "Platform Engineer"]),
      JSON.stringify(["Location", "Barcelona"]),
      JSON.stringify(["Compensation", "EUR 52000 per year"]),
    ]);
    const acceptedSupported = proposals.filter((proposal) =>
      supported.has(JSON.stringify([proposal.label, proposal.value])),
    );

    const evidence = {
      configured: { endpoint, model },
      exchangeMode: exchange.structuredOutputMode,
      rawModelResponse: exchange.rawModelResponse,
      validated: {
        proposals,
        newFields: result.newFields,
        existingTags: result.existingTags,
        newTags: result.newTags,
        issues: result.issues,
      },
    };

    console.log("AAAAT_REAL_MODEL_EVIDENCE");
    console.log(JSON.stringify(evidence, null, 2));

    expect(result.proposals.length).toBeGreaterThan(0);
    expect(acceptedSupported.length).toBeGreaterThan(0);
  });
});
