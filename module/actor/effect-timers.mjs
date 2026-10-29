export function advanceEffects(effects,unit,amount) {
 const result=structuredClone(effects);let changed=false;
 for(const effect of result) {
  if(!effect.active||effect.unit!==unit||!(effect.remaining>0)||!(amount>0))continue;
  effect.remaining=Math.max(0,Math.round((effect.remaining-amount)*1000000)/1000000);
  effect.expired=effect.remaining===0;changed=true;
 }
 return changed?result:null;
}
let queue=Promise.resolve();
function enqueue(task){queue=queue.then(task).catch(error=>console.error('ASHDOM effect timer',error));}
function authoritative(){return game.users.activeGM?.id===game.user.id;}
async function tick(actors,unit,amount){
 for(const actor of actors) {
  const effects=advanceEffects(actor.toObject().system.effects??[],unit,amount);
  if(effects){const previous=actor.toObject().system.effects??[];const expired=effects.filter((e,i)=>e.expired&&!previous[i]?.expired).map(e=>e.name||'Temporary effect');await actor.update({'system.effects':effects},{ashdomTimer:true,ashdomExpired:expired});}
 }
}
export function registerEffectTimers(){
 Hooks.on('preUpdateActor',(actor,changes,options)=>{
  if(options.ashdomTimer)return;
  const effects=changes['system.effects']??changes.system?.effects;
  if(Array.isArray(effects))for(const effect of effects)if(effect.remaining>0||effect.unit==='none')effect.expired=false;
 });
 Hooks.on('updateActor',(actor,changes,options)=>{
  if(!options.ashdomTimer||!actor.isOwner)return;
  for(const name of options.ashdomExpired??[])ui.notifications.warn(`${actor.name}: ${name} has expired. Review the effect on the sheet.`);
 });
 Hooks.on('updateWorldTime',(_time,delta)=>{
  if(!authoritative()||delta<=0)return;
  enqueue(()=>{const actors=new Map(game.actors.map(a=>[a.uuid,a]));for(const token of canvas.tokens?.placeables??[])if(token.actor)actors.set(token.actor.uuid,token.actor);return tick(actors.values(),'minutes',delta/60);});
 });
 Hooks.on('preUpdateCombat',(combat,changes,options)=>{if(changes.round!==undefined)options.ashdomRounds=combat.round>0?Math.max(0,Number(changes.round)-Number(combat.round)):0;});
 Hooks.on('updateCombat',(combat,_changes,options)=>{
  if(!authoritative()||!options.ashdomRounds)return;
  enqueue(()=>tick(new Map(combat.combatants.filter(c=>c.actor).map(c=>[c.actor.uuid,c.actor])).values(),'rounds',options.ashdomRounds));
 });
}
