const { HandlebarsApplicationMixin } =
  foundry.applications.api;

const { ActorSheetV2 } =
  foundry.applications.sheets;


function escapeHTML(value) {

  const element = document.createElement("div");
  element.textContent = String(value);

  return element.innerHTML;

}


/* =========================================
   ASHDOM CHARACTER SHEET
========================================= */

export class AshdomCharacterSheet extends
  HandlebarsApplicationMixin(ActorSheetV2) {


  static DEFAULT_OPTIONS = {

    classes: [
      "ashdom",
      "ashdom-character-sheet"
    ],

    tag: "form",

    position: {
      width: 1000,
      height: 800
    },

    form: {
      closeOnSubmit: false,
      submitOnChange: true,
      handler: AshdomCharacterSheet.#onSubmitForm
    },

    actions: {
      changeTab: AshdomCharacterSheet.#changeTab,
      openNote: AshdomCharacterSheet.#openNote,
      addDataEntry: AshdomCharacterSheet.#addDataEntry,
      deleteDataEntry: AshdomCharacterSheet.#deleteDataEntry,
      displayPerk: AshdomCharacterSheet.#displayPerk,
      displayWeapon: AshdomCharacterSheet.#displayWeapon,
      rollWeaponSingle: AshdomCharacterSheet.#rollWeaponSingle,
      rollWeaponTargeted: AshdomCharacterSheet.#rollWeaponTargeted,
      rollWeaponBurst: AshdomCharacterSheet.#rollWeaponBurst,
      rollReaper: AshdomCharacterSheet.#rollReaper,
      rollSecondary: AshdomCharacterSheet.#rollSecondary,
      toggleArmor: AshdomCharacterSheet.#toggleArmor,
      toggleWeapon: AshdomCharacterSheet.#toggleWeapon,
      toggleVehicle: AshdomCharacterSheet.#toggleVehicle,
      rollVehicleDamage: AshdomCharacterSheet.#rollVehicleDamage,
      toggleInventoryItem: AshdomCharacterSheet.#toggleInventoryItem,
      toggleSkillGroup: AshdomCharacterSheet.#toggleSkillGroup,
      rollSkill: AshdomCharacterSheet.#rollSkill
    }

  };


  static PARTS = {

    form: {
      template:
        "systems/ashdom/templates/actor/character-sheet.html"
    }

  };


  /* =========================================
     PRESERVE TAB SCROLL POSITION
  ========================================= */

  async _preRender(context, options) {

    if (this.rendered) {
      const scrollPositions = this._tabScrollPositions ??= new Map();

      this.element.querySelectorAll("[data-tab-content]")
        .forEach(tab => {
          scrollPositions.set(tab.dataset.tabContent, tab.scrollTop);
        });
    }

    await super._preRender(context, options);

  }


  async _onRender(context, options) {

    await super._onRender(context, options);

    const scrollPositions = this._tabScrollPositions;

    if (scrollPositions) {
      this.element.querySelectorAll("[data-tab-content]")
        .forEach(tab => {
          const scrollTop = scrollPositions.get(tab.dataset.tabContent);

          if (Number.isFinite(scrollTop)) {
            tab.scrollTop = scrollTop;
          }
        });
    }

    this._activateDataReordering();
    this._activateArmorItemDrops();

  }


  /* =========================================
     DROP COMPENDIUM ARMOR COMPONENTS
  ========================================= */

  _activateArmorItemDrops() {

    const slotData = {
      armorSet: {
        nameField: "name",
        ratingField: "armorSet",
        noteLabel: "Armor Set"
      },
      underArmor: {
        nameField: "underArmorName",
        ratingField: "ua",
        noteLabel: "Under Armor"
      },
      helmet: {
        nameField: "helmetName",
        ratingField: "helmet",
        noteLabel: "Helmet"
      }
    };

    const mergeComponentNote = (currentNote, component, itemName, itemNote) => {
      const componentLabels = ["Armor Set", "Under Armor", "Helmet"];
      const componentPattern = new RegExp(
        `^(${componentLabels.join("|")})\\s+[—-]\\s+`,
        "i"
      );
      const blocks = String(currentNote ?? "")
        .split(/\r?\n\s*\r?\n/)
        .map(block => block.trim())
        .filter(Boolean)
        .filter(block => {
          const match = block.match(componentPattern);
          return !match || match[1].toLocaleLowerCase() !== component.noteLabel.toLocaleLowerCase();
        });
      const cleanNote = String(itemNote ?? "").trim();

      if (cleanNote) {
        blocks.push(`${component.noteLabel} — ${itemName}\n${cleanNote}`);
      }

      return blocks.join("\n\n");
    };

    this.element.querySelectorAll("[data-armor-drop-slot]")
      .forEach(target => {
        target.addEventListener("dragover", event => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          target.classList.add("ashdom-armor-drop-ready");
        });

        target.addEventListener("dragleave", () => {
          target.classList.remove("ashdom-armor-drop-ready");
        });

        target.addEventListener("drop", async event => {
          event.preventDefault();
          target.classList.remove("ashdom-armor-drop-ready");

          let dragData;
          try {
            dragData = JSON.parse(event.dataTransfer.getData("text/plain"));
          } catch (error) {
            return;
          }

          if (dragData?.type !== "Item" || !dragData.uuid) return;

          const item = await fromUuid(dragData.uuid);
          if (!item || item.type !== "armor") {
            return ui.notifications.warn("Only ASHDOM Armor Items can be dropped into an Armor slot.");
          }

          const index = Number(target.dataset.armorIndex);
          const component = slotData[target.dataset.armorDropSlot];
          const armors = foundry.utils.deepClone(
            this.actor.toObject().system.armors ?? []
          );

          if (!component || !Number.isInteger(index) || !armors[index]) return;

          const armor = armors[index];
          armor[component.nameField] = String(item.name ?? "");

          for (const key of ["ac", "n", "l", "f", "p", "e", "dr", "rr"]) {
            const sourceRating = item.system.ratings?.[key];
            const targetRating = armor.ratings?.[key];
            if (!sourceRating || !targetRating) continue;
            targetRating[component.ratingField] = Number(
              sourceRating[component.ratingField]
            ) || 0;
          }

          armor.note = mergeComponentNote(
            armor.note,
            component,
            String(item.name || component.noteLabel),
            item.system.note
          );

          await this.actor.update({ "system.armors": armors });
          ui.notifications.info(`${item.name} added as ${component.noteLabel}.`);
        });
      });

  }


  /* =========================================
     REORDER REPEATABLE DATA ENTRIES
  ========================================= */

  _activateDataReordering() {

    const clearIndicators = () => {
      this.element.querySelectorAll(".ashdom-drop-before, .ashdom-drop-after")
        .forEach(row => {
          row.classList.remove("ashdom-drop-before", "ashdom-drop-after");
        });
    };

    this.element.querySelectorAll(".ashdom-drag-handle")
      .forEach(handle => {
        handle.addEventListener("dragstart", event => {
          const row = handle.closest("[data-reorder-entry]");

          if (!row) return;

          this._draggedDataEntry = {
            collection: row.dataset.collection,
            index: Number(row.dataset.index)
          };

          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", "ashdom-data-entry");
          row.classList.add("ashdom-dragging");
        });

        handle.addEventListener("dragend", () => {
          this._draggedDataEntry = null;
          clearIndicators();
          this.element.querySelectorAll(".ashdom-dragging")
            .forEach(row => row.classList.remove("ashdom-dragging"));
        });
      });

    this.element.querySelectorAll("[data-reorder-entry]")
      .forEach(row => {
        row.addEventListener("dragover", event => {
          const dragged = this._draggedDataEntry;

          if (!dragged || dragged.collection !== row.dataset.collection) return;

          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          clearIndicators();

          const bounds = row.getBoundingClientRect();
          const after = event.clientY > bounds.top + bounds.height / 2;
          row.classList.add(after ? "ashdom-drop-after" : "ashdom-drop-before");
        });

        row.addEventListener("drop", async event => {
          const dragged = this._draggedDataEntry;

          if (!dragged || dragged.collection !== row.dataset.collection) return;

          event.preventDefault();

          const bounds = row.getBoundingClientRect();
          const after = event.clientY > bounds.top + bounds.height / 2;

          clearIndicators();
          await this._reorderDataEntries(
            dragged.collection,
            dragged.index,
            Number(row.dataset.index),
            after
          );
        });
      });

  }


  async _reorderDataEntries(collection, fromIndex, targetIndex, after) {

    const allowed = new Set([
      "perks",
      "chargeTrackers",
      "effects",
      "languages",
      "armors",
      "weapons",
      "currencies",
      "inventoryItems"
    ]);

    if (
      !allowed.has(collection) ||
      !Number.isInteger(fromIndex) ||
      !Number.isInteger(targetIndex)
    ) return;

    const entries = foundry.utils.deepClone(
      this.actor.toObject().system[collection] ?? []
    );

    if (
      fromIndex < 0 || fromIndex >= entries.length ||
      targetIndex < 0 || targetIndex >= entries.length
    ) return;

    const [movedEntry] = entries.splice(fromIndex, 1);
    let insertIndex = targetIndex + (after ? 1 : 0);

    if (fromIndex < insertIndex) insertIndex -= 1;

    entries.splice(insertIndex, 0, movedEntry);

    await this.actor.update({
      [`system.${collection}`]: entries
    });

  }


  async _prepareContext(options) {

    const context =
      await super._prepareContext(options);

    context.actor = this.actor;
    context.system = this.actor.system;
    context.activeTab = this._activeTab ?? "character";
    context.tabs = {
      character: context.activeTab === "character",
      data: context.activeTab === "data",
      inventory: context.activeTab === "inventory",
      settings: context.activeTab === "settings"
    };
    context.formulaBaseLimitsActive = Boolean(
      this.actor.system.settings?.variantRules?.formulaBaseLimits
    );
    context.formulaVariantActive = Boolean(
      this.actor.system.settings?.variantRules?.formulaSkillEquations
    );
    context.d100VariantActive = Boolean(
      this.actor.system.settings?.variantRules?.d100Variant &&
      !context.formulaVariantActive
    );
    const closedGroups = this._closedSkillGroups ??= new Set();

    const prepareSkill = ([key, label]) => ({
      key,
      label,
      total: this.actor.system.skills[key].total,
      tagged: this.actor.system.skills[key].tagged,
      modifier: this.actor.system.skills[key].modifier,
      temp: this.actor.system.skills[key].temp,
      hasNote: Boolean(this.actor.system.skills[key].note?.trim())
    });

    const prepareGroup = ([id, label, skills]) => ({
      id,
      label,
      open: !closedGroups.has(id),
      skills: skills.map(prepareSkill)
    });

    context.skillSections = [
      [
        "combat",
        "Combat",
        [
          [
            "close",
            "Close",
            [
              ["meleeWeapons", "Melee Weapons"],
              ["unarmed", "Unarmed"]
            ]
          ],
          [
            "ranged",
            "Ranged",
            [
              ["archery", "Archery"],
              ["energyWeapons", "Energy Weapons"],
              ["heavyGuns", "Heavy Guns"],
              ["lightGuns", "Light Guns"]
            ]
          ]
        ]
      ],
      [
        "support",
        "Support Skills",
        [
          [
            "crafting",
            "Crafting Skills",
            [
              ["blacksmith", "Blacksmith"],
              ["chemistry", "Chemistry"],
              ["electronics", "Electronics"],
              ["engineer", "Engineer"],
              ["gunsmith", "Gunsmith"]
            ]
          ],
          [
            "knowledge",
            "Knowledge Skills",
            [
              ["logic", "Logic"],
              ["lore", "Lore"],
              ["medicine", "Medicine"],
              ["mysticism", "Mysticism"]
            ]
          ],
          [
            "physical",
            "Physical Skills",
            [
              ["acrobatics", "Acrobatics"],
              ["athletics", "Athletics"],
              ["sleightOfHand", "Sleight of Hand"],
              ["sneak", "Sneak"]
            ]
          ],
          [
            "social",
            "Social Skills",
            [
              ["charm", "Charm"],
              ["deception", "Deception"],
              ["intimidation", "Intimidation"],
              ["insight", "Insight"],
              ["mercantile", "Mercantile"]
            ]
          ],
          [
            "utility",
            "Utility Skills",
            [
              ["animalHandling", "Animal Handling"],
              ["chance", "Chance"],
              ["perception", "Perception"],
              ["pilot", "Pilot"],
              ["survival", "Survival"]
            ]
          ]
        ]
      ]
    ].map(([id, label, groups]) => ({
      id,
      label,
      open: !closedGroups.has(id),
      groups: groups.map(prepareGroup)
    }));

    context.weaponSkillChoices = Object.fromEntries(
      context.skillSections.flatMap(section =>
        section.groups.flatMap(group =>
          group.skills.map(skill => [skill.key, skill.label])
        )
      )
    );

    context.weaponDamageTypeChoices = {
      "": "",
      Normal: "Normal",
      Laser: "Laser",
      Fire: "Fire",
      Plasma: "Plasma",
      Explosive: "Explosive",
      Poison: "Poison",
      True: "True"
    };

    const closedWeapons = this._closedWeapons ??= new Set();
    context.weapons = Array.from(this.actor.system.weapons ?? []).map(
      (weapon, index) => ({
        index,
        name: weapon.name,
        equipped: weapon.equipped,
        note: weapon.note,
        hasNote: Boolean(weapon.note?.trim()),
        s: weapon.s,
        t: weapon.t,
        b: weapon.b,
        ac: weapon.ac,
        dt: weapon.dt,
        range: weapon.range,
        skill: weapon.skill,
        skillLabel: context.weaponSkillChoices[weapon.skill] ?? weapon.skill,
        damageType: weapon.damageType,
        diceDamage: weapon.diceDamage,
        flatDamage: weapon.flatDamage,
        capacityCurrent: weapon.capacityCurrent,
        capacityMax: weapon.capacityMax,
        itemType: weapon.itemType,
        reloadAP: weapon.reloadAP,
        ammoType: weapon.ammoType,
        burstLimit: weapon.burstLimit,
        ignoreTargetHitChance: weapon.ignoreTargetHitChance,
        setupAP: weapon.setupAP,
        open: !closedWeapons.has(index)
      })
    );

    context.perkTypeChoices = {
      Background: "Background",
      Bestiary: "Bestiary",
      FORMULA: "FORMULA",
      Racial: "Racial",
      Roleplay: "Roleplay",
      "Skill Spec": "Skill Spec",
      Trait: "Trait"
    };

    context.fatigueChoices = {
      0: "0",
      1: "1",
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8"
    };

    context.armorConditionChoices = {
      Pristine: "Pristine",
      Broken: "Broken"
    };

    const closedArmors = this._closedArmors ??= new Set();
    const armorRatingLabels = {
      ac: "AC",
      n: "N",
      l: "L",
      f: "F",
      p: "P",
      e: "E",
      dr: "DR",
      rr: "RR"
    };

    context.armors = Array.from(this.actor.system.armors ?? []).map(
      (armor, index) => ({
        index,
        name: armor.name,
        helmetName: armor.helmetName,
        underArmorName: armor.underArmorName,
        equipped: armor.equipped,
        condition: armor.condition,
        drDamage: armor.drDamage,
        drTotal: armor.ratings.dr.total,
        note: armor.note,
        hasNote: Boolean(armor.note?.trim()),
        open: !closedArmors.has(index),
        ratings: Object.entries(armorRatingLabels).map(([key, label]) => ({
          key,
          label,
          total: armor.ratings[key].total,
          base: armor.ratings[key].base,
          ua: armor.ratings[key].ua,
          armorSet: armor.ratings[key].armorSet,
          helmet: armor.ratings[key].helmet,
          modifier: armor.ratings[key].modifier,
          baseLocked: key === "rr"
        }))
      })
    );

    const closedVehicles = this._closedVehicles ??= new Set();
    const vehicleRatingLabels = {
      ac: "AC",
      n: "N",
      l: "L",
      f: "F",
      p: "P",
      e: "E",
      ap: "AP"
    };

    context.vehicles = Array.from(this.actor.system.vehicles ?? []).map(
      (vehicle, index) => ({
        index,
        name: vehicle.name,
        type: vehicle.type,
        hpCurrent: vehicle.hpCurrent,
        hpMax: vehicle.hpMax,
        cwCurrent: vehicle.cwCurrent,
        cwMax: vehicle.cwMax,
        diceDamage: vehicle.diceDamage,
        flatDamage: vehicle.flatDamage,
        note: vehicle.note,
        hasNote: Boolean(vehicle.note?.trim()),
        open: !closedVehicles.has(index),
        ratings: Object.entries(vehicleRatingLabels).map(([key, label]) => ({
          key,
          label,
          total: vehicle.ratings[key].total,
          base: vehicle.ratings[key].base,
          modifier: vehicle.ratings[key].modifier,
          temp: vehicle.ratings[key].temp
        }))
      })
    );

    context.carrySizeChoices = {
      Small: "Small",
      Medium: "Medium",
      Large: "Large",
      Huge: "Huge",
      Gargantuan: "Gargantuan"
    };

    context.currencies = Array.from(this.actor.system.currencies ?? []).map(
      (currency, index) => ({
        index,
        title: currency.title,
        amount: currency.amount
      })
    );

    const closedInventoryItems = this._closedInventoryItems ??= new Set();

    context.inventoryItems = Array.from(
      this.actor.system.inventoryItems ?? []
    ).map((item, index) => ({
      index,
      name: item.name,
      quantity: item.quantity,
      weight: item.weight,
      totalWeight: item.totalWeight,
      type: item.type,
      condition: item.condition,
      note: item.note,
      hasNote: Boolean(item.note?.trim()),
      open: !closedInventoryItems.has(index)
    }));

    context.perks = Array.from(this.actor.system.perks ?? []).map(
      (perk, index) => ({
        index,
        name: perk.name,
        type: perk.type,
        note: perk.note,
        hasNote: Boolean(perk.note?.trim())
      })
    );

    context.chargeTrackers = Array.from(
      this.actor.system.chargeTrackers ?? []
    ).map((tracker, index) => ({
      index,
      name: tracker.name,
      current: tracker.current,
      max: tracker.max
    }));

    context.effects = Array.from(this.actor.system.effects ?? []).map(
      (effect, index) => ({
        index,
        name: effect.name,
        source: effect.source,
        active: effect.active
      })
    );

    context.languages = Array.from(this.actor.system.languages ?? []).map(
      (language, index) => ({ index, name: language.name })
    );

    return context;

  }


  static #usesD100(actor) {

    const rules = actor?.system?.settings?.variantRules;

    return Boolean(
      rules?.d100Variant &&
      !rules?.formulaSkillEquations
    );

  }


  /* =========================================
     SAVE FORM DATA
  ========================================= */

  static async #onSubmitForm(event, form, formData) {

    const updateData = formData.object;

    for (const collection of [
      "perks",
      "chargeTrackers",
      "effects",
      "languages",
      "armors",
      "weapons",
      "vehicles",
      "currencies",
      "inventoryItems"
    ]) {
      const path = `system.${collection}`;
      const submittedEntries = foundry.utils.getProperty(updateData, path);

      if (submittedEntries) {
        const normalized = Array.isArray(submittedEntries)
          ? Array.from(submittedEntries)
          : Object.keys(submittedEntries)
          .sort((left, right) => Number(left) - Number(right))
          .map(index => submittedEntries[index]);
        const currentEntries = foundry.utils.deepClone(
          this.actor.toObject().system[collection] ?? []
        );
        const noteCollections = new Set([
          "perks",
          "armors",
          "weapons",
          "vehicles",
          "inventoryItems"
        ]);
        const preserved = normalized.map((entry, index) => {
          const currentEntry = currentEntries[index] ?? {};
          const mergedEntry = foundry.utils.mergeObject(
            currentEntry,
            entry ?? {},
            {
              inplace: false,
              insertKeys: true,
              insertValues: true,
              overwrite: true,
              recursive: true
            }
          );

          if (collection === "weapons") {
            mergedEntry.note = String(entry?.note ?? currentEntry.note ?? "");
          } else if (noteCollections.has(collection)) {
            mergedEntry.note = String(currentEntry.note ?? "");
          }

          return mergedEntry;
        });

        foundry.utils.setProperty(updateData, path, preserved);
      }
    }

    await this.actor.update(updateData);

  }


  /* =========================================
     CHANGE TAB
  ========================================= */

  static async #changeTab(event, target) {

    event.preventDefault();

    const tab = target.dataset.tab;

    this._activeTab = tab;

    const sheet =
      target.closest(".ashdom-sheet");

    if (!sheet) return;


    sheet.querySelectorAll(".ashdom-tab")
      .forEach(button =>
        button.classList.remove("active")
      );


    sheet.querySelectorAll(".ashdom-tab-content")
      .forEach(content =>
        content.classList.remove("active")
      );


    target.classList.add("active");


    const content =
      sheet.querySelector(
        `[data-tab-content="${tab}"]`
      );


    if (content) {

      content.classList.add("active");

    }

  }


  /* =========================================
     COLLAPSE SKILL GROUP
  ========================================= */

  static async #toggleSkillGroup(event, target) {

    event.preventDefault();

    const groupId = target.dataset.groupId;

    if (!groupId) return;

    const closedGroups = this._closedSkillGroups ??= new Set();

    if (closedGroups.has(groupId)) {
      closedGroups.delete(groupId);
    } else {
      closedGroups.add(groupId);
    }

    await this.render();

  }

  static async #toggleArmor(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);

    if (!Number.isInteger(index)) return;

    const closedArmors = this._closedArmors ??= new Set();

    if (closedArmors.has(index)) {
      closedArmors.delete(index);
    } else {
      closedArmors.add(index);
    }

    await this.render();

  }

  static async #toggleWeapon(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);

    if (!Number.isInteger(index)) return;

    const closedWeapons = this._closedWeapons ??= new Set();

    if (closedWeapons.has(index)) {
      closedWeapons.delete(index);
    } else {
      closedWeapons.add(index);
    }

    await this.render();

  }

  static async #toggleVehicle(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);

    if (!Number.isInteger(index)) return;

    const closedVehicles = this._closedVehicles ??= new Set();

    if (closedVehicles.has(index)) {
      closedVehicles.delete(index);
    } else {
      closedVehicles.add(index);
    }

    await this.render();

  }

  static async #toggleInventoryItem(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);

    if (!Number.isInteger(index)) return;

    const closedInventoryItems = this._closedInventoryItems ??= new Set();

    if (closedInventoryItems.has(index)) {
      closedInventoryItems.delete(index);
    } else {
      closedInventoryItems.add(index);
    }

    await this.render();

  }


  /* =========================================
     REPEATABLE DATA ENTRIES
  ========================================= */

  static async #addDataEntry(event, target) {

    event.preventDefault();

    const collection = target.dataset.collection;
    const emptyArmorRating = () => ({
      total: 0,
      base: 0,
      ua: 0,
      armorSet: 0,
      helmet: 0,
      modifier: 0
    });
    const defaults = {
      perks: { name: "", type: "Trait", note: "" },
      chargeTrackers: { name: "", current: 0, max: 0 },
      effects: { name: "", source: "", active: true },
      languages: { name: "" },
      armors: {
        name: "",
        helmetName: "",
        underArmorName: "",
        equipped: false,
        condition: "Pristine",
        drDamage: 0,
        note: "",
        ratings: Object.fromEntries(
          ["ac", "n", "l", "f", "p", "e", "dr", "rr"]
            .map(key => [key, emptyArmorRating()])
        )
      },
      weapons: {
        name: "",
        equipped: false,
        note: "",
        s: 0,
        t: 0,
        b: 0,
        ac: 0,
        dt: 0,
        range: 0,
        skill: "meleeWeapons",
        damageType: "",
        diceDamage: "",
        flatDamage: 0,
        capacityCurrent: 0,
        capacityMax: 0,
        itemType: "",
        reloadAP: 0,
        ammoType: "",
        burstLimit: "",
        ignoreTargetHitChance: 0,
        setupAP: 0
      },
      vehicles: {
        name: "",
        type: "",
        hpCurrent: 0,
        hpMax: 0,
        cwCurrent: 0,
        cwMax: 0,
        diceDamage: "",
        flatDamage: 0,
        note: "",
        ratings: Object.fromEntries(
          ["ac", "n", "l", "f", "p", "e", "ap"]
            .map(key => [key, { total: 0, base: 0, modifier: 0, temp: 0 }])
        )
      },
      currencies: { title: "", amount: 0 },
      inventoryItems: {
        name: "",
        quantity: 0,
        weight: 0,
        totalWeight: 0,
        type: "",
        condition: "Pristine",
        note: ""
      }
    };

    if (!Object.hasOwn(defaults, collection)) return;

    const entries = foundry.utils.deepClone(
      this.actor.toObject().system[collection] ?? []
    );

    entries.push(defaults[collection]);

    await this.actor.update({
      [`system.${collection}`]: entries
    });

  }


  static async #deleteDataEntry(event, target) {

    event.preventDefault();

    const collection = target.dataset.collection;
    const index = Number(target.dataset.index);
    const allowed = new Set([
      "perks",
      "chargeTrackers",
      "effects",
      "languages",
      "armors",
      "weapons",
      "vehicles",
      "currencies",
      "inventoryItems"
    ]);

    if (!allowed.has(collection) || !Number.isInteger(index)) return;

    const entries = foundry.utils.deepClone(
      this.actor.toObject().system[collection] ?? []
    );

    if (index < 0 || index >= entries.length) return;

    entries.splice(index, 1);

    await this.actor.update({
      [`system.${collection}`]: entries
    });

  }


  static async #displayPerk(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);
    const perk = this.actor.system.perks?.[index];

    if (!perk || !Number.isInteger(index)) return;

    const name = String(perk.name || "Unnamed Perk");
    const type = String(perk.type || "Trait");
    const note = String(perk.note || "No description provided.");
    const content =
      "<div class='ashdom-perk-chat-card ashdom-themed-chat-card'>" +
        "<div class='ashdom-perk-chat-type'>" + escapeHTML(type) + "</div>" +
        "<div class='ashdom-roll-note'><strong>Notes:</strong><br>" +
          escapeHTML(note).replace(/\r?\n/g, "<br>") +
        "</div>" +
      "</div>";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: name,
      content
    });

  }

  static async #displayWeapon(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);
    const weapon = this.actor.system.weapons?.[index];

    if (!weapon || !Number.isInteger(index)) return;

    const name = String(weapon.name || "Unnamed Weapon");
    const note = String(weapon.note || "No notes provided.");
    const content =
      "<div class='ashdom-weapon-chat-card ashdom-themed-chat-card'>" +
        "<div class='ashdom-roll-note'><strong>Notes:</strong><br>" +
          escapeHTML(note).replace(/\r?\n/g, "<br>") +
        "</div>" +
      "</div>";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: name,
      content
    });

  }

  static async #rollWeaponSingle(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);
    const weapon = this.actor.system.weapons?.[index];

    if (!weapon || !Number.isInteger(index)) return;

    const weaponName = String(weapon.name || "Unnamed Weapon");
    const skillKey = String(weapon.skill || "");
    const skillName = String(target.dataset.skillLabel || skillKey || "Skill");
    const skillData = this.actor.system.skills?.[skillKey];

    if (!skillData) {
      ui.notifications.warn("Select a valid skill for this weapon first.");
      return;
    }

    const d100 = AshdomCharacterSheet.#usesD100(this.actor);
    const rollModifierInput = await AshdomCharacterSheet.#promptRollModifier(
      `${weaponName} — Single Attack`
    );

    if (rollModifierInput === null) return;

    const skillTotal = Number(skillData.total) || 0;
    const rollModifier = rollModifierInput;
    const singleModifier = Number(weapon.s) || 0;
    const adjustedTotal =
      skillTotal + singleModifier + rollModifier;
    const acReduction = Number(weapon.ac) || 0;
    const dtReduction = Number(weapon.dt) || 0;
    const damageType = String(weapon.damageType || "").trim() || "—";
    const ccSuccess = Number(this.actor.system.secondary?.cc?.success) || 1;
    const ccFailure = Number(this.actor.system.secondary?.cc?.failure) || 20;
    const diceDamage = String(weapon.diceDamage || "0").trim() || "0";
    const flatDamage = Number(weapon.flatDamage) || 0;
    const damageFormula = flatDamage === 0
      ? diceDamage
      : `${diceDamage} ${flatDamage >= 0 ? "+" : "-"} ${Math.abs(flatDamage)}`;

    try {
      const attackRoll = await new Roll(d100 ? "1d100" : "1d20").evaluate();
      const damageRoll = await new Roll(damageFormula).evaluate();
      const result = adjustedTotal - attackRoll.total;
      const criticalSuccess = attackRoll.total <= ccSuccess;
      const criticalFailure = !criticalSuccess && attackRoll.total >= ccFailure;
      const criticalClass = criticalSuccess
        ? " ashdom-critical-success"
        : criticalFailure
          ? " ashdom-critical-failure"
          : "";
      const criticalLabel = criticalSuccess
        ? "Critical Success"
        : criticalFailure
          ? "Critical Failure"
          : "Normal";
      const note = String(weapon.note ?? "").trim();
      const noteContent = note
        ? "<div class='ashdom-roll-note'><strong>Notes:</strong><br>" +
            escapeHTML(note).replace(/\r?\n/g, "<br>") +
          "</div>"
        : "";
      const rollDetails = [
        `${weaponName} — Single Attack`,
        `Skill: ${skillName}`,
        `Skill Total: ${skillTotal}`,
        `Single Attack Modifier: ${singleModifier}`,
        `Roll Modifier: ${rollModifier}`,
        `Adjusted Total: ${adjustedTotal}`,
        `${d100 ? "D100" : "D20"}: ${attackRoll.total}`,
        `Critical Result: ${criticalLabel}`,
        `CC Success: 1-${ccSuccess}`,
        `CC Failure: ${ccFailure}-${d100 ? 100 : 20}`,
        `${adjustedTotal} - ${attackRoll.total} = ${result}`,
        `Damage Type: ${damageType}`,
        `Damage: ${damageFormula} = ${damageRoll.total}`
      ].join("\n");
      const content =
        "<div class='ashdom-roll-card ashdom-themed-chat-card ashdom-weapon-attack-card'>" +
          "<div class='ashdom-roll-result" + criticalClass + "' title='" +
            escapeHTML(rollDetails) + "'>" + result + "</div>" +
          "<div class='ashdom-weapon-attack-results'>" +
            "<div><strong>AC</strong><span>" + acReduction + "</span></div>" +
            "<div><strong>DT</strong><span>" + dtReduction + "</span></div>" +
            "<div><strong>Damage Type</strong><span>" + escapeHTML(damageType) + "</span></div>" +
            "<div><strong>Damage</strong><span title='" +
              escapeHTML(damageFormula) + "'>" + damageRoll.total + "</span></div>" +
          "</div>" +
          noteContent +
        "</div>";

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${weaponName} — Single Attack`,
        content,
        rolls: [attackRoll, damageRoll]
      });
    } catch (error) {
      ui.notifications.error("The weapon's damage formula is invalid.");
      console.error("ASHDOM | Invalid weapon damage formula", error);
    }

  }

  static async #promptTargetedLocation(weaponName, ignoreTargetHitChance) {

    const ignoredPenalty = Math.max(Number(ignoreTargetHitChance) || 0, 0);
    const targets = [
      { key: "head", label: "Head", penalty: -12, flatDamage: 25, effect: "Dazed for one turn" },
      { key: "torso", label: "Torso", penalty: -4, flatDamage: 10, effect: "Knock Down" },
      { key: "arm", label: "Arm", penalty: -8, flatDamage: 15, effect: "DT -10" },
      { key: "leg", label: "Leg", penalty: -8, flatDamage: 15, effect: "DT -10" },
      { key: "groin", label: "Groin", penalty: -12, flatDamage: 25, effect: "10 Bleed" },
      { key: "vehicle", label: "Vehicle", penalty: -8, flatDamage: 0, effect: "DT -10" },
      { key: "item", label: "Item", penalty: -12, flatDamage: 0, effect: "" }
    ].map(target => ({
      ...target,
      penalty: Math.min(target.penalty + ignoredPenalty, 0)
    }));
    const content = document.createElement("div");
    const prompt = document.createElement("p");
    prompt.textContent = "Choose the target for this attack.";
    content.append(prompt);

    const selected = await foundry.applications.api.DialogV2.wait({
      classes: ["ashdom", "ashdom-targeted-attack-window"],
      window: { title: `${weaponName} — Targeted Attack` },
      position: { width: 480 },
      content,
      buttons: [
        ...targets.map(target => ({
          action: target.key,
          label: [
            target.label,
            `Skill ${target.penalty}`,
            target.flatDamage ? `Damage +${target.flatDamage}` : "",
            target.effect
          ].filter(Boolean).join(" — "),
          callback: () => target.key
        })),
        { action: "cancel", label: "Cancel", callback: () => null }
      ],
      rejectClose: false,
      modal: true
    });

    return targets.find(target => target.key === selected) ?? null;

  }

  static async #rollWeaponTargeted(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);
    const weapon = this.actor.system.weapons?.[index];

    if (!weapon || !Number.isInteger(index)) return;

    const weaponName = String(weapon.name || "Unnamed Weapon");
    const skillKey = String(weapon.skill || "");
    const skillName = String(target.dataset.skillLabel || skillKey || "Skill");
    const skillData = this.actor.system.skills?.[skillKey];

    if (!skillData) {
      ui.notifications.warn("Select a valid skill for this weapon first.");
      return;
    }

    const d100 = AshdomCharacterSheet.#usesD100(this.actor);
    const rollModifierInput = await AshdomCharacterSheet.#promptRollModifier(
      `${weaponName} — Targeted Attack`
    );

    if (rollModifierInput === null) return;

    const targetChoice = await AshdomCharacterSheet.#promptTargetedLocation(
      weaponName,
      weapon.ignoreTargetHitChance
    );

    if (!targetChoice) return;

    const skillTotal = Number(skillData.total) || 0;
    const rollModifier = rollModifierInput;
    const targetedModifier = Number(weapon.t) || 0;
    const adjustedTotal =
      skillTotal + targetedModifier + rollModifier + targetChoice.penalty;
    const ac = Number(weapon.ac) || 0;
    const dt = Number(weapon.dt) || 0;
    const damageType = String(weapon.damageType || "").trim() || "—";
    const baseCCSuccess = Number(this.actor.system.secondary?.cc?.success) || 1;
    const successCapModifier = Number(
      this.actor.system.settings?.criticalChance?.successCapModifier
    ) || 0;
    const criticalSuccessCap = d100
      ? 25
      : Math.min(Math.max(Math.ceil(5 + successCapModifier), 1), 20);
    const targetedCCBonus = 2;
    const ccSuccess = Math.min(baseCCSuccess + targetedCCBonus, criticalSuccessCap);
    const ccFailure = Number(this.actor.system.secondary?.cc?.failure) || 20;
    const diceDamage = String(weapon.diceDamage || "0").trim() || "0";
    const weaponFlatDamage = Number(weapon.flatDamage) || 0;
    const targetedFlatDamage = Number(targetChoice.flatDamage) || 0;
    const totalFlatDamage = weaponFlatDamage + targetedFlatDamage;
    const damageFormula = totalFlatDamage === 0
      ? diceDamage
      : `${diceDamage} ${totalFlatDamage >= 0 ? "+" : "-"} ${Math.abs(totalFlatDamage)}`;

    try {
      const attackRoll = await new Roll(d100 ? "1d100" : "1d20").evaluate();
      const damageRoll = await new Roll(damageFormula).evaluate();
      const result = adjustedTotal - attackRoll.total;
      const criticalSuccess = attackRoll.total <= ccSuccess;
      const criticalFailure = !criticalSuccess && attackRoll.total >= ccFailure;
      const criticalClass = criticalSuccess
        ? " ashdom-critical-success"
        : criticalFailure
          ? " ashdom-critical-failure"
          : "";
      const criticalLabel = criticalSuccess
        ? "Critical Success"
        : criticalFailure
          ? "Critical Failure"
          : "Normal";
      const note = String(weapon.note ?? "").trim();
      const noteContent = note
        ? "<div class='ashdom-roll-note'><strong>Notes:</strong><br>" +
            escapeHTML(note).replace(/\r?\n/g, "<br>") +
          "</div>"
        : "";
      const effectContent = targetChoice.effect
        ? "<div><strong>Effect</strong><span>" +
            escapeHTML(targetChoice.effect) + "</span></div>"
        : "";
      const rollDetails = [
        `${weaponName} — Targeted Attack`,
        `Target: ${targetChoice.label}`,
        `Skill: ${skillName}`,
        `Skill Total: ${skillTotal}`,
        `Targeted Attack Modifier: ${targetedModifier}`,
        `Roll Modifier: ${rollModifier}`,
        `Adjusted Total: ${adjustedTotal}`,
        `${d100 ? "D100" : "D20"}: ${attackRoll.total}`,
        `Critical Result: ${criticalLabel}`,
        `CC Success: 1-${ccSuccess} (Targeted +${targetedCCBonus})`,
        `CC Failure: ${ccFailure}-${d100 ? 100 : 20}`,
        `${adjustedTotal} - ${attackRoll.total} = ${result}`,
        `Weapon Flat Damage: ${weaponFlatDamage}`,
        `Damage Type: ${damageType}`,
        `Damage: ${damageFormula} = ${damageRoll.total}`
      ].join("\n");
      const content =
        "<div class='ashdom-roll-card ashdom-themed-chat-card ashdom-weapon-attack-card'>" +
          "<div class='ashdom-roll-result" + criticalClass + "' title='" +
            escapeHTML(rollDetails) + "'>" + result + "</div>" +
          "<div class='ashdom-weapon-attack-results'>" +
            "<div><strong>AC</strong><span>" + ac + "</span></div>" +
            "<div><strong>DT</strong><span>" + dt + "</span></div>" +
            "<div><strong>Damage Type</strong><span>" + escapeHTML(damageType) + "</span></div>" +
            "<div><strong>Damage</strong><span title='" +
              escapeHTML(damageFormula) + "'>" + damageRoll.total + "</span></div>" +
          "</div>" +
          "<div class='ashdom-targeted-attack-effects'>" +
            "<div><strong>Target</strong><span>" + escapeHTML(targetChoice.label) + "</span></div>" +
            effectContent +
          "</div>" +
          noteContent +
        "</div>";

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${weaponName} — Targeted Attack`,
        content,
        rolls: [attackRoll, damageRoll]
      });
    } catch (error) {
      ui.notifications.error("The weapon's damage formula is invalid.");
      console.error("ASHDOM | Invalid weapon targeted damage formula", error);
    }

  }

  static async #promptBurstType(weaponName) {

    const content = document.createElement("div");
    const prompt = document.createElement("p");
    prompt.textContent = "Choose the type of burst attack.";
    content.append(prompt);

    return foundry.applications.api.DialogV2.wait({
      classes: ["ashdom", "ashdom-burst-attack-window"],
      window: { title: `${weaponName} — Burst Attack` },
      position: { width: 420 },
      content,
      buttons: [
        {
          action: "burst",
          label: "Burst",
          callback: () => ({ key: "burst", label: "Burst Attack", halvePenalty: false })
        },
        {
          action: "setup",
          label: "Set Up Burst",
          callback: () => ({ key: "setup", label: "Set Up Burst", halvePenalty: true })
        },
        { action: "cancel", label: "Cancel", callback: () => null }
      ],
      rejectClose: false,
      modal: true
    });

  }

  static async #promptBurstLevel(weaponName, burstType) {

    const baseTiers = [
      { key: "duo", label: "Duo", penalty: -4, hits: 2 },
      { key: "spray", label: "Spray", penalty: -8, hits: 1 },
      { key: "shower", label: "Shower", penalty: -12, hits: 2 },
      { key: "storm", label: "Storm", penalty: -16, hits: 1 }
    ];
    const tiers = baseTiers.map(tier => ({
      ...tier,
      penalty: burstType.halvePenalty ? tier.penalty / 2 : tier.penalty
    }));
    const content = document.createElement("div");
    const prompt = document.createElement("p");
    prompt.textContent = "Choose the maximum burst tier.";
    content.append(prompt);

    const selected = await foundry.applications.api.DialogV2.wait({
      classes: ["ashdom", "ashdom-burst-attack-window"],
      window: { title: `${weaponName} — ${burstType.label}` },
      position: { width: 440 },
      content,
      buttons: [
        ...tiers.map(tier => ({
          action: tier.key,
          label: `${tier.label} — Skill ${tier.penalty} — ${tier.hits} ${tier.hits === 1 ? "Hit" : "Hits"}`,
          callback: () => tier.key
        })),
        { action: "cancel", label: "Cancel", callback: () => null }
      ],
      rejectClose: false,
      modal: true
    });
    const selectedIndex = tiers.findIndex(tier => tier.key === selected);

    if (selectedIndex < 0) return null;

    return {
      selected: tiers[selectedIndex],
      displayed: tiers.slice(0, selectedIndex + 1)
    };

  }

  static async #rollWeaponBurst(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);
    const weapon = this.actor.system.weapons?.[index];

    if (!weapon || !Number.isInteger(index)) return;

    const weaponName = String(weapon.name || "Unnamed Weapon");
    const skillKey = String(weapon.skill || "");
    const skillName = String(target.dataset.skillLabel || skillKey || "Skill");
    const skillData = this.actor.system.skills?.[skillKey];

    if (!skillData) {
      ui.notifications.warn("Select a valid skill for this weapon first.");
      return;
    }

    const d100 = AshdomCharacterSheet.#usesD100(this.actor);
    const rollModifierInput = await AshdomCharacterSheet.#promptRollModifier(
      `${weaponName} — Burst Attack`
    );

    if (rollModifierInput === null) return;

    const burstType = await AshdomCharacterSheet.#promptBurstType(weaponName);

    if (!burstType) return;

    const burstChoice = await AshdomCharacterSheet.#promptBurstLevel(
      weaponName,
      burstType
    );

    if (!burstChoice) return;

    const skillTotal = Number(skillData.total) || 0;
    const rollModifier = rollModifierInput;
    const burstModifier = Number(weapon.b) || 0;
    const baseTotal = skillTotal + burstModifier + rollModifier;
    const ac = Number(weapon.ac) || 0;
    const dt = Number(weapon.dt) || 0;
    const damageType = String(weapon.damageType || "").trim() || "—";
    const ccSuccess = Number(this.actor.system.secondary?.cc?.success) || 1;
    const ccFailure = Number(this.actor.system.secondary?.cc?.failure) || 20;
    const diceDamage = String(weapon.diceDamage || "0").trim() || "0";
    const weaponFlatDamage = Number(weapon.flatDamage) || 0;
    const halvedFlatDamage = Math.sign(weaponFlatDamage) *
      Math.ceil(Math.abs(weaponFlatDamage) / 2);
    const damageFormula = halvedFlatDamage === 0
      ? diceDamage
      : `${diceDamage} ${halvedFlatDamage >= 0 ? "+" : "-"} ${Math.abs(halvedFlatDamage)}`;

    try {
      const attackRoll = await new Roll(d100 ? "1d100" : "1d20").evaluate();
      const damageRoll = await new Roll(damageFormula).evaluate();
      const criticalSuccess = attackRoll.total <= ccSuccess;
      const criticalFailure = !criticalSuccess && attackRoll.total >= ccFailure;
      const criticalClass = criticalSuccess
        ? " ashdom-critical-success"
        : criticalFailure
          ? " ashdom-critical-failure"
          : "";
      const criticalLabel = criticalSuccess
        ? "Critical Success"
        : criticalFailure
          ? "Critical Failure"
          : "Normal";
      const tierResults = burstChoice.displayed.map(tier => {
        const adjustedTotal = baseTotal + tier.penalty;

        return {
          ...tier,
          adjustedTotal,
          checkResult: adjustedTotal - attackRoll.total,
          selected: tier.key === burstChoice.selected.key
        };
      });
      const note = String(weapon.note ?? "").trim();
      const noteContent = note
        ? "<div class='ashdom-roll-note'><strong>Notes:</strong><br>" +
            escapeHTML(note).replace(/\r?\n/g, "<br>") +
          "</div>"
        : "";
      const tierDetails = tierResults.flatMap(tier => [
        `${tier.label}: ${tier.hits} ${tier.hits === 1 ? "Hit" : "Hits"}`,
        `  Penalty: ${tier.penalty}`,
        `  Adjusted Skill: ${tier.adjustedTotal}`,
        `  Check: ${tier.adjustedTotal} - ${attackRoll.total} = ${tier.checkResult}`
      ]);
      const rollDetails = [
        `${weaponName} — ${burstType.label}`,
        `Skill: ${skillName}`,
        `Skill Total: ${skillTotal}`,
        `Burst Attack Modifier: ${burstModifier}`,
        `Roll Modifier: ${rollModifier}`,
        `${d100 ? "D100" : "D20"}: ${attackRoll.total}`,
        `Critical Result: ${criticalLabel}`,
        `Critical Tier: ${burstChoice.selected.label} (one hit only)`,
        `CC Success: 1-${ccSuccess}`,
        `CC Failure: ${ccFailure}-${d100 ? 100 : 20}`,
        ...tierDetails,
        `Weapon Flat Damage: ${weaponFlatDamage}`,
        `Halved Flat Damage: ${halvedFlatDamage}`,
        `Damage Type: ${damageType}`,
        `Damage: ${damageFormula} = ${damageRoll.total}`
      ].join("\n");
      const tierContent = tierResults.map(tier => {
        const resultClass = tier.selected ? criticalClass : "";

        return "<div class='ashdom-burst-result-row" +
          (tier.selected ? " selected" : "") + "'>" +
            "<strong>" + escapeHTML(tier.label) + "</strong>" +
            "<span>" + tier.hits + " " + (tier.hits === 1 ? "Hit" : "Hits") + "</span>" +
            "<b class='ashdom-burst-result" + resultClass + "'>" +
              tier.adjustedTotal + "</b>" +
          "</div>";
      }).join("");
      const content =
        "<div class='ashdom-roll-card ashdom-themed-chat-card ashdom-weapon-attack-card'>" +
          "<div class='ashdom-burst-shared-roll'><strong>Attack Roll</strong><span>" +
            attackRoll.total + "</span></div>" +
          "<div class='ashdom-burst-results' title='" +
            escapeHTML(rollDetails) + "'>" + tierContent + "</div>" +
          "<div class='ashdom-weapon-attack-results'>" +
            "<div><strong>AC</strong><span>" + ac + "</span></div>" +
            "<div><strong>DT</strong><span>" + dt + "</span></div>" +
            "<div><strong>Damage Type</strong><span>" + escapeHTML(damageType) + "</span></div>" +
            "<div><strong>Damage</strong><span title='" +
              escapeHTML(damageFormula) + "'>" + damageRoll.total + "</span></div>" +
          "</div>" +
          noteContent +
        "</div>";

      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${weaponName} — ${burstType.label}`,
        content,
        rolls: [attackRoll, damageRoll]
      });
    } catch (error) {
      ui.notifications.error("The weapon's damage formula is invalid.");
      console.error("ASHDOM | Invalid weapon burst damage formula", error);
    }

  }

  static async #rollVehicleDamage(event, target) {

    event.preventDefault();

    const index = Number(target.dataset.index);
    const vehicle = this.actor.system.vehicles?.[index];

    if (!vehicle || !Number.isInteger(index)) return;

    const diceDamage = String(vehicle.diceDamage || "0").trim() || "0";
    const flatDamage = Number(vehicle.flatDamage) || 0;
    const formula = flatDamage === 0
      ? diceDamage
      : `${diceDamage} ${flatDamage >= 0 ? "+" : "-"} ${Math.abs(flatDamage)}`;

    try {
      const roll = await new Roll(formula).evaluate();

      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: `${this.actor.name} rolls ${vehicle.name || "Vehicle"} damage`
      });
    } catch (error) {
      ui.notifications.error("Vehicle damage formula is invalid.");
      console.error("ASHDOM | Invalid vehicle damage formula", error);
    }

  }


  /* =========================================
     PROMPT FOR A ONE-TIME ROLL MODIFIER
  ========================================= */

  static async #promptRollModifier(label) {

    const content = document.createElement("div");

    const modifierWrapper = document.createElement("div");
    modifierWrapper.className = "ashdom-roll-modifier-dialog";

    const prompt = document.createElement("label");
    prompt.textContent = `Additional modifier for ${label}`;

    const input = document.createElement("input");
    input.type = "number";
    input.name = "modifier";
    input.step = "any";
    input.autofocus = true;

    prompt.append(input);
    modifierWrapper.append(prompt);
    content.append(modifierWrapper);

    const response = await foundry.applications.api.DialogV2.input({
      classes: ["ashdom", "ashdom-roll-modifier-window"],
      window: { title: `${label} Roll Modifier` },
      position: { width: 360 },
      content,
      ok: {
        label: "OK"
      },
      buttons: [
        {
          action: "cancel",
          label: "Cancel",
          callback: () => null
        }
      ],
      rejectClose: false,
      modal: true
    });

    if (response === null || response === "cancel") return null;

    const modifier = Number(response.modifier);

    return Number.isFinite(modifier) ? modifier : 0;

  }


  /* =========================================
     ROLL REAPER CHECK
  ========================================= */

  static async #rollReaper(event, target) {

    event.preventDefault();

    const roll = await new Roll("1d10").evaluate();
    const result = roll.total;
    const note = String(this.actor.system.health?.reaperNote ?? "").trim();
    const noteContent = note
      ? "<div class='ashdom-roll-note'><strong>Notes:</strong><br>" +
          escapeHTML(note).replace(/\r?\n/g, "<br>") +
        "</div>"
      : "";
    const details = `Reaper Check\nD10: ${result}`;

    const content =
      "<div class='ashdom-roll-card ashdom-themed-chat-card'>" +
        "<div class='ashdom-roll-result' title='" +
          escapeHTML(details) + "'>" + result +
        "</div>" +
        noteContent +
      "</div>";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: "Reaper Check",
      content,
      rolls: [roll]
    });

  }


  /* =========================================
     ROLL SECONDARY STAT
  ========================================= */

  static async #rollSecondary(event, target) {

    event.preventDefault();

    const stat = target.dataset.secondary;
    const label = target.dataset.secondaryLabel;
    const mode = target.dataset.rollMode;
    const statData = this.actor.system.secondary?.[stat];

    if (!statData || !label) return;

    const total = Number(statData.total) || 0;
    const d100 =
      AshdomCharacterSheet.#usesD100(this.actor) &&
      ["st", "wp"].includes(stat) &&
      mode === "d20";
    const rollModifierInput = await AshdomCharacterSheet.#promptRollModifier(label);

    if (rollModifierInput === null) return;

    const rollModifier = rollModifierInput;
    const adjustedTotal = total + rollModifier;
    const note = String(statData.note ?? "").trim();
    const noteContent = note
      ? "<div class='ashdom-roll-note'><strong>Notes:</strong><br>" +
          escapeHTML(note).replace(/\r?\n/g, "<br>") +
        "</div>"
      : "";

    let roll;
    let result;
    let details;

    if (mode === "d10-plus") {
      roll = await new Roll("1d10 + @total", {
        total: adjustedTotal
      }).evaluate();
      result = roll.total;
      details =
        `${label}\nSheet Total: ${total}\n` +
        `Roll Modifier: ${rollModifier}\n` +
        `1d10 + ${adjustedTotal} = ${result}`;
    } else {
      roll = await new Roll(d100 ? "1d100" : "1d20").evaluate();
      result = adjustedTotal - roll.total;
      details =
        `${label}\nSheet Total: ${total}\n` +
        `Roll Modifier: ${rollModifier}\n` +
        `Adjusted Total: ${adjustedTotal}\n${d100 ? "D100" : "D20"}: ${roll.total}\n` +
        `${adjustedTotal} - ${roll.total} = ${result}`;
    }

    const criticalShenanigans = Boolean(
      this.actor.system.settings?.variantRules?.criticalShenanigans
    );
    const canCrit =
      criticalShenanigans && ["st", "wp"].includes(stat) && mode === "d20";
    const ccSuccess = Number(this.actor.system.secondary?.cc?.success) || 1;
    const ccFailure = Number(this.actor.system.secondary?.cc?.failure) || 20;
    const criticalSuccess = canCrit && roll.total <= ccSuccess;
    const criticalFailure =
      canCrit && !criticalSuccess && roll.total >= ccFailure;
    const criticalClass = criticalSuccess
      ? " ashdom-critical-success"
      : criticalFailure
        ? " ashdom-critical-failure"
        : "";

    if (canCrit) {
      const criticalLabel = criticalSuccess
        ? "Critical Success"
        : criticalFailure
          ? "Critical Failure"
          : "None";
      details +=
        `\nCritical Result: ${criticalLabel}` +
        `\nCC Success: 1-${ccSuccess}` +
        `\nCC Failure: ${ccFailure}-${d100 ? 100 : 20}`;
    }

    const content =
      "<div class='ashdom-roll-card ashdom-themed-chat-card'>" +
        "<div class='ashdom-roll-result" + criticalClass + "' title='" +
          escapeHTML(details) + "'>" + result +
        "</div>" +
        noteContent +
      "</div>";

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label,
      content,
      rolls: [roll]
    });

  }


  /* =========================================
     EDIT STAT OR SKILL NOTE
  ========================================= */

  static async #openNote(event, target) {

    event.preventDefault();

    const path = target.dataset.notePath;
    const label = target.dataset.noteLabel;

    if (!path || !label || !this.actor) return;

    const currentNote =
      foundry.utils.getProperty(this.actor, path) ?? "";

    const content = document.createElement("div");

    const noteWrapper = document.createElement("div");
    noteWrapper.className = "ashdom-note-dialog";

    const textarea = document.createElement("textarea");
    textarea.name = "note";
    textarea.textContent = String(currentNote);
    textarea.rows = 10;
    textarea.autofocus = true;
    textarea.placeholder = `Enter notes for ${label}`;

    noteWrapper.append(textarea);
    content.append(noteWrapper);

    const savedNote =
      await foundry.applications.api.DialogV2.prompt({
        classes: ["ashdom", "ashdom-note-dialog-window"],
        window: {
          title: label
        },
        position: {
          width: 520
        },
        content,
        ok: {
          label: "Save",
          callback: (dialogEvent, button) =>
            button.form.elements.note.value
        },
        rejectClose: false,
        modal: false
      });

    const noteToSave = savedNote == null
      ? textarea.value
      : savedNote;

    const repeatableNote = path.match(
      /^system\.(perks|weapons|armors|vehicles|inventoryItems)\.(\d+)\.note$/
    );

    if (repeatableNote) {
      const [, collection, indexText] = repeatableNote;
      const index = Number(indexText);
      const entries = foundry.utils.deepClone(
        this.actor.toObject().system[collection] ?? []
      );

      if (index >= 0 && index < entries.length) {
        entries[index].note = String(noteToSave);
        await this.actor.update({
          [`system.${collection}`]: entries
        });

        if (collection === "weapons") {
          const noteField = this.element?.querySelector(
            `input[type="hidden"][name="${path}"]`
          );

          if (noteField) noteField.value = String(noteToSave);
        }
      }

      return;
    }

    await this.actor.update({
      [path]: String(noteToSave)
    });

  }


  /* =========================================
     ROLL SKILL
  ========================================= */

  static async #rollSkill(event, target) {

    event.preventDefault();

    const skill = target.dataset.skill;
    const skillName = target.dataset.skillLabel;

    const actor = this.actor;

    if (!actor) return;


    const skillData =
      actor.system.skills?.[skill];

    if (!skillData || !skillName) return;


    const total =
      Number(skillData.total) || 0;

    const rollModifierInput =
      await AshdomCharacterSheet.#promptRollModifier(skillName);

    if (rollModifierInput === null) return;

    const d100 = AshdomCharacterSheet.#usesD100(actor);
    const rollModifier = rollModifierInput;

    const adjustedTotal =
      total + rollModifier;

    const modifier =
      Number(skillData.modifier) || 0;

    const temp =
      Number(skillData.temp) || 0;

    const tagged =
      Boolean(skillData.tagged);

    const note =
      String(skillData.note ?? "").trim();

    const noteContent = note
      ? "<div class='ashdom-roll-note'>" +
          "<strong>Notes:</strong><br>" +
          escapeHTML(note).replace(/\r?\n/g, "<br>") +
        "</div>"
      : "";


    const roll =
      await new Roll(d100 ? "1d100" : "1d20").evaluate();


    const d20 =
      roll.total;


    /* Total - D20 */

    const result =
      adjustedTotal - d20;

    const rollDetails = [
      skillName,
      `Total: ${total}`,
      `Modifier: ${modifier}`,
      `Temp: ${temp}`,
      `Tagged: ${tagged ? "Yes (+5)" : "No"}`,
      `Roll Modifier: ${rollModifier}`,
      `Adjusted Total: ${adjustedTotal}`,
      `${d100 ? "D100" : "D20"}: ${d20}`,
      `${adjustedTotal} - ${d20} = ${result}`
    ].join("\n");


    const criticalShenanigans = Boolean(
      actor.system.settings?.variantRules?.criticalShenanigans
    );
    const ccSuccess = Number(actor.system.secondary?.cc?.success) || 1;
    const ccFailure = Number(actor.system.secondary?.cc?.failure) || 20;
    const criticalSuccess = criticalShenanigans && d20 <= ccSuccess;
    const criticalFailure =
      criticalShenanigans && !criticalSuccess && d20 >= ccFailure;
    const criticalClass = criticalSuccess
      ? " ashdom-critical-success"
      : criticalFailure
        ? " ashdom-critical-failure"
        : "";
    const criticalDetails = criticalShenanigans
      ? `\nCritical Result: ${criticalSuccess ? "Critical Success" : criticalFailure ? "Critical Failure" : "None"}` +
        `\nCC Success: 1-${ccSuccess}` +
        `\nCC Failure: ${ccFailure}-${d100 ? 100 : 20}`
      : "";

    const content =
      "<div class='ashdom-roll-card ashdom-themed-chat-card'>" +

        "<div class='ashdom-roll-result" + criticalClass + "' " +
          "title='" + escapeHTML(rollDetails + criticalDetails) + "'>" +
          result +
        "</div>" +

        noteContent +

      "</div>";


    await ChatMessage.create({

      speaker:
        ChatMessage.getSpeaker({
          actor: actor
        }),

      flavor: skillName,

      content: content,

      rolls: [roll]

    });

  }

}
