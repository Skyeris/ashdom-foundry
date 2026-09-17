import { AshdomCharacterSheet } from "./character-sheet.mjs";
import { npcIcon, isDefaultNPCImage } from "../npc-icons.mjs";

export class AshdomNPCSheet extends AshdomCharacterSheet {
  static DEFAULT_OPTIONS = {
    ...AshdomCharacterSheet.DEFAULT_OPTIONS,
    classes: ["ashdom", "ashdom-character-sheet", "ashdom-npc-sheet"],
    form: { ...AshdomCharacterSheet.DEFAULT_OPTIONS.form, handler: AshdomNPCSheet.saveNPC }
  };
  static PARTS = { form: { template: "systems/ashdom/templates/actor/npc-sheet.html" } };

  async _prepareContext(options) {
    if (!this.actor.system.armors?.length && this.isEditable) {
      await this.actor.update({ "system.armors": [{}] }, { render: false });
    }
    const context = await super._prepareContext(options);
    context.npcArmor = context.armors[0] ?? {};
    context.npcPortrait = isDefaultNPCImage(this.actor.img) ? npcIcon(this.actor.system.details.bodyType) : this.actor.img;
    context.bodyTypeChoices = { Humanoid: "Humanoid", Creature: "Creature", Robot: "Robot" };
    context.npcDefense = Object.fromEntries((context.npcArmor.ratings ?? []).map(row => [row.key, row.total]));
    if (!context.system.biography && context.system.details.description) {
      context.system = { ...context.system.toObject(), biography: context.system.details.description };
    }
    return context;
  }

  static async saveNPC(event, form, formData) {
    const data = foundry.utils.expandObject(formData.object);
    for (const [key, value] of Object.entries(data.npcDefense ?? {})) {
      if (!["ac", "n", "l", "f", "p", "e", "dr", "rr"].includes(key)) continue;
      const rating = this.actor.system.armors?.[0]?.ratings?.[key] ?? {};
      const components = ["ua", "armorSet", "helmet", "modifier"].reduce((sum, field) => sum + (Number(rating[field]) || 0), 0);
      foundry.utils.setProperty(data, `system.armors.0.ratings.${key}.base`, (Number(value) || 0) - components);
    }
    delete data.npcDefense;
    await AshdomCharacterSheet.DEFAULT_OPTIONS.form.handler.call(this, event, form, { object: data });
  }
}
