import type { CoverLetterDraft, CvWritingField } from "../shared/ai-contracts";
import { operationReferenceSchema } from "../shared/ai-contracts";
import type {
  CvContent,
  CvTemplateItem,
  WorkingCvItem,
  WorkingCvRecord,
} from "../shared/document-domain-contracts";
import {
  externalApplicationCoverLetterCreateResultSchema,
  externalApplicationCvCreateResultSchema,
  externalApplicationDocumentTargetSchema,
  externalCvFieldContextSchema,
  externalDocumentAppliedResultSchema,
  externalDocumentRenderResultSchema,
  externalDocumentRenderingStatusSchema,
  externalReusableCvChoicesSchema,
  externalReusableCvContentSchema,
  type ExternalApplicationCvCreateResult,
  type ExternalCvFieldContext,
  type ExternalReusableCvBlock,
  type ExternalReusableCvContent,
} from "../shared/external-document-contracts";
import { cvWritingContext, restorePrivateValues } from "./ai-service";
import { selectedApplicationDocumentExternalAccessId } from "./application-document-external-access-service";
import { BUILTIN_BLUEPRINT_SOURCE } from "./document-blueprints";
import {
  createCoverLetter,
  createWorkingCv,
  listDocumentCollections,
  renderCoverLetter,
  renderWorkingCv,
  updateCoverLetter,
  updateWorkingCv,
} from "./document-domain-service";
import { listProfileItemAiContextPreferences } from "./profile-ai-context-service";
import { getProfile } from "./profile-service";
import { listProfileVariants } from "./profile-variant-service";
import { getSetupEnvironmentSnapshot } from "./setup-environment-service";

type OperationReference = ReturnType<typeof operationReferenceSchema.parse>;
type PrivateReplacements = Map<string, string | null>;

interface CvFieldBinding {
  readonly cvRef: OperationReference;
  readonly workingCvId: string;
  readonly itemId: string;
  readonly field: CvWritingField;
}

interface CvFieldContextBinding {
  readonly replacements: PrivateReplacements;
  readonly maxLength: number;
}

const visibleCvFields = Object.freeze([
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "description", label: "Description" },
  { key: "startDate", label: "Start date" },
  { key: "endDate", label: "End date" },
  { key: "url", label: "Link" },
] as const);

const writableCvFields = Object.freeze([
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "description", label: "Description" },
] as const satisfies readonly { readonly key: CvWritingField; readonly label: string }[]);

const privatePlaceholderPattern = /\[USERPRIVATE:[^\]]+\]/u;

export class ExternalDocumentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExternalDocumentServiceError";
  }
}

function contentFromTemplateItem(
  item: CvTemplateItem,
  profile: ReadonlyMap<string, ReturnType<typeof getProfile>["items"][number]>,
  variants: ReadonlyMap<string, ReturnType<typeof listProfileVariants>[number]>,
): CvContent {
  if (item.sourceMode === "custom" || item.sourceMode === "override") {
    return item.content;
  }
  const base = profile.get(item.profileItemId);
  if (!base) {
    throw new ExternalDocumentServiceError(
      "The reusable CV references professional information that no longer exists.",
    );
  }
  if (item.sourceMode === "current") {
    return {
      kind: base.kind,
      title: base.title,
      ...(base.subtitle === undefined ? {} : { subtitle: base.subtitle }),
      ...(base.description === undefined ? {} : { description: base.description }),
      ...(base.startDate === undefined ? {} : { startDate: base.startDate }),
      ...(base.endDate === undefined ? {} : { endDate: base.endDate }),
      ...(base.url === undefined ? {} : { url: base.url }),
    };
  }
  const variant = variants.get(item.profileVariantId);
  if (!variant || variant.itemId !== base.id) {
    throw new ExternalDocumentServiceError(
      "The reusable CV references a saved variation that no longer exists.",
    );
  }
  return {
    kind: base.kind,
    title: variant.content.title,
    ...(variant.content.subtitle === undefined ? {} : { subtitle: variant.content.subtitle }),
    ...(variant.content.description === undefined
      ? {}
      : { description: variant.content.description }),
    ...(variant.content.startDate === undefined ? {} : { startDate: variant.content.startDate }),
    ...(variant.content.endDate === undefined ? {} : { endDate: variant.content.endDate }),
    ...(variant.content.url === undefined ? {} : { url: variant.content.url }),
  };
}

