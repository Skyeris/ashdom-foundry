import {factionEquipment,markFactionItems} from './loot-factions.mjs';
import {loadGeneratorItems} from './generator-items.mjs';
import {AshdomLootGenerator} from './loot-generator.mjs';
import {AshdomCustomEntries,mergeCustomEntries} from './generator-custom.mjs';
import {SHOPS,generateShop,shoppingChecks} from './shop-rules.mjs';
export class AshdomShopGenerator extends AshdomLootGenerator {
 static DEFAULT_OPTIONS={id:'ashdom-shop-generator',window:{title:'ASHDOM Shop Generator',icon:'fa-solid fa-store'},actions:{generate:this.generate,custom:this.custom,share:this.share}};
 static PARTS={loot:{template:'systems/ashdom/templates/apps/shop-generator.html'}};
 checks=[];
 selection={rarity:'Common',amount:'Low',location:'General Store',faction:''};
 async _prepareContext(options){return {...await super._prepareContext(options),checks:this.checks,locations:Object.fromEntries(Object.keys(SHOPS).map(x=>[x,x]))};}
 static custom(){if(game.user?.isGM)new AshdomCustomEntries('shop').render({force:true});}
 static async share(){
  if(!game.user?.isGM||this.busy||this.sharing||!this.results.length)return;
  this.sharing=true;
  try{
   const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const stock=this.results.map(r=>`<li>${escape(r.name)} &mdash; ${escape(r.rarity)} &times; ${r.quantity}</li>`).join('');
   const checks=this.checks.length?`<details><summary>Shopping Check Required (${this.checks.length})</summary><p>Chance or Mercantile. Available only on a successful check.</p><ul>${this.checks.map(r=>`<li>${escape(r.name)} &mdash; ${escape(r.rarity)}: ${r.penalty}</li>`).join('')}</ul></details>`:'';
   await ChatMessage.create({speaker:ChatMessage.getSpeaker(),whisper:[],blind:false,content:`<section class="ashdom-loot-chat"><h3>ASHDOM Shop Stock</h3><p>${escape(this.summary)}</p><h4>Available Stock</h4><ul>${stock}</ul>${checks}</section>`});
  }catch(error){ui.notifications.warn(error.message);}
  finally{this.sharing=false;}
 }
 static async generate(){
  if(!game.user?.isGM||this.busy)return;
  this.busy=true;const button=this.element.querySelector('[data-action="generate"]');if(button)button.disabled=true;
  try{
   const selection={...this.selection};
   const items=await loadGeneratorItems();
   const entries=markFactionItems(await mergeCustomEntries(items,'shop'),await factionEquipment(selection.faction));
   const result=await generateShop(entries,selection,async f=>(await new Roll(f).evaluate()).total);
   this.checks=shoppingChecks(entries,selection,Math.random,result.count);
   this.results=result.results;
   const factionName=selection.faction?game.packs.get('ashdom.bestiary')?.folders.get(selection.faction)?.name:'';
   this.summary=`${selection.location}${factionName?' / '+factionName:''} - Up to ${selection.rarity} - ${selection.amount}: ${result.results.length} stocked items`;
  }catch(error){ui.notifications.warn(error.message);}
  finally{this.busy=false;if(button)button.disabled=false;if(this.rendered)await this.render({force:true});}
 }
}
