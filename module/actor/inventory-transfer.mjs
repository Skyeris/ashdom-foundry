import {resourceAction} from './resources.mjs';
import {mirrorEquipmentDrop} from './equipment-inventory.mjs';
export function inventoryPath(actor){return actor.type==='vehicle'?'system.vehicles.0.cargo':'system.inventoryItems';}
const get=(object,path)=>path.split('.').reduce((o,k)=>o?.[k],object);
export function containerTotals(rows){const totals=new Map();for(const row of rows){const name=String(row.container||'').trim()||'Unassigned';totals.set(name,(totals.get(name)||0)+Math.max(0,Number(row.quantity)||0)*Math.max(0,Number(row.weight)||0));}return [...totals].sort((a,b)=>a[0].localeCompare(b[0]));}
export async function transferInventory(source,target,index,quantity,expected){
 if(!source.isOwner||!target.isOwner||source.uuid===target.uuid)throw Error('Choose another actor you can edit.');
 if(!['character','npc','vehicle'].includes(target.type))throw Error('Unsupported destination actor.');
 if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('Enter a positive whole quantity.');
 const ordered=[source,target].sort((a,b)=>a.uuid.localeCompare(b.uuid));
 return resourceAction(ordered[0],()=>resourceAction(ordered[1],async()=>{
  const before=source.toObject(),destination=target.toObject(),path=inventoryPath(source),destPath=inventoryPath(target);
  const rows=structuredClone(get(before,path)??[]),dest=structuredClone(get(destination,destPath)??[]),row=rows[index];
  if(!row||JSON.stringify(row)!==JSON.stringify(expected))throw Error('The item changed while the transfer was open. Please try again.');
  if(quantity>Number(row.quantity))throw Error('Not enough items remain.');
  const match=e=>(row.sourceUuid&&e.sourceUuid===row.sourceUuid)||e.name===row.name;
  const weapons=before.system.weapons??[],armors=before.system.armors??[];
  const weapon=weapons.find(match),armor=armors.find(a=>match(a)||[a.helmetName,a.underArmorName].includes(row.name));
  if(weapon?.equipped||armor?.equipped)throw Error('Unequip this item before transferring it.');
  const moved=structuredClone(row);moved.quantity=quantity;moved.totalWeight=quantity*(Number(row.weight)||0);moved.container='';
  const sourceUpdate={},targetUpdate={};
  let itemData=structuredClone(row.equipmentData??{});
  const otherStack=rows.some((r,i)=>i!==index&&Number(r.quantity)>0&&match(r));
  if(weapon){itemData=structuredClone(weapon);moved.documentType='weapon';if(quantity<Number(row.quantity)||otherStack)itemData.capacityCurrent=0;}
  if(armor){itemData=structuredClone(armor);moved.documentType='armor';itemData.category=armor.underArmorName===row.name?'Under Armor':armor.helmetName===row.name?'Helmet':'Armor Set';}
  moved.equipmentData=itemData;
  row.quantity-=quantity;row.totalWeight=row.quantity*(Number(row.weight)||0);
  if(row.quantity===0&&!otherStack){
   if(weapon)sourceUpdate['system.weapons']=weapons.filter(w=>w!==weapon);
   if(armor){const copy=structuredClone(armors),i=armors.indexOf(armor);const field=armor.underArmorName===row.name?'underArmorName':armor.helmetName===row.name?'helmetName':'name';const column=field==='underArmorName'?'ua':field==='helmetName'?'helmet':'armorSet';copy[i][field]='';for(const rating of Object.values(copy[i].ratings??{}))rating[column]=0;sourceUpdate['system.armors']=copy;}
  }
  if(row.quantity===0)rows.splice(index,1);
  sourceUpdate[path]=rows;dest.push(moved);targetUpdate[destPath]=dest;
  if(target.type!=='vehicle'&&['weapon','armor'].includes(moved.documentType))mirrorEquipmentDrop(destination.system,{type:moved.documentType,name:moved.name,uuid:moved.sourceUuid,system:{...moved,...itemData,equipped:false}},targetUpdate,'inventory',target.type);
  // Foundry array fields must be updated as complete arrays, not numeric dotted paths.
  if(source.type==='vehicle'){
   const vehicles=structuredClone(before.system.vehicles);vehicles[0].cargo=rows;
   delete sourceUpdate[path];sourceUpdate['system.vehicles']=vehicles;
  }
  if(target.type==='vehicle'){
   const vehicles=structuredClone(destination.system.vehicles);
   if(!vehicles?.[0])throw Error('The destination vehicle has no inventory yet. Open its sheet and try again.');
   vehicles[0].cargo=dest;delete targetUpdate[destPath];targetUpdate['system.vehicles']=vehicles;
  }
  const restore={};for(const key of Object.keys(sourceUpdate))restore[key]=get(before,key);
  await source.update(sourceUpdate,{ashdomTransfer:`Sent ${quantity} × ${row.name} to ${target.name}`});
  try {await target.update(targetUpdate,{ashdomTransfer:`Received ${quantity} × ${row.name} from ${source.name}`});}
  catch(error){try{await source.update(restore,{ashdomTransfer:`Transfer failed; restored ${quantity} × ${row.name}`});}catch(rollback){ui.notifications.error('Transfer failed and could not restore the source. Check both inventories.');throw rollback;}throw error;}
  return quantity;
 }));
}

