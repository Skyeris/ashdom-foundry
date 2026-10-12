import {factionFolders,factionEquipment,markFactionItems} from './loot-factions.mjs';
import {loadGeneratorItems} from './generator-items.mjs';
import {AshdomCustomEntries,mergeCustomEntries} from './generator-custom.mjs';
import {RARITIES,AMOUNTS,LOCATIONS,generateLoot} from './loot-rules.mjs';
const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
export class AshdomLootGenerator extends HandlebarsApplicationMixin(ApplicationV2) {
 static DEFAULT_OPTIONS={id:'ashdom-loot-generator',classes:['ashdom','ashdom-loot-generator'],tag:'section',window:{title:'ASHDOM Loot Generator',icon:'fa-solid fa-box-open',resizable:true},position:{width:650,height:650},actions:{generate:AshdomLootGenerator.generate,openItem:AshdomLootGenerator.openItem,share:AshdomLootGenerator.share,custom:AshdomLootGenerator.custom}};
 static PARTS={loot:{template:'systems/ashdom/templates/apps/loot-generator.html'}};
 selection={rarity:'Common',amount:'Low',location:'Abandoned House',faction:''};
 results=[];
 summary='';
 busy=false;
 sharing=false;
 _canRender(options){return Boolean(game.user?.isGM);}
 async _prepareContext(options){return {...await super._prepareContext(options),...this.selection,rarities:Object.fromEntries(RARITIES.map(x=>[x,x])),amounts:Object.fromEntries(Object.keys(AMOUNTS).map(k=>[k,k])),locations:Object.fromEntries(Object.keys(LOCATIONS).map(x=>[x,x])),factions:Object.fromEntries(factionFolders(game.packs.get?.('ashdom.bestiary')).map(f=>[f.id??f._id,f.name])),results:this.results,summary:this.summary,busy:this.busy};}
 async _onRender(context,options){await super._onRender(context,options);this.element.querySelectorAll('[data-loot-field]').forEach(el=>el.addEventListener('change',()=>{this.selection[el.dataset.lootField]=el.type==='checkbox'?el.checked:el.value;}));this.element.querySelectorAll('[data-loot-uuid]').forEach(el=>el.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',JSON.stringify({type:'Item',uuid:el.dataset.lootUuid}));}));}
 static async share(){
  if(!game.user?.isGM||this.busy||this.sharing||!this.results.length)return;
  this.sharing=true;
  try{
   const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
   const rows=this.results.map(item=>`<li><strong>${escape(item.name)}</strong> &mdash; ${escape(item.rarity)} &times; ${escape(item.quantity)}</li>`).join('');
   await ChatMessage.create({speaker:ChatMessage.getSpeaker(),content:`<section class="ashdom-loot-chat"><h3>${escape(this.constructor.name === 'AshdomShopGenerator' ? 'ASHDOM Shop Stock' : 'ASHDOM Loot')}</h3><p>${escape(this.summary)}</p><ul>${rows}</ul></section>`,whisper:[],blind:false});
   ui.notifications.info('Results shared with everyone in chat.');
  }catch(error){ui.notifications.warn(error.message);}
  finally{this.sharing=false;}
 }
 static custom(){if(game.user?.isGM)new AshdomCustomEntries('loot').render({force:true});}
 static async openItem(event,target){const item=await fromUuid(target.dataset.uuid);item?.sheet.render(true);}
 static async generate(){
  if(!game.user?.isGM||this.busy)return;
  this.busy=true;
  const button=this.element.querySelector('[data-action="generate"]');if(button)button.disabled=true;
  try{
   const selection={...this.selection};
   const items=await loadGeneratorItems();
   const roll=async formula=>(await new Roll(formula).evaluate()).total;
   const entries=await mergeCustomEntries(items,'loot');
   const themed=markFactionItems(entries,await factionEquipment(selection.faction));
   const result=await generateLoot(themed,selection,roll);
   this.results=result.results;
   const factionName=selection.faction?game.packs.get('ashdom.bestiary')?.folders.get(selection.faction)?.name:'';
   this.summary=`${selection.location}${factionName?' / '+factionName:''} • Up to ${selection.rarity} • ${selection.amount}: ${result.count} loot entries`;
  }catch(error){ui.notifications.warn(error.message);}
  finally{this.busy=false;await this.render({force:true});}
 }
}