function recordPrivateValue(
  replacements: PrivateReplacements,
  title: string,
  value: string,
): string {
  const placeholder = `[USERPRIVATE:${title}]`;
  if (!replacements.has(placeholder)) {
    replacements.set(placeholder, value);
  } else if (replacements.get(placeholder) !== value) {
    replacements.set(placeholder, null);
  }
  return placeholder;
}

function mergedPrivateValues(
  ...sources: readonly ReadonlyMap<string, string | null>[]
): PrivateReplacements {
  const merged: PrivateReplacements = new Map();
  for (const source of sources) {
    for (const [placeholder, value] of source) {
      if (!merged.has(placeholder)) {
        merged.set(placeholder, value);
      } else if (merged.get(placeholder) !== value) {
        merged.set(placeholder, null);
      }
    }
  }
  return merged;
}

function externalBlock(
  content: CvContent,
  sectionName: string,
  itemIndex: number,
  discloseValue: boolean,
  replacements: PrivateReplacements,
): ExternalReusableCvBlock {
  if (discloseValue) {
    return {
      kind: content.kind,
      title: content.title,
      ...(content.subtitle === undefined ? {} : { subtitle: content.subtitle }),
      ...(content.description === undefined ? {} : { description: content.description }),
      ...(content.startDate === undefined ? {} : { startDate: content.startDate }),
      ...(content.endDate === undefined ? {} : { endDate: content.endDate }),
      ...(content.url === undefined ? {} : { url: content.url }),
    };
  }

  const placeholders = visibleCvFields.flatMap((field) => {
    const value = content[field.key];
    if (value === undefined) return [];
    const title = `${sectionName} ${itemIndex + 1} — ${field.label}`;
    return [recordPrivateValue(replacements, title, value)];
  });
  return { placeholders };
}

function updateCvItemField(
  item: WorkingCvItem,
  field: CvWritingField,
  content: string,
): WorkingCvItem {
  if (field === "title") {
    return { ...item, content: { ...item.content, title: content } };
  }
  if (field === "subtitle") {
    return { ...item, content: { ...item.content, subtitle: content } };
  }
  return { ...item, content: { ...item.content, description: content } };
}

function requireNoPrivatePlaceholder(value: string): void {
  if (privatePlaceholderPattern.test(value)) {
    throw new ExternalDocumentServiceError(
      "The submitted document content contains a private placeholder AAAAT did not supply unambiguously for this document work.",
    );
  }
}

export class ExternalDocumentSession {
  private sequence = 0;
  private readonly applications = new Map<OperationReference, string>();
  private readonly applicationRefs = new Map<string, OperationReference>();
  private readonly reusableCvs = new Map<OperationReference, string>();
  private readonly reusableCvRefs = new Map<string, OperationReference>();
  private readonly workingCvs = new Map<OperationReference, string>();
  private readonly workingCvRefs = new Map<string, OperationReference>();
  private readonly workingCvApplications = new Map<OperationReference, OperationReference>();
  private readonly letters = new Map<OperationReference, string>();
  private readonly letterRefs = new Map<string, OperationReference>();
  private readonly letterApplications = new Map<OperationReference, OperationReference>();
  private readonly cvFields = new Map<OperationReference, CvFieldBinding>();
  private readonly cvEditableFields = new Map<
    OperationReference,
    ExternalApplicationCvCreateResult["editableFields"]
  >();
  private readonly cvFieldContexts = new Map<OperationReference, CvFieldContextBinding>();
  private readonly reusableCvPrivateValues = new Map<OperationReference, PrivateReplacements>();
  private readonly applicationPrivateValues = new Map<OperationReference, PrivateReplacements>();
  private readonly workingCvPrivateValues = new Map<OperationReference, PrivateReplacements>();
  private readonly letterPrivateValues = new Map<OperationReference, PrivateReplacements>();
  private readonly createdApplicationRefs = new Set<OperationReference>();
  private readonly selectedApplicationRefs = new Set<OperationReference>();

