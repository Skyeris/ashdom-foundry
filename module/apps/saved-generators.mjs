import {divideLoot} from './divide-loot.mjs';
import {editMerchant} from './merchant-settings.mjs';
import {schematicDocument} from '../actor/schematics.mjs';
import {namePrompt} from '../sheets/enhancement-controls.mjs';
export function requireActiveGM(){if(!game.user.isGM)throw Error('Only a GM can change saved generator results.');if(game.users.activeGM&&game.users.activeGM.id!==game.user.id)throw Error('Use the active GM account to edit saved results or approve trades.');}
let queue=Promise.resolve();
export function libraryAction(fn){const next=queue.catch(()=>{}).then(()=>{requireActiveGM();return fn();});queue=next.catch(()=>{});return next;}
export const library=()=>structuredClone(game.settings.get('ashdom','savedGenerators')??[]);
export async function writeLibrary(rows){await game.settings.set('ashdom','savedGenerators',rows);}
export function generatorKind(app){return {'ashdom-loot-generator':'loot','ashdom-shop-generator':'shop','ashdom-encounter-generator':'encounter'}[app.options?.id];}
export async function saveGenerator(app,kind,name,copy=false,resetStock=false){return libraryAction(async()=>{
 const records=library(),old=!copy&&records.find(r=>r.id===app.savedGeneratorId),id=old?.id??foundry.utils.randomID();
 const snapshot={selection:structuredClone(app.selection),results:structuredClone(app.results??[]),result:structuredClone(app.result??null),checks:structuredClone(app.checks??[]),summary:app.summary??''};
 if(kind==='encounter'?!snapshot.result:!snapshot.results.length)throw Error('Generate results before saving.');
 const stock=[];if(kind==='shop')for(const row of snapshot.results){const doc=await fromUuid(row.uuid);if(!doc)throw Error(`Cannot load ${row.name}.`);stock.push({...row,id:row.uuid+(row.schematic?'#schematic':''),document:row.schematic?schematicDocument(doc):doc.toObject(),value:Number(doc.system.value)||0});}
 const record={id,name,kind,snapshot,stock,merchant:structuredClone(old?.merchant??records.find(r=>r.id===app.savedGeneratorId)?.merchant??{}),initialStock:kind==='shop'?structuredClone(resetStock?stock:(old?.initialStock??stock)):undefined,revision:(old?.revision??0)+1,published:old?.published??false,updated:Date.now()};
 await writeLibrary([...records.filter(r=>r.id!==id),record]);app.savedGeneratorId=id;return record;
 });}
