import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "../src/preload/api";
import { aiChannels } from "../src/shared/ai-contracts";
import { channels } from "../src/shared/contracts";

const emptyProfile = { items: [], variants: [] };
const emptyCareerContext = {
  careerDirection: "",
  objectives: "",
  constraints: "",
  targetRoles: "",
  targetMarketsLocations: "",
  workPreferences: "",
  applicationWritingPreferences: "",
};
const candidatureId = "00000000-0000-4000-8000-000000000001";
const documentId = "00000000-0000-4000-8000-000000000002";
const itemId = "00000000-0000-4000-8000-000000000003";

describe("desktop preload API", () => {
  it("exposes only fixed workspace, product, and AI intentions", async () => {
    const invoke = vi.fn(async (channel: string, input?: unknown) => {
      if (channel === channels.systemInfo) {
        return { appVersion: "2.0.0", electronVersion: "44.1.1", nodeVersion: "24.19.0" };
      }
      if (channel === channels.workspaceCurrent || channel === aiChannels.connectionCurrent) return null;
      if (channel === channels.workspaceChoose) return { rootPath: "/tmp/aaaat-workspace" };
      if (channel === channels.careerContextCurrent) return emptyCareerContext;
      if (channel === channels.careerContextUpdate) return input;
      if (
        channel === channels.documentList ||
        channel === channels.candidatureList ||
        channel === channels.candidatureListConcepts
      ) return [];
      if (channel === aiChannels.jobExtract) {
        return { company: "Example", role: "Engineer", location: "", workMode: "", salaryText: "" };
      }
      if (channel === aiChannels.variantRecommend) {
        return { variantId: itemId, rationale: "Matches." };
      }
      if (channel === aiChannels.cvTailor) {
        return { recommendations: [{ itemId, rationale: "Relevant." }] };
      }
      if (channel === aiChannels.coverLetterDraft) {
        return {
          recipient: "Hiring team",
          subject: "Application",
          bodyParagraphs: ["Paragraph."],
          closing: "Regards",
        };
      }
      return emptyProfile;
    });

    const api = createDesktopApi(invoke);
    expect(Object.keys(api)).toEqual([
      "system",
      "workspace",
      "profile",
      "careerContext",
      "documents",
      "candidatures",
      "ai",
    ]);
    expect(Object.keys(api.system)).toEqual(["info"]);
    expect(Object.keys(api.workspace)).toEqual(["current", "choose"]);
    expect(Object.keys(api.profile)).toEqual([
      "current",
      "addItem",
      "updateItem",
      "removeItem",
      "createVariant",
      "updateVariant",
      "removeVariant",
      "configureVariantItem",
      "reorderVariant",
      "resolveVariant",
    ]);
    expect(Object.keys(api.careerContext)).toEqual(["current", "update"]);
    expect(Object.keys(api.documents)).toEqual([
      "list",
      "create",
      "update",
      "remove",
      "configureItem",
      "reorder",
      "resolve",
      "render",
      "regenerate",
      "exportProject",
    ]);
    expect(Object.keys(api.candidatures)).toEqual([
      "list",
      "create",
      "update",
      "setDocuments",
      "listConcepts",
      "createConcept",
      "updateConcept",
      "setConcepts",
    ]);
    expect(Object.keys(api.ai)).toEqual([
      "connection",
      "saveConnection",
      "previewFit",
      "assessFit",
      "extractJob",
      "recommendVariant",
      "tailorCv",
      "draftCoverLetter",
    ]);

    await expect(api.system.info()).resolves.toMatchObject({ electronVersion: "44.1.1" });
    await expect(api.workspace.current()).resolves.toBeNull();
    await expect(api.workspace.choose("create")).resolves.toEqual({ rootPath: "/tmp/aaaat-workspace" });
    await expect(api.profile.addItem({ kind: "skill", title: "TypeScript" })).resolves.toEqual(emptyProfile);
    await expect(api.careerContext.current()).resolves.toEqual(emptyCareerContext);
    await expect(
      api.careerContext.update({ ...emptyCareerContext, constraints: "No relocation" }),
    ).resolves.toMatchObject({ constraints: "No relocation" });
    await expect(api.documents.list()).resolves.toEqual([]);
    await expect(api.candidatures.list()).resolves.toEqual([]);
    await expect(api.candidatures.listConcepts()).resolves.toEqual([]);
    await expect(api.ai.connection()).resolves.toBeNull();
    await expect(
      api.ai.extractJob({ sourceText: "Example job", source: "", sourceUrl: "" }),
    ).resolves.toMatchObject({ company: "Example", role: "Engineer" });
    await expect(api.ai.recommendVariant({ candidatureId })).resolves.toMatchObject({
      rationale: "Matches.",
    });
    await expect(api.ai.tailorCv({ candidatureId, documentId })).resolves.toEqual({
      recommendations: [{ itemId, rationale: "Relevant." }],
    });
    await expect(api.ai.draftCoverLetter({ candidatureId, documentId })).resolves.toMatchObject({
      subject: "Application",
    });

    expect(invoke).toHaveBeenNthCalledWith(1, channels.systemInfo);
    expect(invoke).toHaveBeenNthCalledWith(2, channels.workspaceCurrent);
    expect(invoke).toHaveBeenNthCalledWith(3, channels.workspaceChoose, "create");
    expect(invoke).toHaveBeenNthCalledWith(4, channels.profileAddItem, { kind: "skill", title: "TypeScript" });
    expect(invoke).toHaveBeenNthCalledWith(5, channels.careerContextCurrent);
    expect(invoke).toHaveBeenNthCalledWith(6, channels.careerContextUpdate, {
      ...emptyCareerContext,
      constraints: "No relocation",
    });
    expect(invoke).toHaveBeenNthCalledWith(7, channels.documentList);
    expect(invoke).toHaveBeenNthCalledWith(8, channels.candidatureList);
    expect(invoke).toHaveBeenNthCalledWith(9, channels.candidatureListConcepts);
    expect(invoke).toHaveBeenNthCalledWith(10, aiChannels.connectionCurrent);
    expect(invoke).toHaveBeenNthCalledWith(11, aiChannels.jobExtract, {
      sourceText: "Example job",
      source: "",
      sourceUrl: "",
    });
    expect(invoke).toHaveBeenNthCalledWith(12, aiChannels.variantRecommend, { candidatureId });
    expect(invoke).toHaveBeenNthCalledWith(13, aiChannels.cvTailor, { candidatureId, documentId });
    expect(invoke).toHaveBeenNthCalledWith(14, aiChannels.coverLetterDraft, {
      candidatureId,
      documentId,
    });
  });

  it("rejects malformed privileged responses and invalid domain or AI input", async () => {
    const api = createDesktopApi(async () => ({ schemaVersion: 1 }));
    await expect(api.workspace.current()).rejects.toThrow();
    await expect(api.careerContext.current()).rejects.toThrow();
    await expect(api.profile.addItem({ kind: "skill", title: "" })).rejects.toThrow();
    await expect(
      api.documents.create({
        kind: "cv",
        title: "",
        variantId: candidatureId,
        engine: "pdflatex",
        bodyParagraphs: [],
      }),
    ).rejects.toThrow();
    await expect(
      api.candidatures.update({
        id: "invalid",
        company: "",
        role: "",
        location: "",
        workMode: "",
        salaryText: "",
        source: "",
        sourceUrl: "",
        sourceText: "",
        status: "saved",
        applicationDate: "",
        nextAction: "",
        nextActionDate: "",
        notes: "",
        archived: false,
      }),
    ).rejects.toThrow();
    await expect(api.candidatures.createConcept({ name: "", definition: "", aliases: [] })).rejects.toThrow();
    await expect(
      api.ai.saveConnection({ name: "Model", endpoint: "invalid", model: "fixture" }),
    ).rejects.toThrow();
    await expect(
      api.ai.previewFit({
        candidatureId: "invalid",
        identityPrivacy: "token",
        contactPrivacy: "omit",
      }),
    ).rejects.toThrow();
    await expect(api.ai.extractJob({ sourceText: "", source: "", sourceUrl: "" })).rejects.toThrow();
    await expect(api.ai.recommendVariant({ candidatureId: "invalid" })).rejects.toThrow();
    await expect(api.ai.tailorCv({ candidatureId: "invalid", documentId })).rejects.toThrow();
    await expect(api.ai.draftCoverLetter({ candidatureId, documentId: "invalid" })).rejects.toThrow();
  });
});