  constructor(private readonly rootPath: string) {}

  private nextReference(kind: string): OperationReference {
    this.sequence += 1;
    return operationReferenceSchema.parse(`aaaat_${kind}_${this.sequence}`);
  }

  private bind(
    kind: string,
    id: string,
    references: Map<OperationReference, string>,
    reverse: Map<string, OperationReference>,
  ): OperationReference {
    const existing = reverse.get(id);
    if (existing) return existing;
    const reference = this.nextReference(kind);
    references.set(reference, id);
    reverse.set(id, reference);
    return reference;
  }

  private requireReference(
    references: ReadonlyMap<OperationReference, string>,
    reference: OperationReference,
    message: string,
  ): string {
    const id = references.get(reference);
    if (!id) throw new ExternalDocumentServiceError(message);
    return id;
  }

  bindApplication(candidatureId: string): OperationReference {
    const applicationRef = this.bind(
      "application",
      candidatureId,
      this.applications,
      this.applicationRefs,
    );
    this.createdApplicationRefs.add(applicationRef);
    return applicationRef;
  }

  private currentSelectedApplicationRef(): OperationReference | null {
    const candidatureId = selectedApplicationDocumentExternalAccessId(this.rootPath);
    if (!candidatureId) return null;
    const applicationRef = this.applicationRefs.get(candidatureId);
    if (!applicationRef || !this.selectedApplicationRefs.has(applicationRef)) return null;
    return applicationRef;
  }

  private requireDocumentWorkAuthorization(): void {
    if (this.createdApplicationRefs.size > 0 || this.currentSelectedApplicationRef()) return;
    throw new ExternalDocumentServiceError(
      "Create an application or explicitly select an existing application's documents for external AI work in AAAAT first.",
    );
  }

  private requireApplicationReference(applicationRef: OperationReference): string {
    const candidatureId = this.requireReference(
      this.applications,
      applicationRef,
      "Choose or create the application in this AAAAT session first.",
    );
    if (
      this.selectedApplicationRefs.has(applicationRef)
      && !this.createdApplicationRefs.has(applicationRef)
      && selectedApplicationDocumentExternalAccessId(this.rootPath) !== candidatureId
    ) {
      throw new ExternalDocumentServiceError(
        "Select this existing application's documents for external AI work in AAAAT again.",
      );
    }
    return candidatureId;
  }

  applicationTarget(): ReturnType<typeof externalApplicationDocumentTargetSchema.parse> {
    const candidatureId = selectedApplicationDocumentExternalAccessId(this.rootPath);
    if (!candidatureId) return null;
    const applicationRef = this.bind(
      "application",
      candidatureId,
      this.applications,
      this.applicationRefs,
    );
    this.selectedApplicationRefs.add(applicationRef);
    return externalApplicationDocumentTargetSchema.parse({ applicationRef });
  }

  listReusableCvs(): ReturnType<typeof externalReusableCvChoicesSchema.parse> {
    this.requireDocumentWorkAuthorization();
    return externalReusableCvChoicesSchema.parse(
      listDocumentCollections(this.rootPath).templates.map((template) => ({
        cvRef: this.bind(
          "reusable_cv",
          template.id,
          this.reusableCvs,
          this.reusableCvRefs,
        ),
        name: template.name,
      })),
    );
  }

