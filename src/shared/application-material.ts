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
