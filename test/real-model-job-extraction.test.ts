// @vitest-environment node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { saveNamedAiConnection } from "../src/main/ai-connection-service";
import { AiProviderError } from "../src/main/ai-provider";
import { listCandidatureFields } from "../src/main/candidature-field-service";
import { extractJobWithPartialOutcomes } from "../src/main/robust-job-extraction";
import { createOrOpenWorkspace } from "../src/main/workspace";

const endpoint = "http://127.0.0.1:11434/v1";
const model = "qwen2.5:0.5b-instruct";
const roots: string[] = [];
const sourceText = [
  "Northstar Robotics is hiring a Platform Engineer in Barcelona.",
  "The compensation is EUR 52000 per year.",
  "This is a permanent position working on robotics infrastructure.",
].join(" ");

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-real-model-extraction-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

function configure(root: string): void {
  const connections = saveNamedAiConnection(root, {
    name: "Real-model evidence",
    endpoint,
    model,
  });
  const configured = connections.find((connection) => connection.isDefault);
  expect(configured).toMatchObject({ endpoint, model });
}

function request() {
  return {
    sourceTitle: "Platform Engineer at Northstar Robotics",
    sourceUrl: "",
    sourceText,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const realModelDescribe = process.env.AAAAT_REAL_MODEL === "1" ? describe : describe.skip;

realModelDescribe("real constrained-model job extraction", () => {
  it("keeps the successful one-field production evidence", async () => {
    const root = workspace();
    configure(root);
    const roleField = listCandidatureFields(root).find(
      (field) => field.definition.systemKey === "candidature.role",
    );
    if (!roleField) throw new Error("Shipped Role field missing");

    const startedAt = Date.now();
    const result = await extractJobWithPartialOutcomes(
      root,
      request(),
      undefined,
      [roleField.definition.id],
    );
    const elapsedMs = Date.now() - startedAt;

    expect(result.exchange).toBeDefined();
    const exchange = result.exchange!;
    expect(exchange.endpoint).toBe(endpoint);
    expect(exchange.model).toBe(model);
    expect(exchange.rawModelResponse.trim()).not.toBe("");

    const fields = new Map(
      listCandidatureFields(root).map((field) => [field.definition.id, field.definition.label]),
    );
    const proposals = result.proposals.map((proposal) => ({
      label: fields.get(proposal.fieldId) ?? "Unknown",
      value: proposal.value,
    }));

    console.log("AAAAT_REAL_MODEL_ONE_FIELD");
    console.log(JSON.stringify({
      elapsedMs,
      exchangeMode: exchange.structuredOutputMode,
      rawModelResponse: exchange.rawModelResponse,
      validated: {
        proposals,
        newFields: result.newFields,
        existingTags: result.existingTags,
        newTags: result.newTags,
        issues: result.issues,
      },
    }, null, 2));

    expect(proposals).toContainEqual({ label: "Role", value: "Platform Engineer" });
  }, 420_000);

  it("runs the ordinary four-field production request without an implicit 300-second transport ceiling", async () => {
    const root = workspace();
    configure(root);
    const ordinaryLabels = ["Organisation", "Role", "Location", "Compensation"];
    const ordinaryFields = listCandidatureFields(root).filter((field) =>
      ordinaryLabels.includes(field.definition.label),
    );
    expect(ordinaryFields.map((field) => field.definition.label)).toEqual(ordinaryLabels);

    const startedAt = Date.now();
    try {
      const result = await extractJobWithPartialOutcomes(
        root,
        request(),
        undefined,
        ordinaryFields.map((field) => field.definition.id),
      );
      const elapsedMs = Date.now() - startedAt;
      expect(result.exchange).toBeDefined();
      const exchange = result.exchange!;
      expect(exchange.rawModelResponse.trim()).not.toBe("");

      const fields = new Map(
        listCandidatureFields(root).map((field) => [field.definition.id, field.definition.label]),
      );
      const proposals = result.proposals.map((proposal) => ({
        label: fields.get(proposal.fieldId) ?? "Unknown",
        value: proposal.value,
      }));

      console.log("AAAAT_REAL_MODEL_FOUR_FIELD");
      console.log(JSON.stringify({
        outcome: "response",
        elapsedMs,
        exchangeMode: exchange.structuredOutputMode,
        rawModelResponse: exchange.rawModelResponse,
        validated: {
          proposals,
          newFields: result.newFields,
          existingTags: result.existingTags,
          newTags: result.newTags,
          issues: result.issues,
        },
      }, null, 2));
    } catch (reason) {
      const elapsedMs = Date.now() - startedAt;
      if (!(reason instanceof AiProviderError)) throw reason;

      console.log("AAAAT_REAL_MODEL_FOUR_FIELD");
      console.log(JSON.stringify({
        outcome: "provider_failure",
        elapsedMs,
        message: reason.message.split("\n", 1)[0],
        diagnostic: reason.diagnostic,
      }, null, 2));

      expect(elapsedMs).toBeGreaterThan(300_000);
      expect(reason.message).toContain("AAAAT's 15-minute safety limit");
      expect(reason.diagnostic).toMatchObject({
        failureKind: "connection_unreachable",
        validationError: "The request exceeded AAAAT's provider safety timeout.",
      });
      expect(reason.diagnostic?.validationError).not.toContain("UND_ERR_HEADERS_TIMEOUT");
    }
  }, 930_000);
});
