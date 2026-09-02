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


Hooks.once("init", () => {

  console.log("ASHDOM | Initializing system");


  /* =========================================
     ACTOR DATA MODELS
  ========================================= */

  CONFIG.Actor.dataModels = {

    character: AshdomCharacterData,

    npc: AshdomNPCData

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

});
