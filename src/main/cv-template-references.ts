import type { DatabaseSync } from "node:sqlite";

import { cvContentSchema, cvTemplateSectionSchema, workingCvSectionSchema, type CvTemplateSection } from "../shared/document-domain-contracts";

interface TemplateCompositionRow {
  readonly compositionJson: string;
}

function templateSections(database: DatabaseSync): readonly CvTemplateSection[][] {
  const rows = database
    .prepare("SELECT composition_json AS compositionJson FROM cv_templates")
    .all() as unknown as TemplateCompositionRow[];
  return rows.map((row) => {
    try {
      return cvTemplateSectionSchema.array().parse(JSON.parse(row.compositionJson));
    } catch {
      throw new Error("Stored CV template composition is invalid.");
    }
  });
}

export function cvTemplateReferencesProfileItem(database: DatabaseSync, itemId: string): boolean {
  return templateSections(database).some((sections) =>
    sections.some((section) =>
      section.items.some((item) => item.sourceMode !== "custom" && item.profileItemId === itemId),
    ),
  );
}

export function cvTemplateReferencesProfileVariant(database: DatabaseSync, variantId: string): boolean {
  return templateSections(database).some((sections) =>
    sections.some((section) =>
      section.items.some((item) => item.sourceMode === "variant" && item.profileVariantId === variantId),
    ),
  );
}

export function detachProfileReferences(database: DatabaseSync): void {
  const fields = "title, subtitle, description, start_date AS startDate, end_date AS endDate, url";
  const withoutNulls = (row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null));
  const profile = new Map(database.prepare(`SELECT id, kind, ${fields} FROM profile_items`).all().map(({ id, ...content }) =>
    [String(id), cvContentSchema.parse(withoutNulls(content))]));
  const variants = new Map(database.prepare(`SELECT id, item_id AS itemId, ${fields} FROM profile_variants`).all().map(({ id, itemId, ...content }) =>
    [String(id), cvContentSchema.parse({ ...withoutNulls(content), kind: profile.get(String(itemId))?.kind })]));
  const updateTemplate = database.prepare("UPDATE cv_templates SET composition_json = ? WHERE id = ?");
  for (const row of database.prepare("SELECT id, composition_json FROM cv_templates").all()) {
    const sections = cvTemplateSectionSchema.array().parse(JSON.parse(String(row.composition_json)));
    const detached = sections.map(section => ({ ...section, items: section.items.map(item => {
      if (item.sourceMode === "custom") return item;
      const content = item.sourceMode === "override" ? item.content : item.sourceMode === "variant"
        ? variants.get(item.profileVariantId) : profile.get(item.profileItemId);
      if (!content) throw new Error("A CV template references missing personal information.");
      return { id: item.id, sourceMode: "custom" as const, content };
    }) }));
    updateTemplate.run(JSON.stringify(detached), String(row.id));
  }
  const updateCv = database.prepare("UPDATE working_cvs SET composition_json = ? WHERE id = ?");
  for (const row of database.prepare("SELECT id, composition_json FROM working_cvs").all()) {
    const sections = workingCvSectionSchema.array().parse(JSON.parse(String(row.composition_json)));
    updateCv.run(JSON.stringify(sections.map(section => ({ ...section, items: section.items.map(item => ({
      ...item, sourceMode: "custom", profileItemId: null, profileVariantId: null,
    })) }))), String(row.id));
  }
}
