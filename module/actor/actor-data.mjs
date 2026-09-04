const { fields } = foundry.data;


/* =========================================
   PRIMARY STAT HELPER
========================================= */

function createPrimaryStat() {

  return new fields.SchemaField({

    base: new fields.NumberField({
      initial: 0
    }),

    modifier: new fields.NumberField({
      initial: 0
    }),

    note: new fields.StringField({
      initial: ""
    }),

    total: new fields.NumberField({
      initial: 0
    }),

    min: new fields.NumberField({
      initial: 0
    }),

    max: new fields.NumberField({
      initial: 0
    })

  });

}


/* =========================================
   SKILL HELPER
========================================= */

function createSkill(initialValue = 5) {

  return new fields.SchemaField({

    total: new fields.NumberField({
      initial: initialValue,
      min: 0,
      max: 200
    }),

    modifier: new fields.NumberField({
      initial: 0
    }),

    temp: new fields.NumberField({
      initial: 0
    }),

    note: new fields.StringField({
      initial: ""
    }),

    tagged: new fields.BooleanField({
      initial: false
    }),

    sp: new fields.NumberField({
      initial: 0,
      integer: true,
      min: 0
    })

  });

}


/* =========================================
   SECONDARY STAT HELPERS
========================================= */

function createSecondaryStat(withNote = false) {
  const schema = {
    modifier: new fields.NumberField({ initial: 0 }),
    total: new fields.NumberField({ initial: 0 })
  };

  if (withNote) {
    schema.note = new fields.StringField({ initial: "" });
  }

  return new fields.SchemaField(schema);
}

function createCriticalChance() {
  return new fields.SchemaField({
    successModifier: new fields.NumberField({ initial: 0 }),
    failureModifier: new fields.NumberField({ initial: 0 }),
    success: new fields.NumberField({ initial: 1 }),
    failure: new fields.NumberField({ initial: 18 })
  });
}


/* =========================================
   REPEATABLE DATA HELPERS
========================================= */

function createPerk() {
  return new fields.SchemaField({
    name: new fields.StringField({ initial: "" }),
    type: new fields.StringField({
      initial: "Trait",
      choices: [
        "Background",
        "Bestiary",
        "FORMULA",
        "Racial",
        "Roleplay",
        "Skill Spec",
        "Trait"
      ]
    }),
    note: new fields.StringField({ initial: "" })
  });
}

function createChargeTracker() {
  return new fields.SchemaField({
    name: new fields.StringField({ initial: "" }),
    current: new fields.NumberField({ initial: 0, integer: true }),
    max: new fields.NumberField({ initial: 0, integer: true, min: 0 })
  });
}

function createEffectTracker() {
  return new fields.SchemaField({
    name: new fields.StringField({ initial: "" }),
    source: new fields.StringField({ initial: "" }),
    active: new fields.BooleanField({ initial: true })
  });
}

function createLanguage() {
  return new fields.SchemaField({
    name: new fields.StringField({ initial: "" })
  });
}

function createArmorRating() {
  return new fields.SchemaField({
    total: new fields.NumberField({ initial: 0 }),
    base: new fields.NumberField({ initial: 0 }),
    ua: new fields.NumberField({ initial: 0 }),
    armorSet: new fields.NumberField({ initial: 0 }),
    helmet: new fields.NumberField({ initial: 0 }),
    modifier: new fields.NumberField({ initial: 0 })
  });
}

function createArmor() {
  return new fields.SchemaField({
    name: new fields.StringField({ initial: "" }),
    helmetName: new fields.StringField({ initial: "" }),
    underArmorName: new fields.StringField({ initial: "" }),
    equipped: new fields.BooleanField({ initial: false }),
    condition: new fields.StringField({
      initial: "Pristine",
      choices: ["Pristine", "Broken"]
    }),
    drDamage: new fields.NumberField({ initial: 0, min: 0 }),
    note: new fields.StringField({ initial: "" }),
    ratings: new fields.SchemaField({
      ac: createArmorRating(),
      n: createArmorRating(),
      l: createArmorRating(),
      f: createArmorRating(),
      p: createArmorRating(),
      e: createArmorRating(),
      dr: createArmorRating(),
      rr: createArmorRating()
    })
  });
}

function createVehicleRating() {
  return new fields.SchemaField({
    total: new fields.NumberField({ initial: 0 }),
    base: new fields.NumberField({ initial: 0 }),
    modifier: new fields.NumberField({ initial: 0 }),
    temp: new fields.NumberField({ initial: 0 })
  });
}

