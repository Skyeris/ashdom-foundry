import {registerCrewRefresh} from './module/sheets/crew-controls.mjs';
import {registerJournalHelp} from './module/sheets/journal-help.mjs';
import {registerCustomSkills} from './module/actor/custom-skills.mjs';
import {registerPerkRadii} from './module/apps/perk-radii.mjs';
import {registerSavedGenerators} from "./module/apps/saved-generators.mjs";
import {registerShopTrading} from "./module/apps/shop-trading.mjs";
registerSavedGenerators();
registerShopTrading();
import {registerEnhancementHooks} from "./module/actor/sheet-enhancements.mjs";
registerEnhancementHooks();
import {registerHPProgression} from "./module/actor/hp-progression.mjs";
registerHPProgression();
import {registerPerkCharges} from "./module/actor/perk-charges.mjs";
import {registerDeferredDamage} from "./module/apps/deferred-damage.mjs";
registerPerkCharges();
registerDeferredDamage();
import {registerTokenSizing} from "./module/token-sizing.mjs";
import {registerChatDamage} from "./module/apps/chat-damage.mjs";
import {registerTokenResources} from "./module/apps/token-resources.mjs";
import {rememberResourceChange} from "./module/actor/resource-history.mjs";
import {registerEffectTimers} from "./module/actor/effect-timers.mjs";
import {AshdomShopGenerator} from "./module/apps/shop-generator.mjs";
import {registerCustomEntries} from "./module/apps/generator-custom.mjs";
import { AshdomEncounterGenerator } from "./module/apps/encounter-generator.mjs";
import { AshdomLootGenerator } from "./module/apps/loot-generator.mjs";
import { applyCompendiumSorting } from "./module/compendium-sorting.mjs";
import { updateNPCIcon } from "./module/npc-icons.mjs";
import { AshdomVehicleActorData } from "./module/actor/vehicle-data.mjs";
import { AshdomVehicleSheet } from "./module/sheets/vehicle-sheet.mjs";
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
  AshdomDiseaseData,
  AshdomCyberneticData
} from "./module/item/item-data.mjs";

import {
  AshdomItemSheet
} from "./module/sheets/item-sheet.mjs";

import {
  AshdomLegacyItemMigration
} from "./module/migration/legacy-items.mjs";

import {
  AshdomCompendiumBrowser
} from "./module/apps/compendium-browser.mjs";

import {
  getAshdomItemIcon,
  isReplaceableItemIcon
} from "./module/item/item-icons.mjs";


