const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class AshdomNPCSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ashdom", "ashdom-npc-sheet"],
    tag: "form",
    position: {
      width: 600,
      height: 500
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true,
      handler: AshdomNPCSheet.#onSubmitForm
    }
  };

  static PARTS = {
    form: {
      template: "systems/ashdom/templates/actor/npc-sheet.html"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.actor = this.actor;
    context.system = this.actor.system;
    return context;
  }

  static async #onSubmitForm(event, form, formData) {
    await this.actor.update(formData.object);
  }
}
