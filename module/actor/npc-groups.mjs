const SIZES = { Small: { size: "Medium", members: 5 }, Medium: { size: "Large", members: 4 }, Large: { size: "Huge", members: 3 } };
export function npcGroup(system) {
  const size = Object.keys(SIZES).find(key => key.toLowerCase() === String(system.details?.size ?? "").trim().toLowerCase());
  const tier = Number(system.details?.level);
  const eligible = Boolean(size && [4, 5].includes(tier));
  const active = eligible && Boolean(system.settings?.groups);
  const spec = SIZES[size];
  const number = value => Number(value) || 0;
  const multiplier = active ? spec.members - 1 : 1;
  const hpMax = number(system.health?.hpMax) * multiplier;
  const trBonus = active && number(system.health?.trMax) > 0 ? 2 : 0;
  return {
    eligible, active, members: spec?.members ?? 0, multiplier,
    size: active ? spec.size : system.details?.size,
    tier: active ? tier - 1 : tier,
    hpMax, hpCurrent: system.groupResources?.hpCurrent ?? number(system.health?.hpCurrent) * multiplier,
    trMax: number(system.health?.trMax) + trBonus,
    trCurrent: system.groupResources?.trCurrent ?? number(system.health?.trCurrent) + trBonus,
    drCurrent: system.groupResources?.drCurrent ?? number(system.armors?.[0]?.drDamage) * (active ? 2 : 1)
  };
}

export function applyNPCGroupTotals(system) {
  if (!npcGroup(system).active) return;
  for (const key of ["crippled", "crippledHead", "crippledTorso", "crippledArm", "crippledLeg", "crippledGroin", "knockDown"]) {
    if (system.health) system.health[key] = false;
  }
  for (const [key, skill] of Object.entries(system.skills ?? {})) if (key !== "sneak") skill.total += 5;
  for (const [key, bonus] of Object.entries({ ap: 1, de: 1, sq: 2, st: 2, wp: 2 })) {
    if (system.secondary?.[key]) system.secondary[key].total += bonus;
  }
  for (const armor of system.armors ?? []) for (const [key, rating] of Object.entries(armor.ratings ?? {})) {
    if (key === "ac") rating.total = Math.ceil(rating.total * 1.5);
    else if (key === "dr") rating.total *= 2;
    else if (["n", "l", "f", "p", "e"].includes(key)) rating.total += 5;
  }
}

export function groupWeapon(actor, weapon) {
  if (actor.type !== "npc" || !npcGroup(actor.system).active || !weapon) return weapon;
  const result = { ...weapon };
  // Add one die of the first dice term's type; fixed-only damage has no die to add.
  result.diceDamage = String(weapon.diceDamage || "0").replace(/(\d*)d(\d+)/i,
    (_match, count, faces) => `${Number(count || 1) + 1}d${faces}`);
  if (/^poison$/i.test(String(weapon.damageType).trim())) result.diceDamage = `2 * (${result.diceDamage})`;
  result.flatDamage = (Number(weapon.flatDamage) || 0) * 2;
  result.ac = (Number(weapon.ac) || 0) - 2;
  result.dt = (Number(weapon.dt) || 0) - 5;
  result.note = [weapon.note, "Group attack: +1 damage die; flat and poison damage doubled. Double Rads inflicted. Apply the displayed AC/DT reductions to the target for this attack only."].filter(Boolean).join("\n\n");
  return result;
}
