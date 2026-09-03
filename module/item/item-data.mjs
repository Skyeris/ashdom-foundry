const { fields } = foundry.data;

const number = (options = {}) => new fields.NumberField({ initial: 0, ...options });
const text = (options = {}) => new fields.StringField({ initial: "", ...options });

function taxonomyFields() {
  return {
    category: text(),
    subcategory: text(),
    specialization: text()
  };
}

function inventoryFields() {
  return {
    ...taxonomyFields(),
    quantity: number({ integer: true, min: 0 }),
    weight: number({ min: 0 }),
    totalWeight: number({ min: 0 }),
    condition: text({ initial: "Pristine", choices: ["Pristine", "Broken"] }),
    note: text()
  };
}

class AshdomInventoryData extends foundry.abstract.TypeDataModel {
  prepareDerivedData() {
    super.prepareDerivedData();
    this.totalWeight = (Number(this.quantity) || 0) * (Number(this.weight) || 0);
  }
}

function armorRating() {
  return new fields.SchemaField({
    total: number(),
    base: number(),
    ua: number(),
    armorSet: number(),
    helmet: number(),
    modifier: number()
  });
}

function vehicleRating() {
  return new fields.SchemaField({
    total: number(),
    base: number(),
    modifier: number(),
    temp: number()
  });
}

export class AshdomWeaponData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...taxonomyFields(),
      quantity: number({ initial: 1, integer: true, min: 0 }),
      weight: number({ min: 0 }),
      totalWeight: number({ min: 0 }),
      equipped: new fields.BooleanField({ initial: false }),
      note: text(),
      s: number(),
      t: number(),
      b: number(),
      ac: number(),
      dt: number(),
      range: number({ min: 0 }),
      skill: text({ initial: "meleeWeapons" }),
      damageType: text(),
      diceDamage: text(),
      flatDamage: number(),
      capacityCurrent: number({ min: 0 }),
      capacityMax: number({ min: 0 }),
      itemType: text(),
      reloadAP: number({ min: 0 }),
      ammoType: text(),
      burstLimit: text(),
      ignoreTargetHitChance: number({ min: 0 }),
      setupAP: number({ min: 0 })
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.totalWeight = (Number(this.quantity) || 0) * (Number(this.weight) || 0);
  }
}

export class AshdomArmorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...taxonomyFields(),
      quantity: number({ initial: 1, integer: true, min: 0 }),
      weight: number({ min: 0 }),
      totalWeight: number({ min: 0 }),
      helmetName: text(),
      underArmorName: text(),
      equipped: new fields.BooleanField({ initial: false }),
      condition: text({ initial: "Pristine", choices: ["Pristine", "Broken"] }),
      drDamage: number({ min: 0 }),
      note: text(),
      ratings: new fields.SchemaField({
        ac: armorRating(), n: armorRating(), l: armorRating(),
        f: armorRating(), p: armorRating(), e: armorRating(),
        dr: armorRating(), rr: armorRating()
      })
    };
  }


  prepareDerivedData() {
    super.prepareDerivedData();
    this.totalWeight = (Number(this.quantity) || 0) * (Number(this.weight) || 0);
  }
}

export class AshdomPerkData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...taxonomyFields(),
      perkType: text({
        initial: "Trait",
        choices: ["Background", "Bestiary", "FORMULA", "Racial", "Roleplay", "Skill Spec", "Trait"]
      }),
      note: text(),
      chargesCurrent: number({ integer: true, min: 0 }),
      chargesMax: number({ integer: true, min: 0 })
    };
  }
}

export class AshdomSkillSpecData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...taxonomyFields(),
      note: text(),
      chargesCurrent: number({ integer: true, min: 0 }),
      chargesMax: number({ integer: true, min: 0 })
    };
  }
}

export class AshdomGearData extends AshdomInventoryData {
  static defineSchema() {
    return {
      ...taxonomyFields(),
      quantity: number({ min: 0 }),
      weight: number({ min: 0 }),
      totalWeight: number({ min: 0 }),
      itemType: text(),
      condition: text({ initial: "Pristine", choices: ["Pristine", "Broken"] }),
      note: text()
    };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    this.totalWeight = (Number(this.quantity) || 0) * (Number(this.weight) || 0);
  }
}

export class AshdomConsumableData extends AshdomInventoryData {
  static defineSchema() {
    return {
      ...taxonomyFields(),
      quantity: number({ integer: true, min: 0 }),
      usesCurrent: number({ integer: true, min: 0 }),
      usesMax: number({ integer: true, min: 0 }),
      weight: number({ min: 0 }),
      totalWeight: number({ min: 0 }),
      consumableType: text(),
      note: text()
    };
  }
}

export class AshdomModData extends AshdomInventoryData {
  static defineSchema() {
    return {
      ...inventoryFields(),
      modType: text(),
      modifier: number()
    };
  }
}

export class AshdomAmmunitionData extends AshdomInventoryData {
  static defineSchema() { return inventoryFields(); }
}

export class AshdomRobotPartData extends AshdomInventoryData {
  static defineSchema() { return inventoryFields(); }
}

export class AshdomLiteratureData extends AshdomInventoryData {
  static defineSchema() { return inventoryFields(); }
}

export class AshdomMiscData extends AshdomInventoryData {
  static defineSchema() { return inventoryFields(); }
}

export class AshdomLegendaryData extends AshdomInventoryData {
  static defineSchema() { return inventoryFields(); }
}

export class AshdomVehicleModData extends AshdomInventoryData {
  static defineSchema() {
    return { ...inventoryFields(), modifier: number() };
  }
}

export class AshdomImplantData extends AshdomInventoryData {
  static defineSchema() { return inventoryFields(); }
}

export class AshdomCyberneticData extends AshdomInventoryData {
  static defineSchema() { return inventoryFields(); }
}

export class AshdomVehicleData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      ...taxonomyFields(),
      vehicleType: text(),
      hpCurrent: number({ min: 0 }),
      hpMax: number({ min: 0 }),
      cwCurrent: number({ min: 0 }),
      cwMax: number({ min: 0 }),
      diceDamage: text(),
      flatDamage: number(),
      note: text(),
      ratings: new fields.SchemaField({
        ac: vehicleRating(), n: vehicleRating(), l: vehicleRating(),
        f: vehicleRating(), p: vehicleRating(), e: vehicleRating(),
        ap: vehicleRating()
      })
    };
  }
}
