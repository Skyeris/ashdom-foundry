import {JOURNAL_HELP} from './journal-help-map.mjs';
const TOPICS = {
 combat: ['Weapons & Combat', 'Attacks & Ammunition', 'Applying Damage'],
 inventory: ['Inventory & Crafting', 'Inventory & Items'],
 perks: ['Perks & Abilities'],
 resources: ['Resource & Effects', 'Resources & Effects', 'Resources, Charges, & Effects', 'Resource, Chargers, & Effects'],
 settings: ['Sheet Tools & Settings', 'Settings & Advancement'],
 npc: ['NPCs & Groups'],
 vehicle: ['Vehicles & Cargo', 'Vehicle & Cargo']
};
const normalize = value => String(value ?? '').toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]/g,'');
export function helpTopic(title) {
 const name=normalize(title);
 if (/^(weapons|armor|automaticap|rollattackbeforedamage)$/.test(name)) return 'combat';
 if (/^(inventory|currency|carryweight|crafting|cybernetics.*)$/.test(name)) return 'inventory';
 if (/^perk/.test(name)) return 'perks';
 if (/^(effectstracker|resourcehistory|alertsandreminders|statuseffects.*)$/.test(name)) return 'resources';
 if (/^group/.test(name)) return 'npc';
 if (/^vehicle/.test(name)) return 'vehicle';
 if (/^(hopepoints|sheetvalidation|primarystats|secondarystats|criticalchance|radiation|hpprogression|supplements|pinnedactions|variantrules|advancementhistory|customskills)$/.test(name)) return 'settings';
 return null;
}
export function registerJournalHelp() {
 game.settings.register('ashdom','journalHelpLinks',{scope:'world',config:false,type:Object,default:{}});
}
export function canReadGuide(doc) {
 return Boolean(doc?.testUserPermission?.(globalThis.game?.user,'OBSERVER'));
}
function guides(journals) {
 return Array.from(journals??[]).flatMap(entry=>[entry,...Array.from(entry.pages??[])]);
}
export function findGuide(topic,journals) {
 const names=(TOPICS[topic]??[]).map(normalize);
 const matches=guides(journals).filter(doc=>names.includes(normalize(doc.name))&&canReadGuide(doc));
 return matches.length===1?matches[0]:null;
}
function isJournal(doc) {return ['JournalEntry','JournalEntryPage'].includes(doc?.documentName);}
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function helpSection(title,actorType,settingsPanel=false) {
 const key=normalize(title);
 if(key==='carryweight'&&actorType==='npc'&&settingsPanel)return 'npccarryweight';
 if(key.startsWith('cybernetics'))return 'augmentations';
 if(key.startsWith('statuseffects'))return 'statuseffects';
 if(key.startsWith('perk')&&!key.includes('charges'))return 'perkdetails';
 return Object.hasOwn(JOURNAL_HELP,key)?key:helpTopic(title);
}
async function configure(topic,section=topic) {
 if(!game.user.isGM)return;
 const links=game.settings.get('ashdom','journalHelpLinks');
 const options=guides(game.journal).filter(canReadGuide).sort((a,b)=>a.name.localeCompare(b.name)).map(doc=>`<option value="${escapeHTML(doc.uuid)}">${escapeHTML(doc.parent?.name?`${doc.parent.name} / ${doc.name}`:doc.name)}</option>`).join('');
 const result=await foundry.applications.api.DialogV2.wait({classes:['ashdom','ashdom-roll-modifier-window'],window:{title:`Journal Help: ${JOURNAL_HELP[section]?.title??TOPICS[topic][0]}`},position:{width:480},content:`<p>Choose a guide for this topic. Players still need permission to read it. Use the bundled guide to restore the system’s default link.</p><label>Journal or page<select name="guide"><option value="">Choose a journal or page</option>${options}</select></label><label>Or paste a journal/page UUID<input name="uuid" type="text" value="${escapeHTML(links[section]??(['hopepoints','criticalchance'].includes(section)?'':links[topic])??'')}"></label>`,buttons:[{action:'save',label:'Save',callback:(_e,b)=>b.form.elements.guide.value||b.form.elements.uuid.value.trim()},{action:'clear',label:'Use Bundled Guide',callback:()=>''},{action:'cancel',label:'Cancel',callback:()=>null}],rejectClose:false,modal:true});
 if(typeof result!=='string')return;
 if(result){const doc=await fromUuid(result).catch(()=>null);if(!isJournal(doc)||!canReadGuide(doc))return ui.notifications.warn('Choose a readable journal entry or page.');}
 await game.settings.set('ashdom','journalHelpLinks',{...game.settings.get('ashdom','journalHelpLinks'),[section]:result});
 ui.notifications.info('Journal help link saved for this world.');
}
export async function openGuide(topic,section=topic) {
 try {
 const links=game.settings.get('ashdom','journalHelpLinks');
 // An explicit empty section override restores the bundled destination even if an old topic override exists.
 const uuid=Object.hasOwn(links,section)?links[section]:['hopepoints','criticalchance'].includes(section)?'':links[topic];
 const destination=JOURNAL_HELP[section]??JOURNAL_HELP[topic];
 let doc=uuid?await fromUuid(uuid):destination?await fromUuid(destination.uuid).catch(()=>null):null;
 if(!uuid&&!doc)doc=findGuide(topic,game.journal);
 const anchor=!uuid&&doc?.uuid===destination?.uuid?destination?.anchor:undefined;
 if(!doc||!isJournal(doc)||!canReadGuide(doc)){
  if(game.user.isGM)return await configure(topic,section);
  return ui.notifications.warn('This guide is not available. Ask the GM to link it and grant journal access.');
 }
 if(doc.documentName==='JournalEntryPage')await doc.parent.sheet.render(true,{pageId:doc.id,...(anchor?{anchor}:{})});
 else await doc.sheet.render(true);
 }catch(error){console.error('ASHDOM | Journal help',error);ui.notifications.warn('Unable to open this guide. Ask the GM to check the journal help link.');}
}
export function activateJournalHelp(root,actorType) {
 for(const heading of root.querySelectorAll('h2')) {
  const topic=helpTopic(heading.textContent);if(!topic)continue;
  const section=helpSection(heading.textContent,actorType,Boolean(heading.closest('.ashdom-settings-panel')));
  const host=heading.parentElement?.tagName==='SUMMARY'?heading.parentElement:heading;
  if(host.querySelector('.ashdom-journal-help'))continue;
  host.classList.add('ashdom-help-heading');
  const button=document.createElement('button');button.type='button';button.className='ashdom-display-button ashdom-journal-help';
  const label=`Help: ${JOURNAL_HELP[section]?.title??TOPICS[topic][0]}`;button.title=label+(game.user.isGM?' (right-click to choose guide)':'');button.setAttribute('aria-label',label);
  const icon=document.createElement('i');icon.className='fas fa-book-open';icon.setAttribute('aria-hidden','true');button.append(icon);
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();void openGuide(topic,section);});
  if(game.user.isGM)button.addEventListener('contextmenu',event=>{event.preventDefault();event.stopPropagation();void configure(topic,section);});
  host.append(button);
 }
}
