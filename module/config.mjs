export const ASHDOM_SKILLS = Object.freeze({
  meleeWeapons: "Melee Weapons", unarmed: "Unarmed", archery: "Archery",
  energyWeapons: "Energy Weapons", heavyGuns: "Heavy Guns", lightGuns: "Light Guns",
  blacksmith: "Blacksmith", chemistry: "Chemistry", electronics: "Electronics",
  engineer: "Engineer", gunsmith: "Gunsmith", logic: "Logic", lore: "Lore",
  medicine: "Medicine", mysticism: "Mysticism", acrobatics: "Acrobatics",
  athletics: "Athletics", sleightOfHand: "Sleight of Hand", sneak: "Sneak",
  charm: "Charm", deception: "Deception", intimidation: "Intimidation",
  insight: "Insight", mercantile: "Mercantile", animalHandling: "Animal Handling",
  chance: "Chance", perception: "Perception", pilot: "Pilot", survival: "Survival"
});

export const ASHDOM_ITEM_RARITIES = Object.freeze({
  Common: "Common",
  Uncommon: "Uncommon",
  Rare: "Rare",
  Radical: "Radical",
  Atomic: "Atomic"
});

export const ASHDOM_RARITY_ITEM_TYPES = Object.freeze([
  "weapon", "armor", "gear", "consumable", "mod", "ammunition",
  "robotPart", "literature", "misc", "legendary", "vehicleMod", "implant", "cybernetic"
]);

const skillSpecHierarchy = Object.fromEntries(
  Object.values(ASHDOM_SKILLS).map(label => [label, null])
);

export const ASHDOM_ITEM_TAXONOMY = Object.freeze({
  weapon: {
    Guns: {
      "Heavy Guns": { Artillery: null, "Flame Weapons": null, "Machine Guns": null, Miniguns: null },
      "Light Guns": { "Assault Rifles": null, Handguns: null, Rifles: null, Shotguns: null, "Submachine Guns": null }
    },
    "Melee Weapons": { Bladed: null, Bludgeons: null, Short: null, Special: null },
    "Unarmed Weapons": null,
    Archery: { Bows: null, Crossbows: null, Special: null },
    "Energy Weapons": { Laser: null, Plasma: null, Special: null },
    Explosives: null
  },
  armor: {
    "Under Armor": { General: null, Faction: null },
    "Armor Set": { General: null, Faction: null },
    "Power Armor": { General: null, Faction: null },
    Helmets: { General: null, Faction: null }
  },
  perk: {
    "Racial Perk": null,
    "Background Perk": null,
    "FORMULA Perk": null,
    "Roleplay Perk": null,
    Trait: null
  },
  skillSpec: skillSpecHierarchy,
  ammunition: { Bullets: null, Energy: null, Heavy: null, Shells: null, Special: null },
  robotPart: { Body: null, Upgrades: null, Variants: null },
  mod: {
    Ammo: null,
    Archery: { Frame: null, "Misc.": null },
    Armor: { Armor: null, Helmets: null },
    Energy: { Frame: null, Muzzle: null },
    Explosive: null,
    Gun: { Frames: null, "Misc.": null, Muzzle: null },
    "Melee & Unarmed": { Grips: null, Canister: null, Form: null },
    "Shared Mods": { Frames: null, "Misc.": null, Scopes: null }
  },
  consumable: { Chems: null, Concoctions: null, "Cooked Food": null, Drinks: null },
  gear: { General: null, Materials: null, "Musical Instruments": null, Tools: null },
  legendary: {
    "Legendary Weapons": null,
    "Legendary Under Armor": null,
    "Legendary Armor Set": null,
    "Legendary Helmet": null,
    "Legendary Power Armor": null,
    "Legendary Gear": null
  },
  vehicle: {
    "Lightweight Vehicle": null,
    "Civilian Vehicle": null,
    "Sea Vehicle": null,
    "Heavy Vehicle": null,
    Tank: null,
    "Military Vehicle": null,
    "Air Vehicle": null
  },
  vehicleMod: { Chassis: null, Engine: null, Trailer: null, Upgrades: null }
});

export const ASHDOM_ITEM_DESTINATIONS = Object.freeze({
  weapon: ["weapons", "inventory"],
  armor: ["armors", "inventory"],
  perk: ["perks"],
  skillSpec: ["perks"],
  vehicle: ["vehicles"],
  gear: ["inventory"],
  consumable: ["inventory"],
  mod: ["inventory"],
  ammunition: ["inventory"],
  robotPart: ["inventory"],
  literature: ["inventory"],
  misc: ["inventory"],
  legendary: ["inventory"],
  vehicleMod: ["inventory"],
  implant: ["inventory"],
  cybernetic: ["inventory"]
});
