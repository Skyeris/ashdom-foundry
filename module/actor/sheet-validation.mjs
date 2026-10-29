import {evaluateChargeFormula} from './perk-charges.mjs';
import {crewSummary} from './vehicle-crew.mjs';
export function sheetIssues(actor,{skills={},actors=[]}={}){
 const s=actor.system??{},issues=[],add=(section,message,index=null)=>issues.push({section,message,index});
 for(const [i,w]of (s.weapons??[]).entries()){
  if(!w.name?.trim())continue;
  if(!w.skill||!Object.hasOwn(skills,w.skill))add('WEAPONS',`${w.name}: choose an available weapon skill.`,i);
  if(Number(w.capacityMax)>0&&!String(w.ammoType??'').trim())add('WEAPONS',`${w.name}: ammunition type is missing.`,i);
  if(Number(w.capacityCurrent)>Number(w.capacityMax)||Number(w.capacityCurrent)<0)add('WEAPONS',`${w.name}: loaded ammunition is outside its capacity.`,i);
 }
 for(const [i,t]of (s.chargeTrackers??[]).entries())if(t.formula){try{evaluateChargeFormula(t.formula,s.primary??{});}catch{add('CHARGES',`${t.name||'Charge tracker'}: the formula cannot be calculated.`,i);}}
 for(const r of actor.flags?.ashdom?.crafting?.recipes??[]){
  const missing=[];if(!(Number(r.hours)>0))missing.push('work hours');if(!r.skills?.length)missing.push('skill checks');else if(r.skills.some(k=>!Object.hasOwn(skills,k)))missing.push('unavailable skills');
  if(!r.materials?.length)missing.push('materials (none entered)');
  if((r.materials??[]).some(m=>m.amount==null||!Number.isFinite(Number(m.amount))||Number(m.amount)<=0))missing.push('material quantities');
  if(missing.length)add('CRAFTING',`${r.name||'Recipe'}: review ${missing.join(', ')}.`);
 }
 if(actor.type==='vehicle')for(const text of crewSummary(actor.flags?.ashdom?.vehicleCrew??[],s.vehicles?.[0]?.seating,actors).issues)add('VEHICLE CREW',text);
 return issues;
}
