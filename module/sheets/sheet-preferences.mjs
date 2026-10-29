const sets = ["_closedSkillGroups", "_closedArmors", "_closedWeapons", "_closedVehicles", "_closedInventoryItems", "_openCargo"];
function key(sheet) { return `ashdom.sheet.${globalThis.game?.world?.id}.${globalThis.game?.user?.id}.${sheet.actor.uuid}`; }
export function loadPreferences(sheet) {
 if (sheet._preferencesLoaded) return;
 sheet._preferencesLoaded = true;
 try { const data = JSON.parse(localStorage.getItem(key(sheet)) || "{}");
  for (const name of sets) if (Array.isArray(data[name])) sheet[name] = new Set(data[name]);
  sheet._groupRulesClosed = !!data._groupRulesClosed;
 } catch (_) { /* Storage may be disabled. Keep the current session's preferences. */ }
}
export function savePreferences(sheet) {
 try { localStorage.setItem(key(sheet), JSON.stringify(Object.fromEntries([...sets.map(name => [name, [...(sheet[name] ?? [])]]), ["_groupRulesClosed", !!sheet._groupRulesClosed]]))); } catch (_) {}
}
