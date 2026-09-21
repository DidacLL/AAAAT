import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "../src/preload/api";
import { createCandidatureOpportunityResearchAccessDesktopApi } from "../src/preload/candidature-opportunity-research-access-api";
import { createDocumentDomainDesktopApi } from "../src/preload/document-domain-api";
import { createWorkspaceRecoveryDesktopApi } from "../src/preload/workspace-recovery-api";
import { aiChannels } from "../src/shared/ai-contracts";
import { channels } from "../src/shared/contracts";
import { candidatureOpportunityResearchAccessChannels } from "../src/shared/candidature-opportunity-research-access-contracts";
import { documentDomainChannels } from "../src/shared/document-domain-contracts";
import { workspaceRecoveryChannels } from "../src/shared/workspace-recovery-contracts";

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
    favourite: false,
    favouriteOrder: null,
    presentationSize: "normal" as const,
    aiUseAllowed: true,
  },
};

const record = {
  id: candidatureId,
  archived: false,
  createdAt: "2026-09-04T00:00:00.000Z",
  updatedAt: "2026-09-04T00:00:00.000Z",
  sourceSearchText: "",
  values: [],
  tagIds: [],
};

describe("desktop preload boundary", () => {
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
      if (channel === channels.candidatureFavouriteOrderUpdate) return [configuration];
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
      if (channel === aiChannels.opportunityReviewPreview) {
        return {
          connection: {
            name: "Remote provider",
            endpoint: "https://models.example.test/v1",
            model: "review-model",
          },
          projectedContext: {
            candidature: { label: "Candidature", information: [], sources: [] },
            profileItems: [],
          },
        };
      }
      if (channel === aiChannels.opportunityReview) {
        return {
          summary: "The supplied information is relevant evidence.",
          relevantEvidence: ["TypeScript"],
          uncertainties: [],
          questions: [],
        };
      }
      if (channel === aiChannels.jobExtract) {
        return { proposals: [{ fieldId, value: 1500 }], newFields: [] };
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
      api.candidatures.reorderFavouriteFields([fieldId]),
    ).resolves.toEqual([configuration]);
    await expect(
      api.ai.extractJob({
        sourceTitle: "Pilot vacancy",
        sourceUrl: "",
        sourceText: "Minimum 1,500 hours.",
      }),
    ).resolves.toEqual({ proposals: [{ fieldId, value: 1500 }], newFields: [] });
    await expect(
      api.ai.previewOpportunityReview({ candidatureId }),
    ).resolves.toMatchObject({ connection: { name: "Remote provider" } });
    await expect(api.ai.reviewOpportunity({ candidatureId })).resolves.toEqual({
      summary: "The supplied information is relevant evidence.",
      relevantEvidence: ["TypeScript"],
      uncertainties: [],
      questions: [],
    });
    await expect(
      api.ai.discoverField({ candidatureId, fieldId, sourceIds: [sourceId] }),
    ).resolves.toEqual({
      proposal: { fieldId, value: 1500 },
      existingValuePresent: false,
    });

    expect(invoke).toHaveBeenCalledWith(channels.candidatureFieldList);
    expect(invoke).toHaveBeenCalledWith(
      channels.candidatureFavouriteOrderUpdate,
      { fieldIds: [fieldId] },
    );
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
    expect(invoke).toHaveBeenCalledWith(aiChannels.opportunityReviewPreview, {
      candidatureId,
    });
    expect(invoke).toHaveBeenCalledWith(aiChannels.opportunityReview, {
      candidatureId,
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

  it("keeps narrow privileged capabilities narrow while validating their boundary", async () => {
    const invoke = vi.fn(async (channel: string, input?: unknown) => {
      if (channel === candidatureOpportunityResearchAccessChannels.current) {
        return { candidatureId, allowed: true };
      }
      if (channel === candidatureOpportunityResearchAccessChannels.update) return input;
      if (channel === workspaceRecoveryChannels.backup) return { status: "backed_up" };
      if (channel === workspaceRecoveryChannels.restore) return { status: "cancelled" };
      if (channel === documentDomainChannels.exportRenderedCv) {
        return { exportedPath: "/tmp/portable-rendered-cv" };
      }
      if (channel === documentDomainChannels.renderLetter) {
        return {
          id: sourceId,
          coverLetterId: candidatureId,
          candidatureId: null,
          title: "Standalone letter",
          snapshot: {
            candidatureId: null,
            title: "Standalone letter",
            bodyParagraphs: ["Retained body."],
          },
          createdAt: "2026-09-21T00:00:00.000Z",
          hasPdf: true,
        };
      }
      if (
        channel === documentDomainChannels.openRenderedLetter ||
        channel === documentDomainChannels.packetOpen
      ) {
        return { opened: true };
      }
      if (channel === documentDomainChannels.exportRenderedLetter) {
        return { exportedPath: "/tmp/portable-rendered-letter" };
      }
      if (channel === documentDomainChannels.packetExport) {
        return { exportedPath: "/tmp/portable-packet" };
      }
      return null;
    });

    const research = createCandidatureOpportunityResearchAccessDesktopApi(invoke);
    const recovery = createWorkspaceRecoveryDesktopApi(invoke);
    const documents = createDocumentDomainDesktopApi(invoke);

    await expect(
      research.candidatureOpportunityResearchAccess.current(candidatureId),
    ).resolves.toEqual({ candidatureId, allowed: true });
    await expect(
      research.candidatureOpportunityResearchAccess.update({ candidatureId, allowed: false }),
    ).resolves.toEqual({ candidatureId, allowed: false });
    await expect(recovery.workspaceRecovery.backup()).resolves.toEqual({ status: "backed_up" });
    await expect(recovery.workspaceRecovery.restore()).resolves.toEqual({ status: "cancelled" });
    await expect(documents.documentDomain.exportRenderedCv(candidatureId)).resolves.toEqual({
      exportedPath: "/tmp/portable-rendered-cv",
    });
    await expect(documents.documentDomain.renderLetter(candidatureId)).resolves.toMatchObject({
      id: sourceId,
      coverLetterId: candidatureId,
      hasPdf: true,
    });
    await expect(documents.documentDomain.openRenderedLetter(sourceId)).resolves.toEqual({
      opened: true,
    });
    await expect(documents.documentDomain.exportRenderedLetter(sourceId)).resolves.toEqual({
      exportedPath: "/tmp/portable-rendered-letter",
    });
    await expect(documents.documentDomain.exportPacket(sourceId)).resolves.toEqual({
      exportedPath: "/tmp/portable-packet",
    });

    expect(invoke).toHaveBeenCalledWith(
      candidatureOpportunityResearchAccessChannels.current,
      candidatureId,
    );
    expect(invoke).toHaveBeenCalledWith(
      candidatureOpportunityResearchAccessChannels.update,
      { candidatureId, allowed: false },
    );
    expect(invoke).toHaveBeenCalledWith(workspaceRecoveryChannels.backup);
    expect(invoke).toHaveBeenCalledWith(workspaceRecoveryChannels.restore);
    expect(invoke).toHaveBeenCalledWith(documentDomainChannels.exportRenderedCv, candidatureId);
    expect(invoke).toHaveBeenCalledWith(documentDomainChannels.renderLetter, candidatureId);
    expect(invoke).toHaveBeenCalledWith(documentDomainChannels.openRenderedLetter, sourceId);
    expect(invoke).toHaveBeenCalledWith(documentDomainChannels.exportRenderedLetter, sourceId);
    expect(invoke).toHaveBeenCalledWith(documentDomainChannels.packetExport, sourceId);

    const malformedResearch = createCandidatureOpportunityResearchAccessDesktopApi(
      vi.fn(async () => ({ candidatureId, allowed: "yes" })),
    );
    await expect(
      malformedResearch.candidatureOpportunityResearchAccess.current(candidatureId),
    ).rejects.toThrow();
    await expect(
      research.candidatureOpportunityResearchAccess.current("not-a-uuid"),
    ).rejects.toThrow();
  });

});
