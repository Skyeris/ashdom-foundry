export const AUGMENTATION_TYPES = [
  "Implant", "Cybernetic", "Robot Body", "Robot Upgrade", "Robot Variant"
];

export function augmentationType(item) {
  if (item?.type === "implant") return "Implant";
  if (item?.type === "cybernetic") return "Cybernetic";
  if (item?.type !== "robotPart") return null;
  const category = String(item.system?.category ?? "").trim().toLowerCase();
  return { body: "Robot Body", upgrades: "Robot Upgrade", variants: "Robot Variant" }[category] ?? null;
}

export function appendAugmentation(entries, item) {
  const type = augmentationType(item);
  const result = Array.from(entries ?? [], entry => ({ ...entry }));
  if (!type) return result;
  const sourceUuid = String(item.uuid ?? "");
  if (sourceUuid && result.some(entry => entry.sourceUuid === sourceUuid)) return result;
  result.push({
    name: String(item.name ?? ""),
    type,
    note: String(item.system?.note ?? ""),
    sourceUuid
  });
  return result;
}
