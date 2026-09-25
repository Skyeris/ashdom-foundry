const locations = ["head", "torso", "arms", "legs", "groin"];
const ratingKeys = ["ac", "n", "l", "f", "p", "e", "dr", "rr"];
export function mirrorEquipmentDrop(system, item, update, origin, actorType) {
  const robotBody = item.type === "robotPart" && String(item.system.category).toLowerCase() === "body";
  if (!["weapon", "armor"].includes(item.type) && !robotBody) return update;
  const source = item.system.toObject?.() ?? item.system;
  const uuid = item.uuid ?? "";
  const clone = value => foundry.utils.deepClone(value);
  const inventory = clone(update["system.inventoryItems"] ?? system.inventoryItems ?? []);
  const matches = row => (uuid && row.sourceUuid === uuid) || (row.name === item.name && (!row.sourceUuid || !uuid));
  if (origin !== "inventory" && !inventory.some(matches)) {
    const quantity = Number(source.quantity ?? 1);
    const weight = Number(source.weight ?? 0);
    inventory.push({ name: item.name, sourceUuid: uuid, quantity, weight, totalWeight: quantity * weight,
      type: source.category ?? "", category: source.category ?? "", subcategory: source.subcategory ?? "",
      specialization: source.specialization ?? "", condition: source.condition ?? "Pristine", note: source.note ?? "" });
    update["system.inventoryItems"] = inventory;
  }
  if (origin !== "inventory") return update;
  if (item.type === "weapon") {
    const weapons = clone(system.weapons ?? []);
    if (!weapons.some(matches)) {
      weapons.push({ ...clone(source), name: item.name, sourceUuid: uuid, mods: clone(source.mods ?? []),
        itemType: source.itemType || source.subcategory || source.category || "",
        capacityCurrent: source.capacityCurrent ?? source.capacityMax ?? 0 });
      update["system.weapons"] = weapons;
    }
    return update;
  }
  const category = String(source.category ?? "").toLowerCase();
  const column = category === "under armor" ? "ua" : ["helmet", "helmets"].includes(category) ? "helmet" : "armorSet";
  const nameField = column === "ua" ? "underArmorName" : column === "helmet" ? "helmetName" : "name";
  const armors = clone(system.armors ?? []);
  if (armors.some(a => a[nameField] === item.name)) return update;
  const index = actorType === "npc" ? 0 : armors.length;
  const armor = armors[index] ?? { name: "", helmetName: "", underArmorName: "", note: "", mods: [], equipped: false,
    condition: "Pristine", drDamage: 0, targetable: Object.fromEntries(locations.map(k=>[k,true])), hardplate: {},
    ratings: Object.fromEntries(ratingKeys.map(k=>[k,{base:0,ua:0,armorSet:0,helmet:0,modifier:0}])) };
  armor[nameField] = item.name;
  for (const key of ratingKeys) {
    armor.ratings[key] ??= {base:0,ua:0,armorSet:0,helmet:0,modifier:0};
    armor.ratings[key][column] = Number(source.ratings?.[key]?.[column]) || 0;
  }
  if (column === "armorSet") {
    armor.isRobotBody = robotBody;
    armor.conductive = Boolean(source.conductive); armor.insulated = Boolean(source.insulated);
    armor.targetable = Object.fromEntries(locations.map(k=>[k,robotBody ? source.targetable?.[k] ?? true : true]));
    armor.hardplate = Object.fromEntries(locations.map(k=>[k,Boolean(source.hardplate?.[k])]));
  }
  if (source.note) armor.note = [armor.note, `${item.name}\n${source.note}`].filter(Boolean).join("\n\n");
  armors[index] = armor; update["system.armors"] = armors;
  return update;
}
