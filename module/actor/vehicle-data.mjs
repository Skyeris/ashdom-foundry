const { fields } = foundry.data;
const RATING_KEYS = ["ac", "n", "l", "f", "p", "e", "ap"];
const number = (options = {}) => new fields.NumberField({ initial: 0, ...options });
const text = (options = {}) => new fields.StringField({ initial: "", ...options });
const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const positive = value => Math.max(finite(value), 0);

function entryWeight(entry) {
  const total = positive(entry?.quantity) * positive(entry?.weight);
  return Number.isFinite(total) ? total : 0;
}

export function cargoWeight(cargo = []) {
  return cargo.reduce((total, entry) => total + entryWeight(entry), 0);
}

export function createCargoEntry(item) {
  const source = item?.system ?? {};
  const quantity = positive(source.quantity ?? 1);
  const weight = positive(source.weight);
  const category = String(source.category ?? "");
  return {
    name: String(item?.name ?? ""), quantity, weight,
    totalWeight: entryWeight({ quantity, weight }),
    type: category, category,
    subcategory: String(source.subcategory ?? ""),
    specialization: String(source.specialization ?? ""),
    condition: source.condition === "Broken" ? "Broken" : "Pristine",
    note: String(source.note ?? "")
  };
}

function ratingTotal(key, rating) {
  const total = finite(rating.base) + finite(rating.modifier) + finite(rating.temp);
  return key === "ac" ? Math.min(total, 30) : total;
}

export function createVehicleEntry(item) {
  const source = item?.system ?? {};
  const ratings = Object.fromEntries(RATING_KEYS.map(key => {
    const imported = source.ratings?.[key] ?? {};
    const rating = {
      total: 0, base: finite(imported.base),
      modifier: finite(imported.modifier), temp: finite(imported.temp)
    };
    rating.total = ratingTotal(key, rating);
    return [key, rating];
  }));
  return {
    name: String(item?.name ?? ""), type: String(source.type ?? source.category ?? ""),
    hpCurrent: positive(source.hpCurrent), hpMax: positive(source.hpMax),
    seating: Math.floor(positive(source.seating)),
    cwCurrent: 0, cwMax: positive(source.cwMax),
    fuelCurrent: positive(source.fuelCurrent), fuelMax: positive(source.fuelMax),
    diceDamage: String(source.diceDamage ?? ""), flatDamage: finite(source.flatDamage),
    note: String(source.note ?? ""), ratings, cargo: [], mods: []
  };
}

function cargoSchema() {
  return new fields.SchemaField({
    name: text(), quantity: number({ initial: 1, min: 0 }),
    weight: number({ min: 0 }), totalWeight: number({ min: 0 }),
    type: text(), category: text(), subcategory: text(), specialization: text(),
    condition: text({ initial: "Pristine", choices: ["Pristine", "Broken"] }),
    note: text()
  });
}

function vehicleSchema() {
  return new fields.SchemaField({
    name: text(), type: text(),
    seating: number({ min: 0, integer: true }),
    hpCurrent: number({ min: 0 }), hpMax: number({ min: 0 }),
    cwCurrent: number({ min: 0 }), cwMax: number({ min: 0 }),
    fuelCurrent: number({ min: 0 }), fuelMax: number({ min: 0 }),
    diceDamage: text(), flatDamage: number(), note: text(),
    ratings: new fields.SchemaField(Object.fromEntries(RATING_KEYS.map(key => [
      key, new fields.SchemaField({
        total: number(), base: number(), modifier: number(), temp: number()
      })
    ]))),
    mods: new fields.ArrayField(new fields.SchemaField({ name: text(), note: text(), sourceUuid: text() }), { initial: [] }),
    cargo: new fields.ArrayField(cargoSchema(), { initial: [] })
  });
}

export class AshdomVehicleActorData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return { vehicles: new fields.ArrayField(vehicleSchema(), { initial: () => [createVehicleEntry()] }) };
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    for (const vehicle of this.vehicles ?? []) {
      for (const entry of vehicle.cargo ?? []) entry.totalWeight = entryWeight(entry);
      vehicle.cwCurrent = cargoWeight(vehicle.cargo ?? []);
      for (const key of RATING_KEYS) {
        const rating = vehicle.ratings?.[key];
        if (rating) rating.total = ratingTotal(key, rating);
      }
    }
  }
}
