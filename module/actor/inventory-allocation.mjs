import {resourceAction} from './resources.mjs';
import {inventoryPath} from './inventory-transfer.mjs';
import {mirrorEquipmentDrop} from './equipment-inventory.mjs';
const get=(data,path)=>path.split('.').reduce((v,k)=>v?.[k],data);
const round=v=>Math.round(v*1e6)/1e6;
export function splitRows(input,index,quantity) {
 const rows=structuredClone(input),row=rows[index],n=Number(quantity);
 if(!row||!Number.isFinite(n)||n<=0||n>=Number(row.quantity))throw Error('Split quantity must be greater than zero and less than the stack quantity.');
 const copy=structuredClone(row);copy.quantity=round(n);row.quantity=round(Number(row.quantity)-n);
 if(copy.quantity<=0||row.quantity<=0)throw Error('Quantity is too small to split.');
 copy.totalWeight=copy.quantity*(Number(copy.weight)||0);row.totalWeight=row.quantity*(Number(row.weight)||0);
 if(copy.equipmentData)copy.equipmentData.capacityCurrent=0;
 rows.splice(index+1,0,copy);return rows;
}
export async function splitStack(actor,index,quantity,expected) {return resourceAction(actor,async()=>{
 if(!actor.isOwner)throw Error('You cannot edit this inventory.');
 const before=actor.toObject(),path=inventoryPath(actor),rows=get(before,path)??[];
 if(JSON.stringify(rows[index])!==JSON.stringify(expected))throw Error('This stack changed; reopen Split.');
 const result=splitRows(rows,index,quantity);
 const changes=actor.type==='vehicle'?{'system.vehicles':before.system.vehicles.map((v,i)=>i===0?{...v,cargo:result}:v)}:{[path]:result};
 await actor.update(changes,{ashdomTransfer:`Split ${quantity} × ${expected.name} into a separate stack`});
});}
export function evenAllocations(rows,count) {
 if(!Number.isSafeInteger(count)||count<1)throw Error('Choose at least one recipient.');
 let cursor=0;
 return rows.map(row=>{
  if(!Number.isSafeInteger(row.quantity)||row.quantity<0)throw Error('Generated loot must use non-negative whole quantities.');
  const values=Array(count).fill(Math.floor(row.quantity/count)),extra=row.quantity%count;
  for(let i=0;i<extra;i++)values[(cursor+i)%count]++;
  cursor=(cursor+extra)%count;return values;
 });
}
export function validateAllocations(rows,matrix,count) {
 if(matrix.length!==rows.length||count<1)throw Error('Invalid allocation.');
 let allocated=0;
 const remaining=rows.map((r,i)=>{
  const values=matrix[i];if(!Array.isArray(values)||values.length!==count||values.some(n=>!Number.isSafeInteger(n)||n<0))throw Error('Enter non-negative whole quantities for every recipient.');
  const total=values.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(r.quantity)||r.quantity<0||total>r.quantity)throw Error(`Allocation exceeds available ${r.name??'quantity'}.`);
  allocated+=total;return r.quantity-total;
 });
 if(!allocated)throw Error('Allocate at least one item.');return remaining;
}
export function addAllocatedItems(actor,before,items) {
 const system=structuredClone(before.system),changes={},path=inventoryPath(actor),rows=get({system},path);
 if(!Array.isArray(rows))throw Error(`Open ${actor.name}'s inventory before distributing loot.`);
 for(const {document:doc,quantity,uuid} of items){
  const d=structuredClone(doc.system);rows.push({name:doc.name,sourceUuid:uuid??'',documentType:doc.type,quantity,weight:Number(d.weight)||0,totalWeight:quantity*(Number(d.weight)||0),rarity:d.rarity??'',category:d.category??'',type:d.category??'',subcategory:d.subcategory??'',specialization:d.specialization??'',condition:d.condition??'Pristine',note:d.note??d.description??'',container:'',equipmentData:d});
  const currentArmor=(changes['system.armors']??system.armors??[])[0];
  const isArmor=doc.type==='armor'||(doc.type==='robotPart'&&String(d.category).toLowerCase()==='body');
  const occupiedNPCArmor=actor.type==='npc'&&isArmor&&currentArmor&&(currentArmor.name||currentArmor.helmetName||currentArmor.underArmorName||currentArmor.equipped);
  if(actor.type!=='vehicle'&&!occupiedNPCArmor){
   mirrorEquipmentDrop({...system,...(changes['system.weapons']?{weapons:changes['system.weapons']}:{}),...(changes['system.armors']?{armors:changes['system.armors']}:{} )},{type:doc.type,name:doc.name,uuid:uuid??'',system:{...d,quantity,equipped:false,capacityCurrent:0}},changes,'inventory',actor.type);
  }
 }
 if(actor.type==='vehicle')changes['system.vehicles']=system.vehicles;else changes[path]=rows;
 return changes;
}
// Lock all recipients in a stable order, stage every update, then commit or roll back.
export async function distributeItems(actors,itemsByActor,finish=async()=>{}) {
 if(!globalThis.game?.user?.isGM)throw Error('Only the GM can divide generated loot.');
 if(new Set(actors.map(a=>a.uuid)).size!==actors.length)throw Error('Duplicate recipient.');
 const ordered=[...actors].sort((a,b)=>a.uuid.localeCompare(b.uuid));
 const lock=i=>i===ordered.length?commit():resourceAction(ordered[i],()=>lock(i+1));
 async function commit(){
  const staged=actors.map((actor,i)=>{
   if(!actor.isOwner||!['character','npc','vehicle'].includes(actor.type))throw Error('A recipient is no longer editable.');
   const before=actor.toObject(),changes=addAllocatedItems(actor,before,itemsByActor[i]);
   return {actor,changes,before,restore:Object.fromEntries(Object.keys(changes).map(p=>[p,get(before,p)]))};
  });
  const applied=[];
  try{
   for(const stage of staged){
    if(JSON.stringify(stage.actor.toObject().system)!==JSON.stringify(stage.before.system))throw Error('A recipient changed during distribution. Try again.');
    if(!itemsByActor[actors.indexOf(stage.actor)].length)continue;
    await stage.actor.update(stage.changes,{ashdomTransfer:'Received divided loot'});stage.after=stage.actor.toObject();applied.push(stage);
   }
   await finish();
  }catch(error){
   let incomplete=false;
   for(const stage of applied.reverse()){
    try{
     if(Object.keys(stage.changes).some(p=>JSON.stringify(get(stage.actor.toObject(),p))!==JSON.stringify(get(stage.after,p))))throw Error('Recipient changed');
     await stage.actor.update(stage.restore,{ashdomTransfer:'Loot distribution failed; restored inventory'});
    }catch{incomplete=true;}
   }
   if(incomplete){ui.notifications.error('Distribution rollback was incomplete. Check recipient inventories before retrying.');error.partialDistribution=true;}
   throw error;
  }
 }
 return lock(0);
}
