import {npcDefconLabel} from "./npc-defcon.mjs";
export const NPC_BREAK_BONUSES={"5 <":2,"5 -":3,"5 >":4,"4 <":6,"4 -":7,"4 >":8,"3":12,"2":16,"1":17};
import {npcGroup} from "./npc-groups.mjs";
import {resourceAction} from './resources.mjs';
export function restChanges(actor,kind){
 const s=actor.system,raw=actor.toObject().system;
 const group=actor.type==='npc'?npcGroup(s):{active:false};
 const hpMax=group.active?group.hpMax:Number(s.health.hpMax),hpCurrent=group.active?group.hpCurrent:Number(s.health.hpCurrent);
 const hpPath=group.active?'system.groupResources.hpCurrent':'system.health.hpCurrent';
 const bonus=actor.type==='npc'?(NPC_BREAK_BONUSES[npcDefconLabel(group.active?group.tier:s.details.level,s.details.defconQualifier)]??0):Math.ceil(Number(s.details.level)/2);
 const changes={[hpPath]:kind==='rest'?hpMax:Math.min(hpMax,hpCurrent+Math.max(0,Number(s.primary.frt.total)+bonus))};
 if(kind==='rest'){
  const index=actor.type==='npc'?((s.armors??[]).length?0:-1):(s.armors??[]).findIndex(a=>a.equipped);
  if(index>=0){const maximum=Math.max(0,Number(s.armors[index].ratings.dr.total)||0);
   if(group.active)changes['system.groupResources.drCurrent']=maximum;
   else {const armors=structuredClone(raw.armors);armors[index].drDamage=maximum;changes['system.armors']=armors;}
  }
 }
 const resetKey=kind==='rest'?'resetRest':'resetBreak';
 changes['system.chargeTrackers']=(raw.chargeTrackers??[]).map((t,i)=>t[resetKey]?{...t,current:Math.max(0,Number(s.chargeTrackers[i]?.max)||0)}:{...t});
 return changes;
}
export async function recover(actor,kind){
 if(!actor.isOwner||!['character','npc'].includes(actor.type))return;
 return resourceAction(actor,()=>actor.update(restChanges(actor,kind)));
}
