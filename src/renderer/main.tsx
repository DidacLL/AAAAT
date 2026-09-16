import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { AiConnectionDesktopApi } from "../shared/ai-connection-contracts";
import type { AiPromptDesktopApi } from "../shared/ai-prompt-contracts";
import type { ArtifactDesktopApi } from "../shared/artifact-contracts";
import type { CandidatureActivityDesktopApi } from "../shared/candidature-activity-contracts";
import type { CandidatureOpportunityResearchAccessDesktopApi } from "../shared/candidature-opportunity-research-access-contracts";
import type { CandidatureSearchDesktopApi } from "../shared/candidature-search-contracts";
import type {
  CareerContextAiDisclosure,
  CareerContextAiDisclosureDesktopApi,
  CareerContextAiDisclosureUpdate,
} from "../shared/career-context-ai-disclosure-contracts";
import type { CandidatureFieldConfiguration, CandidatureInput, CandidatureRecord, CandidatureUpdate, CareerContext, DesktopApi, ProfileSnapshot } from "../shared/contracts";
import type { CvContentAccessDesktopApi } from "../shared/cv-content-access-contracts";
import type { CvDescriptorDesktopApi } from "../shared/cv-descriptor-contracts";
import type { DocumentOutputDesktopApi } from "../shared/document-output-contracts";
import type {
  ProfileAiContextDesktopApi,
  ProfileAiContextUpdate,
} from "../shared/profile-ai-context-contracts";
import type {
  SetupAssistantAccessUpdate,
  SetupAssistantDesktopApi,
} from "../shared/setup-assistant-contracts";
import type { SetupEnvironmentDesktopApi } from "../shared/setup-environment-contracts";
import type { WorkspaceRecoveryDesktopApi } from "../shared/workspace-recovery-contracts";
import { App } from "./App";
import "./styles.css";
import "./candidatures.css";
import "./professional-information.css";

const emptyProfile: ProfileSnapshot = { items: [], variants: [] };
const emptyCareerContext: CareerContext = {
  careerDirection: "",
  objectives: "",
  constraints: "",
  targetRoles: "",
  targetMarketsLocations: "",
  workPreferences: "",
  applicationWritingPreferences: "",
};
const defaultCareerContextAiDisclosure: CareerContextAiDisclosure = {
  careerDirection: true,
  objectives: true,
  constraints: true,
  targetRoles: true,
  targetMarketsLocations: true,
  workPreferences: true,
  applicationWritingPreferences: true,
};
const previewUnavailable = async (): Promise<never> => {
  throw new Error("Create preview data in the desktop app for this operation.");
};

const previewFieldIds = {
  organisation: "00000000-0000-4000-8000-000000000101",
  role: "00000000-0000-4000-8000-000000000102",
  location: "00000000-0000-4000-8000-000000000103",
  compensation: "00000000-0000-4000-8000-000000000104",
} as const;

function previewFields(): CandidatureFieldConfiguration[] {
  const now = new Date().toISOString();
  return [
    [previewFieldIds.organisation, "organisation", "Organisation", "Company or organisation", 0],
    [previewFieldIds.role, "role", "Role", "Position or opportunity", 1],
    [previewFieldIds.location, "location", "Location", "Location and working arrangement", 2],
    [previewFieldIds.compensation, "compensation", "Compensation", "Salary or compensation information", 3],
  ].map(([id, systemKey, label, description, order]) => ({
    definition: { id: String(id), systemKey: String(systemKey), label: String(label), description: String(description), valueType: "text" as const, cardinality: "one" as const, choices: [], enabled: true, createdAt: now, updatedAt: now },
    preferences: { fieldId: String(id), focusVisible: true, focusOrder: Number(order), focusProminence: "normal" as const, identityOrder: Number(order), aiDiscovery: true, aiContextMode: "expose" as const },
  }));
}