  readReusableCv(cvRef: OperationReference): ExternalReusableCvContent {
    this.requireDocumentWorkAuthorization();
    const templateId = this.requireReference(
      this.reusableCvs,
      cvRef,
      "Choose one reusable CV from AAAAT's reusable-CV list first.",
    );
    const template = listDocumentCollections(this.rootPath).templates.find(
      (candidate) => candidate.id === templateId,
    );
    if (!template) {
      throw new ExternalDocumentServiceError("The chosen reusable CV no longer exists.");
    }

    const profile = new Map(getProfile(this.rootPath).items.map((item) => [item.id, item]));
    const variants = new Map(
      listProfileVariants(this.rootPath).map((variant) => [variant.id, variant]),
    );
    const permissions = new Map(
      listProfileItemAiContextPreferences(this.rootPath).map((preference) => [
        preference.itemId,
        preference.aiUseAllowed,
      ]),
    );
    const privateValues: PrivateReplacements = new Map();

    const result = externalReusableCvContentSchema.parse({
      name: template.name,
      sections: template.sections.map((section) => ({
        name: section.name,
        blocks: section.items.map((item, itemIndex) => {
          const content = contentFromTemplateItem(item, profile, variants);
          const discloseValue =
            item.sourceMode !== "custom"
            && permissions.get(item.profileItemId) === true;
          return externalBlock(
            content,
            section.name,
            itemIndex,
            discloseValue,
            privateValues,
          );
        }),
      })),
    });

    this.reusableCvPrivateValues.set(
      cvRef,
      mergedPrivateValues(privateValues),
    );
    return result;
  }

  private bindWorkingCv(working: WorkingCvRecord): {
    readonly cvRef: OperationReference;
    readonly editableFields: ExternalApplicationCvCreateResult["editableFields"];
  } {
    const cvRef = this.bind(
      "working_cv",
      working.id,
      this.workingCvs,
      this.workingCvRefs,
    );
    const existing = this.cvEditableFields.get(cvRef);
    if (existing) return { cvRef, editableFields: existing };

    const editableFields: ExternalApplicationCvCreateResult["editableFields"] = [];
    for (const section of working.sections) {
      section.items.forEach((item, itemIndex) => {
        for (const field of writableCvFields) {
          if (field.key !== "title" && !(field.key in item.content)) continue;
          const fieldRef = this.nextReference("cv_field");
          this.cvFields.set(fieldRef, {
            cvRef,
            workingCvId: working.id,
            itemId: item.id,
            field: field.key,
          });
          editableFields.push({
            fieldRef,
            title: `${section.name} ${itemIndex + 1} — ${field.label}`,
            field: field.key,
          });
        }
      });
    }
    this.cvEditableFields.set(cvRef, editableFields);
    return { cvRef, editableFields };
  }

  createApplicationCv(
    applicationRef: OperationReference,
    reusableCvRef: OperationReference,
  ): ExternalApplicationCvCreateResult {
    const candidatureId = this.requireApplicationReference(applicationRef);
    const templateId = this.requireReference(
      this.reusableCvs,
      reusableCvRef,
      "Choose one reusable CV from AAAAT's reusable-CV list first.",
    );
    const privateValues = this.reusableCvPrivateValues.get(reusableCvRef);
    if (!privateValues) {
      throw new ExternalDocumentServiceError(
        "Inspect the chosen reusable CV before creating the application CV.",
      );
    }
    const created = createWorkingCv(this.rootPath, {
      title: "Application CV",
      candidatureId,
      source: { kind: "template", templateId },
    });
    const bound = this.bindWorkingCv(created);
    const documentPrivateValues = mergedPrivateValues(privateValues);
    this.workingCvApplications.set(bound.cvRef, applicationRef);
    this.workingCvPrivateValues.set(bound.cvRef, documentPrivateValues);
    this.applicationPrivateValues.set(
      applicationRef,
      mergedPrivateValues(documentPrivateValues),
    );
    return externalApplicationCvCreateResultSchema.parse({
      created: true,
      cvRef: bound.cvRef,
      editableFields: bound.editableFields,
    });
  }

