export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Radical', 'Atomic'];
export const AMOUNTS = {Scarce:'1d4', Low:'1d6+2', Average:'2d6+4', Plentiful:'3d6+8'};
const TYPES = new Set(['weapon','consumable','armor','gear','misc','mod','robotPart','ammunition']);
const DICE = {
 material:['1d4','1d6+2','2d4+4','2d6+8','2d8+12'],
 ammo:['1d10+5','2d10+10','3d10+20','4d10+40','5d10+85'],
 other:['1d2','1d2+1','1d4+2','2d4','3d4']
};
// These presets define eligible pools, not invented items or changes to compendium data.
export const LOCATIONS = {
 'Abandoned House': {types:['gear','misc','literature','consumable'], exclude:['Materials','Concoctions']},
 'Auto Garage': {categories:['Tools','Materials'], words:/battery|jerrycan|repair|fix|wrench|jack|motor|oil/i},
 'Bunker': {types:['armor','ammunition'], categories:['Cooked Food','Drinks'], words:/radio|geiger|flashlight|medical|gas mask|ration|water/i},
 'Construction Site': {categories:['Tools','Materials'], words:/helmet|rope|hammer|shovel|pickaxe|goggle|glove/i},
 'Farm': {categories:['Tools','Cooked Food'], words:/seed|fertilizer|sickle|pitchfork|shovel|rope|saddle|hunting|shotgun/i},
 'Gas Station': {categories:['Drinks'], words:/jerrycan|lighter|matches|battery|oil|fuel|food|snack|map/i},
 'Hospital': {types:['cybernetic','implant','literature'], categories:['Chems'], words:/medical|syringe|bandage|brace|decon|surgical|antibiotic|first aid/i},
 'Junkyard': {types:['robotPart','misc'], categories:['Materials','Tools'], words:/scrap|battery|wire|cable|motor|circuit/i},
 'Library': {types:['literature'], words:/paper|pen|pencil|book|magazine|map|glasses/i},
 'Military Base': {types:['weapon','armor','ammunition','mod','cybernetic','implant','robotPart'], categories:['Tools'], words:/medical|radio|binocular|canteen|ration|backpack/i},
 'Pharmacy': {categories:['Chems'], words:/medical|syringe|bandage|antibiotic|first aid|medicine/i},
 'Police Station': {types:['armor'], categories:['Tools'], words:/pistol|revolver|shotgun|baton|handcuff|radio|flashlight|bullet|shell|holster|bandolier/i},
 'Prison': {types:['armor'], categories:['Cooked Food'], words:/baton|handcuff|knife|shank|padlock|key|uniform/i},
 'Raider Camp': {types:['weapon','armor','ammunition','mod','misc'], categories:['Chems','Drinks','Cooked Food'], words:/tent|bedroll|camp|rope|backpack/i},
 'Research Lab': {types:['cybernetic','implant','robotPart','literature'], categories:['Materials','Concoctions','Energy Weapons','Energy'], words:/analyzer|syringe|geiger|memory|circuit|battery/i},
 'School': {types:['literature'], categories:['Musical Instruments'], words:/backpack|paper|pen|pencil|scissor|glue|ruler|lunch/i},
 'Subway Station': {categories:['Tools'], words:/flashlight|lantern|battery|wire|cable|radio|map|ticket/i},
 'Supermarket': {categories:['Drinks','Cooked Food'], words:/food|water|bottle|can opener|lighter|matches|bag|soap|clean|snack/i},
 'Warehouse': {types:['gear','misc'], categories:['Drinks','Cooked Food']},
 'Workshop': {types:['mod','robotPart'], categories:['Materials','Tools'], words:/battery|wire|cable|repair|fix|wrench|hammer|screwdriver/i}
};
export function eligible(item, maximum, location) {
 const rank=RARITIES.indexOf(item.system?.rarity), cap=RARITIES.indexOf(maximum), rule=LOCATIONS[location];
 if(!rule||cap<0||rank<0||rank>cap||!TYPES.has(item.type)||/\bcopy\b/i.test(item.name))return false;
 if(Array.isArray(item.customLocations))return item.customLocations.includes(location);
 const category=item.system?.category;
 if(rule.exclude?.includes(category))return false;
 return Boolean(rule.types?.includes(item.type)||rule.categories?.includes(category)||rule.words?.test(item.name));
}
export function quantityFormula(item, maximum) {
 const difference=RARITIES.indexOf(maximum)-RARITIES.indexOf(item.system?.rarity);
 if(difference<0||difference>4||!RARITIES.includes(item.system?.rarity))throw new Error('Invalid loot rarity');
 const category=item.system?.category;
 const kind=item.type==='gear'&&category==='Materials'?'material':
 (item.type==='ammunition'&&category!=='Heavy')||(item.type==='mod'&&category==='Ammo')?'ammo':'other';
 return DICE[kind][difference];
}
export async function generateLoot(items, {rarity,amount,location,faction=''}, roll) {
 if(!AMOUNTS[amount]||!LOCATIONS[location]||!RARITIES.includes(rarity))throw new Error('Choose valid loot parameters.');
 const pool=items.filter(item=>eligible(item,rarity,location));
 if(!pool.length)throw new Error('No eligible items at this location and rarity. Choose another combination.');
 const preferred=faction?pool.filter(item=>item.factionPreferred):[];
 const count=await roll(AMOUNTS[amount]);
 const results=[];
 for(let i=0;i<count;i++){
  const drawPool=preferred.length&&(await roll('1d4'))===1?preferred:pool;
  const item=drawPool[(await roll(`1d${drawPool.length}`))-1];
  const formula=quantityFormula(item,rarity);
  results.push({uuid:item.uuid,name:item.name,img:item.img,rarity:item.system.rarity,quantity:await roll(formula),formula});
 }
 return {results,count,poolSize:pool.length};
}
