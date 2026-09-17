const ROOT = "systems/ashdom/assets/icons/npc";
const ICONS = { Humanoid: `${ROOT}/humanoid.svg`, Creature: `${ROOT}/creature.svg`, Robot: `${ROOT}/robot.svg` };

export function npcIcon(bodyType) {
  return ICONS[bodyType] ?? ICONS.Humanoid;
}

export function isDefaultNPCImage(img) {
  return !img || ["icons/svg/mystery-man.svg", "icons/svg/hazard.svg", ...Object.values(ICONS)].includes(img);
}

export function updateNPCIcon(actor, changes) {
  if (actor.type !== "npc") return;
  const image = changes.img ?? actor.img;
  if (!isDefaultNPCImage(image)) return;
  const bodyType = changes["system.details.bodyType"] ?? changes.system?.details?.bodyType ?? actor.system?.details?.bodyType;
  changes.img = npcIcon(bodyType);
}
