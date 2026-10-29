import {tokenSize} from "../token-sizing.mjs";
import {AshdomCustomEntries,mergeCustomEntries} from './generator-custom.mjs';
import {TIERS,SIZES,COMPOSITIONS,LOCATIONS,encounterPool,buildEncounter,combineEncounterRows,leaderCandidates,hasBossPerk} from './encounter-rules.mjs';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
const choices=values=>Object.fromEntries(values.map(v=>[v,v]));
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const roll=async formula=>(await new Roll(formula).evaluate()).total;
export class AshdomEncounterGenerator extends HandlebarsApplicationMixin(ApplicationV2){
 static DEFAULT_OPTIONS={id:'ashdom-encounter-generator',classes:['ashdom','ashdom-loot-generator'],tag:'section',window:{title:'ASHDOM Encounter Generator',icon:'fa-solid fa-users',resizable:true},position:{width:760,height:720},actions:{generate:this.generate,reroll:this.reroll,open:this.open,share:this.share,place:this.place,custom:this.custom}};
 static PARTS={encounter:{template:'systems/ashdom/templates/apps/encounter-generator.html'}};
 selection={location:'Any Location',weakest:'5 <',strongest:'4 >',size:'Small',composition:'Related creatures',category:'',groups:false};
 entries=[];result=null;busy=false;
 _canRender(){return Boolean(game.user?.isGM);}
 async load(){

  const pack=game.packs.get('ashdom.bestiary');if(!pack)throw Error('ASHDOM Bestiary is unavailable.');
  const index=await pack.getIndex({fields:['system.details','system.settings','system.perks','items','type','folder']});
  this.entries=[...index.values()].filter(e=>e.type==='npc').map(e=>{
   const names=[],seen=new Set();let folder=typeof e.folder==='object'?e.folder:pack.folders.get(e.folder);
   while(folder&&!seen.has(folder.id??folder._id)){seen.add(folder.id??folder._id);names.unshift(folder.name);folder=typeof folder.folder==='object'?folder.folder:pack.folders.get(folder.folder);}
   return {...e,path:names.join(' / '),uuid:pack.getUuid(e._id)};
  });
  this.entries=await mergeCustomEntries(this.entries,'encounter');
 }
 static custom(){if(game.user?.isGM)new AshdomCustomEntries('encounter').render({force:true});}
 async _prepareContext(options){await this.load();return {...await super._prepareContext(options),...this.selection,locations:choices(Object.keys(LOCATIONS)),tiers:TIERS.map(value=>({value,label:value})),sizes:{Solo:'Solo (1)',Small:'Small (2-3)',Large:'Large (4-6)',Huge:'Huge (7-8)'},compositions:choices(COMPOSITIONS),categories:choices([...new Set(this.entries.map(e=>e.path))].sort()),result:this.result,busy:this.busy};}
 async _onRender(context,options){await super._onRender(context,options);
  this.element.querySelectorAll('[data-field]').forEach(el=>el.addEventListener('change',()=>{this.selection[el.dataset.field]=el.type==='checkbox'?el.checked:el.value;}));
  this.element.querySelectorAll('[data-quantity]').forEach(el=>el.addEventListener('change',()=>{const n=Math.max(1,Math.min(30,Math.trunc(Number(el.value)||1)));this.result.rows[Number(el.dataset.quantity)].quantity=n;el.value=n;}));
 }
 async perform(fn){if(!game.user?.isGM||this.busy)return;this.busy=true;this.element.querySelectorAll('.ashdom-loot-shell [data-action]').forEach(b=>b.disabled=true);try{await fn();}catch(error){ui.notifications.warn(error.message);}finally{this.busy=false;this.element.querySelectorAll('.ashdom-loot-shell [data-action]').forEach(b=>b.disabled=false);if(this.rendered)await this.render({force:true});}}
 static async generate(){await this.perform(async()=>{await this.load();this.result=await buildEncounter(this.entries,this.selection,roll);});}
 static async reroll(event,target){await this.perform(async()=>{
  const index=Number(target.dataset.index),old=this.result.rows[index];
  if(this.result.selection.composition==='Same creature'&&this.result.rows.length>1)throw Error('Generate again to replace a same-creature encounter together.');
  let pool=encounterPool(this.entries,this.result.selection).filter(e=>e.family===old.family&&e.uuid!==old.uuid);
  if(this.result.selection.composition==='Leader with followers'){
   if(old.leader)pool=leaderCandidates(pool);
   else {const followers=pool.filter(e=>!hasBossPerk(e)&&!this.result.rows.some(r=>r.leader&&r.uuid===e.uuid));if(followers.length)pool=followers;}
  }
  if(!pool.length)throw Error('No alternative matching entry for this encounter.');
  this.result.rows[index]={...pool[(await roll(`1d${pool.length}`))-1],quantity:old.quantity,leader:old.leader};
  this.result.rows=combineEncounterRows(this.result.rows);
 });}
 static async open(event,target){if(!game.user?.isGM)return;(await fromUuid(target.dataset.uuid))?.sheet.render(true);}
 static async share(){await this.perform(async()=>{if(!this.result)return;
  const rows=this.result.rows.map(r=>`<li>${escape(r.name)} &times; ${r.quantity}</li>`).join('');
  await ChatMessage.create({speaker:ChatMessage.getSpeaker(),whisper:[],blind:false,content:`<section class="ashdom-loot-chat"><h3>Encounter</h3><p>${escape(this.result.selection.location)}</p><ul>${rows}</ul></section>`});
 });}
 static async place(){await this.perform(async()=>{
  if(!this.result)return;if(!canvas?.ready||!canvas.scene)throw Error('Open a scene before adding an encounter.');
  if(this.result.rows.some(r=>!Number.isSafeInteger(r.quantity)||r.quantity<1||r.quantity>30))throw Error('Each entry must have between 1 and 30 tokens.');
  const total=this.result.rows.reduce((n,r)=>n+r.quantity,0);if(total>60)throw Error('Limit scene placement to 60 tokens at a time.');
  const scene=canvas.scene;const prepared=[];
  const grid=canvas.dimensions.size,bounds=canvas.dimensions.sceneRect;
  let plannedX=bounds.x+grid,plannedY=bounds.y+grid,plannedHeight=0;
  for(const row of this.result.rows){const original=await fromUuid(row.uuid);if(!original)throw Error('A Bestiary entry could not be found.');const data=original.toObject();delete data._id;delete data.folder;delete data._stats;data.name=row.name;data.system.settings={...data.system.settings,groups:row.group};data.system.groupResources={hpCurrent:null,trCurrent:null,drCurrent:null};data.prototypeToken={...data.prototypeToken,name:row.name,actorLink:false,texture:{...data.prototypeToken?.texture,src:data.img||data.prototypeToken?.texture?.src}};data.ownership={default:0};const preview=await original.getTokenDocument();const plannedSize=tokenSize(data.system,data.type,scene.grid.distance);if(plannedSize)preview.updateSource(plannedSize);const w=preview.width*grid,h=preview.height*grid;
  if(w>bounds.width-grid||h>bounds.height-grid)throw Error('A token is too large for this scene.');
  for(let i=0;i<row.quantity;i++){
   if(plannedX+w>bounds.x+bounds.width){plannedX=bounds.x+grid;plannedY+=plannedHeight+grid;plannedHeight=0;}
   if(plannedY+h>bounds.y+bounds.height)throw Error('This encounter does not fit on the scene. Reduce the quantities or use a larger scene.');
   plannedX+=w+grid;plannedHeight=Math.max(plannedHeight,h);
  }
  prepared.push({row,data});}
  if(canvas.scene?.id!==scene.id)throw Error('The active scene changed. Deploy again on the intended scene.');
  const created=[];const tokens=[];let x=bounds.x+grid,y=bounds.y+grid,lineHeight=0;
  try {for(const {row,data}of prepared){const actor=await Actor.create(data,{renderSheet:false});created.push(actor);
   for(let i=0;i<row.quantity;i++){const token=await actor.getTokenDocument({name:row.name,actorLink:false,hidden:true});const sized=tokenSize(actor.system,actor.type,scene.grid.distance);if(sized)token.updateSource(sized);const w=token.width*grid,h=token.height*grid;
    if(x+w>bounds.x+bounds.width){x=bounds.x+grid;y+=lineHeight+grid;lineHeight=0;}
    token.updateSource({x,y});tokens.push(token.toObject());x+=w+grid;lineHeight=Math.max(lineHeight,h);
   }
  }
  await scene.createEmbeddedDocuments('Token',tokens);
  }catch(error){for(const actor of created){try{const placed=scene.tokens.filter(t=>t.actorId===actor.id).map(t=>t.id);if(placed.length)await scene.deleteEmbeddedDocuments('Token',placed);await actor.delete();}catch{ui.notifications.error('Deployment cleanup failed; check the scene and newly created actors.');}}throw error;}
  ui.notifications.info('Encounter added as hidden tokens near the scene’s upper-left corner. Reveal them when ready.');
 });}
}
