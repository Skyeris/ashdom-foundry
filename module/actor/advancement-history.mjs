import {ASHDOM_SKILLS} from '../config.mjs';
const title=value=>String(value??'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
const display=v=>v===true?'Yes':v===false?'No':v==null||v===''?'Not set':String(v);
export function advancementDiff(before={},after={}){
 const lines=[];
 const compare=(label,a,b)=>{if(a!==b)lines.push(`${label}: ${display(a)} → ${display(b)}`);};
 compare('Level',before.details?.level,after.details?.level);
 for(const key of new Set([...Object.keys(before.primary??{}),...Object.keys(after.primary??{})]))compare(`${key.toUpperCase()} — Base`,before.primary?.[key]?.base,after.primary?.[key]?.base);
 for(const key of new Set([...Object.keys(before.skills??{}),...Object.keys(after.skills??{})])){
  compare(`${ASHDOM_SKILLS[key]??title(key)} — Skill Points`,before.skills?.[key]?.sp??0,after.skills?.[key]?.sp??0);
  compare(`${ASHDOM_SKILLS[key]??title(key)} — Tagged`,Boolean(before.skills?.[key]?.tagged),Boolean(after.skills?.[key]?.tagged));
 }
 const a=before.hpProgression??{},b=after.hpProgression??{};
 compare('HP per Level (previous setting)',a.perLevel,b.perLevel);
 for(const key of new Set([...Object.keys(a.levels??{}),...Object.keys(b.levels??{})])){
  const old=a.levels?.[key]??{},next=b.levels?.[key]??{},level=key.replace(/^l/,'');
  for(const [field,label] of Object.entries({levelUpHP:'Level-up HP',modifier:'Modifier',perkName:'Perk Name',bonus:'Perk HP Bonus',applies:'Perk Bonus Enabled'})){
   const fallback=field==='applies'?false:field==='perkName'?'':0;
   compare(`HP at Level ${level} — ${label}`,old[field]??fallback,next[field]??fallback);
  }
 }
 const remaining=[...(after.perks??[])];
 for(const perk of before.perks??[]){
  const index=remaining.findIndex(p=>p.name===perk.name);
  if(index<0){if(perk.name)lines.push(`Removed perk: ${perk.name}`);continue;}
  const next=remaining.splice(index,1)[0];
  compare(`${perk.name||'Unnamed perk'} — Rank`,perk.rank,next.rank);
  compare(`${perk.name||'Unnamed perk'} — Category`,perk.type,next.type);
 }
 for(const perk of remaining)if(perk.name)lines.push(`Added perk: ${perk.name}${perk.rank!=null&&perk.rank!==''?` (Rank ${perk.rank})`:''}`);
 return lines;
}
// Render older stored entries readably without altering their original record.
export function readableAdvancementLines(lines=[]){return lines.flatMap(line=>{
 const match=String(line).match(/^(.*?): (.*?) → (.*)$/s);if(!match)return [String(line)];
 const [,label,left,right]=match;
 if(label==='HP progression'||label==='Perks'){
  try{const field=label==='Perks'?'perks':'hpProgression',a=JSON.parse(left),b=JSON.parse(right);return advancementDiff({[field]:a||undefined},{[field]:b||undefined});}catch{return [`${label} updated (older record).`];}
 }
 const skill=label.match(/^(\w+) (sp|tagged)$/);
 if(skill){const decode=v=>{try{return display(JSON.parse(v));}catch{return v;}};return [`${ASHDOM_SKILLS[skill[1]]??title(skill[1])} — ${skill[2]==='sp'?'Skill Points':'Tagged'}: ${decode(left)} → ${decode(right)}`];}
 return [String(line)];
});}
