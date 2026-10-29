import {schematicResult} from '../actor/schematics.mjs';
import {RARITIES,AMOUNTS,quantityFormula} from './loot-rules.mjs';
export const SHOPS={
 'Armor Merchant':{types:['armor'],mods:['Armor']},
 'Caravan Trader':{types:['ammunition'],categories:['General','Drinks','Cooked Food','Melee Weapons','Archery'],words:/pistol|revolver|hunting rifle|ration/i},
 'Chem Dealer':{categories:['Chems','Concoctions']},
 'Clothing & Protection Store':{categories:['Under Armor','Helmets'],words:/goggle|glove|boot|rebreather|gas mask|hazmat|radiation suit/i},
 'Electronics Dealer':{categories:['Energy'],words:/radio|camera|film|battery|recharger|memory core|circuit|wire|cable|floppy|analyzer|geiger|electronic|sensor/i},
 'Farm & Ranch Supply':{categories:['Tools','Cooked Food'],words:/saddle|animal|rope|fishing|seed|fertilizer|shovel|pitchfork|sickle|water|camp/i},
 'Food & Drink Vendor':{categories:['Drinks','Cooked Food'],words:/canned food|ration|drinking water/i},
 'General Store':{types:['misc'],categories:['General','Tools'],words:/food|water|bottle|matches|lighter/i},
 'Guns & Ammo Shop':{types:['ammunition'],categories:['Guns','Energy Weapons'],mods:['Gun','Energy','Ammo','Shared Mods']},
 'Hardware Store':{categories:['Tools','Materials'],words:/padlock|rope|lantern|flashlight|battery|repair|fix|jerrycan/i},
 'Hunting & Fishing Store':{categories:['Archery','Tools'],words:/hunting|fishing|trap|snare|bait|camp|rope|tent|binocular|compass|backpack|canteen|bow|shotgun/i},
 'Medical Supply Store':{words:/medical|surgical|syringe|bandage|antibiotic|antidote|medicine|healing|first aid|decon|splint|painkiller|stimulant|inhaler|antivenom|herbal powder|pain relief|rad-out|rad cap|\bstim\b|^aid-/i},
 'Melee & Archery Shop':{categories:['Melee Weapons','Unarmed Weapons','Archery'],mods:['Archery','Melee & Unarmed']},
 'Military Surplus Store':{types:['weapon','armor','ammunition'],words:/radio|binocular|canteen|ration|medical|backpack|parachute|holster|bandolier|gas mask/i},
 'Raider Black Market':{types:['weapon','armor','ammunition','mod'],categories:['Chems','Concoctions']},
 'Robot Parts Dealer':{types:['robotPart'],words:/memory core|circuit|robot/i},
 'Salvage Dealer':{types:['misc','robotPart'],categories:['Materials','Tools']},
 'Schematic Dealer':{schematics:true},
 'Scrap & Materials Trader':{categories:['Materials']},
 'Survival Outfitter':{categories:['General','Tools'],words:/bow|crossbow|hunting|camp|rope|tent|backpack|canteen/i},
 'Tool & Modification Shop':{types:['mod'],categories:['Tools']}
};
const TYPES=new Set(['weapon','armor','consumable','gear','misc','mod','robotPart','ammunition']);
export function shopEligible(item,rarity,shop,includeFactionArmor=false){
 if(!includeFactionArmor&&item.type==='armor'&&String(item.system?.subcategory??'').trim().toLowerCase()==='faction')return false;
 const rule=SHOPS[shop],rank=RARITIES.indexOf(item.system?.rarity),max=RARITIES.indexOf(rarity);
 if(!rule||rank<0||max<rank||!TYPES.has(item.type)||/\bcopy\b/i.test(item.name)||String(item.uuid??'').includes('.legendary-items.'))return false;
 if(rule.schematics)return true;
 if(Array.isArray(item.customLocations))return item.customLocations.includes(shop);
 const category=item.system?.category;
 return Boolean(rule.types?.includes(item.type)||(item.type==='mod'?rule.mods?.includes(category):rule.categories?.includes(category))||rule.words?.test(item.name));
}
export function shopQuantityFormula(item, rarity){
 return quantityFormula(item,rarity).replace(/(\d+)d(\d+)/,(_match,count,faces)=>`${Number(count)+1}d${faces}`);
}
export async function generateShop(items,{rarity,amount,location,includeFactionArmor=false,faction=''},roll){
 if(!RARITIES.includes(rarity)||!AMOUNTS[amount]||!SHOPS[location])throw Error('Choose valid shop parameters.');
 const pool=items.filter(i=>shopEligible(i,rarity,location,includeFactionArmor||Boolean(faction&&i.factionPreferred)));if(!pool.length)throw Error('No matching stock for this shop and rarity.');
 const preferred=faction?pool.filter(i=>i.factionPreferred):[];
 const count=await roll(AMOUNTS[amount]),results=[];
 for(let i=0;i<count;i++){
  const drawPool=preferred.length&&(await roll('1d4'))===1?preferred:pool;
  const item=drawPool[(await roll(`1d${drawPool.length}`))-1],formula=shopQuantityFormula(item,rarity);
  const schematic=location==='Schematic Dealer'||(await roll('1d20'))===1;
  const quantity=schematic?1:await roll(formula),previous=results.find(r=>r.uuid===item.uuid&&Boolean(r.schematic)===schematic);
  if(previous)previous.quantity+=quantity;
  else if(schematic)results.push(schematicResult(item,quantity));
  else results.push({uuid:item.uuid,name:item.name,img:item.img,rarity:item.system.rarity,quantity});
 }
 return {results,count};
}
export const SHOPPING_PENALTIES={Uncommon:[-6,-4],Rare:[-10,-8],Radical:[-14,-12],Atomic:[-18,-16]};
export function shoppingChecks(items,{rarity,location,includeFactionArmor=false,faction=''},random=Math.random,stockCount=1){
 const cap=RARITIES.indexOf(rarity);
 if(cap<0||!SHOPS[location])throw Error('Choose valid shop parameters.');
 if(cap===RARITIES.length-1)return [];
 const seen=new Set();
 const pool=items.filter(item=>{
  if(!shopEligible(item,RARITIES[cap+1],location,includeFactionArmor||Boolean(faction&&item.factionPreferred))||RARITIES.indexOf(item.system.rarity)!==cap+1||seen.has(item.uuid))return false;
  seen.add(item.uuid);return true;
 });
 const limit=Math.min(pool.length,Math.max(1,Math.floor(stockCount/4)));
 const results=[];
 for(let i=0;i<limit;i++){
  const preferred=faction?pool.filter(item=>item.factionPreferred):[];
  const drawPool=preferred.length&&random()<0.25?preferred:pool;
  const item=drawPool[Math.floor(random()*drawPool.length)];
  pool.splice(pool.indexOf(item),1);
  const schematic=location==='Schematic Dealer'||random()<0.05;
  results.push({...schematicResult(item),schematic,name:schematic?`${item.name} Schematic`:item.name,penalty:SHOPPING_PENALTIES[item.system.rarity][0]+Math.floor(random()*3)});
 }
 return results.sort((a,b)=>a.name.localeCompare(b.name));
}