function previewDemoApplications(): CandidatureRecord[] {
  const organisations = ["Aster Dynamics", "Boreal Systems", "Cinder Works", "Deepfield Research", "Eon Transit", "Faro Robotics", "Granite Health", "Helix Energy", "Ion Cartography", "Juniper Studio", "Kepler Tools", "Morrow Labs"];
  const roles = ["Backend Engineer", "Platform Engineer", "Product Engineer", "Data Engineer", "Systems Engineer", "Developer Tools Engineer", "ML Engineer", "Technical Product Specialist"];
  const locations = ["Madrid · Hybrid", "Barcelona · On site", "Spain · Remote", "Remote EU", "Valencia · Hybrid", "Bilbao · On site"];
  return Array.from({ length: 128 }, (_, index) => {
    const suffix = String(index + 1).padStart(12, "0");
    const id = `00000000-0000-4000-8000-${suffix}`;
    const createdAt = new Date(Date.now() - index * 3_600_000).toISOString();
    const organisation = organisations[index % organisations.length]!;
    const role = roles[index % roles.length]!;
    const location = locations[index % locations.length]!;
    const values = [
      [previewFieldIds.organisation, organisation],
      [previewFieldIds.role, role],
      [previewFieldIds.location, location],
      ...(index % 4 === 0 ? [[previewFieldIds.compensation, `€${String(42 + (index % 8) * 4)}k–€${String(52 + (index % 8) * 4)}k`]] : []),
    ].map(([fieldId, value]) => ({ candidatureId: id, fieldId: String(fieldId), value: String(value), createdAt, updatedAt: createdAt }));
    return { id, archived: false, createdAt, updatedAt: createdAt, label: `${organisation} · ${role}`, sourceSearchText: index % 3 === 0 ? `${role} opportunity at ${organisation}. ${location}.` : "", values, documentIds: index < 2 ? [`10000000-0000-4000-8000-${suffix}`] : [], tagIds: [] };
  });
}