export function registerSavedGenerators(){
 Hooks.once('init',()=>game.settings.register('ashdom','savedGenerators',{scope:'world',config:false,type:Object,default:[]}));
 Hooks.on('renderApplicationV2',(app)=>{
 const kind=generatorKind(app);if(!kind||!game.user.isGM)return;const shell=app.element?.querySelector('.ashdom-loot-shell');if(!shell||shell.querySelector('.ashdom-saved-controls'))return;
 const bar=document.createElement('div');bar.className='ashdom-saved-controls';const select=document.createElement('select');select.setAttribute('aria-label','Saved results');select.append(new Option('Saved results…',''));for(const record of library().filter(r=>r.kind===kind))select.append(new Option(record.name,record.id));select.value=app.savedGeneratorId??'';bar.append(select);
 const add=(name,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){ui.notifications.warn(e.message);}finally{b.disabled=false;}});bar.append(b);};
 const selected=()=>{const record=library().find(r=>r.id===select.value);if(!record)throw Error('Choose a saved result first.');return record;};
 add('Open',async()=>{const r=selected();app.savedGeneratorId=r.id;app.selection=structuredClone(r.snapshot.selection);app.results=structuredClone(r.snapshot.results);if(kind==='shop')app.results=r.stock.map(({document,value,id,...row})=>row);app.result=structuredClone(r.snapshot.result);app.checks=structuredClone(r.snapshot.checks);app.summary=r.snapshot.summary;await app.render({force:true});});
 add('Save',async()=>{const old=library().find(r=>r.id===app.savedGeneratorId);const name=old?.name??await namePrompt('Name saved results');if(typeof name!=='string'||!name)return;await saveGenerator(app,kind,name);await app.render({force:true});});
 add('Save Copy',async()=>{const name=await namePrompt('Name copied results');if(typeof name==='string'&&name){await saveGenerator(app,kind,name,true);await app.render({force:true});}});
 add('Rename',async()=>{const r=selected(),name=await namePrompt('Rename saved results');if(typeof name!=='string'||!name)return;await libraryAction(async()=>{const rows=library(),record=rows.find(x=>x.id===r.id);if(!record)throw Error('Entry was removed.');record.name=name;await writeLibrary(rows);});await app.render({force:true});});
 add('Delete',async()=>{const r=selected();const yes=await foundry.applications.api.DialogV2.confirm({window:{title:'Delete saved results'},content:'<p>Delete this saved result? Pending trades for this shop will no longer be valid.</p>'});if(!yes)return;await libraryAction(()=>writeLibrary(library().filter(x=>x.id!==r.id)));if(app.savedGeneratorId===r.id)app.savedGeneratorId='';await app.render({force:true});});
 if(kind==='loot')add('Divide Loot',async()=>{await divideLoot(app);});
 if(kind==='shop'){
 add('Merchant Settings',async()=>{await editMerchant(selected().id);await app.render({force:true});});
 add('Restore Stock',async()=>{const r=selected();await restoreShopStock(r.id);const updated=library().find(x=>x.id===r.id);app.savedGeneratorId=r.id;app.selection=structuredClone(updated.snapshot.selection);app.results=updated.stock.map(({document,value,id,...row})=>row);app.checks=structuredClone(updated.snapshot.checks??[]);app.summary=updated.snapshot.summary;await app.render({force:true});});
 add('Regenerate Stock',async()=>{const r=selected();app.savedGeneratorId=r.id;app.selection=structuredClone(r.snapshot.selection);const before=app.results;await app.constructor.generate.call(app);if(app.results===before)return;await saveGenerator(app,kind,r.name,false,true);await app.render({force:true});});
 add('Open Trading',async()=>{const r=selected();await game.ashdom.openShopTrade(r.id);});
 add('Share Trading Link',async()=>{const r=selected();await libraryAction(async()=>{const rows=library(),record=rows.find(x=>x.id===r.id);record.published=true;await writeLibrary(rows);});const content=document.createElement('section');content.className='ashdom-themed-chat-card';const h=document.createElement('h3');h.textContent=r.name;content.append(h);const p=document.createElement('p');p.textContent='Open this shop to prepare a bulk purchase or sale for GM approval.';content.append(p);await ChatMessage.create({content:content.outerHTML,flags:{ashdom:{shopLink:r.id}}});});
 }
 shell.prepend(bar);
 });
}

export async function restoreShopStock(id){return libraryAction(async()=>{
 const rows=library(),shop=rows.find(r=>r.id===id&&r.kind==='shop');if(!shop)throw Error('Shop not found.');
 let baseline=shop.initialStock;
 if(!baseline){baseline=[];for(const row of shop.snapshot.results??[]){const existing=shop.stock.find(s=>s.uuid===row.uuid&&Boolean(s.schematic)===Boolean(row.schematic));const doc=existing?null:await fromUuid(row.uuid);if(!existing&&!doc)throw Error(`Cannot restore ${row.name}.`);baseline.push({...structuredClone(existing??{}),...structuredClone(row),id:row.uuid+(row.schematic?'#schematic':''),document:existing?.document??(row.schematic?schematicDocument(doc):doc.toObject()),value:existing?.value??(Number(doc.system.value)||0)});}}
 shop.initialStock=structuredClone(baseline);shop.stock=structuredClone(baseline);shop.revision=(shop.revision??0)+1;shop.updated=Date.now();await writeLibrary(rows);return shop;
});}
