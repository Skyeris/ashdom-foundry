const COLLECTION_TYPES = Object.freeze({
  weapons: "weapon",
  armors: "armor",
  perks: "perk",
  inventoryItems: "gear",
  vehicles: "vehicle"
});

function convertEntry(collection, entry, index) {
  const system = foundry.utils.deepClone(entry);
  const name = String(system.name || `${COLLECTION_TYPES[collection]} ${index + 1}`);

  delete system.name;
  if (collection === "perks") {
    const isSkillSpec = system.type === "Skill Spec";
    system.perkType = system.type || "Trait";
    delete system.type;
    if (isSkillSpec) return {
      name,
      type: "skillSpec",
      system: { ...system, category: "", subcategory: "", specialization: "" },
      flags: { ashdom: { legacySource: { collection, index } } }
    };
  } else if (collection === "inventoryItems") {
    system.itemType = system.type || "";
    delete system.type;
  } else if (collection === "vehicles") {
    system.vehicleType = system.type || "";
    delete system.type;
  }

  return {
    name,
    type: COLLECTION_TYPES[collection],
    system,
    flags: {
      ashdom: {
        legacySource: { collection, index }
      }
    }
  };
}

export class AshdomLegacyItemMigration {
  static version = 1;

  static preview(actor) {
    if (!actor || actor.type !== "character") return [];

    const existing = new Set(
      actor.items.map(item => {
        const source = item.getFlag("ashdom", "legacySource");
        return source ? `${source.collection}:${source.index}` : null;
      }).filter(Boolean)
    );

    const documents = [];
    for (const [collection] of Object.entries(COLLECTION_TYPES)) {
      const entries = actor.toObject().system?.[collection] ?? [];
      entries.forEach((entry, index) => {
        if (!existing.has(`${collection}:${index}`)) {
          documents.push(convertEntry(collection, entry, index));
        }
      });
    }
    return documents;
  }

  static async migrateActor(actor) {
    const documents = this.preview(actor);
    if (!documents.length) return [];

    const created = await actor.createEmbeddedDocuments("Item", documents, {
      keepId: false,
      renderSheet: false
    });

    await actor.setFlag("ashdom", "legacyItemMigration", {
      version: this.version,
      migratedAt: new Date().toISOString(),
      createdItemIds: created.map(item => item.id),
      legacyDataRetained: true
    });

    return created;
  }
}
