export const NPC_DEFCON_CHOICES =
  ["5 <", "5 -", "5 >", "4 <", "4 -", "4 >", "3", "2", "1"].map(value => ({ value, label: value }));

export function npcDefconLabel(level, qualifier = "<") {
  const tier = Number(level);
  return [4, 5].includes(tier)
    ? `${tier} ${["<", "-", ">"].includes(qualifier) ? qualifier : "<"}`
    : String(tier);
}

export function parseNPCDefcon(value) {
  if (!NPC_DEFCON_CHOICES.some(choice => choice.value === value)) return null;
  const [tier, qualifier = "<"] = value.split(" ");
  return { level: Number(tier), defconQualifier: qualifier };
}
