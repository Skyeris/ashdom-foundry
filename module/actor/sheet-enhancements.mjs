import {advancementDiff} from './advancement-history.mjs';
export {advancementDiff} from './advancement-history.mjs';
const finite=v=>Number.isFinite(Number(v))?Number(v):0;
export function tradeProfile(item={}){
 const data=item.document?.system??item.equipmentData??item;
 const condition=item.condition??data.condition??'Pristine';
 const schematic=Boolean(item.schematic??data.schematic)||[item.category,item.subcategory,data.category,data.subcategory].some(v=>/^schematics?$/i.test(String(v??'').trim()));
 return {condition,schematic};
}
export function tradeRate(mode,percent=0,profile={}){
 if(!['buy','sell'].includes(mode)||!Number.isFinite(Number(percent))||Number(percent)<0)throw Error('Enter a non-negative percentage adjustment.');
 const broken=String(profile.condition??'Pristine').toLowerCase()==='broken';
 const base=mode==='sell'?(broken?10:50):(profile.schematic?25:broken?50:100);
 const maximum=mode==='sell'?(broken?100:200):base;
 const requested=base+(mode==='sell'?1:-1)*Number(percent),rate=Math.max(10,Math.min(maximum,requested));
 return {base,rate,minimum:10,maximum,limited:rate!==requested,condition:broken?'Broken':'Pristine',schematic:Boolean(profile.schematic)};
}
export function tradePrice(value,quantity,mode,percent=0,profile={}){
 if(!Number.isFinite(Number(value))||Number(value)<0||!Number.isSafeInteger(quantity)||quantity<1)throw Error('Enter a valid base value and positive whole quantity.');
 return Math.round(Number(value)*quantity*tradeRate(mode,percent,profile).rate)/100;
}
export function containerState(weight,limit){const maximum=limit===''||limit==null?null:Math.max(0,finite(limit));return {maximum,overloaded:maximum!==null&&weight>maximum};}
export const CONFIG_FIELDS=['skill','s','t','b','diceDamage','flatDamage','damageType','ac','dt','ccSuccessModifier','ccFailureModifier','range','burstLimit','ignoreTargetHitChance','setupAP','ammoType','reloadAP','note'];
export function weaponConfiguration(weapon){return Object.fromEntries(CONFIG_FIELDS.filter(k=>Object.hasOwn(weapon,k)).map(k=>[k,structuredClone(weapon[k])]));}
export function applyConfiguration(weapon,config){if(config.ammoType!==undefined&&config.ammoType!==weapon.ammoType&&finite(weapon.capacityCurrent)>0)throw Error('Unload this weapon before switching ammunition types.');return {...weapon,...weaponConfiguration(config)};}
export function resourceAlerts(s,settings={}){
 const result=[],hp=s.health??{},threshold=Number(settings.hp??25);
 if(settings.enabled===false)return result;
 if(threshold>0&&finite(hp.hpMax)>0&&finite(hp.hpCurrent)/finite(hp.hpMax)*100<=threshold)result.push('Low HP');
 if(settings.ammo!==false)for(const w of s.weapons??[])if(finite(w.capacityMax)>0&&finite(w.capacityCurrent)<=Number(settings.ammoThreshold??2))result.push(`${w.name||'Weapon'}: low ammunition`);
 if(settings.charges!==false)for(const c of s.chargeTrackers??[])if(finite(c.max)>0&&finite(c.current)<=0)result.push(`${c.name||'Tracker'}: no charges`);
 if(settings.weight!==false&&finite(s.carryWeight?.current)>finite(s.carryWeight?.max))result.push('Carry weight exceeded');return result;
}
export function activeConditions(system){const health=system.health??{};const labels={knockDown:'Knocked Down',immobilized:'Immobilized',bleed:'Bleed',burn:'Burn',chill:'Chill',dazed:'Dazed',drunk:'Drunk',pulsed:'Pulsed',stunned:'Stunned',terrored:'Terrored',crippled:'Crippled',crippledHead:'Crippled Head',crippledTorso:'Crippled Torso',crippledArm:'Crippled Arm',crippledLeg:'Crippled Leg',crippledGroin:'Crippled Groin',fatigue:'Fatigue'};return Object.entries(labels).filter(([k])=>Boolean(health[k])).map(([k,label])=>`${label}${typeof health[k]==='number'?` (${health[k]})`:''}`);}
export const STATUS_REMINDERS={
 "bleed": "True Damage at turn start; all Skills -5. No duration; higher Bleed replaces lower. End with Stabilize or instant healing.",
 "burn": "True Damage at turn start; ST and WP -5. No duration; extinguish flames or Stabilize. Ignition items explode after Burn damage; check fire and equipment consequences.",
 "crippled": "Every action costs +1 AP once. Medicine removes it. A start-of-turn Free Action can ignore it for combat, up to TR uses per R&R; unavailable while Fatigued.",
 "dazed": "All Skills -10; cannot Run. End-of-turn ST -5 removes it on success; cannot attempt while Stunned.",
 "knockDown": "Total AC halved; no Movement Actions, Overwatch, or Attacks of Opportunity. Get Up ends it. Overwatch, Defend, and Dodge end and cannot resume until next turn.",
 "pulsed": "Powered Energy Ammo items shut down; Reset can remove it. Robots and items without required Energy Ammo are unaffected. 60 consecutive seconds breaks items. Cybernetics give Fatigue +1 during Pulse. Vehicle HP counts as 0 without exploding; remains 0 after 60 seconds.",
 "stunned": "Total AC halved (0 if also Knocked Down); no actions, AP perks, talking, movement, or stance benefits/penalties. Forced checks fail except escape Stun and Reaper Checks. End-of-turn ST -5 removes it on success.",
 "terrored": "All Skills -5; every action costs +1 AP once. End-of-turn WP -5 removes it on success; cannot attempt while Stunned."
};
export function statusReminderText(system){
 const health=system.health??{},conditions=activeConditions(system);
 if(!conditions.length)return '';
 const rules=Object.entries(STATUS_REMINDERS).filter(([key])=>key==='crippled'?Object.keys(health).some(k=>k.startsWith('crippled')&&Boolean(health[k])):Boolean(health[key])).map(([key,text])=>`${key==='knockDown'?'Knock Down':key[0].toUpperCase()+key.slice(1)}: ${text}`);
 rules.push('Apply any relevant Group exceptions.');
 return `${conditions.join(', ')}. ${rules.join(' ')} Effects do not stack; use the longest duration. Effects received on your turn activate immediately, but that turn does not count toward duration and no removal roll is allowed that turn. Apply condition rules manually.`;
}
export function remindStatuses(actor){if(actor.getFlag('ashdom','enhancementSettings')?.reminders===false)return;const text=statusReminderText(actor.system);if(text)ui.notifications.info(`${actor.name} — ${text}`);}
export function registerEnhancementHooks(){
 Hooks.on('preUpdateActor',(actor,changes,options)=>{if(!['character','npc'].includes(actor.type)||options.ashdomAdvancementNote)return;
 const before=actor.toObject(),after=foundry.utils.mergeObject(structuredClone(before),foundry.utils.expandObject(changes),{inplace:true});const lines=advancementDiff(before.system,after.system);if(!lines.length){const history=actor.getFlag('ashdom','advancementHistory')??[];if(history.length>50)changes['flags.ashdom.advancementHistory']=history.slice(-50);return;}
 changes['flags.ashdom.advancementHistory']=[...(actor.getFlag('ashdom','advancementHistory')??[]),{time:Date.now(),user:game.user.name,lines}].slice(-50);
 });
 Hooks.on('updateCombat',(combat,changes)=>{if(!combat.started||!['turn','round'].some(k=>Object.hasOwn(changes,k)))return;const actor=combat.combatant?.actor;if(actor?.isOwner)remindStatuses(actor);});
}
