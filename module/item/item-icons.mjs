import { VEHICLE_TYPE_ICONS } from "../vehicle-types.mjs";
const ICON_ROOT = "systems/ashdom/assets/icons/items";

const TYPE_ICONS = Object.freeze({
  weapon: "weapon.svg",
  armor: "armor.svg",
  perk: "perk.svg",
  skillSpec: "skill-spec.svg",
  gear: "gear.svg",
  consumable: "consumable.svg",
  mod: "modification.svg",
  ammunition: "ammunition.svg",
  robotPart: "robot-part.svg",
  literature: "literature.svg",
  misc: "misc.svg",
  legendary: "legendary.svg",
  vehicle: "vehicle.svg",
  vehicleMod: "vehicle-mod.svg",
  implant: "implant.svg",
  cybernetic: "cybernetic.svg"
});

const TAXONOMY_ICONS = Object.freeze({
  ...Object.fromEntries(Object.entries(VEHICLE_TYPE_ICONS).map(([type, icon]) => [`vehicle|${type}`, `${icon}.svg`])),
  "vehicle|Sea Vehicle": "vehicle-boat.svg",
  "weapon|Archery": "archery.svg",
  "weapon|Energy Weapons": "energy-weapons.svg",
  "weapon|Explosive": "explosive.svg",
  "weapon|Explosives": "explosive.svg",
  "weapon|Guns|Heavy Guns": "heavy-guns.svg",
  "weapon|Guns|Light Guns": "light-guns.svg",
  "weapon|Melee Weapons": "melee-weapons.svg",
  "weapon|Unarmed Weapons": "unarmed-weapons.svg",
  "consumable|Chems": "chems.svg",
  "consumable|Cooked Food": "cooked-food.svg",
  "consumable|Drinks": "drinks.svg",
  "armor|Helmets": "helmets.svg",
  "armor|Power Armor": "power-armor.svg",
  "armor|Under Armor": "under-armor.svg",
  "armor|Armor Set": "armor-set.svg",
  "gear|Musical Instruments": "musical-instruments.svg",
  "gear|Tools": "tools.svg",
  "gear|Materials": "materials.svg",
  "legendary|Legendary Under Armor": "under-armor.svg",
  "legendary|Legendary Armor Set": "armor-set.svg",
  "legendary|Legendary Helmet": "helmets.svg",
  "legendary|Legendary Power Armor": "power-armor.svg"
});

const RARITY_SUFFIXES = Object.freeze({
  Common: "common",
  Uncommon: "uncommon",
  Rare: "rare",
  Radical: "radical",
  Atomic: "atomic"
});

export function getAshdomItemIcon(
  type,
  category = "",
  subcategory = "",
  rarity = "Common",
  perkType = ""
) {
  const typeName = String(type);
  if (typeName === "skillSpec") return `${ICON_ROOT}/skill-spec.svg`;
  if (typeName === "perk") {
    const kind = String(perkType || category).trim().toLowerCase();
    const icon = kind === "mutation" ? "mutation" : kind === "trait" ? "trait" : kind === "skill spec" ? "skill-spec" : "perk";
    return `${ICON_ROOT}/${icon}.svg`;
  }
  const categoryName = String(category);
  const subcategoryName = String(subcategory);
  const file =
    TAXONOMY_ICONS[`${typeName}|${categoryName}|${subcategoryName}`] ??
    TAXONOMY_ICONS[`${typeName}|${categoryName}`] ??
    TYPE_ICONS[typeName] ??
    "misc.svg";
  const basename = file.replace(/\.svg$/i, "");
  const suffix = RARITY_SUFFIXES[String(rarity)] ?? RARITY_SUFFIXES.Common;
  return `${ICON_ROOT}/${basename}-${suffix}.svg`;
}

export function isReplaceableItemIcon(path = "") {
  const value = String(path);
  return !value || value.startsWith("icons/svg/") || value.startsWith(`${ICON_ROOT}/`);
}
