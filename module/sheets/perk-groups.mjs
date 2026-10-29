export function perkTypeGroups(perks=[]){
 const groups=new Map();perks.forEach((perk,index)=>{const type=perk.type||'Trait';if(!groups.has(type))groups.set(type,{type,indices:[]});groups.get(type).indices.push(index);});
 return [...groups.values()].sort((a,b)=>a.type.localeCompare(b.type));
}
export function groupPerkRows(sheet,root){
 const list=root.querySelector('[data-item-section="perks"] .ashdom-perk-list');if(!list||list.querySelector('.ashdom-perk-type-group'))return;
 const rows=new Map([...list.querySelectorAll('[data-collection="perks"][data-reorder-entry]')].map(row=>[Number(row.dataset.index),row]));
 for(const {type,indices}of perkTypeGroups(Array.from(sheet.actor.system.perks??[]))){
  const members=indices.map(i=>rows.get(i)).filter(Boolean);if(!members.length)continue;
  const group=document.createElement('details');group.className='ashdom-inventory-container ashdom-perk-type-group';group.open=true;group.dataset.sheetSection=`perk-type-${type}`;
  const summary=document.createElement('summary');summary.textContent=type;group.append(summary);
  const content=document.createElement('div');content.className='ashdom-perk-list';for(const row of members)content.append(row);group.append(content);list.append(group);
 }
}
