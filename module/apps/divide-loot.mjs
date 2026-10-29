import {evenAllocations,validateAllocations,distributeItems} from '../actor/inventory-allocation.mjs';
import {schematicDocument} from '../actor/schematics.mjs';
import {utilityDialog,esc,check} from '../sheets/utility-dialog.mjs';
import {library,libraryAction,writeLibrary,requireActiveGM} from './saved-generators.mjs';
export async function divideLoot(app) {
 requireActiveGM();if(app.busy||!app.results?.length)return;
 if(app.distributionUncertain)throw Error('A previous distribution needs manual reconciliation. Generate fresh results after checking inventories.');
 app.busy=true;
 try{
 const original=structuredClone(app.results);
 const choices=[...game.actors].filter(a=>a.isOwner&&['character','npc','vehicle'].includes(a.type)).sort((a,b)=>a.name.localeCompare(b.name));
 if(!choices.length)throw Error('No editable recipient actors are available.');
 const selected=await utilityDialog('Divide Loot — Recipients',`<p>Select who receives the loot. The next step suggests an even split that you can adjust.</p>${choices.map((a,i)=>check(`actor${i}`,`${a.name} (${a.type})`,false)).join('')}`,[{action:'next',label:'Allocate Items',callback:(_e,b)=>choices.filter((_a,i)=>b.form.elements[`actor${i}`].checked)}]);
 if(!selected)return;if(!selected.length)throw Error('Choose at least one recipient.');
 const defaults=evenAllocations(original,selected.length);
 const matrix=await utilityDialog('Divide Loot — Allocation',`<p>Adjust the suggested shares. Unassigned quantities stay in the loot results.</p><div class="ashdom-allocation-table"><table><thead><tr><th>Item / available</th>${selected.map(a=>`<th>${esc(a.name)}</th>`).join('')}</tr></thead><tbody>${original.map((r,i)=>`<tr><td>${esc(r.name)} / ${r.quantity}</td>${selected.map((_a,j)=>`<td><input aria-label="${esc(r.name)} for ${esc(selected[j].name)}" name="q${i}_${j}" type="number" min="0" max="${r.quantity}" step="1" value="${defaults[i][j]}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`,[{action:'review',label:'Review Distribution',callback:(_e,b)=>original.map((_r,i)=>selected.map((_a,j)=>Number(b.form.elements[`q${i}_${j}`].value)))}]);
 if(!matrix)return;const remaining=validateAllocations(original,matrix,selected.length);
 const preview=selected.map((a,j)=>`<h3>${esc(a.name)}</h3><ul>${original.flatMap((r,i)=>matrix[i][j]?[`<li>${esc(r.name)} × ${matrix[i][j]}</li>`]:[]).join('')||'<li>No items</li>'}</ul>`).join('');
 const yes=await utilityDialog('Confirm Loot Distribution',preview+`<p>Unassigned units: ${remaining.reduce((a,b)=>a+b,0)}</p>`,[{action:'confirm',label:'Distribute Loot',callback:()=>true}]);if(yes!==true)return;
 const documents=await Promise.all(original.map(async r=>{const doc=await fromUuid(r.uuid);if(!doc)throw Error(`Cannot load ${r.name}.`);return r.schematic?schematicDocument(doc):doc.toObject();}));
 const items=selected.map((_a,j)=>original.flatMap((r,i)=>matrix[i][j]?[{document:documents[i],quantity:matrix[i][j],uuid:r.schematic?'':r.uuid}]:[]));
 await libraryAction(async()=>{
  if(JSON.stringify(app.results)!==JSON.stringify(original))throw Error('Loot changed; reopen Divide Loot.');
  const records=library(),saved=app.savedGeneratorId?records.find(r=>r.id===app.savedGeneratorId):null;
  if(app.savedGeneratorId&&(!saved||saved.kind!=='loot'||JSON.stringify(saved.snapshot.results)!==JSON.stringify(original)))throw Error('Saved loot differs from these results. Save the current results before dividing.');
  const next=original.map((r,i)=>({...r,quantity:remaining[i]})).filter(r=>r.quantity>0);
  await distributeItems(selected,items,async()=>{if(saved){saved.snapshot.results=next;saved.revision++;saved.updated=Date.now();await writeLibrary(records);}});
  app.results=next;
 });
 ui.notifications.info('Loot distributed. Assigned quantities were removed from these results.');
 }catch(error){if(error.partialDistribution)app.distributionUncertain=true;throw error;}
 finally{app.busy=false;await app.render({force:true});}
}
