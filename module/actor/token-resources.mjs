import {npcGroup} from './npc-groups.mjs';
import {resourceAction} from './resources.mjs';
const n=value=>Math.max(0,Number(value)||0);
export function tokenResources(actor){
 const s=actor.system,vehicle=actor.type==='vehicle'?s.vehicles?.[0]:null,group=actor.type==='npc'?npcGroup(s):{active:false};
 const armor=actor.type==='npc'?s.armors?.[0]:(s.armors??[]).find(a=>a.equipped);
 const maxAP=n(vehicle?vehicle.ratings?.ap?.total:s.secondary?.ap?.total);
 const saved=actor.getFlag?.('ashdom','apCurrent');
 return [
  {key:'HP',color:0x22bb44,value:n(vehicle?vehicle.hpCurrent:group.active?group.hpCurrent:s.health?.hpCurrent),max:n(vehicle?vehicle.hpMax:group.active?group.hpMax:s.health?.hpMax)},
  {key:'DR',color:0x999999,value:n(group.active?group.drCurrent:armor?.drDamage),max:n(armor?.ratings?.dr?.total)},
  {key:'AP',color:0x268bff,value:saved===undefined||saved===null?maxAP:Math.min(n(saved),maxAP),max:maxAP}
 ];
}
export async function adjustAP(actor,change){
 if(!game.user.isGM&&!actor.isOwner)throw Error('You cannot edit this actor.');
 return resourceAction(actor,async()=>{const ap=tokenResources(actor)[2];const value=change==='reset'?ap.max:Math.min(ap.max,Math.max(0,ap.value+change));await actor.update({'flags.ashdom.apCurrent':value});return value;});
}

export async function adjustHP(actor,amount,healing=false){
 if(!game.user.isGM&&!actor.isOwner)throw Error('You cannot edit this actor.');
 if(!Number.isFinite(amount)||amount<0)throw Error('Enter a non-negative damage or healing amount.');
 return resourceAction(actor,async()=>{
  const hp=tokenResources(actor)[0],value=Math.min(hp.max,Math.max(0,hp.value+(healing?amount:-amount)));
  if(actor.type==='vehicle'){
   const vehicles=structuredClone(actor.toObject().system.vehicles??[]);
   if(!vehicles[0])throw Error('This vehicle has no HP entry.');
   vehicles[0].hpCurrent=value;await actor.update({'system.vehicles':vehicles});
  }else{
   const path=actor.type==='npc'&&npcGroup(actor.system).active?'system.groupResources.hpCurrent':'system.health.hpCurrent';
   await actor.update({[path]:value});
  }
  return value;
 });
}

export async function adjustDR(actor,amount,healing=false){
 if(!game.user.isGM&&!actor.isOwner)throw Error('You cannot edit this actor.');
 if(!Number.isFinite(amount)||amount<0)throw Error('Enter a non-negative DR amount.');
 return resourceAction(actor,async()=>{
  const dr=tokenResources(actor)[1];if(!dr.max)throw Error('This actor has no DR pool.');
  const value=Math.min(dr.max,Math.max(0,dr.value+(healing?amount:-amount)));
  if(actor.type==='npc'&&npcGroup(actor.system).active)await actor.update({'system.groupResources.drCurrent':value});
  else{const armors=structuredClone(actor.toObject().system.armors??[]),index=actor.type==='npc'?0:armors.findIndex(a=>a.equipped);if(index<0)throw Error('Equip armor to adjust DR.');armors[index].drDamage=value;await actor.update({'system.armors':armors});}
  return value;
 });
}
