import { VEHICLE_TYPES, normalizeVehicleType, vehicleTypeIcon } from "../vehicle-types.mjs";
import { createVehicleEntry, createCargoEntry, cargoWeight } from "../actor/vehicle-data.mjs";
import { ASHDOM_ITEM_DESTINATIONS } from "../config.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export class AshdomVehicleSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["ashdom", "ashdom-vehicle-sheet"],
    tag: "form",
    position: { width: 1100, height: 780 },
    form: { closeOnSubmit: false, submitOnChange: true, handler: AshdomVehicleSheet.#save },
    actions: {
      removeVehicleMod: AshdomVehicleSheet.#removeVehicleMod,
      addCargo: AshdomVehicleSheet.#addCargo,
      deleteCargo: AshdomVehicleSheet.#deleteCargo,
      editVehicleNote: AshdomVehicleSheet.#editNote,
      toggleCargo: AshdomVehicleSheet.#toggleCargo,
      rollVehicleDamage: AshdomVehicleSheet.#rollDamage
    }
  };

  static PARTS = { form: { template: "systems/ashdom/templates/actor/vehicle-sheet.html" } };

  _vehicles() {
    const vehicles = foundry.utils.deepClone(this.actor.toObject().system.vehicles ?? []);
    if (!vehicles.length) vehicles.push(createVehicleEntry());
    return vehicles;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const vehicles = Array.from(this.actor.system.vehicles ?? []);
    if (!vehicles.length) vehicles.push(createVehicleEntry());
    const selected = 0;
    this._selectedVehicle = selected;
    context.actor = this.actor;
    context.vehicles = vehicles.slice(0, 1).map((vehicle, index) => ({
      ...vehicle.toObject?.() ?? vehicle,
      type: normalizeVehicleType(vehicle.type), typeIcon: vehicleTypeIcon(vehicle.type),
      index, selected: index === selected, cwCurrent: cargoWeight(vehicle.cargo),
      hasNote: Boolean(vehicle.note?.trim()),
      mods: Array.from(vehicle.mods ?? []).map((mod, modIndex) => ({ ...mod, modIndex, hasNote: Boolean(mod.note?.trim()) })),
      ratings: Object.entries(vehicle.ratings ?? {}).map(([key, rating]) => ({ key, ...rating }))
    }));
    const vehicle = vehicles[selected];
    context.activeVehicle = vehicle ? {
      name: this.actor.name || vehicle.name || "Vehicle", index: selected,
      cwCurrent: cargoWeight(vehicle.cargo), cwMax: vehicle.cwMax,
      overloaded: cargoWeight(vehicle.cargo) > Number(vehicle.cwMax || 0),
      cargo: Array.from(vehicle.cargo ?? []).map((item, index) => ({
        ...item.toObject?.() ?? item,
        index, vehicleIndex: selected,
        totalWeight: Math.max(0, Number(item.quantity) || 0) * Math.max(0, Number(item.weight) || 0),
        hasNote: Boolean(item.note?.trim()),
        open: this._openCargo?.has(`${selected}:${index}`) ?? false
      }))
    } : null;
    context.vehicleTypeChoices = Object.fromEntries(VEHICLE_TYPES.map(type => [type, type]));
    context.conditions = { Pristine: "Pristine", Broken: "Broken" };
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelectorAll("[data-vehicle-drop], [data-cargo-drop], [data-vehicle-mod-drop]").forEach(target => {
      target.addEventListener("dragover", event => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
        target.classList.add("ashdom-vehicle-drop-ready");
      });
      target.addEventListener("dragleave", event => {
        if (!target.contains(event.relatedTarget)) target.classList.remove("ashdom-vehicle-drop-ready");
      });
      target.addEventListener("drop", event => this._dropItem(event, target));
    });
  }

  async _dropItem(event, target) {
    event.preventDefault();
    event.stopPropagation();
    target.classList.remove("ashdom-vehicle-drop-ready");
    let data;
    try { data = JSON.parse(event.dataTransfer.getData("text/plain")); }
    catch { return; }
    if (data?.type !== "Item" || !data.uuid || !this.isEditable) return;
    const item = await fromUuid(data.uuid);
    if (!item) return;
    const vehicles = this._vehicles();
    if (target.hasAttribute("data-vehicle-mod-drop")) {
      if (item.type !== "vehicleMod") return ui.notifications.warn("Drop a Vehicle Mod Item here.");
      (vehicles[0].mods ??= []).push({ name: String(item.name ?? ""), note: String(item.system.note ?? ""), sourceUuid: String(item.uuid ?? "") });
    } else if (target.hasAttribute("data-vehicle-drop")) {
      if (item.type !== "vehicle") return ui.notifications.warn("Drop a Vehicle Item in the Vehicles column.");
      const cargo = vehicles[0].cargo ?? [];
      vehicles[0] = { ...createVehicleEntry(item), cargo, mods: vehicles[0].mods ?? [] };
    } else {
      const index = Number(target.dataset.vehicleIndex);
      if (!Number.isInteger(index) || !vehicles[index]) return;
      if (!(ASHDOM_ITEM_DESTINATIONS[item.type] ?? []).includes("inventory")) {
        return ui.notifications.warn("Drop an inventory item into vehicle cargo.");
      }
      (vehicles[index].cargo ??= []).push(createCargoEntry(item));
    }
    const update = { "system.vehicles": vehicles };
    if (target.hasAttribute("data-vehicle-drop")) update.name = item.name;
    await this.actor.update(update);
  }

  static async #save(event, form, formData) {
    if (!this.isEditable) return;
    const data = foundry.utils.expandObject(formData.object);
    const vehicles = this._vehicles();
    for (const [key, submitted] of Object.entries(data.system?.vehicles ?? {})) {
      const index = Number(key);
      if (index !== 0 || !vehicles[index]) continue;
      const { cargo, mods, note, cwCurrent, ...fields } = submitted;
      vehicles[index] = foundry.utils.mergeObject(vehicles[index], fields, { inplace: false });
      for (const [cargoKey, entry] of Object.entries(cargo ?? {})) {
        const cargoIndex = Number(cargoKey);
        if (!Number.isInteger(cargoIndex) || !vehicles[index].cargo?.[cargoIndex]) continue;
        const { note, totalWeight, ...cargoFields } = entry;
        vehicles[index].cargo[cargoIndex] = foundry.utils.mergeObject(vehicles[index].cargo[cargoIndex], cargoFields, { inplace: false });
      }
    }
    const update = { "system.vehicles": vehicles };
    if (typeof data.name === "string") {
      update.name = data.name;
      vehicles[0].name = data.name;
    }
    await this.actor.update(update);
  }

  static async #removeVehicleMod(event, target) {
    event.preventDefault();
    if (!this.isEditable) return;
    const vehicles = this._vehicles();
    const index = Number(target.dataset.modIndex);
    if (!Number.isInteger(index) || index < 0 || !vehicles[0].mods?.[index]) return;
    vehicles[0].mods.splice(index, 1);
    await this.actor.update({ "system.vehicles": vehicles });
  }

  static async #addCargo(event, target) {
    event.preventDefault();
    if (!this.isEditable) return;
    const vehicles = this._vehicles();
    const index = Number(target.dataset.vehicleIndex);
    if (!Number.isInteger(index) || !vehicles[index]) return;
    (vehicles[index].cargo ??= []).push(createCargoEntry());
    await this.actor.update({ "system.vehicles": vehicles });
  }

  static async #deleteCargo(event, target) {
    event.preventDefault();
    if (!this.isEditable) return;
    const vehicles = this._vehicles();
    const index = Number(target.dataset.vehicleIndex);
    const cargoIndex = Number(target.dataset.cargoIndex);
    if (!Number.isInteger(index) || !Number.isInteger(cargoIndex) || !vehicles[index]?.cargo?.[cargoIndex]) return;
    vehicles[index].cargo.splice(cargoIndex, 1);
    this._openCargo = new Set();
    await this.actor.update({ "system.vehicles": vehicles });
  }

  static async #toggleCargo(event, target) {
    event.preventDefault();
    const key = `${target.dataset.vehicleIndex}:${target.dataset.cargoIndex}`;
    this._openCargo ??= new Set();
    if (!this._openCargo.delete(key)) this._openCargo.add(key);
    this.render({ force: true });
  }

  static async #editNote(event, target) {
    event.preventDefault();
    if (!this.isEditable) return;
    const index = Number(target.dataset.vehicleIndex);
    const cargoIndex = target.dataset.cargoIndex === undefined ? null : Number(target.dataset.cargoIndex);
    const vehicles = this._vehicles();
    const modIndex = target.dataset.modIndex === undefined ? null : Number(target.dataset.modIndex);
    const entry = modIndex !== null ? vehicles[index]?.mods?.[modIndex] : cargoIndex === null ? vehicles[index] : vehicles[index]?.cargo?.[cargoIndex];
    if (!entry) return;
    const content = document.createElement("div");
    const noteWrapper = document.createElement("div");
    noteWrapper.className = "ashdom-note-dialog";
    const textarea = document.createElement("textarea");
    textarea.name = "note";
    textarea.textContent = String(entry.note ?? "");
    textarea.rows = 10;
    textarea.autofocus = true;
    const label = entry.name || (cargoIndex === null ? this.actor.name : "Item") || "Vehicle";
    textarea.placeholder = `Enter notes for ${label}`;
    noteWrapper.append(textarea);
    content.append(noteWrapper);
    const savedNote = await foundry.applications.api.DialogV2.prompt({
      classes: ["ashdom", "ashdom-note-dialog-window"],
      window: { title: label }, position: { width: 520 }, content,
      ok: { label: "Save", callback: (event, button) => button.form.elements.note.value },
      rejectClose: false,
      modal: false
    });
    const note = savedNote == null ? textarea.value : savedNote;
    const latest = this._vehicles();
    const current = modIndex !== null ? latest[index]?.mods?.[modIndex] : cargoIndex === null ? latest[index] : latest[index]?.cargo?.[cargoIndex];
    if (!current) return;
    current.note = String(note);
    await this.actor.update({ "system.vehicles": latest });
  }

  static async #rollDamage(event, target) {
    event.preventDefault();
    const vehicle = this.actor.system.vehicles?.[Number(target.dataset.vehicleIndex)];
    if (!vehicle) return;
    const flat = Number(vehicle.flatDamage) || 0;
    try {
      const roll = await new Roll(`(${String(vehicle.diceDamage || "0")}) + (${flat})`).evaluate();
      const details = String(roll.formula).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${this.actor.name || vehicle.name || "Vehicle"} — Damage`,
        content: `<div class="ashdom-roll-card ashdom-themed-chat-card"><div class="ashdom-roll-result" title="${details}">${Number(roll.total)}</div></div>`,
        rolls: [roll]
      });
    } catch { ui.notifications.error("Vehicle damage formula is invalid."); }
  }
}
