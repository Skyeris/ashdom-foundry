export function appendEquipmentMod(mods, item) {
  const result = Array.from(mods ?? [], mod => ({ ...mod }));
  if (item?.type !== "mod") return result;
  result.push({
    name: String(item.name ?? ""),
    note: String(item.system?.note ?? ""),
    sourceUuid: String(item.uuid ?? "")
  });
  return result;
}

export function equipmentModRows(mods, collection, equipmentIndex) {
  return Array.from(mods ?? []).map((mod, modIndex) => ({
    name: mod.name,
    hasNote: Boolean(mod.note?.trim()),
    collection,
    equipmentIndex,
    modIndex,
    notePath: `system.${collection}.${equipmentIndex}.mods.${modIndex}.note`
  }));
}
