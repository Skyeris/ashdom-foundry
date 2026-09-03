import {
  AshdomCharacterData,
  AshdomNPCData
} from "./module/actor/actor-data.mjs";

import {
  AshdomCharacterSheet
} from "./module/sheets/character-sheet.mjs";

import {
  AshdomNPCSheet
} from "./module/sheets/npc-sheet.mjs";

import {
  AshdomWeaponData,
  AshdomArmorData,
  AshdomPerkData,
  AshdomSkillSpecData,
  AshdomGearData,
  AshdomConsumableData,
  AshdomModData,
  AshdomAmmunitionData,
  AshdomRobotPartData,
  AshdomLiteratureData,
  AshdomMiscData,
  AshdomLegendaryData,
  AshdomVehicleData,
  AshdomVehicleModData,
  AshdomImplantData,
  AshdomCyberneticData
} from "./module/item/item-data.mjs";

import {
  AshdomItemSheet
} from "./module/sheets/item-sheet.mjs";

import {
  AshdomLegacyItemMigration
} from "./module/migration/legacy-items.mjs";


Hooks.once("init", () => {

  console.log("ASHDOM | Initializing system");


  /* =========================================
     ACTOR DATA MODELS
  ========================================= */

  CONFIG.Actor.dataModels = {

    character: AshdomCharacterData,

    npc: AshdomNPCData

  };

  CONFIG.Item.dataModels = {
    weapon: AshdomWeaponData,
    armor: AshdomArmorData,
    perk: AshdomPerkData,
    skillSpec: AshdomSkillSpecData,
    gear: AshdomGearData,
    consumable: AshdomConsumableData,
    mod: AshdomModData,
    ammunition: AshdomAmmunitionData,
    robotPart: AshdomRobotPartData,
    literature: AshdomLiteratureData,
    misc: AshdomMiscData,
    legendary: AshdomLegendaryData,
    vehicle: AshdomVehicleData,
    vehicleMod: AshdomVehicleModData,
    implant: AshdomImplantData,
    cybernetic: AshdomCyberneticData
  };


  /* =========================================
     CHARACTER SHEET
  ========================================= */

  foundry.documents.collections.Actors.registerSheet(
    "ashdom",
    AshdomCharacterSheet,
    {
      types: ["character"],
      makeDefault: true,
      label: "ASHDOM.CharacterSheet"
    }
  );

  foundry.documents.collections.Actors.registerSheet(
    "ashdom",
    AshdomNPCSheet,
    {
      types: ["npc"],
      makeDefault: true,
      label: "ASHDOM.NPCSheet"
    }
  );

  foundry.documents.collections.Items.registerSheet(
    "ashdom",
    AshdomItemSheet,
    {
      types: [
        "weapon", "armor", "perk", "skillSpec", "gear", "consumable",
        "mod", "ammunition", "robotPart", "literature", "misc", "legendary",
        "vehicle", "vehicleMod", "implant", "cybernetic"
      ],
      makeDefault: true,
      label: "ASHDOM.ItemSheet"
    }
  );

  game.ashdom = {
    ...(game.ashdom ?? {}),
    migrations: AshdomLegacyItemMigration
  };

});
