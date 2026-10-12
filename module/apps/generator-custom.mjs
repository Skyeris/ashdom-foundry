import {SHOPS} from './shop-rules.mjs';
import {LOCATIONS as LOOT} from './loot-rules.mjs';
import {LOCATIONS as ENCOUNTERS} from './encounter-rules.mjs';
export const CUSTOM_TYPES=['weapon','consumable','armor','gear','misc','mod','robotPart','ammunition'];
export function validCustom(doc,kind){return kind!=='encounter'?!String(doc.uuid??'').includes('.legendary-items.')&&doc.documentName==='Item'&&CUSTOM_TYPES.includes(doc.type):doc.documentName==='Actor'&&doc.type==='npc';}
export function registerCustomEntries(){game.settings.register('ashdom','generatorEntries',{scope:'world',config:false,type:Object,default:{loot:[],encounter:[],shop:[]}});}
let pending=Promise.resolve();
export function updateCustomEntries(kind,change){
 if(!game.user?.isGM)return Promise.reject(Error('Only GMs can manage generator entries.'));
 const task=pending.then(async()=>{const state=foundry.utils.deepClone(game.settings.get('ashdom','generatorEntries'));state[kind]=change(state[kind]??[]);await game.settings.set('ashdom','generatorEntries',state);});
 pending=task.catch(()=>{});return task;
}
export async function mergeCustomEntries(base,kind){
 const records=game.settings.get('ashdom','generatorEntries')?.[kind]??[];
 const overrides=new Set(records.map(r=>r.uuid));const result=base.filter(e=>!overrides.has(e.uuid));
 for(const record of records){if(!record.enabled)continue;
  let doc;try{doc=await fromUuid(record.uuid);}catch{continue;}
  if(!doc||!validCustom(doc,kind))continue;
  result.push({...doc.toObject(),uuid:doc.uuid,customLocations:record.locations??[],customFamily:record.family||record.uuid,path:record.family||'Custom Entries'});
 }
 return result;
}
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
export class AshdomCustomEntries extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={classes:['ashdom','ashdom-loot-generator'],tag:'section',window:{title:'Generator Custom Entries',resizable:true},position:{width:720,height:650},actions:{remove:this.remove}};
 static PARTS={manager:{template:'systems/ashdom/templates/apps/generator-custom.html'}};
 constructor(kind){super();this.kind=kind;}
 _canRender(){return Boolean(game.user?.isGM);}
 async _prepareContext(options){const locations=Object.keys(this.kind==='loot'?LOOT:this.kind==='shop'?SHOPS:ENCOUNTERS).filter(x=>x!=='Any Location');
 const records=game.settings.get('ashdom','generatorEntries')?.[this.kind]??[];
 const rows=await Promise.all(records.map(async r=>{let doc;try{doc=await fromUuid(r.uuid);}catch{}return {...r,name:doc?.name??r.name,missing:!doc,locations:locations.map(name=>({name,checked:r.locations?.includes(name)}))};}));
 return {...await super._prepareContext(options),rows,isEncounter:this.kind==='encounter'};}
 async _onRender(context,options){await super._onRender(context,options);
 const zone=this.element.querySelector('.ashdom-custom-shell');zone.addEventListener('dragover',e=>e.preventDefault());
 zone.addEventListener('drop',async e=>{e.preventDefault();if(!game.user?.isGM)return;try{
 const data=JSON.parse(e.dataTransfer.getData('text/plain'));if(!data.uuid)throw Error('Drag an existing item or NPC here.');
 const doc=await fromUuid(data.uuid);if(!doc||!validCustom(doc,this.kind))throw Error(this.kind!=='encounter'?'This item type is excluded from loot.':'Only NPC actors can be added.');
 await updateCustomEntries(this.kind,rows=>rows.some(r=>r.uuid===doc.uuid)?rows:[...rows,{uuid:doc.uuid,name:doc.name,enabled:true,locations:[],family:''}]);await this.render({force:true});
 }catch(error){ui.notifications.warn(error.message);}});
 zone.querySelectorAll('[data-custom-field]').forEach(input=>input.addEventListener('change',async()=>{const row=input.closest('[data-custom-uuid]'),uuid=row.dataset.customUuid,field=input.dataset.customField;
 const value=field==='locations'?[...row.querySelectorAll('[data-custom-field="locations"]:checked')].map(x=>x.value):input.type==='checkbox'?input.checked:input.value.trim();
 try{await updateCustomEntries(this.kind,rows=>rows.map(r=>r.uuid===uuid?{...r,[field]:value}:r));}catch(error){ui.notifications.warn(error.message);}
 }));
 }
 static async remove(event,target){try{await updateCustomEntries(this.kind,rows=>rows.filter(r=>r.uuid!==target.dataset.uuid));await this.render({force:true});}catch(error){ui.notifications.warn(error.message);}}
}
