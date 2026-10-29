import {npcGroup} from '../actor/npc-groups.mjs';
import {CREW_ROLES,validateCrew,crewSummary} from '../actor/vehicle-crew.mjs';
import {resourceAction} from '../actor/resources.mjs';
import {button,utilityDialog,esc} from './utility-dialog.mjs';
const crew=actor=>structuredClone(actor.getFlag('ashdom','vehicleCrew')??[]);
async function editCrew(sheet,index=null){
 const original=crew(sheet.actor),row=index===null?null:original[index];
 const actors=[...game.actors].filter(a=>a.isOwner&&['character','npc'].includes(a.type)).sort((a,b)=>a.name.localeCompare(b.name));
 if(!actors.length)throw Error('No editable Character or NPC actors are available.');
 const selected=await utilityDialog(row?'Edit Crew Assignment':'Assign Vehicle Crew',`<label>Actor<select name="actor">${actors.map(a=>`<option value="${esc(a.uuid)}" ${a.uuid===row?.uuid?'selected':''}>${esc(a.name)}</option>`).join('')}</select></label><label>Role<select name="role">${Object.entries(CREW_ROLES).map(([key,name])=>`<option value="${key}" ${(row?.role??'passenger')===key?'selected':''}>${name}</option>`).join('')}</select></label><label>Seats used<input name="seats" type="number" min="1" step="1" value="${row?.seats??1}"></label><p>Enter the seating required for this actor’s size. For Groups, set the total seating cost manually; Groups cannot drive. Excess seating produces a warning but is allowed.</p>`,[{action:'save',label:'Save Assignment',callback:(_e,b)=>({uuid:b.form.elements.actor.value,role:b.form.elements.role.value,seats:Number(b.form.elements.seats.value)})}],{render:(_event,app)=>{
 const form=app.element.querySelector('form')??app.element,select=form.querySelector('[name=actor]'),input=form.querySelector('[name=seats]');
 const setDefault=()=>{const chosen=actors.find(a=>a.uuid===select.value);input.value=chosen?.type==='npc'&&npcGroup(chosen.system).active?'':'1';input.placeholder='Enter seats for this Group';input.required=true;};
 if(!row)setDefault();select.addEventListener('change',setDefault);
 }});
 if(!selected||typeof selected!=='object')return;
 await resourceAction(sheet.actor,async()=>{
  if(!sheet.isEditable||JSON.stringify(crew(sheet.actor))!==JSON.stringify(original))throw Error('Crew changed; reopen the assignment.');
  const target=game.actors.find(a=>a.uuid===selected.uuid);if(!target?.isOwner)throw Error('The chosen actor is no longer editable.');
  const next=structuredClone(original);if(index===null)next.push(selected);else next[index]=selected;
  validateCrew(next,[...game.actors]);await sheet.actor.setFlag('ashdom','vehicleCrew',next);
 });
}
export function activateCrew(sheet,root){
 if(sheet.actor.type!=='vehicle')return;
 const host=root.querySelector('.ashdom-fleet-panel');if(!host)return;
 const panel=document.createElement('details');panel.className='ashdom-panel ashdom-crew-panel';panel.open=true;
 const head=document.createElement('summary');head.className='ashdom-section-heading';const title=document.createElement('h2');title.textContent='VEHICLE CREW';head.append(title);panel.append(head);
 const rows=crew(sheet.actor),state=crewSummary(rows,sheet.actor.system.vehicles?.[0]?.seating,[...game.actors]);
 const note=document.createElement('p');note.className='ashdom-settings-help';note.textContent=`Seating: ${state.used} / ${state.capacity}. Assign a driver, gunners, and passengers; seats used can be adjusted for size.`;panel.append(note);
 for(const issue of state.issues){const p=document.createElement('p');p.className='ashdom-resource-alert';p.textContent=issue;panel.append(p);}
 rows.forEach((row,index)=>{
  const entry=document.createElement('div');entry.className='ashdom-crew-row';
  const actor=game.actors.find(a=>a.uuid===row.uuid),readable=actor?.testUserPermission(game.user,'OBSERVER');
  const name=button(readable?actor.name:'Unavailable actor',()=>{if(actor?.testUserPermission(game.user,'OBSERVER'))actor.sheet.render(true);});name.disabled=!readable;entry.append(name);
  const description=document.createElement('span');description.textContent=`${CREW_ROLES[row.role]??row.role} · ${row.seats} seat(s)`;entry.append(description);
  const edit=button('Edit',()=>editCrew(sheet,index));edit.disabled=!sheet.isEditable;entry.append(edit);
  const remove=button('×',()=>resourceAction(sheet.actor,async()=>{if(!sheet.isEditable||JSON.stringify(crew(sheet.actor))!==JSON.stringify(rows))throw Error('Crew changed; reopen the sheet.');await sheet.actor.setFlag('ashdom','vehicleCrew',rows.filter((_r,i)=>i!==index));}));remove.title='Remove crew assignment';remove.disabled=!sheet.isEditable;entry.append(remove);panel.append(entry);
 });
 const add=button('Assign Crew',()=>editCrew(sheet));add.disabled=!sheet.isEditable;panel.append(add);host.append(panel);
 const key=`ashdom.crew.${game.world.id}.${game.user.id}.${sheet.actor.uuid}`;
 try{panel.open=localStorage.getItem(key)!=='false';}catch{}
 panel.addEventListener('toggle',()=>{try{localStorage.setItem(key,String(panel.open));}catch{}});
}
export function registerCrewRefresh(){
 const refresh=actor=>{for(const vehicle of game.actors??[]){if(vehicle.type==='vehicle'&&vehicle.sheet?.rendered&&(vehicle.getFlag('ashdom','vehicleCrew')??[]).some(r=>r.uuid===actor.uuid))vehicle.sheet.render(false);}};
 Hooks.on('updateActor',refresh);Hooks.on('deleteActor',refresh);
}
