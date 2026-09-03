// @vitest-environment node

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assessFit,
  previewFitAssessment,
  saveAiConnection,
  type SecureStorageAdapter,
} from "../src/main/ai-service";
import { createCandidature } from "../src/main/candidature-service";
import type { FitModelProvider } from "../src/main/ai-provider";
import { addProfileItem } from "../src/main/profile-service";
import { createOrOpenWorkspace } from "../src/main/workspace";

const roots: string[] = [];

function workspace(): string {
  const root = mkdtempSync(path.join(tmpdir(), "aaaat-ai-"));
  roots.push(root);
  createOrOpenWorkspace(root);
  return root;
}

const secureStorage: SecureStorageAdapter = {
  isEncryptionAvailable: () => true,
  encryptString: (value) => Buffer.from(`encrypted:${value}`, "utf8"),
  decryptString: (value) => value.toString("utf8").replace(/^encrypted:/, ""),
};

const unavailableStorage: SecureStorageAdapter = {
  isEncryptionAvailable: () => false,
  encryptString: () => {
    throw new Error("unavailable");
  },
  decryptString: () => {
    throw new Error("unavailable");
  },
};

const basicTextStorage: SecureStorageAdapter = {
  isEncryptionAvailable: () => true,
  getSelectedStorageBackend: () => "basic_text",
  encryptString: (value) => Buffer.from(value, "utf8"),
  decryptString: (value) => value.toString("utf8"),
};

function seedFitContext(root: string): string {
  addProfileItem(root, { kind: "identity", title: "Didac Example" });
  addProfileItem(root, { kind: "contact", title: "didac@example.test" });
  addProfileItem(root, { kind: "skill", title: "TypeScript" });
  const candidature = createCandidature(root, {
    company: "Example Corp",
    role: "Platform Engineer",
    location: "Remote",
    workMode: "remote",
    salaryText: "",
    source: "Job board",
    sourceUrl: "",
    sourceText: "Build reliable TypeScript platform systems.",
    status: "saved",
    applicationDate: "",
    nextAction: "",
    nextActionDate: "",
    notes: "This note is intentionally not part of the AI context.",
  });
  return candidature.id;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("M3 AI service", () => {
  it("stores optional credentials only as safeStorage ciphertext", () => {
    const root = workspace();
    const status = saveAiConnection(
      root,
      {
        name: "Remote provider",
        endpoint: "https://models.example.test/v1",
        model: "model-a",
        classification: "remote",
        apiKey: "plain-secret",
      },
      secureStorage,
    );

    expect(status).toMatchObject({ hasCredential: true, secureStorageAvailable: true });
    const stored = readFileSync(path.join(root, "ai-connection.json"), "utf8");
    expect(stored).not.toContain("plain-secret");
    expect(stored).toContain("encryptedApiKey");
  });

  it("refuses to persist a credential when secure OS storage is unavailable", () => {
    const root = workspace();
    expect(() =>
      saveAiConnection(
        root,
        {
          name: "Remote provider",
          endpoint: "https://models.example.test/v1",
          model: "model-a",
          classification: "remote",
          apiKey: "plain-secret",
        },
        unavailableStorage,
      ),
    ).toThrow("Secure credential storage is unavailable");
    expect(existsSync(path.join(root, "ai-connection.json"))).toBe(false);
  });

  it("treats Electron's Linux basic_text backend as insecure storage", () => {
    if (process.platform !== "linux") return;
    const root = workspace();
    expect(() =>
      saveAiConnection(
        root,
        {
          name: "Remote provider",
          endpoint: "https://models.example.test/v1",
          model: "model-a",
          classification: "remote",
          apiKey: "plain-secret",
        },
        basicTextStorage,
      ),
    ).toThrow("Secure credential storage is unavailable");
    expect(existsSync(path.join(root, "ai-connection.json"))).toBe(false);
  });

  it("does not carry an existing provider credential to a different endpoint", () => {
    const root = workspace();
    saveAiConnection(
      root,
      {
        name: "Provider A",
        endpoint: "https://a.example.test/v1",
        model: "model-a",
        classification: "remote",
        apiKey: "provider-a-secret",
      },
      secureStorage,
    );

    const status = saveAiConnection(
      root,
      {
        name: "Provider B",
        endpoint: "https://b.example.test/v1",
        model: "model-b",
        classification: "remote",
      },
      secureStorage,
    );
    expect(status.hasCredential).toBe(false);
  });

  it("projects identity as opaque local tokens and omits contact before inference", () => {
    const root = workspace();
    const candidatureId = seedFitContext(root);
    saveAiConnection(
      root,
      {
        name: "Local model",
        endpoint: "http://localhost:11434/v1",
        model: "local-model",
        classification: "local",
      },
      secureStorage,
    );

    const preview = previewFitAssessment(
      root,
      {
        candidatureId,
        identityPrivacy: "token",
        contactPrivacy: "omit",
      },
      secureStorage,
    );
    const serialized = JSON.stringify(preview.projectedContext);
    expect(serialized).toContain("[AAAT_PRIVATE_1]");
    expect(serialized).not.toContain("Didac Example");
    expect(serialized).not.toContain("didac@example.test");
    expect(serialized).toContain("TypeScript");
    expect(serialized).not.toContain("intentionally not part");
    expect(preview.requiresRemoteDisclosure).toBe(false);
  });

  it("passes only projected context to the provider and rehydrates local tokens", async () => {
    const root = workspace();
    const candidatureId = seedFitContext(root);
    saveAiConnection(
      root,
      {
        name: "Remote model",
        endpoint: "https://models.example.test/v1",
        model: "remote-model",
        classification: "remote",
        apiKey: "provider-secret",
      },
      secureStorage,
    );

    const assess = vi.fn<FitModelProvider["assessFit"]>(async (_connection, credential, context) => {
      expect(credential).toBe("provider-secret");
      const serialized = JSON.stringify(context);
      expect(serialized).not.toContain("Didac Example");
      expect(serialized).not.toContain("didac@example.test");
      expect(serialized).toContain("[AAAT_PRIVATE_1]");
      return {
        fit: "strong",
        summary: "Strong evidence for [AAAT_PRIVATE_1].",
        strengths: ["TypeScript"],
        gaps: [],
        focus: ["Platform ownership"],
      };
    });
    const provider: FitModelProvider = { assessFit: assess };

    const result = await assessFit(
      root,
      {
        candidatureId,
        identityPrivacy: "token",
        contactPrivacy: "omit",
      },
      secureStorage,
      provider,
    );

    expect(assess).toHaveBeenCalledOnce();
    expect(result.summary).toBe("Strong evidence for Didac Example.");
  });

  it("rejects non-loopback local endpoints and insecure remote endpoints", () => {
    const root = workspace();
    expect(() =>
      saveAiConnection(
        root,
        {
          name: "Not local",
          endpoint: "http://192.168.1.20:11434/v1",
          model: "model",
          classification: "local",
        },
        secureStorage,
      ),
    ).toThrow("loopback endpoint");
    expect(() =>
      saveAiConnection(
        root,
        {
          name: "Remote",
          endpoint: "http://models.example.test/v1",
          model: "model",
          classification: "remote",
        },
        secureStorage,
      ),
    ).toThrow("must use HTTPS");
  });
});