function createPreviewApi(): DesktopApi &
  AiConnectionDesktopApi &
  AiPromptDesktopApi &
  ArtifactDesktopApi &
  CandidatureActivityDesktopApi &
  CandidatureOpportunityResearchAccessDesktopApi &
  CandidatureSearchDesktopApi &
  CareerContextAiDisclosureDesktopApi &
  CvContentAccessDesktopApi &
  CvDescriptorDesktopApi &
  DocumentOutputDesktopApi &
  ProfileAiContextDesktopApi &
  SetupAssistantDesktopApi &
  SetupEnvironmentDesktopApi &
  WorkspaceRecoveryDesktopApi {
  let careerContextAiDisclosure = defaultCareerContextAiDisclosure;
  let setupAssistantAccess = {
    installerActionsAllowed: false,
    configuratorActionsAllowed: false,
  };
  let previewWorkspace: { rootPath: string } | null = null;
  let previewRecentPath: string | null = null;
  const fields = previewFields();
  let applications: CandidatureRecord[] = [];
  let previewDemo = false;
  return Object.freeze({
    system: Object.freeze({
      info: async () => ({
        appVersion: "browser-preview",
        electronVersion: "browser-preview",
        nodeVersion: "browser-preview",
      }),
    }),
    workspace: Object.freeze({
      current: async () => previewWorkspace,
      recent: async () => previewRecentPath,
      continueRecent: async () => {
        previewWorkspace = previewRecentPath ? { rootPath: previewRecentPath } : null;
        return previewWorkspace;
      },
      close: async () => { previewWorkspace = null; },
      delete: async () => { previewWorkspace = null; previewRecentPath = null; },
      choose: async () => {
        previewRecentPath = "/Users/example/AAAAT Workspace";
        previewWorkspace = { rootPath: previewRecentPath };
        previewDemo = false;
        applications = [];
        return previewWorkspace;
      },
      createDemo: async () => {
        previewRecentPath = "/Users/example/AAAAT Demo Workspace";
        previewWorkspace = { rootPath: previewRecentPath };
        previewDemo = true;
        applications = previewDemoApplications();
        return previewWorkspace;
      },
      reset: async () => ({ rootPath: "/Users/example/AAAAT Workspace" }),
      status: async () => ({ demo: previewDemo }),
    }),
    profile: Object.freeze({
      current: async () => emptyProfile,
      addItem: async () => emptyProfile,
      updateItem: async () => emptyProfile,
      removeItem: async () => emptyProfile,
      createVariant: async () => emptyProfile,
      updateVariant: async () => emptyProfile,
      removeVariant: async () => emptyProfile,
      configureVariantItem: async () => emptyProfile,
      reorderVariant: async () => emptyProfile,
      resolveVariant: previewUnavailable,
    }),
    profileAiContext: Object.freeze({
      current: async (itemId: string) => ({ itemId, aiContextMode: "expose" as const }),
      update: async (input: ProfileAiContextUpdate) => input,
    }),
    careerContext: Object.freeze({
      current: async () => emptyCareerContext,
      update: async (update: CareerContext) => update,
    }),
    careerContextAiDisclosure: Object.freeze({
      current: async () => careerContextAiDisclosure,
      update: async (input: CareerContextAiDisclosureUpdate) => {
        careerContextAiDisclosure = input;
        return careerContextAiDisclosure;
      },
    }),
    documents: Object.freeze({
      list: async () => [],
      create: previewUnavailable,
      update: previewUnavailable,
      remove: async () => [],
      configureItem: previewUnavailable,
      applySelection: previewUnavailable,
      reorder: previewUnavailable,
      resolve: previewUnavailable,
      render: previewUnavailable,
      regenerate: previewUnavailable,
      exportProject: async () => null,
    }),
    documentOutput: Object.freeze({
      open: previewUnavailable,
      openProject: previewUnavailable,
    }),
    cvContentAccess: Object.freeze({
      current: previewUnavailable,
      update: previewUnavailable,
      updateRender: previewUnavailable,
    }),
    cvDescriptors: Object.freeze({
      current: previewUnavailable,
      update: previewUnavailable,
    }),
    candidatures: Object.freeze({
      list: async () => applications,
      create: async (input: CandidatureInput) => {
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        const values = input.values.map((item) => ({ ...item, candidatureId: id, createdAt: now, updatedAt: now }));
        const organisation = values.find((item) => item.fieldId === previewFieldIds.organisation)?.value;
        const role = values.find((item) => item.fieldId === previewFieldIds.role)?.value;
        const label = [organisation, role].filter((value): value is string => typeof value === "string" && Boolean(value)).join(" · ") || "Saved application";
        const created: CandidatureRecord = { id, archived: false, createdAt: now, updatedAt: now, label, sourceSearchText: input.source ? `${input.source.title} ${input.source.url} ${input.source.sourceText}` : "", values, documentIds: [], tagIds: [] };
        applications = [created, ...applications];
        return created;
      },
      update: async ({ id, archived }: CandidatureUpdate) => {
        const current = applications.find((item) => item.id === id);
        if (!current) throw new Error("Application not found");
        const updated = { ...current, archived, updatedAt: new Date().toISOString() };
        applications = applications.map((item) => item.id === id ? updated : item);
        return updated;
      },
      filter: async () => applications.map((application) => application.id),
      listFields: async () => fields,
      createField: previewUnavailable,
      updateField: previewUnavailable,
      deleteField: async () => [],
      updateFieldPreferences: previewUnavailable,
      setFieldValue: previewUnavailable,
      clearFieldValue: previewUnavailable,
      listSources: async () => [],
      addSource: previewUnavailable,
      updateSource: previewUnavailable,
      removeSource: previewUnavailable,
      setDocuments: previewUnavailable,
      listTags: async () => [],
      createTag: previewUnavailable,
      updateTag: previewUnavailable,
      setTags: previewUnavailable,
    }),
    candidatureActivity: Object.freeze({ list: async () => [] }),
    candidatureOpportunityResearchAccess: Object.freeze({
      current: previewUnavailable,
      update: previewUnavailable,
    }),
    candidatureSearch: Object.freeze({ search: async () => [] }),
    aiConnections: Object.freeze({
      list: async () => [],
      save: previewUnavailable,
      setDefault: previewUnavailable,
      remove: async () => [],
      validateOperation: previewUnavailable,
      setOperationDefault: previewUnavailable,
      exportPortable: previewUnavailable,
      importPortable: previewUnavailable,
    }),
    aiPrompts: Object.freeze({
      list: async () => [],
      save: async () => [],
      reset: async () => [],
    }),
    artifacts: Object.freeze({
      list: async () => [],
      capture: previewUnavailable,
      captureCombined: previewUnavailable,
      open: previewUnavailable,
    }),
    setupAssistant: Object.freeze({
      access: async () => setupAssistantAccess,
      updateAccess: async (update: SetupAssistantAccessUpdate) => {
        setupAssistantAccess = update;
        return setupAssistantAccess;
      },
      runRenderingSelfTest: previewUnavailable,
    }),
    setupEnvironment: Object.freeze({
      current: previewUnavailable,
      externalConnection: previewUnavailable,
    }),
    workspaceRecovery: Object.freeze({
      backup: previewUnavailable,
      restore: previewUnavailable,
    }),
  });
}

if (import.meta.env.DEV && !("aaaat" in window)) {
  Object.defineProperty(window, "aaaat", {
    configurable: false,
    value: createPreviewApi(),
    writable: false,
  });
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("AAAAT renderer root is missing");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
