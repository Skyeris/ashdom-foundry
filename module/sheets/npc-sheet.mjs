import {savePreferences} from "./sheet-preferences.mjs";
import { AshdomCharacterSheet } from "./character-sheet.mjs";
import { npcIcon, isDefaultNPCImage } from "../npc-icons.mjs";
import { npcGroup } from "../actor/npc-groups.mjs";
import { NPC_DEFCON_CHOICES, npcDefconLabel, parseNPCDefcon } from "../actor/npc-defcon.mjs";

export class AshdomNPCSheet extends AshdomCharacterSheet {
  static DEFAULT_OPTIONS = {
    ...AshdomCharacterSheet.DEFAULT_OPTIONS,
    classes: ["ashdom", "ashdom-character-sheet", "ashdom-npc-sheet"],
    actions: {
      ...AshdomCharacterSheet.DEFAULT_OPTIONS.actions,
      toggleGroupRules: AshdomNPCSheet.toggleGroupRules
    },
    form: { ...AshdomCharacterSheet.DEFAULT_OPTIONS.form, handler: AshdomNPCSheet.saveNPC }
  };
  static PARTS = { form: { template: "systems/ashdom/templates/actor/npc-sheet.html" } };

  static toggleGroupRules(event) {
    event.preventDefault();
    this._groupRulesClosed = !this._groupRulesClosed;
    savePreferences(this);
    this.render();
  }

  async _prepareContext(options) {
    if (!this.actor.system.armors?.length && this.isEditable) {
      await this.actor.update({ "system.armors": [{}] }, { render: false });
    }
    const context = await super._prepareContext(options);
    context.npcArmor = context.armors[0] ?? {};
    context.npcPortrait = isDefaultNPCImage(this.actor.img) ? npcIcon(this.actor.system.details.bodyType) : this.actor.img;
    context.bodyTypeChoices = { Humanoid: "Humanoid", Creature: "Creature", Robot: "Robot" };
    context.npcDefense = Object.fromEntries((context.npcArmor.ratings ?? []).map(row => [row.key, row.total]));
    context.group = npcGroup(this.actor.system);
    context.defconChoices = NPC_DEFCON_CHOICES;
    context.npcDefcon = npcDefconLabel(this.actor.system.details.level, this.actor.system.details.defconQualifier);
    context.groupDefcon = npcDefconLabel(context.group.tier, this.actor.system.details.defconQualifier);
    context.groupRulesOpen = !this._groupRulesClosed;
    if (!context.system.biography && context.system.details.description) {
      context.system = { ...context.system.toObject(), biography: context.system.details.description };
    }
    return context;
  }

  static async saveNPC(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    if (data.npcDefconTier !== undefined) {
      const selection = parseNPCDefcon(data.npcDefconTier);
      if (selection && !npcGroup(this.actor.system).active) {
        foundry.utils.setProperty(data, "system.details.level", selection.level);
        foundry.utils.setProperty(data, "system.details.defconQualifier", selection.defconQualifier);
      }
      delete data.npcDefconTier;
    }
    const group = npcGroup(this.actor.system);
    if (data.system?.settings?.groups && !npcGroup({
      ...this.actor.system,
      details: { ...this.actor.system.details, ...data.system?.details }
    }).eligible) {
      data.system.settings.groups = false;
      ui.notifications.warn("Groups require original DEFCON 4 or 5 and Small, Medium, or Large size.");
    }
    if (group.active) {
      delete data.npcDefense;
      for (const key of ["crippled", "crippledHead", "crippledTorso", "crippledArm", "crippledLeg", "crippledGroin", "knockDown"]) {
        if (data.system?.health) delete data.system.health[key];
      }
    }
    for (const [key, value] of Object.entries(data.npcDefense ?? {})) {
      if(key === "rr" && (this.actor.system.health?.immuneToRads || data.system?.health?.immuneToRads)) continue;
      if (!["ac", "n", "l", "f", "p", "e", "dr", "rr"].includes(key)) continue;
      const rating = this.actor.system.armors?.[0]?.ratings?.[key] ?? {};
      const components = ["ua", "armorSet", "helmet", "modifier"].reduce((sum, field) => sum + (Number(rating[field]) || 0), 0);
      foundry.utils.setProperty(data, `system.armors.0.ratings.${key}.base`, (Number(value) || 0) - components);
    }
    delete data.npcDefense;
    await AshdomCharacterSheet.DEFAULT_OPTIONS.form.handler.call(this, event, form, { object: data });
  }
}
