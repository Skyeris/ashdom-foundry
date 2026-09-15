// The pack sort fields encode rarity/name ordering and alphabetical folders.
// Foundry's root directory otherwise defaults to alphabetical item sorting.
export async function applyCompendiumSorting() {
  const modes = { ...game.settings.get("core", "collectionSortingModes") };
  const changed = [];
  for (const pack of game.packs) {
    if (pack.documentName !== "Item" || !pack.collection.startsWith("ashdom.")) continue;
    if (modes[pack.collection] === "m") continue;
    modes[pack.collection] = "m";
    changed.push(pack);
  }
  if (changed.length) {
    await game.settings.set("core", "collectionSortingModes", modes);
    for (const pack of changed) pack.initializeTree();
  }
}
