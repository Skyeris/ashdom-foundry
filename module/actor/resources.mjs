import {schematicDocument} from './schematics.mjs';
export const BURST_AMMO={duo:2,spray:5,shower:9,storm:12};
export function generatedQuantity(data){const n=Number(data?.ashdomQuantity);return Number.isSafeInteger(n)&&n>0?n:null;}
export function withDropQuantity(item,data){
 if(item&&data?.ashdomSchematic){item={...schematicDocument(item),uuid:''};}
 const quantity=generatedQuantity(data);if(!item||quantity===null)return item;
 return {generatedQuantity:quantity,name:item.name,type:item.type,uuid:item.uuid,img:item.img,system:{...(item.system.toObject?.()??item.system),quantity}};
}
export function isConsumable(item){return item.documentType==='consumable'||['Chems','Concoctions','Drinks','Cooked Food'].includes(item.category||item.type);}
const locks=new WeakMap();
export async function resourceAction(actor,action){const previous=locks.get(actor)??Promise.resolve();const next=previous.catch(()=>{}).then(action);locks.set(actor,next);try{return await next;}finally{if(locks.get(actor)===next)locks.delete(actor);}}
function apSpend(actor,cost){
 if(actor.system.settings?.autoSpendAP!==true)return {};
 cost=Math.max(0,Number(cost)||0);
 const max=Math.max(0,Number(actor.system.secondary?.ap?.total)||0);
 const saved=actor.getFlag?.('ashdom','apCurrent');const current=saved==null?max:Math.min(max,Math.max(0,Number(saved)||0));
 if(current<cost)throw Error(`Not enough AP. This action costs ${cost} AP; ${current} remain.`);
 return {'flags.ashdom.apCurrent':current-cost};
}
export async function spendAmmo(actor,index,amount,mode='s'){return resourceAction(actor,async()=>{
 const weapons=structuredClone(actor.toObject().system.weapons??[]),weapon=weapons[index];
 if(!weapon)throw Error('Weapon no longer exists.');
 const update=apSpend(actor,weapon[mode]);
 if(!(Number(weapon.capacityMax)>0)){if(Object.keys(update).length)await actor.update(update);return;}
 if(!Number.isSafeInteger(amount)||amount<1)throw Error('Invalid ammunition cost.');
 if(Number(weapon.capacityCurrent)<amount)throw Error(`Not enough loaded ammunition. This attack needs ${amount} round(s).`);
 weapon.capacityCurrent=Number(weapon.capacityCurrent)-amount;
 await actor.update({...update,'system.weapons':weapons});
});}
export async function reloadWeapon(actor,index){return resourceAction(actor,async()=>{
 const system=actor.toObject().system,weapons=structuredClone(system.weapons??[]),inventory=structuredClone(system.inventoryItems??[]),weapon=weapons[index];
 if(!weapon)throw Error('Weapon no longer exists.');
 const needed=Math.max(0,Math.floor(Number(weapon.capacityMax)||0)-Math.floor(Number(weapon.capacityCurrent)||0));
 if(!needed)throw Error('This weapon is full or has no ammunition capacity.');
 if(actor.type==='npc'){
  weapon.capacityCurrent=(Number(weapon.capacityCurrent)||0)+needed;
  await actor.update({...apSpend(actor,weapon.reloadAP),'system.weapons':weapons});return needed;
 }
 const key=String(weapon.ammoType??'').trim().toLowerCase();if(!key)throw Error('Set the weapon Ammo Type to the matching inventory ammunition name first.');
 const matches=inventory.filter(row=>String(row.name??'').trim().toLowerCase()===key&&(row.documentType==='ammunition'||['Bullets','Shells','Heavy','Energy','Special'].includes(row.category||row.type)));
 let remaining=needed;
 for(const row of matches){const used=Math.min(remaining,Math.max(0,Math.floor(Number(row.quantity)||0)));row.quantity-=used;row.totalWeight=row.quantity*(Number(row.weight)||0);remaining-=used;}
 const loaded=needed-remaining;if(!loaded)throw Error('No matching ammunition is available in inventory.');
 weapon.capacityCurrent=(Number(weapon.capacityCurrent)||0)+loaded;
 await actor.update({...apSpend(actor,weapon.reloadAP),'system.weapons':weapons,'system.inventoryItems':inventory});return loaded;
});}

export function isCookedFood(row){return String(row.category||row.type||'').trim().toLowerCase()==='cooked food';}
export function consumeOne(row){
 const quantity=Number(row.quantity)||0,weight=Number(row.weight)||0;
 if(isCookedFood(row)){
  const remaining=quantity*weight;
  if(weight<=0||remaining<1-1e-9)throw Error('At least 1 lb of cooked food is needed for one use.');
  row.quantity=Math.max(0,(remaining-1)/weight);
 }else{
  if(quantity<1)throw Error('No uses remaining.');
  row.quantity=quantity-1;
 }
 row.totalWeight=row.quantity*weight;
}
