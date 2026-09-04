const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const INDEX_FIELDS = [
  "name",
  "img",
  "type",
  "system.rarity",
  "system.category",
  "system.subcategory",
  "system.specialization",
  "system.weight",
  "system.value"
];

function text(value) {
  return String(value ?? "").trim();
}

function optionMap(values) {
  return Object.fromEntries(
    [...new Set(values.filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map(value => [value, value])
  );
}

function itemTypeLabel(type) {
  const key = CONFIG.Item.typeLabels?.[type] ?? `TYPES.Item.${type}`;
  const localized = game.i18n.localize(key);
  return localized === key ? type : localized;
}

export class AshdomCompendiumBrowser extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "ashdom-compendium-browser",
    classes: ["ashdom", "ashdom-compendium-browser"],
    tag: "section",
    window: {
      title: "ASHDOM Compendium Browser",
      icon: "fa-solid fa-book-atlas",
      resizable: true
    },
    position: { width: 900, height: 700 },
    actions: {
      refresh: AshdomCompendiumBrowser.#refresh,
      openEntry: AshdomCompendiumBrowser.#openEntry,
      importEntry: AshdomCompendiumBrowser.#importEntry
    }
  };

  static PARTS = {
    browser: {
      template: "systems/ashdom/templates/apps/compendium-browser.html"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const entries = [];
    const packs = game.packs
      .filter(pack => pack.documentName === "Item" && pack.collection.startsWith("ashdom."))
      .sort((a, b) => a.title.localeCompare(b.title));

    for (const pack of packs) {
      const index = await pack.getIndex({ fields: INDEX_FIELDS });

      for (const entry of index.values()) {
        const rarity = text(foundry.utils.getProperty(entry, "system.rarity"));
        const category = text(foundry.utils.getProperty(entry, "system.category"));
        const subcategory = text(foundry.utils.getProperty(entry, "system.subcategory"));
        const specialization = text(foundry.utils.getProperty(entry, "system.specialization"));
        const type = text(entry.type);
        const name = text(entry.name) || "Unnamed Item";

        entries.push({
          id: entry._id,
          uuid: entry.uuid ?? pack.getUuid(entry._id),
          name,
          img: entry.img || CONST.DEFAULT_TOKEN,
          type,
          typeLabel: itemTypeLabel(type),
          pack: pack.collection,
          packLabel: pack.title,
          rarity,
          category,
          subcategory,
          specialization,
          weight: foundry.utils.getProperty(entry, "system.weight") ?? "",
          value: foundry.utils.getProperty(entry, "system.value") ?? "",
          search: [name, pack.title, type, itemTypeLabel(type), rarity, category, subcategory, specialization]
            .join(" ")
            .toLocaleLowerCase()
        });
      }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));

    return foundry.utils.mergeObject(context, {
      entries,
      entryCount: entries.length,
      packCount: packs.length,
      packChoices: optionMap(entries.map(entry => entry.packLabel)),
      typeChoices: Object.fromEntries(
        [...new Set(entries.map(entry => entry.type))]
          .sort((a, b) => itemTypeLabel(a).localeCompare(itemTypeLabel(b)))
          .map(type => [type, itemTypeLabel(type)])
      ),
      categoryChoices: optionMap(entries.map(entry => entry.category)),
      subcategoryChoices: optionMap(entries.map(entry => entry.subcategory)),
      specializationChoices: optionMap(entries.map(entry => entry.specialization)),
      rarityChoices: {
        Common: "Common",
        Uncommon: "Uncommon",
        Rare: "Rare",
        Radical: "Radical",
        Atomic: "Atomic"
      }
    }, { inplace: false });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    this.element.querySelectorAll("[data-browser-filter]").forEach(control => {
      control.addEventListener("input", () => this.#applyFilters());
      control.addEventListener("change", () => this.#applyFilters());
    });

    this.element.querySelectorAll("[data-entry-uuid]").forEach(row => {
      row.addEventListener("dragstart", event => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", JSON.stringify({
          type: "Item",
          uuid: row.dataset.entryUuid,
          category: row.dataset.category
        }));
      });
    });

    this.#applyFilters();
  }

  #applyFilters() {
    const value = name => text(
      this.element.querySelector(`[data-browser-filter="${name}"]`)?.value
    ).toLocaleLowerCase();

    const filters = {
      search: value("search"),
      pack: value("pack"),
      type: value("type"),
      category: value("category"),
      subcategory: value("subcategory"),
      specialization: value("specialization"),
      rarity: value("rarity")
    };

    let visible = 0;
    this.element.querySelectorAll("[data-entry-uuid]").forEach(row => {
      const matches = (!filters.search || row.dataset.search.includes(filters.search))
        && (!filters.pack || row.dataset.pack === filters.pack)
        && (!filters.type || row.dataset.type === filters.type)
        && (!filters.category || row.dataset.category === filters.category)
        && (!filters.subcategory || row.dataset.subcategory === filters.subcategory)
        && (!filters.specialization || row.dataset.specialization === filters.specialization)
        && (!filters.rarity || row.dataset.rarity === filters.rarity);

      row.hidden = !matches;
      if (matches) visible += 1;
    });

    const count = this.element.querySelector("[data-result-count]");
    if (count) count.textContent = String(visible);
    const empty = this.element.querySelector("[data-browser-empty]");
    if (empty) empty.hidden = visible !== 0;
  }

  static async #refresh() {
    await this.render({ force: true });
  }

  static async #openEntry(event, target) {
    const item = await fromUuid(target.dataset.uuid);
    if (!item) return ui.notifications.warn("ASHDOM could not find that compendium Item.");
    item.sheet.render(true);
  }

  static async #importEntry(event, target) {
    const item = await fromUuid(target.dataset.uuid);
    if (!item) return ui.notifications.warn("ASHDOM could not find that compendium Item.");

    const data = item.toObject();
    delete data._id;
    delete data.folder;
    delete data._stats;
    await Item.create(data, { renderSheet: false });
    ui.notifications.info(`${item.name} imported to the Items directory.`);
  }
}
