const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

import {
  ASHDOM_SKILLS,
  ASHDOM_ITEM_TAXONOMY,
  ASHDOM_ITEM_DESTINATIONS,
  ASHDOM_ITEM_RARITIES,
  ASHDOM_RARITY_ITEM_TYPES
} from "../config.mjs";

function optionMap(values) {
  return Object.fromEntries(values.map(value => [value, value]));
}

export class AshdomItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ashdom", "ashdom-item-sheet"],
    tag: "form",
    position: { width: 620, height: 680 },
    form: {
      closeOnSubmit: false,
      submitOnChange: true,
      handler: AshdomItemSheet.#onSubmitForm
    }
  };

  static PARTS = {
    form: { template: "systems/ashdom/templates/item/item-sheet.html" }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.item = this.item;
    context.system = this.item.system;
    context.itemTypeLabel = game.i18n.localize(`TYPES.Item.${this.item.type}`);
    context.isWeapon = this.item.type === "weapon";
    context.isArmor = this.item.type === "armor";
    context.isPerk = this.item.type === "perk";
    context.isSkillSpec = this.item.type === "skillSpec";
    context.isGear = this.item.type === "gear";
    context.isConsumable = this.item.type === "consumable";
    context.isMod = this.item.type === "mod";
    context.isVehicle = this.item.type === "vehicle";
    context.isVehicleMod = this.item.type === "vehicleMod";
    context.hasRarity = ASHDOM_RARITY_ITEM_TYPES.includes(this.item.type);
    context.rarityChoices = ASHDOM_ITEM_RARITIES;
    const destinations = ASHDOM_ITEM_DESTINATIONS[this.item.type] ?? [];
    context.isInventoryType = destinations.includes("inventory");
    context.isGeneralInventoryType = context.isInventoryType &&
      !["weapon", "armor"].includes(this.item.type);
    context.skillChoices = ASHDOM_SKILLS;
    context.damageTypes = {
      "": "", Normal: "Normal", Laser: "Laser", Fire: "Fire", Plasma: "Plasma",
      Explosive: "Explosive", Poison: "Poison", True: "True"
    };
    context.perkTypes = {
      Background: "Background", Bestiary: "Bestiary", FORMULA: "FORMULA",
      Racial: "Racial", Roleplay: "Roleplay", "Skill Spec": "Skill Spec", Trait: "Trait"
    };
    context.conditions = { Pristine: "Pristine", Broken: "Broken" };

    const taxonomy = ASHDOM_ITEM_TAXONOMY[this.item.type] ?? {};
    const category = String(this.item.system.category || "");
    const subcategory = String(this.item.system.subcategory || "");
    const subcategories = taxonomy[category];
    const specializations = subcategories && typeof subcategories === "object"
      ? subcategories[subcategory]
      : null;

    context.hasTaxonomy = Object.keys(taxonomy).length > 0;
    context.categoryChoices = optionMap(Object.keys(taxonomy));
    context.subcategoryChoices = optionMap(
      subcategories && typeof subcategories === "object" ? Object.keys(subcategories) : []
    );
    context.specializationChoices = optionMap(
      specializations && typeof specializations === "object" ? Object.keys(specializations) : []
    );
    context.hasSubcategories = Object.keys(context.subcategoryChoices).length > 0;
    context.hasSpecializations = Object.keys(context.specializationChoices).length > 0;
    return context;
  }

  static async #onSubmitForm(event, form, formData) {
    await this.item.update(formData.object);
  }
}
