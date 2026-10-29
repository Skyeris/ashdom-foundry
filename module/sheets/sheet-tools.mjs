import {actorSkill} from '../actor/custom-skills.mjs';
import {groupPerkRows} from './perk-groups.mjs';
import {resourceAction} from "../actor/resources.mjs";
import {isConsumable} from '../actor/resources.mjs';
export const RARITIES=['Common','Uncommon','Rare','Radical','Atomic','Legendary'];
const normal=value=>String(value??'').trim().toLowerCase();
export function matchesInventory(row,search,type,rarity){return (!search||normal([row.name,row.category,row.subcategory,row.note,row.container].join(' ')).includes(normal(search)))&&(!rarity||normal(row.rarity)===normal(rarity))&&(!type||(type==='ammo'&&row.ammo)||(type==='consumable'&&row.consumable)||(type==='equipped'&&row.equipped));}
export function inventoryMetadata(row,system){
 const match=entry=>(row.sourceUuid&&entry.sourceUuid===row.sourceUuid)||normal(row.name)===normal(entry.name);
 return {...row,ammo:row.documentType==='ammunition'||['Bullets','Shells','Heavy','Energy','Special'].includes(row.category||row.type),consumable:isConsumable(row),equipped:(system.weapons??[]).some(w=>w.equipped&&match(w))||(system.armors??[]).some(a=>a.equipped&&(match(a)||[a.helmetName,a.underArmorName].some(n=>n&&normal(n)===normal(row.name))))};
}
const pinIcon='<i class="fas fa-thumbtack" aria-hidden="true"></i>';
function storeKey(sheet){return `ashdom.pins.${game.world.id}.${game.user.id}.${sheet.actor.uuid}`;}
export function pinnedActionsEnabled(sheet) {
 if (sheet._pinnedActionsEnabled !== undefined) return sheet._pinnedActionsEnabled;
 try { return localStorage.getItem(`${storeKey(sheet)}.enabled`) === 'true'; } catch (_) { return false; }
}
export function setPinnedActionsEnabled(sheet, enabled) {
 sheet._pinnedActionsEnabled = Boolean(enabled);
 try { localStorage.setItem(`${storeKey(sheet)}.enabled`, String(Boolean(enabled))); } catch (_) {}
}
export function pinIdentity(kind,row,index,rows){const id=row.sourceUuid||row.name||'';return `${kind}:${id}:${rows.slice(0,index).filter(r=>(r.sourceUuid||r.name||'')===id).length}`;}
function button(label){const b=document.createElement('button');b.type='button';b.className='ashdom-display-button';b.textContent=label;return b;}
export function activateSheetTools(sheet){
 const root=sheet.element.querySelector('.ashdom-sheet');if(!root)return;
 groupPerkRows(sheet,root);
 for(const toggle of root.querySelectorAll('[data-perk-radius-toggle]')){
  const row=toggle.closest('[data-reorder-entry]'),details=row.querySelector('.ashdom-perk-radius-details');
  const key=`ashdom.section.${game.world.id}.${game.user.id}.${sheet.actor.uuid}.perk-radius-${row.dataset.index}`;
  let open=false;try{open=localStorage.getItem(key)==='true';}catch{}
  const display=()=>{details.hidden=!open;toggle.textContent=open?'▲':'▼';toggle.setAttribute('aria-expanded',String(open));toggle.title=open?'Collapse perk details':'Expand perk details';};display();
  toggle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open=!open;display();try{localStorage.setItem(key,String(open));}catch{}});
 }
 for(const toggle of root.querySelectorAll('[data-charge-formula-toggle]')){
  const row=toggle.closest('[data-reorder-entry]'),details=row.querySelector('.ashdom-charge-formula-details');
  const name=row.querySelector('input[type="text"]')?.value??'';
  const key=`ashdom.charge-formula.${game.world.id}.${game.user.id}.${sheet.actor.uuid}.${row.dataset.index}.${name}`;
  const display=open=>{details.hidden=!open;toggle.textContent=open?'▾':'▸';toggle.setAttribute('aria-expanded',String(open));};
  let open=false;try{open=localStorage.getItem(key)==='true';}catch{}display(open);
  toggle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open=!open;display(open);try{localStorage.setItem(key,String(open));}catch{}});
 }
 for(const toggle of root.querySelectorAll('[data-effect-timer-toggle]')){
  const row=toggle.closest('[data-reorder-entry]'),details=row.querySelector('.ashdom-effect-timer');
  const name=row.querySelector('.ashdom-effect-name input')?.value??'';
  const key=`ashdom.effect-timer.${game.world.id}.${game.user.id}.${sheet.actor.uuid}.${row.dataset.index}.${name}`;
  const display=open=>{details.hidden=!open;toggle.textContent=open?'▾':'▸';toggle.setAttribute('aria-expanded',String(open));};
  let open=false;try{open=localStorage.getItem(key)==='true';}catch{}display(open);
  toggle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open=!open;display(open);try{localStorage.setItem(key,String(open));}catch{}});
 }
 const drInput=root.querySelector('[data-equipped-dr]');
 drInput?.addEventListener('change',async event=>{
  event.stopPropagation();if(!sheet.isEditable)return;
  const value=Number(drInput.value);if(!Number.isFinite(value)||value<0)return;
  await resourceAction(sheet.actor,async()=>{const armors=structuredClone(sheet.actor.toObject().system.armors??[]),index=armors.findIndex(a=>a.equipped);if(index<0)return;armors[index].drDamage=value;await sheet.actor.update({'system.armors':armors});});
 });
 for(const section of root.querySelectorAll('[data-sheet-section]')){
  const key=`ashdom.section.${game.world.id}.${game.user.id}.${sheet.actor.uuid}.${section.dataset.sheetSection}`;
  try{const saved=localStorage.getItem(key);if(saved!==null)section.open=saved==='true';}catch{}
  section.addEventListener('toggle',()=>{try{localStorage.setItem(key,String(section.open));}catch{}});
 }
 activateFilters(sheet,root);
 const setting = root.querySelector('[data-pinned-actions-enabled]');
 if (setting) {
  setting.checked = pinnedActionsEnabled(sheet);
  setting.addEventListener('change', event => {
   event.stopPropagation();
   setPinnedActionsEnabled(sheet, setting.checked);
   sheet.render({force:true});
  });
 }
 if (!pinnedActionsEnabled(sheet)) return;
 let pins=[];try{pins=JSON.parse(localStorage.getItem(storeKey(sheet))||'[]');if(!Array.isArray(pins))pins=[];}catch(_){}
 const panel=document.createElement('section');panel.className='ashdom-pinned-actions';panel.setAttribute('aria-label','Pinned actions');
 const title=document.createElement('strong');title.textContent='PINNED ACTIONS';panel.append(title);
 const list=document.createElement('div');list.className='ashdom-pin-list';panel.append(list);
 root.querySelector('.ashdom-character-header')?.after(panel);
 const sourceButtons=[];
 function save(){try{localStorage.setItem(storeKey(sheet),JSON.stringify(pins));}catch(_){}draw();}
 function toggle(pin){const existing=pins.findIndex(p=>p.key===pin.key);if(existing<0)pins.push(pin);else pins.splice(existing,1);save();}
 const candidates=[...root.querySelectorAll('[data-action="rollSkill"]')].map(b=>({host:b,pin:{kind:'skill',key:`skill:${b.dataset.skill}`,skill:b.dataset.skill,label:b.dataset.skillLabel}}));
 for(const kind of ['weapons','perks'])for(const input of root.querySelectorAll(`input[name^="system.${kind}."][name$=".name"]`)){
  const index=Number(input.name.split('.')[2]),rows=Array.from(sheet.actor.system[kind]??[]),row=rows[index];if(!row?.name)continue;
  candidates.push({host:input,pin:{kind,key:pinIdentity(kind,row,index,rows),label:row.name}});
 }
 for(const host of root.querySelectorAll('[data-action="displayWeapon"]')){
  const rows=Array.from(sheet.actor.system.weapons??[]),index=Number(host.dataset.index),row=rows[index];
  if(row?.name)candidates.push({host,pin:{kind:'weaponNotes',key:pinIdentity('weaponNotes',row,index,rows),label:row.name+' Notes'}});
 }
 for(const {host,pin}of candidates){
  const wrap=document.createElement('span');wrap.className='ashdom-pinnable'+(pin.kind==='weaponNotes'?' ashdom-notes-pinnable':'');host.before(wrap);wrap.append(host);
  const b=button('');b.innerHTML=pinIcon;b.classList.add('ashdom-pin-button');wrap.append(b);b.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggle(pin);});sourceButtons.push({b,pin});
 }
 function draw(){
  list.replaceChildren();
  for(const {b,pin}of sourceButtons){const active=pins.some(p=>p.key===pin.key);b.classList.toggle('is-pinned',active);b.setAttribute('aria-pressed',String(active));b.title=`${active?'Unpin':'Pin'} ${pin.label}`;b.setAttribute('aria-label',b.title);}
  for(const pin of pins){
   const chip=document.createElement('span');chip.className='ashdom-pin-chip';let index=-1;
   if(pin.kind!=='skill'){const rows=Array.from(sheet.actor.system[pin.kind==='weaponNotes'?'weapons':pin.kind]??[]);index=rows.findIndex((r,i)=>pinIdentity(pin.kind,r,i,rows)===pin.key);}
   const available=pin.kind==='skill'?!!actorSkill(sheet.actor.system,pin.skill):index>=0;
   const label=available&&pin.kind!=='skill'?sheet.actor.system[pin.kind==='weaponNotes'?'weapons':pin.kind][index].name+(pin.kind==='weaponNotes'?' Notes':''):pin.label;
   const action=button(label);action.disabled=!available;action.title=!available?'This entry is no longer available':pin.kind==='weapons'?'Choose Single, Targeted or Burst attack':pin.kind==='skill'?'Roll skill':pin.kind==='weaponNotes'?'Display weapon notes in chat':'Display perk in chat';
   action.dataset.action=pin.kind==='skill'?'rollSkill':pin.kind==='weapons'?'rollPinnedWeapon':pin.kind==='weaponNotes'?'displayWeaponNotes':'displayPerk';
   if(pin.kind==='skill'){action.dataset.skill=pin.skill;action.dataset.skillLabel=pin.label;}else action.dataset.index=String(index);
   const remove=button('');remove.innerHTML=pinIcon;remove.classList.add('ashdom-pin-button','is-pinned');remove.title=`Unpin ${pin.label}`;remove.setAttribute('aria-label',remove.title);remove.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle(pin);});chip.append(action,remove);list.append(chip);
  }
  if(!pins.length){const hint=document.createElement('span');hint.className='ashdom-pin-hint';hint.textContent='Use the pin beside a skill, weapon or perk to add it here.';list.append(hint);}
 }
 draw();
}
function activateFilters(sheet,root){
 const panel=root.querySelector('[data-inventory-drop-zone]');if(!panel)return;
 const controls=document.createElement('div');controls.className='ashdom-inventory-filters';
 const search=document.createElement('input');search.type='search';search.placeholder='Search inventory';search.setAttribute('aria-label','Search inventory');
 function select(label,options){const el=document.createElement('select');el.setAttribute('aria-label',label);for(const [value,text]of options){const option=document.createElement('option');option.value=value;option.textContent=text;el.append(option);}return el;}
 const type=select('Inventory type',[['','All items'],['ammo','Ammunition'],['consumable','Consumables'],['equipped','Equipped']]);const rarity=select('Inventory rarity',[['','All rarities'],...RARITIES.map(r=>[r,r])]);
 const clear=button('CLEAR');controls.append(search,type,rarity,clear);panel.querySelector('h2').after(controls);
 const status=document.createElement('p');status.className='ashdom-filter-status';status.setAttribute('role','status');controls.after(status);
 const saved=sheet._inventoryFilter??{};search.value=saved.search||'';type.value=saved.type||'';rarity.value=saved.rarity||'';
 const entries=Array.from(panel.querySelectorAll('.ashdom-item-entry'));
 const metadata=Array.from(sheet.actor.system.inventoryItems??[]).map(row=>inventoryMetadata(row,sheet.actor.system));
 function apply(){sheet._inventoryFilter={search:search.value,type:type.value,rarity:rarity.value};let count=0;for(const entry of entries){const row=metadata[Number(entry.dataset.index)];const show=!!row&&matchesInventory(row,search.value,type.value,rarity.value);entry.hidden=!show;if(show)count++;}status.textContent=count===0?'No matching items.':`${count} of ${entries.length} items`;}
 for(const control of [search,type,rarity])for(const eventName of ['input','change'])control.addEventListener(eventName,e=>{e.stopPropagation();apply();});
 clear.addEventListener('click',e=>{e.preventDefault();search.value='';type.value='';rarity.value='';apply();});apply();
 // Older inventory rows can resolve rarity from their source without changing the item.
 Promise.all(metadata.map(async row=>{if(!row.rarity&&row.sourceUuid){try{row.rarity=(await fromUuid(row.sourceUuid))?.system?.rarity||'';}catch(_){}}})).then(()=>{if(controls.isConnected)apply();});
}