  cvFieldContext(
    cvRef: OperationReference,
    fieldRef: OperationReference,
  ): ExternalCvFieldContext {
    const applicationRef = this.workingCvApplications.get(cvRef);
    if (!applicationRef) {
      throw new ExternalDocumentServiceError(
        "Choose an application CV created in this AAAAT session first.",
      );
    }
    this.requireApplicationReference(applicationRef);
    const workingCvId = this.requireReference(
      this.workingCvs,
      cvRef,
      "Choose an application CV created in this AAAAT session first.",
    );
    const binding = this.cvFields.get(fieldRef);
    if (!binding || binding.cvRef !== cvRef || binding.workingCvId !== workingCvId) {
      throw new ExternalDocumentServiceError(
        "Choose one editable field AAAAT supplied for this CV.",
      );
    }
    const working = listDocumentCollections(this.rootPath).workingCvs.find(
      (candidate) => candidate.id === workingCvId,
    );
    if (!working) {
      throw new ExternalDocumentServiceError("The application CV no longer exists.");
    }
    const projected = cvWritingContext(
      this.rootPath,
      working,
      binding.itemId,
      binding.field,
    );
    this.cvFieldContexts.set(fieldRef, {
      replacements: mergedPrivateValues(
        this.workingCvPrivateValues.get(cvRef) ?? new Map(),
        projected.replacements,
      ),
      maxLength: projected.maxLength,
    });
    return externalCvFieldContextSchema.parse(projected.context);
  }