// A named container is moved as one transaction, using the same equipment rules as individual transfers.
export async function transferContainer(source,target,name,expected){
 if(!source.isOwner||!target?.isOwner||source.uuid===target.uuid)throw Error('Choose another actor you can edit.');
 name=String(name??'').trim();if(!name||name==='Unassigned')throw Error('Choose a named container.');
 const ordered=[source,target].sort((a,b)=>a.uuid.localeCompare(b.uuid));
 return resourceAction(ordered[0],()=>resourceAction(ordered[1],async()=>{
  const before=source.toObject(),destination=target.toObject(),rows=get(before,inventoryPath(source))??[];
  if(JSON.stringify(rows)!==JSON.stringify(expected))throw Error('Inventory changed; reopen the container transfer.');
  const indices=rows.flatMap((r,i)=>String(r.container??'').trim()===name?[i]:[]);
  const bag=rows.findIndex((r,i)=>!indices.includes(i)&&r.name?.trim().toLowerCase()===name.toLowerCase()&&Number(r.quantity)>0);
  if(bag>=0)indices.push(bag);if(!indices.length)throw Error('This container is empty.');
  const proxy=(actor,data)=>({uuid:actor.uuid,name:actor.name,type:actor.type,isOwner:actor.isOwner,toObject:()=>structuredClone(data),async update(update){for(const [key,value] of Object.entries(update))foundry.utils.setProperty(data,key,structuredClone(value));}});
  const left=structuredClone(before),right=structuredClone(destination),a=proxy(source,left),b=proxy(target,right),start=(get(right,inventoryPath(target))??[]).length;
  for(const i of indices.sort((a,b)=>b-a)){const row=get(left,inventoryPath(source))[i];await transferInventory(a,b,i,i===bag?1:Number(row.quantity),structuredClone(row));}
  for(const row of get(right,inventoryPath(target)).slice(start))row.container=name;
  const changes=(actor,data)=>Object.fromEntries((actor.type==='vehicle'?['system.vehicles']:['system.inventoryItems','system.weapons','system.armors']).filter(p=>get(data,p)!==undefined).map(p=>[p,get(data,p)]));
  const update=changes(source,left),restore=changes(source,before);
  await source.update(update,{ashdomTransfer:`Sent container ${name} to ${target.name}`});
  try{await target.update(changes(target,right),{ashdomTransfer:`Received container ${name} from ${source.name}`});}
  catch(error){try{await source.update(restore,{ashdomTransfer:`Restored container ${name} after failed transfer`});}catch{ui.notifications.error('Container transfer failed; check both inventories before retrying.');}throw error;}
  return indices.length;
 }));
}
