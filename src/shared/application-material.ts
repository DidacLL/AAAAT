import type { ProfileItem } from "./contracts";

export interface CvTailoringSelection {
  readonly includedItemIds: readonly string[];
  readonly orderedItemIds: readonly string[];
}

const alwaysIncludedKinds = new Set<ProfileItem["kind"]>(["identity", "contact"]);

export function cvTailoringSelection(
  items: readonly ProfileItem[],
  recommendedItemIds: readonly string[],
): CvTailoringSelection {
  const available = new Set(items.map((item) => item.id));
  const recommended = recommendedItemIds.filter((id, index) =>
    available.has(id) && recommendedItemIds.indexOf(id) === index,
  );
  const fixed = items.filter((item) => alwaysIncludedKinds.has(item.kind)).map((item) => item.id);
  const included = new Set([...fixed, ...recommended]);
  const ordered = [
    ...fixed,
    ...recommended.filter((id) => !fixed.includes(id)),
    ...items.map((item) => item.id).filter((id) => !included.has(id)),
  ];
  return {
    includedItemIds: items.map((item) => item.id).filter((id) => included.has(id)),
    orderedItemIds: ordered,
  };
}

const commonWords = new Set([
  "about", "after", "also", "and", "are", "can", "for", "from", "have", "into", "more", "our",
  "that", "the", "their", "this", "with", "work", "your", "you", "will", "role", "team",
  "experience", "position", "candidate", "application", "opportunity", "offer", "looking",
]);

function meaningfulWords(value: string): Set<string> {
  return new Set(
    (value.toLocaleLowerCase().match(/[\p{L}\p{N}]{4,}/gu) ?? []).filter((word) => !commonWords.has(word)),
  );
}

/** A quick local selection. Model recommendations may refine it later. */
export function localCvSelection(items: readonly ProfileItem[], sourceText: string): CvTailoringSelection {
  const words = meaningfulWords(sourceText);
  const evidence = items.filter((item) => !alwaysIncludedKinds.has(item.kind) && item.kind !== "link");
  const ranked = evidence.map((item) => ({
    item,
    score: [...meaningfulWords(`${item.title} ${item.subtitle ?? ""} ${item.description ?? ""}`)]
      .filter((word) => words.has(word)).length,
  })).sort((left, right) => right.score - left.score);
  const matches = ranked.filter((entry) => entry.score > 0).slice(0, 5).map((entry) => entry.item.id);
  return cvTailoringSelection(items, matches.length > 0 ? matches : evidence.slice(0, 5).map((item) => item.id));
}

export function localCoverLetterDraft(items: readonly ProfileItem[], sourceText: string): {
  readonly recipient: string;
  readonly subject: string;
  readonly bodyParagraphs: readonly string[];
  readonly closing: string;
} {
  const role = (
    sourceText.match(/^(?:job title|position|role)\s*[:–-]\s*([^\n.;]{3,60})/imu)?.[1] ??
    sourceText.match(/\b(?:needs?|seeks?|hiring|looking for)\s+(?:an?\s+)?([\p{L}\p{N}][\p{L}\p{N}\s/-]{2,60}?)(?:\s+for\b|\s+to\b|[.,;\n])/iu)?.[1]
  )?.trim();
  const offerWords = meaningfulWords(sourceText);
  const evidence = items.filter((item) =>
    !alwaysIncludedKinds.has(item.kind) && item.kind !== "link" &&
    [...meaningfulWords(`${item.title} ${item.description ?? ""}`)].some((word) => offerWords.has(word)),
  ).slice(0, 2);
  const evidenceText = evidence.map((item) =>
    [item.title, item.description?.replace(/[.\s]+$/, "")].filter(Boolean).join(": "),
  ).join("; ");
  return {
    recipient: "Hiring team",
    subject: role ? `Application for ${role}` : "Application in response to your job offer",
    bodyParagraphs: [
      role ? `I am writing to apply for the ${role} position described in your offer.` : "I am writing in response to the job offer I saved for this application.",
      evidenceText
        ? `My relevant professional information includes ${evidenceText}. I would welcome the opportunity to discuss how this fits your needs.`
        : "I would welcome the opportunity to discuss how my experience fits the requirements in your offer.",
    ],
    closing: "Kind regards",
  };
}
