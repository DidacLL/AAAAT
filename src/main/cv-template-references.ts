import type { DatabaseSync } from "node:sqlite";

import { cvTemplateSectionSchema, type CvTemplateSection } from "../shared/document-domain-contracts";

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
