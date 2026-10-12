// Both generators draw from the same visible ASHDOM Item compendiums.
export async function loadGeneratorItems(){
 const items=[];
 for(const pack of game.packs.filter(p=>p.documentName==='Item'&&p.visible!==false&&p.collection.startsWith('ashdom.')&&!p.collection.endsWith('.legendary-items'))){
  const index=await pack.getIndex({fields:['type','img','system.rarity','system.category','system.subcategory']});
  for(const entry of index.values())items.push({...entry,uuid:pack.getUuid(entry._id)});
 }
 return items;
}