function createWeapon() {
  return new fields.SchemaField({
    name: new fields.StringField({ initial: "" }),
    equipped: new fields.BooleanField({ initial: false }),
    note: new fields.StringField({ initial: "" }),
    concealedNote: new fields.StringField({ initial: "" }),
    s: new fields.NumberField({ initial: 0 }),
    t: new fields.NumberField({ initial: 0 }),
    b: new fields.NumberField({ initial: 0 }),
    ac: new fields.NumberField({ initial: 0 }),
    dt: new fields.NumberField({ initial: 0 }),
    range: new fields.NumberField({ initial: 0, min: 0 }),
    skill: new fields.StringField({ initial: "meleeWeapons" }),
    damageType: new fields.StringField({
      initial: "",
      blank: true
    }),
    diceDamage: new fields.StringField({ initial: "" }),
    flatDamage: new fields.NumberField({ initial: 0 }),
    capacityCurrent: new fields.NumberField({ initial: 0, min: 0 }),
    capacityMax: new fields.NumberField({ initial: 0, min: 0 }),
    itemType: new fields.StringField({ initial: "" }),
    reloadAP: new fields.NumberField({ initial: 0, min: 0 }),
    ammoType: new fields.StringField({ initial: "" }),
    burstLimit: new fields.StringField({ initial: "" }),
    ignoreTargetHitChance: new fields.NumberField({ initial: 0, min: 0 }),
    setupAP: new fields.NumberField({ initial: 0, min: 0 })
  });
}

function createVehicle() {
  return new fields.SchemaField({
    name: new fields.StringField({ initial: "" }),
    type: new fields.StringField({ initial: "" }),
    hpCurrent: new fields.NumberField({ initial: 0, min: 0 }),
    hpMax: new fields.NumberField({ initial: 0, min: 0 }),
    cwCurrent: new fields.NumberField({ initial: 0, min: 0 }),
    cwMax: new fields.NumberField({ initial: 0, min: 0 }),
    diceDamage: new fields.StringField({ initial: "" }),
    flatDamage: new fields.NumberField({ initial: 0 }),
    note: new fields.StringField({ initial: "" }),
    ratings: new fields.SchemaField({
      ac: createVehicleRating(),
      n: createVehicleRating(),
      l: createVehicleRating(),
      f: createVehicleRating(),
      p: createVehicleRating(),
      e: createVehicleRating(),
      ap: createVehicleRating()
    })
  });
}

function createCurrency() {
  return new fields.SchemaField({
    title: new fields.StringField({ initial: "" }),
    amount: new fields.NumberField({ initial: 0 })
  });
}

function createInventoryItem() {
  return new fields.SchemaField({
    name: new fields.StringField({ initial: "" }),
    quantity: new fields.NumberField({ initial: 0, min: 0 }),
    weight: new fields.NumberField({ initial: 0, min: 0 }),
    totalWeight: new fields.NumberField({ initial: 0, min: 0 }),
    type: new fields.StringField({ initial: "" }),
    condition: new fields.StringField({
      initial: "Pristine",
      choices: ["Pristine", "Broken"]
    }),
    note: new fields.StringField({ initial: "" })
  });
}


/* =========================================
   ASHDOM CHARACTER DATA
========================================= */

export class AshdomCharacterData extends foundry.abstract.TypeDataModel {


  /* =========================================
     DERIVED DATA
  ========================================= */

