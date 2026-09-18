const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const INDEX_FIELDS = [
  "name",
  "img",
  "type",
  "folder",
  "system.rank",
  "system.perkType",
  "system.rarity",
  "system.category",
  "system.subcategory",
  "system.specialization",
  "system.weight",
  "system.value",
  "system.details.level"
];

const RARITY_ORDER = Object.freeze({
  Common: 0,
  Uncommon: 1,
  Rare: 2,
  Radical: 3,
  Atomic: 4
});

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

function itemTypeLabel(type, documentName = "Item") {
  const key = CONFIG[documentName].typeLabels?.[type] ?? `TYPES.${documentName}.${type}`;
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
      .filter(pack => pack.visible !== false && ((pack.documentName === "Item" && pack.collection.startsWith("ashdom.")) || pack.documentName === "Actor"))
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
        const level = Number(foundry.utils.getProperty(entry, "system.details.level"));
        const defconTier = pack.documentName === "Actor" && type === "npc" && Number.isInteger(level) && level >= 1 && level <= 5 ? String(level) : "";
        const isFormula = type === "perk" && (foundry.utils.getProperty(entry, "system.perkType") === "FORMULA" || category === "FORMULA Perk");
        const rank = Number(foundry.utils.getProperty(entry, "system.rank"));
        const formulaRank = isFormula && Number.isInteger(rank) && rank >= 0 ? String(rank) : "";
        const folderNames = [];
        const seenFolders = new Set();
        let folder = typeof entry.folder === "object" ? entry.folder : pack.folders?.get(entry.folder);
        while (folder && !seenFolders.has(folder.id ?? folder._id)) {
          seenFolders.add(folder.id ?? folder._id);
          folderNames.unshift(folder.name);
          folder = typeof folder.folder === "object" ? folder.folder : pack.folders?.get(folder.folder);
        }
        const folderPath = folderNames.join(" / ");

        entries.push({
          id: entry._id,
          uuid: entry.uuid ?? pack.getUuid(entry._id),
          name,
          img: entry.img || CONST.DEFAULT_TOKEN,
          type,
          documentName: pack.documentName,
          typeLabel: itemTypeLabel(type, pack.documentName),
          defconTier,
          formulaRank,
          hasFormulaRank: formulaRank !== "",
          folderPath,
          pack: pack.collection,
          packLabel: pack.title,
          rarity,
          category,
          subcategory,
          specialization,
          weight: foundry.utils.getProperty(entry, "system.weight") ?? "",
          value: foundry.utils.getProperty(entry, "system.value") ?? "",
          search: [name, pack.title, type, itemTypeLabel(type, pack.documentName), rarity, category, subcategory, specialization, defconTier ? `DEFCON ${defconTier} DEFCON Tier ${defconTier}` : ""]
            .join(" ")
            .toLocaleLowerCase()
        });
      }
    }

    entries.sort((a, b) => {
      const rarityDifference =
        (RARITY_ORDER[a.rarity] ?? Number.MAX_SAFE_INTEGER) -
        (RARITY_ORDER[b.rarity] ?? Number.MAX_SAFE_INTEGER);

      return rarityDifference ||
        a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true }) ||
        a.packLabel.localeCompare(b.packLabel);
    });

    return foundry.utils.mergeObject(context, {
      entries,
      entryCount: entries.length,
      packCount: packs.length,
      packChoices: optionMap(entries.map(entry => entry.packLabel)),
      folderChoices: optionMap(entries.map(entry => entry.folderPath)),
      typeChoices: Object.fromEntries(
        [...new Map(entries.map(entry => [entry.type, entry.typeLabel]))]
          .sort((a, b) => a[1].localeCompare(b[1]))
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
      for (const key of ["pack", "type", "category", "subcategory", "specialization", "rarity", "folder"]) {
        row.dataset[key] = text(row.dataset[key]).toLocaleLowerCase();
      }
      row.addEventListener("dragstart", event => {
        event.dataTransfer.effectAllowed = "copy";
        event.dataTransfer.setData("text/plain", JSON.stringify({
          type: row.dataset.documentName,
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
      rarity: value("rarity"),
      defcon: value("defcon"),
      rank: value("rank"),
      folder: value("folder")
    };

    let visible = 0;
    this.element.querySelectorAll("[data-entry-uuid]").forEach(row => {
      const matches = (!filters.search || row.dataset.search.includes(filters.search))
        && (!filters.pack || row.dataset.pack === filters.pack)
        && (!filters.type || row.dataset.type === filters.type)
        && (!filters.category || row.dataset.category === filters.category)
        && (!filters.subcategory || row.dataset.subcategory === filters.subcategory)
        && (!filters.specialization || row.dataset.specialization === filters.specialization)
        && (!filters.rarity || row.dataset.rarity === filters.rarity)
        && (!filters.defcon || row.dataset.defcon === filters.defcon)
        && (!filters.folder || row.dataset.folder === filters.folder)
        && (!filters.rank || (row.dataset.formulaRank !== undefined && row.dataset.formulaRank !== "" && Number(row.dataset.formulaRank) <= Number(filters.rank)));

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
    const documentClass = item.documentName === "Actor" ? Actor : Item;
    await documentClass.create(data, { renderSheet: false });
    ui.notifications.info(`${item.name} imported to the ${item.documentName === "Actor" ? "Actors" : "Items"} directory.`);
  }
}