  writeCvField(
    cvRef: OperationReference,
    fieldRef: OperationReference,
    rawContent: string,
  ): ReturnType<typeof externalDocumentAppliedResultSchema.parse> {
    const applicationRef = this.workingCvApplications.get(cvRef);
    if (!applicationRef) {
      throw new ExternalDocumentServiceError(
        "Choose an application CV created in this AAAAT session first.",
      );
    }
    this.requireApplicationReference(applicationRef);
    const workingCvId = this.requireReference(
      this.workingCvs,
      cvRef,
      "Choose an application CV created in this AAAAT session first.",
    );
    const binding = this.cvFields.get(fieldRef);
    if (!binding || binding.cvRef !== cvRef || binding.workingCvId !== workingCvId) {
      throw new ExternalDocumentServiceError(
        "Choose one editable field AAAAT supplied for this CV.",
      );
    }
    const context = this.cvFieldContexts.get(fieldRef);
    if (!context) {
      throw new ExternalDocumentServiceError(
        "Read AAAAT's bounded context for this CV field before writing it.",
      );
    }

    const content = restorePrivateValues(rawContent.trim(), context.replacements).trim();
    if (!content || content.length > context.maxLength) {
      throw new ExternalDocumentServiceError(
        "The submitted CV content does not fit the requested field.",
      );
    }
    requireNoPrivatePlaceholder(content);

    const working = listDocumentCollections(this.rootPath).workingCvs.find(
      (candidate) => candidate.id === workingCvId,
    );
    if (!working) {
      throw new ExternalDocumentServiceError("The application CV no longer exists.");
    }
    let changed = false;
    const sections = working.sections.map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.id !== binding.itemId) return item;
        changed = true;
        return updateCvItemField(item, binding.field, content);
      }),
    }));
    if (!changed) {
      throw new ExternalDocumentServiceError("The selected CV field no longer exists.");
    }

    updateWorkingCv(this.rootPath, {
      id: working.id,
      title: working.title,
      ...(working.language ? { language: working.language } : {}),
      pdfMetadata: working.pdfMetadata,
      parserSummary: working.parserSummary,
      sections,
    });
    for (const [candidateRef, candidate] of this.cvFields) {
      if (candidate.cvRef === cvRef) this.cvFieldContexts.delete(candidateRef);
    }
    return externalDocumentAppliedResultSchema.parse({ applied: true });
  }

  createApplicationCoverLetter(
    applicationRef: OperationReference,
  ): ReturnType<typeof externalApplicationCoverLetterCreateResultSchema.parse> {
    const candidatureId = this.requireApplicationReference(applicationRef);
    const letter = createCoverLetter(this.rootPath, {
      candidatureId,
      title: "Application cover letter",
      bodyParagraphs: [],
    });
    const letterRef = this.bind(
      "cover_letter",
      letter.id,
      this.letters,
      this.letterRefs,
    );
    this.letterApplications.set(letterRef, applicationRef);
    this.letterPrivateValues.set(
      letterRef,
      mergedPrivateValues(this.applicationPrivateValues.get(applicationRef) ?? new Map()),
    );
    return externalApplicationCoverLetterCreateResultSchema.parse({
      created: true,
      letterRef,
    });
  }

  writeCoverLetter(
    letterRef: OperationReference,
    draft: CoverLetterDraft,
  ): ReturnType<typeof externalDocumentAppliedResultSchema.parse> {
    const applicationRef = this.letterApplications.get(letterRef);
    if (!applicationRef) {
      throw new ExternalDocumentServiceError(
        "Create the application cover letter in this AAAAT session first.",
      );
    }
    this.requireApplicationReference(applicationRef);
    const letterId = this.requireReference(
      this.letters,
      letterRef,
      "Create the application cover letter in this AAAAT session first.",
    );
    const letter = listDocumentCollections(this.rootPath).letters.find(
      (candidate) => candidate.id === letterId,
    );
    if (!letter) {
      throw new ExternalDocumentServiceError("The application cover letter no longer exists.");
    }

    const privateValues = this.letterPrivateValues.get(letterRef) ?? new Map();
    const restore = (value: string): string =>
      restorePrivateValues(value, privateValues);
    const restoredDraft: CoverLetterDraft = {
      recipient: restore(draft.recipient),
      subject: restore(draft.subject),
      bodyParagraphs: draft.bodyParagraphs.map(restore),
      closing: restore(draft.closing),
    };
    requireNoPrivatePlaceholder(restoredDraft.recipient);
    requireNoPrivatePlaceholder(restoredDraft.subject);
    for (const paragraph of restoredDraft.bodyParagraphs) {
      requireNoPrivatePlaceholder(paragraph);
    }
    requireNoPrivatePlaceholder(restoredDraft.closing);

    updateCoverLetter(this.rootPath, {
      id: letter.id,
      title: letter.title,
      ...(letter.language ? { language: letter.language } : {}),
      sender: letter.sender,
      recipient: restoredDraft.recipient,
      subject: restoredDraft.subject,
      bodyParagraphs: restoredDraft.bodyParagraphs,
      closing: restoredDraft.closing,
    });
    return externalDocumentAppliedResultSchema.parse({ applied: true });
  }

  async renderingStatus(): Promise<
    ReturnType<typeof externalDocumentRenderingStatusSchema.parse>
  > {
    const snapshot = await getSetupEnvironmentSnapshot(this.rootPath);
    return externalDocumentRenderingStatusSchema.parse({
      available: snapshot.tex.documentRenderingReady,
    });
  }

  async renderDocument(
    documentRef: OperationReference,
  ): Promise<ReturnType<typeof externalDocumentRenderResultSchema.parse>> {
    const workingCvId = this.workingCvs.get(documentRef);
    const letterId = this.letters.get(documentRef);
    const applicationRef =
      this.workingCvApplications.get(documentRef)
      ?? this.letterApplications.get(documentRef);
    if (!workingCvId && !letterId) {
      throw new ExternalDocumentServiceError(
        "Choose a document created in this AAAAT session first.",
      );
    }
    if (!applicationRef) {
      throw new ExternalDocumentServiceError(
        "Choose a document created for an application in this AAAAT session first.",
      );
    }
    this.requireApplicationReference(applicationRef);

    const status = await this.renderingStatus();
    if (!status.available) {
      return externalDocumentRenderResultSchema.parse({ rendered: false });
    }

    try {
      if (workingCvId) {
        await renderWorkingCv(this.rootPath, workingCvId, BUILTIN_BLUEPRINT_SOURCE);
      } else if (letterId) {
        await renderCoverLetter(this.rootPath, letterId);
      }
      return externalDocumentRenderResultSchema.parse({ rendered: true });
    } catch {
      return externalDocumentRenderResultSchema.parse({ rendered: false });
    }
  }
}

export function createExternalDocumentSession(rootPath: string): ExternalDocumentSession {
  return new ExternalDocumentSession(rootPath);
}