  prepareDerivedData() {

    super.prepareDerivedData();


    /* =====================================
       PRIMARY STAT TOTALS

       BASE + MODIFIER = TOTAL
    ====================================== */

    const primaryStats = [
      "frt",
      "obs",
      "ref",
      "mgt",
      "und",
      "lck",
      "apl"
    ];


    for (const stat of primaryStats) {

      const base =
        Number(this.primary[stat].base) || 0;

      const modifier =
        Number(this.primary[stat].modifier) || 0;


      this.primary[stat].total =
        base + modifier;

    }


    /* =====================================
       SECONDARY STAT TOTALS
    ====================================== */

    const frt = Number(this.primary.frt.total) || 0;
    const obs = Number(this.primary.obs.total) || 0;
    const ref = Number(this.primary.ref.total) || 0;
    const mgt = Number(this.primary.mgt.total) || 0;
    const und = Number(this.primary.und.total) || 0;
    const lck = Number(this.primary.lck.total) || 0;
    const apl = Number(this.primary.apl.total) || 0;
    const d100Variant = Boolean(this.settings?.variantRules?.d100Variant);
    const d100Incompatible = Boolean(
      this.settings?.variantRules?.formulaSkillEquations
    );
    const d100Active = d100Variant && !d100Incompatible;
    const fatigueValue = Number(this.health.fatigue);
    const fatigue = Number.isFinite(fatigueValue)
      ? Math.min(Math.max(fatigueValue, 0), 8)
      : 0;
    const fatigueSecondaryPenalty =
      (fatigue >= 1 ? 2 : 0) +
      (fatigue >= 2 ? 1 : 0) +
      (fatigue >= 3 ? 1 : 0) +
      (fatigue >= 4 ? 1 : 0) +
      (fatigue >= 5 ? 2 : 0);

    const apBase = ref <= 5 ? 8 : ref <= 8 ? 9 : 10;
    const secondaryBases = {
      ap: apBase,
      baseAC: d100Active ? obs + ref : (obs + ref) / 5,
      de: 5 + obs,
      hpPerLevel: 3 + frt,
      pl: apl * 10,
      sp: d100Active ? 50 : 10,
      baseRR: frt / 2,
      sq: ref / 2,
      st: frt * 2,
      tr: frt / 2,
      wp: und + apl
    };

    for (const [stat, base] of Object.entries(secondaryBases)) {
      const modifier = Number(this.secondary[stat].modifier) || 0;
      const fatiguePenalty = ["st", "wp"].includes(stat)
        ? fatigueSecondaryPenalty
        : 0;
      let total;

      if (d100Active && ["st", "wp"].includes(stat)) {
        total = Math.ceil((base + modifier - fatiguePenalty) * 5);
      } else if (d100Active && stat === "baseAC") {
        total = Math.ceil(base + modifier);
      } else {
        total = Math.ceil(base + modifier - fatiguePenalty);
      }

      if (["baseRR", "st", "wp"].includes(stat)) {
        total = Math.max(total, 0);
      }

      if (stat === "ap") {
        total = Math.min(total, 15);
      }

      if (stat === "baseAC") {
        total = Math.min(total, d100Active ? 150 : 30);
      }

      this.secondary[stat].total = total;
    }

    if (d100Active) {
      const lckStep = Math.max(Math.floor(lck), 1);
      this.secondary.cc.success = Math.min(
        Math.max(Math.ceil(
          lckStep + (Number(this.secondary.cc.successModifier) || 0)
        ), 1),
        25
      );
      this.secondary.cc.failure = Math.min(
        Math.max(Math.ceil(
          90 + Math.min(lckStep, 10) +
          (Number(this.secondary.cc.failureModifier) || 0) +
          (Number(this.settings?.criticalChance?.failureCapModifier) || 0)
        ), 1),
        100
      );
    } else {
      let ccSuccess = 1;
      let ccFailure = 18;

      if (lck >= 10) {
        ccSuccess = 2;
        ccFailure = 20;
      } else if (lck >= 5) {
        ccSuccess = 2;
        ccFailure = 19;
      }

      const successCapModifier =
        Number(this.settings?.criticalChance?.successCapModifier) || 0;
      const criticalSuccessCap = Math.min(
        Math.max(Math.ceil(5 + successCapModifier), 1),
        20
      );

      this.secondary.cc.success = Math.min(
        Math.max(Math.ceil(
          ccSuccess + (Number(this.secondary.cc.successModifier) || 0)
        ), 1),
        criticalSuccessCap
      );
      this.secondary.cc.failure = Math.min(
        Math.max(Math.ceil(
          ccFailure + (Number(this.secondary.cc.failureModifier) || 0)
          + (Number(this.settings?.criticalChance?.failureCapModifier) || 0)
        ), 1),
        20
      );
    }

    /* =====================================
       ARMOR TOTALS
    ====================================== */

    for (const armor of this.armors ?? []) {
      for (const [ratingKey, rating] of Object.entries(armor.ratings)) {
        const base = ratingKey === "rr"
          ? this.secondary.baseRR.total
          : (Number(rating.base) || 0);

        rating.base = base;
        const manualTotal =
          (Number(rating.ua) || 0) +
          (Number(rating.armorSet) || 0) +
          (Number(rating.helmet) || 0) +
          (Number(rating.modifier) || 0);

        rating.total = ratingKey === "ac"
          ? Math.min(base + manualTotal, d100Active ? 150 : 30)
          : base + manualTotal;
      }
    }

    for (const vehicle of this.vehicles ?? []) {
      for (const [ratingKey, rating] of Object.entries(vehicle.ratings)) {
        const ratingTotal =
          (Number(rating.base) || 0) +
          (Number(rating.modifier) || 0) +
          (Number(rating.temp) || 0);

        rating.total = ratingKey === "ac"
          ? Math.min(ratingTotal, d100Active ? 150 : 30)
          : ratingTotal;
      }
    }

    let currentCarryWeight = 0;

    for (const item of this.inventoryItems ?? []) {
      item.totalWeight =
        (Number(item.quantity) || 0) *
        (Number(item.weight) || 0);
      currentCarryWeight += item.totalWeight;
    }

    const carrySize = String(this.carryWeight.size || "Medium");
    const carryBases = {
      Small: 10 + (mgt * 10),
      Medium: 20 + (10 * (mgt + frt)),
      Large: 50 + (20 * (mgt + frt)),
      Huge: 200 + (50 * (mgt + frt)),
      Gargantuan: 500 + (80 * (mgt + frt))
    };
    const carryModifier = Number(this.carryWeight.modifier) || 0;

    this.carryWeight.max = Math.max(
      Math.ceil((carryBases[carrySize] ?? carryBases.Medium) + carryModifier),
      0
    );
    this.carryWeight.current = currentCarryWeight;


    /* =====================================
       SKILL TOTALS

       Five skills derive their base from a
       primary stat. Every other skill has a
       base of 5. All apply their modifier.
    ====================================== */

    const derivedSkillBases = {
      athletics: this.primary.mgt.total * 2,
      acrobatics: this.primary.ref.total * 2,
      logic: this.primary.und.total * 2,
      chance: this.primary.lck.total * 2,
      perception: this.primary.obs.total * 2
    };

    const formulaSkillEquations = Boolean(
      this.settings?.variantRules?.formulaSkillEquations
    );
    const formulaSkillLuckBonus =
      formulaSkillEquations &&
      Boolean(this.settings?.variantRules?.formulaSkillLuckBonus)
        ? Math.ceil(lck / 2)
        : 0;
    const equationSkillBases = {
      archery: Math.ceil((obs + ref) / 2),
      energyWeapons: Math.ceil((obs + und) / 2),
      heavyGuns: Math.ceil((frt + obs) / 2),
      lightGuns: Math.ceil((obs + ref) / 2),
      meleeWeapons: Math.ceil((ref + mgt) / 2),
      unarmed: Math.ceil((frt + Math.max(ref, mgt)) / 2),
      animalHandling: Math.ceil((apl + Math.max(frt, obs)) / 2),
      blacksmith: Math.ceil((frt + und) / 2),
      charm: apl,
      chemistry: Math.ceil((frt + und) / 2),
      deception: Math.ceil((und + apl) / 2),
      electronics: Math.ceil((obs + und) / 2),
      engineer: Math.ceil((obs + und) / 2),
      gunsmith: Math.ceil((und + Math.max(ref, obs)) / 2),
      insight: Math.ceil((obs + apl) / 2),
      intimidation: Math.ceil((mgt + Math.max(frt, apl)) / 2),
      lore: und,
      medicine: Math.ceil((obs + und) / 2),
      mercantile: Math.ceil((und + apl) / 2),
      mysticism: Math.ceil((und + lck) / 2),
      pilot: Math.ceil((und + Math.max(obs, ref)) / 2),
      sleightOfHand: Math.ceil((obs + ref) / 2),
      sneak: Math.ceil((obs + ref) / 2),
      survival: Math.ceil((frt + obs) / 2)
    };

    const combatSkills = new Set([
      "meleeWeapons", "unarmed", "archery", "energyWeapons",
      "heavyGuns", "lightGuns"
    ]);
    const physicalSkills = new Set([
      "acrobatics", "athletics", "sleightOfHand", "sneak"
    ]);
    const allSkillPenalty =
      (fatigue >= 1 ? 5 : 0) +
      (fatigue >= 5 ? 5 : 0);
    const supportSkillPenalty = fatigue >= 3 ? 10 : 0;
    const combatSkillPenalty = fatigue >= 4 ? 10 : 0;
    const physicalSkillPenalty = fatigue >= 2 ? 5 : 0;

    const formulaBaseLimits = Boolean(
      this.settings?.variantRules?.formulaBaseLimits
    );
    const formulaBaseLimitsD100 = Boolean(
      this.settings?.variantRules?.formulaBaseLimitsD100
    );
    const formulaSkillStats = {
      athletics: "mgt",
      acrobatics: "ref",
      logic: "und",
      chance: "lck",
      perception: "obs"
    };

    for (const [skill, skillData] of Object.entries(this.skills)) {
      let base;

      if (d100Active) {
        base = (derivedSkillBases[skill] ?? 5) * 5;
      } else if (formulaSkillEquations) {
        base = (equationSkillBases[skill] ?? derivedSkillBases[skill] ?? 5) +
          formulaSkillLuckBonus;
      } else {
        base = derivedSkillBases[skill] ?? 5;
      }
      const modifier = Number(skillData.modifier) || 0;
      const temp = Number(skillData.temp) || 0;
      const tagBonus = skillData.tagged ? 5 : 0;
      const fatiguePenalty =
        allSkillPenalty +
        (combatSkills.has(skill) ? combatSkillPenalty : supportSkillPenalty) +
        (physicalSkills.has(skill) ? physicalSkillPenalty : 0);

      let skillCap = 40;

      if (formulaBaseLimits && formulaSkillStats[skill]) {
        const formulaTotal = Number(
          this.primary[formulaSkillStats[skill]]?.total
        ) || 0;
        const baseLimit = Math.min(
          Math.max(Math.floor(formulaTotal), 1) * 4,
          40
        );
        skillCap = baseLimit * (formulaBaseLimitsD100 ? 5 : 1);
      }

      const appliedFatiguePenalty = fatiguePenalty * (d100Active ? 5 : 1);
      const rawTotal =
        base + modifier + temp + tagBonus - appliedFatiguePenalty;

      const hasFormulaLimit =
        formulaBaseLimits && Boolean(formulaSkillStats[skill]);
      const maximumSkill = hasFormulaLimit
        ? skillCap
        : d100Active ? 200 : 40;
      skillData.total = Math.min(Math.max(rawTotal, 1), maximumSkill);
    }

  }


