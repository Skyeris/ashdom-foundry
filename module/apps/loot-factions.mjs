const normalize=value=>String(value??'').trim().toLowerCase();
export function factionFolders(pack){
 if(!pack)return [];
 return [...pack.folders.values()].filter(f=>{
  const parent=typeof f.folder==='object'?f.folder:pack.folders.get(f.folder);
  return ['Factions','Nations'].includes(parent?.name);
 }).sort((a,b)=>a.name.localeCompare(b.name));
}
export function belongsToFaction(folderId,factionId,folders){
 const seen=new Set();let folder=typeof folderId==='object'?folderId:folders.get(folderId);
 while(folder&&!seen.has(folder.id??folder._id)){
  const id=folder.id??folder._id;if(id===factionId)return true;seen.add(id);
  folder=typeof folder.folder==='object'?folder.folder:folders.get(folder.folder);
 }
 return false;
}
export function equipmentNames(actors){
 const names=new Set();
 const collect=row=>{
  if(!row||typeof row!=='object')return;
  for(const field of ['name','helmetName','underArmorName'])if(row[field])names.add(normalize(row[field]));
  for(const mod of row.mods??[])collect(mod);
 };
 for(const actor of actors){
  const system=actor.system??{};
  for(const key of ['weapons','armors','inventoryItems','augmentations'])for(const row of system[key]??[])collect(row);
  for(const item of actor.items??[])if(item&&typeof item==='object'&&item.type!=='perk'&&item.type!=='skillSpec')collect(item);
 }
 return names;
}
export async function factionEquipment(factionId){
 if(!factionId)return new Set();
 const pack=game.packs.get('ashdom.bestiary');
 if(!pack||!factionFolders(pack).some(f=>(f.id??f._id)===factionId))return new Set();
 const index=await pack.getIndex({fields:['folder','type']});
 const ids=[...index.values()].filter(e=>e.type==='npc'&&belongsToFaction(e.folder,factionId,pack.folders)).map(e=>e._id);
 const actors=await Promise.all(ids.map(id=>pack.getDocument(id)));
 return equipmentNames(actors.filter(Boolean));
}
export function markFactionItems(items,names){return items.map(item=>({...item,factionPreferred:names.has(normalize(item.name))}));}