Hooks.once("init", () => {
  registerJournalHelp();
  registerCrewRefresh();
  registerCustomSkills();
  registerCustomEntries();
  Hooks.on("preUpdateActor",rememberResourceChange);
  registerEffectTimers();
  registerTokenResources();
  registerPerkRadii();
  registerTokenSizing();
  registerChatDamage();

  console.log("ASHDOM | Initializing system");


  /* =========================================
     ACTOR DATA MODELS
  ========================================= */

  CONFIG.Actor.dataModels = {

    character: AshdomCharacterData,

    vehicle: AshdomVehicleActorData,
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
    disease: AshdomDiseaseData,
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

  foundry.documents.collections.Actors.registerSheet("ashdom", AshdomVehicleSheet, {
    types: ["vehicle"], makeDefault: true, label: "ASHDOM.VehicleSheet"
  });

  foundry.documents.collections.Items.registerSheet(
    "ashdom",
    AshdomItemSheet,
    {
      types: [
        "weapon", "armor", "perk", "skillSpec", "gear", "consumable",
        "mod", "ammunition", "robotPart", "literature", "misc", "legendary",
        "vehicle", "vehicleMod", "implant", "cybernetic", "disease"
      ],
      makeDefault: true,
      label: "ASHDOM.ItemSheet"
    }
  );

  game.ashdom = {
    ...(game.ashdom ?? {}),
    migrations: AshdomLegacyItemMigration,
    openEncounterGenerator: () => {
      if (!game.user?.isGM) return;
      game.ashdom.encounterGenerator ??= new AshdomEncounterGenerator();
      return game.ashdom.encounterGenerator.render({force:true});
    },
    openShopGenerator: () => {
      if (!game.user?.isGM) return;
      game.ashdom.shopGenerator ??= new AshdomShopGenerator();
      return game.ashdom.shopGenerator.render({force:true});
    },
    openLootGenerator: () => {
      if (!game.user?.isGM) return;
      game.ashdom.lootGenerator ??= new AshdomLootGenerator();
      return game.ashdom.lootGenerator.render({force:true});
    },
    openCompendiumBrowser: () => {
      game.ashdom.compendiumBrowser ??= new AshdomCompendiumBrowser();
      return game.ashdom.compendiumBrowser.render({ force: true });
    }
  };

});

Hooks.once("ready", async () => {
  await applyCompendiumSorting();
  game.ashdom.compendiumBrowser ??= new AshdomCompendiumBrowser();
});

Hooks.on("preCreateItem", (item, data) => {
  const currentImage = data.img ?? item.img;
  if (!isReplaceableItemIcon(currentImage)) return;
  item.updateSource({
    img: getAshdomItemIcon(
      data.type ?? item.type,
      data.system?.category ?? item.system?.category,
      data.system?.subcategory ?? item.system?.subcategory,
      data.system?.rarity ?? item.system?.rarity,
      data.system?.perkType ?? item.system?.perkType
    )
  });
});

Hooks.on("preCreateActor", (actor, data) => {
  const changes = { ...data };
  updateNPCIcon(actor, changes);
  if (changes.img !== undefined && actor.type === "npc") actor.updateSource({ img: changes.img });
});

Hooks.on("preUpdateActor", updateNPCIcon);

Hooks.on("preUpdateItem", (item, changes) => {
  if (!isReplaceableItemIcon(item.img)) return;
  const category = foundry.utils.getProperty(changes, "system.category") ??
    item.system?.category;
  const rarity = foundry.utils.getProperty(changes, "system.rarity") ??
    item.system?.rarity;
  const subcategory = foundry.utils.getProperty(changes, "system.subcategory") ??
    item.system?.subcategory;
  const perkType = foundry.utils.getProperty(changes, "system.perkType") ?? item.system?.perkType;
  changes.img = getAshdomItemIcon(item.type, category, subcategory, rarity, perkType);
});

Hooks.on("renderCompendiumDirectory", (application, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector("[data-ashdom-compendium-browser]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.dataset.ashdomCompendiumBrowser = "true";
  button.className = "ashdom-open-browser";
  button.innerHTML = '<i class="fa-solid fa-book-atlas" aria-hidden="true"></i> ASHDOM Browser';
  button.addEventListener("click", () => game.ashdom.openCompendiumBrowser());

  const footer = root.querySelector(".directory-footer");
  if (footer) footer.append(button);
  else root.prepend(button);
});

Hooks.on("renderCompendiumDirectory", (application, html) => {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!game.user?.isGM || !root || root.querySelector("[data-ashdom-loot-generator]")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.ashdomLootGenerator = "true";
  button.className = "ashdom-open-browser";
  button.textContent = "ASHDOM Loot Generator";
  button.addEventListener("click", () => game.ashdom.openLootGenerator());
  const toolbar = document.createElement("div");
  toolbar.className = "ashdom-loot-launcher";
  toolbar.append(button);
  const header = root.querySelector(".directory-header");
  if (header) header.after(toolbar); else root.prepend(toolbar);
});

Hooks.on("renderCompendiumDirectory", (application, html) => {
 const root=html instanceof HTMLElement?html:html?.[0];
 if(!game.user?.isGM||!root||root.querySelector('[data-ashdom-encounter-generator]'))return;
 const toolbar=document.createElement('div');toolbar.className='ashdom-loot-launcher';
 const button=document.createElement('button');button.type='button';button.className='ashdom-open-browser';button.dataset.ashdomEncounterGenerator='true';button.textContent='ASHDOM Encounter Generator';
 button.addEventListener('click',()=>game.ashdom.openEncounterGenerator());toolbar.append(button);
 const header=root.querySelector('.directory-header');if(header)header.after(toolbar);else root.prepend(toolbar);
});

Hooks.on("renderCompendiumDirectory", (application, html) => {
 const root=html instanceof HTMLElement?html:html?.[0];
 if(!game.user?.isGM||!root||root.querySelector('[data-ashdom-shop-generator]'))return;
 const toolbar=document.createElement('div');toolbar.className='ashdom-loot-launcher';
 const button=document.createElement('button');button.type='button';button.className='ashdom-open-browser';button.dataset.ashdomShopGenerator='true';button.textContent='ASHDOM Shop Generator';
 button.addEventListener('click',()=>game.ashdom.openShopGenerator());toolbar.append(button);
 const header=root.querySelector('.directory-header');if(header)header.after(toolbar);else root.prepend(toolbar);
});
