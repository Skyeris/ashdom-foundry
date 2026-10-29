import {sheetIssues} from '../actor/sheet-validation.mjs';
import {customDefinitions} from '../actor/custom-skills.mjs';
import {ASHDOM_SKILLS} from '../config.mjs';
import {button} from './utility-dialog.mjs';
const titles=section=>section==='CHARGES'?['PERK CHARGES','PERK & TRAIT CHARGES']:[section];
function findSection(root,section){return [...root.querySelectorAll('h2')].find(h=>titles(section).includes(h.textContent.trim()));}
async function jump(sheet,section,index){
 let root=sheet.element.querySelector('.ashdom-sheet'),heading=findSection(root,section);if(!heading)return;
 const tab=heading.closest('[data-tab-content]');if(tab?.hidden||tab?.classList.contains('hidden')||tab&&getComputedStyle(tab).display==='none'){
  root.querySelector(`[data-action="changeTab"][data-tab="${tab.dataset.tabContent}"]`)?.click();
  root=sheet.element.querySelector('.ashdom-sheet');heading=findSection(root,section);if(!heading)return;
 }
 for(let el=heading.parentElement;el&&el!==root;el=el.parentElement)if(el.tagName==='DETAILS')el.open=true;
 heading.scrollIntoView({behavior:'smooth',block:'center'});heading.classList.add('ashdom-validation-focus');setTimeout(()=>heading.classList.remove('ashdom-validation-focus'),1800);
 if(index!==null&&section==='WEAPONS'){
  const row=root.querySelector(`.ashdom-weapon-entry[data-index="${index}"]`);if(row)row.scrollIntoView({behavior:'smooth',block:'center'});
 }
}
export function activateValidation(sheet,root){
 const host=root.querySelector('.ashdom-settings-right, .ashdom-vehicle-settings');if(!host)return;
 const panel=document.createElement('section');panel.className='ashdom-panel ashdom-settings-panel ashdom-validation-panel';
 const heading=document.createElement('h2');heading.textContent='SHEET VALIDATION';panel.append(heading);
 const desc=document.createElement('p');desc.className='ashdom-settings-help';desc.textContent='Review missing skills, invalid charge formulas, incomplete recipes, and crew assignments. Warnings do not change your values.';panel.append(desc);
 const actor=sheet.actor.toObject();actor.type=sheet.actor.type;actor.system=sheet.actor.system;
 const skills={...ASHDOM_SKILLS,...Object.fromEntries(customDefinitions().map(d=>[d.id,d.name]))};
 const issues=sheetIssues(actor,{skills,actors:[...game.actors]});
 if(!issues.length){const p=document.createElement('p');p.textContent='No issues found in these checks.';panel.append(p);}
 for(const issue of issues){const row=document.createElement('div');row.className='ashdom-validation-row';const p=document.createElement('span');p.textContent=issue.message;row.append(p,button('View',()=>jump(sheet,issue.section,issue.index)));panel.append(row);}
 host.append(panel);
}
