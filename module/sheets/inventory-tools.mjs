import {activateCrew} from './crew-controls.mjs';
import {activateValidation} from './validation-controls.mjs';
import {splitControl} from './split-controls.mjs';
import {activateJournalHelp} from './journal-help.mjs';
import {activateCrafting} from './crafting-controls.mjs';
import {resourceUndoStack} from '../actor/resource-history.mjs';
import {enhancementControls} from "./enhancement-controls.mjs";
import {containerTotals,inventoryPath,transferInventory,transferContainer} from '../actor/inventory-transfer.mjs';
export function activateInventoryTools(sheet){
 const root=sheet.element.querySelector('.ashdom-sheet');if(!root)return;
 const vehicle=sheet.actor.type==='vehicle',rows=sheet.actor.toObject().system;
 const inventory=vehicle?rows.vehicles?.[0]?.cargo??[]:rows.inventoryItems??[];
 const entries=[...root.querySelectorAll(vehicle?'.ashdom-cargo-entry':'.ashdom-item-entry')];
 const groups=new Map();
 for(const [fallback,entry]of entries.entries()){
  const index=vehicle?Number(entry.querySelector('[data-cargo-index]')?.dataset.cargoIndex??fallback):Number(entry.dataset.index),row=inventory[index];if(!row)continue;
  const tools=document.createElement('div');tools.className='ashdom-container-tools';
  const label=document.createElement('label');label.textContent='CONTAINER';const input=document.createElement('input');input.type='text';input.name=`${inventoryPath(sheet.actor)}.${index}.container`;input.value=row.container||'';input.placeholder='Unassigned';input.setAttribute('aria-label',`Container for ${row.name}`);input.disabled=!sheet.isEditable;label.append(input);
  const transfer=document.createElement('button');transfer.type='button';transfer.className='ashdom-display-button';transfer.textContent='TRANSFER';transfer.disabled=!sheet.isEditable;transfer.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();await transferPrompt(sheet,index);});tools.append(label,transfer,splitControl(sheet,index,row));
  const details=entry.querySelector(vehicle?'.ashdom-cargo-details':'.ashdom-item-details');
  if(details)details.append(tools);
  const name=String(row.container||'').trim()||'Unassigned';
  if(!groups.has(name)){const group=document.createElement('details');group.className='ashdom-inventory-container';group.open=true;const summary=document.createElement('summary');group.append(summary);entry.before(group);groups.set(name,group);}
  groups.get(name).append(entry);
 }
 for(const [name,weight]of containerTotals(inventory)){const group=groups.get(name);if(group)group.querySelector('summary').textContent=`${name} — ${Number(weight.toFixed(2))} lbs`;}
 const variant=[...root.querySelectorAll('.ashdom-settings-panel')].find(p=>p.querySelector('h2')?.textContent.trim()==='VARIANT RULES');
 if(variant){const right=document.createElement('div');right.className='ashdom-settings-right';variant.before(right);right.append(variant);}
 renderHistory(sheet,root);
 enhancementControls(sheet,root,groups,containerTotals(inventory));
 // Move the existing panels, retaining listeners and the saved collapse keys.
 const settingsPanel=title=>[...root.querySelectorAll('section.ashdom-settings-panel')].find(p=>p.querySelector('h2')?.textContent.trim()===title);
 const supplements=settingsPanel('SUPPLEMENTS'),alerts=settingsPanel('ALERTS & REMINDERS');
 if(variant&&supplements){variant.before(supplements);if(alerts)supplements.before(alerts);}
 const radiation=settingsPanel('RADIATION'),pins=settingsPanel('PINNED ACTIONS');
 if(radiation&&pins)pins.after(radiation);
 const advancement=settingsPanel('ADVANCEMENT HISTORY'),resources=settingsPanel('RESOURCE HISTORY');
 if(advancement&&resources)resources.before(advancement);

 addContainerTransfers(sheet,groups,inventory);
 activateCrafting(sheet,root);
 activateCrew(sheet,root);
 activateValidation(sheet,root);
 for(const panel of root.querySelectorAll('section.ashdom-settings-panel')){
  const heading=panel.querySelector('h2');if(!heading)continue;
  const details=document.createElement('details');details.className=panel.className;details.open=true;
  const summary=document.createElement('summary');summary.className='ashdom-section-heading';summary.append(heading);details.append(summary);
  while(panel.firstChild)details.append(panel.firstChild);
  panel.replaceWith(details);
  const key=`ashdom.settings-panel.${game.world.id}.${game.user.id}.${sheet.actor.uuid}.${heading.textContent.trim()}`;
  try{const saved=localStorage.getItem(key);if(saved!==null)details.open=saved==='true';}catch{}
  details.addEventListener('toggle',()=>{try{localStorage.setItem(key,String(details.open));}catch{}});
 }
 activateJournalHelp(root,sheet.actor.type);
}
async function transferPrompt(sheet,index){
 const targets=Array.from(game.actors).filter(actor=>actor.isOwner&&actor.uuid!==sheet.actor.uuid&&['character','npc','vehicle'].includes(actor.type)).sort((a,b)=>a.name.localeCompare(b.name));
 if(!targets.length)return ui.notifications.warn('No other editable actors are available.');
 const data=sheet.actor.toObject(),row=sheet.actor.type==='vehicle'?data.system.vehicles?.[0]?.cargo[index]:data.system.inventoryItems?.[index];if(!row)return;
 const content=document.createElement('div');content.className='ashdom-transfer-form';
 const label=document.createElement('label');label.textContent='DESTINATION';const select=document.createElement('select');select.name='destination';for(const actor of targets){const option=document.createElement('option');option.value=actor.uuid;option.textContent=actor.name;select.append(option);}label.append(select);
 const qtyLabel=document.createElement('label');qtyLabel.textContent='QUANTITY';const qty=document.createElement('input');qty.name='quantity';qty.type='number';qty.min='1';qty.max=String(row.quantity);qty.step='1';qty.value='1';qtyLabel.append(qty);content.append(label,qtyLabel);
 const result=await foundry.applications.api.DialogV2.wait({classes:['ashdom','ashdom-roll-modifier-window'],window:{title:`Transfer ${row.name}`},position:{width:400},content:content.outerHTML,buttons:[{action:'transfer',label:'Transfer',callback:(_event,button)=>({uuid:button.form.elements.destination.value,quantity:Number(button.form.elements.quantity.value)})},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false,modal:true});
 if(!result||typeof result!=='object')return;
 try{const target=targets.find(a=>a.uuid===result.uuid);if(!target)throw Error('Destination no longer available.');await transferInventory(sheet.actor,target,index,result.quantity,row);ui.notifications.info(`Transferred ${result.quantity} × ${row.name} to ${target.name}.`);}catch(error){ui.notifications.warn(error.message);}
}
function renderHistory(sheet,root){
 let parent=root.querySelector('.ashdom-settings-right')??root.querySelector('.ashdom-settings-left, .ashdom-npc-settings-left');
 if(!parent&&sheet.actor.type==='vehicle'){parent=document.createElement('details');parent.className='ashdom-vehicle-settings';const summary=document.createElement('summary');summary.textContent='SETTINGS';parent.append(summary);root.append(parent);}
 if(!parent)return;
 const panel=document.createElement('section');panel.className='ashdom-panel ashdom-settings-panel ashdom-resource-history';const heading=document.createElement('h2');heading.textContent='RESOURCE HISTORY';panel.append(heading);
 const actions=document.createElement('div');actions.className='ashdom-resource-history-actions';panel.append(actions);
 const undo=document.createElement('button');undo.type='button';undo.className='ashdom-display-button ashdom-resource-undo';undo.dataset.action='undoResource';undo.textContent='Undo Change';undo.disabled=!sheet.isEditable||!resourceUndoStack(sheet.actor).length;actions.append(undo);
 const redo=document.createElement('button');redo.type='button';redo.className='ashdom-display-button ashdom-resource-undo';redo.dataset.action='redoResource';redo.textContent='Redo Change';redo.disabled=!sheet.isEditable||!(sheet.actor.getFlag('ashdom','resourceRedoStack')??[]).length;actions.append(redo);
 const explanation=document.createElement('p');explanation.className='ashdom-settings-help';explanation.textContent='Undo up to five recent resource changes, one at a time. Redo reapplies undone changes. A new resource change clears Redo. Rolls and transfers cannot be undone; changes to item rows clear both buttons’ saved changes.';panel.append(explanation);

 const help=document.createElement('p');help.className='ashdom-settings-help';help.textContent='The latest 50 resource adjustments, undo and redo actions, and item transfers.';panel.append(help);
 const entries=sheet.actor.getFlag('ashdom','resourceHistory')??[];const list=document.createElement('ol');
 for(const entry of entries){const item=document.createElement('li');const title=document.createElement('strong');title.textContent=`${new Date(entry.time).toLocaleString()} — ${entry.user}: ${entry.action}`;item.append(title);for(const line of entry.lines){const text=document.createElement('div');text.textContent=line;item.append(text);}list.append(item);}
 if(!entries.length){const empty=document.createElement('p');empty.textContent='No resource changes recorded yet.';list.append(empty);}panel.append(list);parent.append(panel);
}
function addContainerTransfers(sheet,groups,inventory){for(const [name,group]of groups){if(name==='Unassigned')continue;const button=document.createElement('button');button.type='button';button.className='ashdom-display-button ashdom-container-transfer';button.textContent='Transfer Container';button.disabled=!sheet.isEditable;button.addEventListener('click',async event=>{event.preventDefault();event.stopPropagation();try{const targets=[...game.actors].filter(a=>a.isOwner&&a.uuid!==sheet.actor.uuid&&['character','npc','vehicle'].includes(a.type));if(!targets.length)throw Error('No other editable actors are available.');const div=document.createElement('div'),label=document.createElement('p'),select=document.createElement('select');label.textContent=`Transfer all of ${name}, including one matching bag item if present. Equipped items must be unequipped first.`;select.name='destination';for(const a of targets)select.append(new Option(a.name,a.uuid));div.append(label,select);const uuid=await foundry.applications.api.DialogV2.wait({classes:['ashdom','ashdom-roll-modifier-window'],window:{title:'Transfer Container'},content:div.outerHTML,buttons:[{action:'transfer',label:'Transfer All',callback:(_e,b)=>b.form.elements.destination.value},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false,modal:true});if(!uuid)return;const target=targets.find(a=>a.uuid===uuid);await transferContainer(sheet.actor,target,name,inventory);ui.notifications.info(`Transferred ${name} to ${target.name}.`);}catch(error){ui.notifications.warn(error.message);}});group.querySelector('summary').append(button);}}
