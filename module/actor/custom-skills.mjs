import {evaluateChargeFormula} from './perk-charges.mjs';
import {ASHDOM_SKILLS} from '../config.mjs';
export const CUSTOM_CATEGORIES={close:'Close',ranged:'Ranged',crafting:'Crafting',knowledge:'Knowledge',physical:'Physical',social:'Social',utility:'Utility'};
export function customDefinitions(){try{return game.settings.get('ashdom','customSkills')??[];}catch{return [];}}
export function actorSkill(system,key){return key?.startsWith('custom_')?system.customSkills?.[key]:system.skills?.[key];}
export function skillChoices(selected=[]){const choices={...ASHDOM_SKILLS};for(const d of customDefinitions())choices[d.id]=d.name+(d.enabled===false?' (disabled)':'');for(const key of selected)if(key&&!choices[key])choices[key]=`${key} (unavailable)`;return Object.fromEntries(Object.entries(choices).sort((a,b)=>a[1].localeCompare(b[1])));}
export function skillBase(d,primary){return d.mode==='formula'?evaluateChargeFormula(d.formula,primary):Number(d.base??5);}
export function validateDefinition(d,definitions=[]){if(!d.name?.trim())throw Error('Enter a skill name.');if(!CUSTOM_CATEGORIES[d.category])throw Error('Choose a category.');if([...Object.values(ASHDOM_SKILLS),...definitions.filter(x=>x.id!==d.id).map(x=>x.name)].some(n=>n.toLowerCase()===d.name.trim().toLowerCase()))throw Error('That skill name is already used.');if(d.mode==='formula')skillBase(d,Object.fromEntries(['frt','obs','ref','mgt','und','lck','apl'].map(k=>[k,{total:5}])));else if(!Number.isFinite(Number(d.base))||Number(d.base)<0)throw Error('Base must be zero or greater.');return d;}
export function prepareCustomSkills(system,options={},definitions=customDefinitions()){
 system.customSkills??={};
 for(const d of definitions){const row=system.customSkills[d.id]??={modifier:0,temp:0,tagged:false,note:d.note??'',sp:0};row.formulaError='';let base=0;try{base=skillBase(d,system.primary);}catch(e){row.formulaError=e.message;}
 const combat=['close','ranged'].includes(d.category);const penalty=(options.allSkillPenalty??0)+(combat?(options.combatSkillPenalty??0):(options.supportSkillPenalty??0))+(d.category==='physical'?(options.physicalSkillPenalty??0):0);const scale=options.d100Active?5:1;
 row.total=Math.min(options.d100Active?200:40,Math.max(1,base*scale+(Number(row.modifier)||0)+(Number(row.temp)||0)+(row.tagged?5:0)-penalty*scale));
 }
}
export function registerCustomSkills(){
 const refresh=()=>{const actors=new Set([...(game.actors??[]),...(globalThis.canvas?.tokens?.placeables??[]).map(t=>t.actor)]);for(const actor of actors){if(!actor)continue;actor.prepareData();actor.sheet?.render(false);}for(const item of game.items??[])if(item.sheet?.rendered)item.sheet.render(false);};
 game.settings.register('ashdom','customSkills',{name:'Custom Skills',scope:'world',config:false,type:Array,default:[],onChange:refresh});Hooks.once('ready',refresh);
}