  /* =========================================
     SCHEMA
  ========================================= */

  static defineSchema() {

    return {


      /* CHARACTER INFORMATION */

      details: new fields.SchemaField({

        race: new fields.StringField({
          initial: ""
        }),

        sex: new fields.StringField({
          initial: ""
        }),

        age: new fields.NumberField({
          initial: 0,
          integer: true
        }),

        size: new fields.StringField({
          initial: "Medium"
        }),

        level: new fields.NumberField({
          initial: 1,
          integer: true,
          min: 1
        }),

        experience: new fields.NumberField({
          initial: 0,
          integer: true
        }),

        hopePoints: new fields.NumberField({
          initial: 0,
          integer: true
        })

      }),


      /* HEALTH */

      health: new fields.SchemaField({
        hpCurrent: new fields.NumberField({ initial: 0, min: 0 }),
        hpMax: new fields.NumberField({ initial: 0, min: 0 }),
        trCurrent: new fields.NumberField({ initial: 0, min: 0 }),
        trMax: new fields.NumberField({ initial: 0, min: 0 }),
        rads: new fields.NumberField({ initial: 0, min: 0, max: 500 }),
        horror: new fields.NumberField({ initial: 0, min: 0, max: 500 }),
        success1: new fields.BooleanField({ initial: false }),
        success2: new fields.BooleanField({ initial: false }),
        success3: new fields.BooleanField({ initial: false }),
        failure1: new fields.BooleanField({ initial: false }),
        failure2: new fields.BooleanField({ initial: false }),
        failure3: new fields.BooleanField({ initial: false }),
        fatigue: new fields.NumberField({ initial: 0, integer: true, min: 0, max: 8 }),
        reaperNote: new fields.StringField({ initial: "" }),
        crippled: new fields.BooleanField({ initial: false }),
        crippledHead: new fields.BooleanField({ initial: false }),
        crippledTorso: new fields.BooleanField({ initial: false }),
        crippledArm: new fields.BooleanField({ initial: false }),
        crippledLeg: new fields.BooleanField({ initial: false }),
        crippledGroin: new fields.BooleanField({ initial: false }),
        knockDown: new fields.BooleanField({ initial: false }),
        bleed: new fields.NumberField({ initial: 0, min: 0 }),
        burn: new fields.NumberField({ initial: 0, min: 0 }),
        dazed: new fields.NumberField({ initial: 0, min: 0 }),
        pulsed: new fields.NumberField({ initial: 0, min: 0 }),
        stunned: new fields.NumberField({ initial: 0, min: 0 }),
        terrored: new fields.NumberField({ initial: 0, min: 0 })
      }),


      /* PRIMARY STATS */

      primary: new fields.SchemaField({

        frt: createPrimaryStat(),
        obs: createPrimaryStat(),
        ref: createPrimaryStat(),
        mgt: createPrimaryStat(),
        und: createPrimaryStat(),
        lck: createPrimaryStat(),
        apl: createPrimaryStat()

      }),


      /* SECONDARY STATS */

      secondary: new fields.SchemaField({
        ap: createSecondaryStat(),
        baseAC: createSecondaryStat(),
        cc: createCriticalChance(),
        de: createSecondaryStat(),
        hpPerLevel: createSecondaryStat(),
        pl: createSecondaryStat(),
        sp: createSecondaryStat(),
        baseRR: createSecondaryStat(),
        sq: createSecondaryStat(true),
        st: createSecondaryStat(true),
        tr: createSecondaryStat(),
        wp: createSecondaryStat(true)
      }),


      /* SKILLS */

      skills: new fields.SchemaField({

        meleeWeapons: createSkill(),
        unarmed: createSkill(),

        archery: createSkill(),
        energyWeapons: createSkill(),
        heavyGuns: createSkill(),
        lightGuns: createSkill(),

        blacksmith: createSkill(),
        chemistry: createSkill(),
        electronics: createSkill(),
        engineer: createSkill(),
        gunsmith: createSkill(),

        logic: createSkill(0),
        lore: createSkill(),
        medicine: createSkill(),
        mysticism: createSkill(),

        acrobatics: createSkill(0),
        athletics: createSkill(0),
        sleightOfHand: createSkill(),
        sneak: createSkill(),

        charm: createSkill(),
        deception: createSkill(),
        intimidation: createSkill(),
        insight: createSkill(),
        mercantile: createSkill(),

        animalHandling: createSkill(),
        chance: createSkill(0),
        perception: createSkill(0),
        pilot: createSkill(),
        survival: createSkill()

      }),


      biography: new fields.StringField({
        initial: ""
      }),


      vicesVirtues: new fields.StringField({
        initial: ""
      }),

      perks: new fields.ArrayField(createPerk(), { initial: [] }),

      chargeTrackers: new fields.ArrayField(createChargeTracker(), {
        initial: []
      }),

      effects: new fields.ArrayField(createEffectTracker(), { initial: [] }),

      languages: new fields.ArrayField(createLanguage(), { initial: [] }),

      armors: new fields.ArrayField(createArmor(), { initial: [] }),

      weapons: new fields.ArrayField(createWeapon(), { initial: [] }),

      vehicles: new fields.ArrayField(createVehicle(), { initial: [] }),

      carryWeight: new fields.SchemaField({
        size: new fields.StringField({
          initial: "Medium",
          choices: ["Small", "Medium", "Large", "Huge", "Gargantuan"]
        }),
        modifier: new fields.NumberField({ initial: 0 }),
        max: new fields.NumberField({ initial: 0, min: 0 }),
        current: new fields.NumberField({ initial: 0, min: 0 }),
        note: new fields.StringField({ initial: "" })
      }),

      currencies: new fields.ArrayField(createCurrency(), { initial: [] }),

      inventoryItems: new fields.ArrayField(createInventoryItem(), { initial: [] }),

      settings: new fields.SchemaField({
        criticalChance: new fields.SchemaField({
          successCapModifier: new fields.NumberField({ initial: 0 }),
          failureCapModifier: new fields.NumberField({ initial: 0 })
        }),
        variantRules: new fields.SchemaField({
          criticalShenanigans: new fields.BooleanField({ initial: false }),
          formulaBaseLimits: new fields.BooleanField({ initial: false }),
          formulaBaseLimitsD100: new fields.BooleanField({ initial: false }),
          formulaSkillEquations: new fields.BooleanField({ initial: false }),
          formulaSkillLuckBonus: new fields.BooleanField({ initial: false }),
          psychicAnomalies: new fields.BooleanField({ initial: false }),
          d100Variant: new fields.BooleanField({ initial: false }),
          expandedCrippledStatus: new fields.BooleanField({ initial: false })
        })
      })

    };

  }

}


/* =========================================
   ASHDOM NPC DATA
========================================= */

export class AshdomNPCData extends foundry.abstract.TypeDataModel {

  static defineSchema() {

    return {

      details: new fields.SchemaField({

        description: new fields.StringField({
          initial: ""
        })

      })

    };

  }

}
