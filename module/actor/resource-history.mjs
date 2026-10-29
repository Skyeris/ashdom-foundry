import {resourceAction} from './resources.mjs';
import {tokenResources} from "./token-resources.mjs";
const resourceKey = /^(hpCurrent|trCurrent|drCurrent|capacityCurrent|quantity|fuelCurrent|drDamage)$/;
export function resourceDiff(before,after,path="system",result=[]) {
 if(Array.isArray(before)) {
  if(!Array.isArray(after)||before.length!==after.length)return result;
  before.forEach((row,i)=>{if(row?.name===after[i]?.name)resourceDiff(row,after[i],`${path}.${i}`,result);});
 } else if(before && typeof before==="object" && after && typeof after==="object") {
  for(const key of Object.keys(before)) {
   const p=`${path}.${key}`,a=before[key],b=after[key];
   if((resourceKey.test(key)||(key==='current'&&path.startsWith('system.chargeTrackers.')))&&typeof a==='number'&&typeof b==='number'&&Number.isFinite(b)&&a!==b)result.push({path:p,before:a,after:b});
   else if(a&&typeof a==='object')resourceDiff(a,b,p,result);
  }
 }
 return result;
}
export function rememberResourceChange(actor,changes,options={}) {
 if(!['character','npc','vehicle'].includes(actor.type))return;
 const before=actor.toObject(),after=foundry.utils.mergeObject(structuredClone(before),foundry.utils.expandObject(changes),{inplace:true});
 const entries=resourceDiff(before.system,after.system);
 if(actor.type==='npc'&&before.system.groupResources?.hpCurrent==null&&typeof after.system.groupResources?.hpCurrent==='number'){
  const previous=tokenResources(actor)[0].value,next=after.system.groupResources.hpCurrent;
  if(previous!==next)entries.push({path:'system.groupResources.hpCurrent',before:previous,after:next});
 }
 if(actor.type==='npc'&&before.system.groupResources?.drCurrent==null&&typeof after.system.groupResources?.drCurrent==='number'){
  const previous=tokenResources(actor)[1].value,next=after.system.groupResources.drCurrent;
  if(previous!==next)entries.push({path:'system.groupResources.drCurrent',before:previous,after:next});
 }
 const nextAP=after.flags?.ashdom?.apCurrent;
 const oldAP=before.flags?.ashdom?.apCurrent??tokenResources(actor)[2].max;
 if(typeof nextAP==='number'&&nextAP!==oldAP)entries.push({path:'flags.ashdom.apCurrent',before:oldAP,after:nextAP});
 const structureChanged=JSON.stringify(collectionNames(before.system))!==JSON.stringify(collectionNames(after.system));
 if(options.ashdomTransfer||structureChanged){
  changes['flags.ashdom.resourceUndoStack']=[];changes['flags.ashdom.resourceRedoStack']=[];changes['flags.ashdom.resourceUndo']=null;
 }else if(entries.length&&!options.ashdomUndo&&!options.ashdomRedo){
  const record={entries,damageKey:options.ashdomDamageKey??null,collections:JSON.stringify(collectionNames(after.system))};
  changes['flags.ashdom.resourceUndoStack']=[...resourceUndoStack(actor),record].slice(-5);
  changes['flags.ashdom.resourceUndo']=record;changes['flags.ashdom.resourceRedoStack']=[];
 }
 const lines=entries.map(entry=>{
  const parts=entry.path.split('.'), field=parts.pop(), parent=foundry.utils.getProperty(before,parts.join('.'));
  const labels={apCurrent:'AP',hpCurrent:'HP',trCurrent:'TR charges',drCurrent:'DR',capacityCurrent:'Loaded ammo',quantity:'Quantity',fuelCurrent:'Fuel',drDamage:'Armor damage',current:'Charges'};
  return `${parent?.name?parent.name+' - ':''}${labels[field]||field}: ${entry.before} → ${entry.after}`;
 });
 if(options.ashdomTransfer)lines.push(options.ashdomTransfer);
 if(lines.length){
  const history=actor.getFlag?.('ashdom','resourceHistory')??[];
  changes['flags.ashdom.resourceHistory']=[{time:Date.now(),user:globalThis.game?.user?.name??'Player',action:options.ashdomRedo?'Redo':options.ashdomUndo?'Undo':options.ashdomTransfer?'Transfer':'Adjustment',lines},...history].slice(0,50);
 }

}
function collectionNames(system) {
 return Object.fromEntries(['weapons','armors','inventoryItems','chargeTrackers','vehicles'].map(k=>[k,(system[k]??[]).map(r=>({name:r.name,cargo:r.cargo?.map(c=>c.name)}))]));
}
export function resourceUndoStack(actor){const saved=actor.getFlag('ashdom','resourceUndoStack');return Array.isArray(saved)?saved.slice(-5):actor.getFlag('ashdom','resourceUndo')?[actor.getFlag('ashdom','resourceUndo')]:[];}
export async function undoResourceChange(actor){return restoreResourceChange(actor,false);}
export async function redoResourceChange(actor){return restoreResourceChange(actor,true);}
async function restoreResourceChange(actor,redo){
 if(!actor.isOwner)return;
 return resourceAction(actor,async()=>{
 const undoStack=[...resourceUndoStack(actor)],redoStack=[...(actor.getFlag('ashdom','resourceRedoStack')??[])];
 const stack=redo?redoStack:undoStack,record=stack.at(-1),verb=redo?'redo':'undo';
 if(!record?.entries?.length)return ui.notifications.info(`No resource change to ${verb}.`);
 const source=actor.toObject(),expected=redo?'before':'after',restore=redo?'after':'before';
 if(record.collections!==JSON.stringify(collectionNames(source.system))||record.entries.some(e=>foundry.utils.getProperty(source,e.path)!==e[expected]))return ui.notifications.warn(`Resources or item rows have changed. This adjustment can no longer be safely ${redo?'redone':'undone'}.`);
 stack.pop();(redo?undoStack:redoStack).push(record);
 const update={'flags.ashdom.resourceUndoStack':undoStack.slice(-5),'flags.ashdom.resourceRedoStack':redoStack.slice(-5),'flags.ashdom.resourceUndo':undoStack.at(-1)??null};
 if(record.damageKey){
  const keys=Array.isArray(record.damageKey)?record.damageKey:[record.damageKey],current=actor.getFlag('ashdom','appliedDamage')??[];
  update['flags.ashdom.appliedDamage']=redo?[...new Set([...current,...keys])]:current.filter(key=>!keys.includes(key));
 }
 for(const entry of record.entries){
  foundry.utils.setProperty(source,entry.path,entry[restore]);
  if(entry.path==='flags.ashdom.apCurrent'){update[entry.path]=entry[restore];continue;}
  const root=entry.path.split('.').slice(0,2).join('.');update[root]=foundry.utils.getProperty(source,root);
 }
 await actor.update(update,redo?{ashdomRedo:true}:{ashdomUndo:true});
 ui.notifications.info(redo?'Resource change reapplied.':'Resource change undone.');
 });
}
