import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "../src/preload/api";
import { aiChannels } from "../src/shared/ai-contracts";
import { channels } from "../src/shared/contracts";

const candidatureId = "00000000-0000-4000-8000-000000000601";
const fieldId = "00000000-0000-4000-8000-000000000602";
const sourceId = "00000000-0000-4000-8000-000000000603";

const configuration = {
  definition: {
    id: fieldId,
    systemKey: null,
    label: "Minimum flight hours",
    description: "Minimum total flight hours requested.",
    valueType: "number" as const,
    cardinality: "one" as const,
    choices: [],
    enabled: true,
    createdAt: "2026-09-04T00:00:00.000Z",
    updatedAt: "2026-09-04T00:00:00.000Z",
  },
  preferences: {
    fieldId,
    focusVisible: false,
    focusOrder: null,
    focusProminence: "normal" as const,
    identityOrder: null,
    aiDiscovery: true,
    aiContextMode: "expose" as const,
  },
};

const record = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  label: "Pilot opportunity",
  values: [],
  documentIds: [],
  conceptIds: [],
};

describe("desktop preload API", () => {
  it("validates and forwards live candidature field operations over named IPC channels", async () => {
    const invoke = vi.fn(async (channel: string, input?: unknown) => {
      if (channel === channels.systemInfo) {
        return { appVersion: "2.0.0", electronVersion: "44.1.1", nodeVersion: "24.19.0" };
      }
      if (channel === channels.workspaceCurrent) return null;
      if (channel === channels.candidatureList) return [record];
      if (channel === channels.candidatureFieldList) return [configuration];
      if (channel === channels.candidatureFilter) return [candidatureId];
      if (channel === channels.candidatureFieldCreate) return configuration;
      if (channel === channels.candidatureFieldPreferencesUpdate) return configuration;
      if (channel === channels.candidatureFieldValueSet) {
        return {
          ...record,
          values: [
            {
              candidatureId,
              fieldId,
              value: 1500,
              createdAt: "2026-09-04T00:00:00.000Z",
              updatedAt: "2026-09-04T00:00:00.000Z",
            },
          ],
        };
      }
      if (channel === channels.candidatureSourceList) return [];
      if (channel === aiChannels.connectionCurrent) return null;
      if (channel === aiChannels.jobExtract) {
        return { proposals: [{ fieldId, value: 1500 }] };
      }
      if (channel === aiChannels.fieldDiscover) {
        return {
          proposal: { fieldId, value: 1500 },
          existingValuePresent: false,
        };
      }
      return input;
    });

    const api = createDesktopApi(invoke);
    await expect(api.system.info()).resolves.toMatchObject({ electronVersion: "44.1.1" });
    await expect(api.workspace.current()).resolves.toBeNull();
    await expect(api.candidatures.list()).resolves.toEqual([record]);
    await expect(api.candidatures.listFields()).resolves.toEqual([configuration]);
    await expect(
      api.candidatures.createField({
        label: "Minimum flight hours",
        description: "Minimum total flight hours requested.",
        valueType: "number",
        cardinality: "one",
        choices: [],
        enabled: true,
      }),
    ).resolves.toEqual(configuration);
    await expect(
      api.candidatures.filter({
        fieldId,
        operator: "greater_than_or_equal",
        value: 1200,
      }),
    ).resolves.toEqual([candidatureId]);
    await expect(
      api.candidatures.setFieldValue({ candidatureId, fieldId, value: 1500 }),
    ).resolves.toMatchObject({ id: candidatureId });
    await expect(
      api.ai.extractJob({
        sourceTitle: "Pilot vacancy",
        sourceUrl: "",
        sourceText: "Minimum 1,500 hours.",
      }),
    ).resolves.toEqual({ proposals: [{ fieldId, value: 1500 }] });
    await expect(
      api.ai.discoverField({ candidatureId, fieldId, sourceIds: [sourceId] }),
    ).resolves.toEqual({
      proposal: { fieldId, value: 1500 },
      existingValuePresent: false,
    });

    expect(invoke).toHaveBeenCalledWith(channels.candidatureFieldList);
    expect(invoke).toHaveBeenCalledWith(channels.candidatureFilter, {
      fieldId,
      operator: "greater_than_or_equal",
      value: 1200,
    });
    expect(invoke).toHaveBeenCalledWith(channels.candidatureFieldValueSet, {
      candidatureId,
      fieldId,
      value: 1500,
    });
    expect(invoke).toHaveBeenCalledWith(aiChannels.jobExtract, {
      sourceTitle: "Pilot vacancy",
      sourceUrl: "",
      sourceText: "Minimum 1,500 hours.",
    });
  });

  it("rejects malformed privileged responses and invalid field, value, filter, Source and AI input", async () => {
    const invoke = vi.fn(async () => ({ schemaVersion: 1 }));
    const api = createDesktopApi(invoke);

    await expect(api.workspace.current()).rejects.toThrow();
    await expect(
      api.candidatures.createField({
        label: "",
        description: "",
        valueType: "text",
        cardinality: "one",
        choices: [],
        enabled: true,
      }),
    ).rejects.toThrow();
    await expect(
      api.candidatures.setFieldValue({ candidatureId: "invalid", fieldId, value: 1 }),
    ).rejects.toThrow();
    await expect(
      api.candidatures.filter({ fieldId: "invalid", operator: "is_set" }),
    ).rejects.toThrow();
    await expect(
      api.candidatures.addSource({
        candidatureId: "invalid",
        kind: "other",
        title: "Source",
        url: "",
        sourceText: "Evidence",
      }),
    ).rejects.toThrow();
    await expect(
      api.ai.extractJob({ sourceTitle: "", sourceUrl: "", sourceText: "" }),
    ).rejects.toThrow();
    await expect(
      api.ai.discoverField({ candidatureId, fieldId, sourceIds: [] }),
    ).rejects.toThrow();
  });
});
