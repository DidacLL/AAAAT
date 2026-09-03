import { describe, expect, it, vi } from "vitest";

import { createDesktopApi } from "../src/preload/api";
import { aiChannels } from "../src/shared/ai-contracts";
import { channels } from "../src/shared/contracts";

const emptyProfile = { items: [], variants: [] };

describe("desktop preload API", () => {
  it("exposes only fixed workspace, product, and AI intentions", async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === channels.systemInfo) {
        return { appVersion: "2.0.0", electronVersion: "44.1.1", nodeVersion: "24.19.0" };
      }
      if (channel === channels.workspaceCurrent || channel === aiChannels.connectionCurrent) return null;
      if (channel === channels.workspaceChoose) return { rootPath: "/tmp/aaaat-workspace" };
      if (
        channel === channels.documentList ||
        channel === channels.candidatureList ||
        channel === channels.candidatureListConcepts
      ) return [];
      if (channel === aiChannels.jobExtract) {
        return { company: "Example", role: "Engineer", location: "", workMode: "", salaryText: "" };
      }
      return emptyProfile;
    });

    const api = createDesktopApi(invoke);
    expect(Object.keys(api)).toEqual(["system", "workspace", "profile", "documents", "candidatures", "ai"]);
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
    ]);

    await expect(api.system.info()).resolves.toMatchObject({ electronVersion: "44.1.1" });
    await expect(api.workspace.current()).resolves.toBeNull();
    await expect(api.workspace.choose("create")).resolves.toEqual({ rootPath: "/tmp/aaaat-workspace" });
    await expect(api.profile.addItem({ kind: "skill", title: "TypeScript" })).resolves.toEqual(emptyProfile);
    await expect(api.documents.list()).resolves.toEqual([]);
    await expect(api.candidatures.list()).resolves.toEqual([]);
    await expect(api.candidatures.listConcepts()).resolves.toEqual([]);
    await expect(api.ai.connection()).resolves.toBeNull();
    await expect(
      api.ai.extractJob({ sourceText: "Example job", source: "", sourceUrl: "" }),
    ).resolves.toMatchObject({ company: "Example", role: "Engineer" });

    expect(invoke).toHaveBeenNthCalledWith(1, channels.systemInfo);
    expect(invoke).toHaveBeenNthCalledWith(2, channels.workspaceCurrent);
    expect(invoke).toHaveBeenNthCalledWith(3, channels.workspaceChoose, "create");
    expect(invoke).toHaveBeenNthCalledWith(4, channels.profileAddItem, { kind: "skill", title: "TypeScript" });
    expect(invoke).toHaveBeenNthCalledWith(5, channels.documentList);
    expect(invoke).toHaveBeenNthCalledWith(6, channels.candidatureList);
    expect(invoke).toHaveBeenNthCalledWith(7, channels.candidatureListConcepts);
    expect(invoke).toHaveBeenNthCalledWith(8, aiChannels.connectionCurrent);
    expect(invoke).toHaveBeenNthCalledWith(9, aiChannels.jobExtract, {
      sourceText: "Example job",
      source: "",
      sourceUrl: "",
    });
  });

  it("rejects malformed privileged responses and invalid domain or AI input", async () => {
    const api = createDesktopApi(async () => ({ schemaVersion: 1 }));
    await expect(api.workspace.current()).rejects.toThrow();
    await expect(api.profile.addItem({ kind: "skill", title: "" })).rejects.toThrow();
    await expect(
      api.documents.create({
        kind: "cv",
        title: "",
        variantId: "00000000-0000-4000-8000-000000000001",
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
      api.ai.saveConnection({
        name: "Model",
        endpoint: "invalid",
        model: "fixture",
      }),
    ).rejects.toThrow();
    await expect(
      api.ai.previewFit({
        candidatureId: "invalid",
        identityPrivacy: "token",
        contactPrivacy: "omit",
      }),
    ).rejects.toThrow();
    await expect(api.ai.extractJob({ sourceText: "", source: "", sourceUrl: "" })).rejects.toThrow();
  });
});
