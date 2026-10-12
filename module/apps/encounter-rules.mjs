import {npcGroup} from '../actor/npc-groups.mjs';
import {npcDefconLabel} from '../actor/npc-defcon.mjs';
export const TIERS=['5 <','5 -','5 >','4 <','4 -','4 >','3','2','1'];
export const SIZES={Solo:'1',Small:'1d2+1',Large:'1d3+3',Huge:'1d2+6'};
export const COMPOSITIONS=['Same creature','Related creatures','Leader with followers'];
export const LOCATIONS={
 'Any Location':/.*/,
 'Coast':/pirat|swab|swashbuckler|sailor|privateer|argos|crab|orca|dolphin|shark/i,
 'Hospital':/doctor|medic|nurse|feral|roach|scavenger/i,
 'Military Base':/haven|republic|technate|turret|centaur|gorgon/i,
 'Raider Camp':/raider|bandit|slaver|gangster|marauder/i,
 'Research Lab':/scientist|synth|robot|bot|drone|mutant|kemera|amalgamate/i,
 'Ruined City':/wastelander|marauder|bandit|raider|feral|roach|bot|mercenar/i,
 'Settlement':/wastelander|survivalist|merchant|guard|doctor|mechanic|cook|priest/i,
 'Swamp':/alligator|crocodile|snake|croaker|gladespawn|insect|gecko/i,
 'Wilderness':/beast|insect|tribal|hunter|howler|ogre|mutant/i
};
export function family(entry){
 if(entry.customFamily)return entry.customFamily;
 const text=entry.path+' '+entry.name;
 for(const [key,re]of Object.entries({Haven:/haven/i,Republic:/republic/i,Technate:/technate|templar|lancer|keeper/i,Pirates:/pirat|swab|swashbuckler/i,Sunshine:/sunshine/i,Augustin:/augustin/i,Apala:/apala|watcher/i,Argos:/argos/i,Raider:/raider/i,Bandit:/bandit/i,Slaver:/slaver/i,Ogre:/ogre/i}))if(re.test(text))return key;
 if(/beasts|insects|mutants/i.test(entry.path))return entry.name.replace(/^(young|baby|giant|large|alpha|queen|king|acidic|obsidian|evolved|feral) /gi,'').replace(/ (alpha|queen|king|matriarch|soldier|hatchling|swarm|larva)$/gi,'').toLowerCase();
 return entry.path.split(' / ')[0]||entry.system.details?.bodyType||'Other';
}
export function hasBossPerk(entry){
 const perks=[...(entry.system?.perks??[]),...(Array.isArray(entry.items)?entry.items.filter(i=>i?.type==='perk'):[])];
 return perks.some(p=>/^boss(?: perk)?$/i.test(String(p?.name??'').trim()));
}
export function leaderCandidates(pool){
 const bosses=pool.filter(hasBossPerk);
 if(bosses.length)return bosses;
 const highest=Math.max(...pool.map(e=>e.strength));
 return pool.filter(e=>e.strength===highest);
}
export function candidate(entry,groups){
 const system=structuredClone(entry.system);system.settings={...system.settings,groups:Boolean(groups)};
 const group=npcGroup(system);const tier=npcDefconLabel(group.tier,system.details?.defconQualifier);
 return {...entry,group:group.active,tier,strength:TIERS.indexOf(tier),family:family(entry),name:group.active&&!/\bGroup$/i.test(entry.name)?entry.name+' Group':entry.name};
}
export function encounterPool(entries,selection){
 const min=TIERS.indexOf(selection.weakest),max=TIERS.indexOf(selection.strongest);
 if(min<0||max<min)throw Error('Choose a strongest tier at least as strong as the weakest tier.');
 const location=LOCATIONS[selection.location];if(!location)throw Error('Choose a location.');
 return entries.filter(e=>!(/unique characters|\bcopy\b/i.test(e.path+' '+e.name)))
 .filter(e=>!selection.category||e.path===selection.category)
 .filter(e=>Array.isArray(e.customLocations)?selection.location==='Any Location'||e.customLocations.includes(selection.location):location.test(e.path+' '+e.name)).map(e=>candidate(e,selection.groups))
 .filter(e=>e.strength>=min&&e.strength<=max);
}
export function combineEncounterRows(rows){
 const combined=[];
 for(const row of rows){
  const existing=combined.find(r=>r.uuid===row.uuid&&r.group===row.group);
  if(existing){existing.quantity+=row.quantity;existing.leader ||= row.leader;}
  else combined.push({...row});
 }
 return combined;
}
export async function buildEncounter(entries,selection,roll){
 const pool=encounterPool(entries,selection);if(!pool.length)throw Error('No matching Bestiary entries. Widen the tier range or change location/category.');
 if(!SIZES[selection.size]||!COMPOSITIONS.includes(selection.composition))throw Error('Choose a valid encounter size and composition.');
 const pick=async list=>list[(await roll(`1d${list.length}`))-1];
 const count=await roll(SIZES[selection.size]);const anchor=await pick(selection.composition==='Leader with followers'?leaderCandidates(pool):pool);
 const related=pool.filter(e=>e.family===anchor.family);
 const rows=[];
 for(let i=0;i<count;i++){
  let entry=anchor;
  if(selection.composition==='Related creatures')entry=await pick(related);
  if(selection.composition==='Leader with followers'){
   const followers=related.filter(e=>e.uuid!==anchor.uuid&&!hasBossPerk(e));
   const alternatives=related.filter(e=>e.uuid!==anchor.uuid);
   entry=i===0?anchor:await pick(followers.length?followers:alternatives.length?alternatives:related);
  }
  rows.push({...entry,quantity:1,leader:selection.composition==='Leader with followers'&&i===0});
 }
 return {rows:combineEncounterRows(rows),selection:{...selection}};
}
