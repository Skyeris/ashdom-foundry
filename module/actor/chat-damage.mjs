import {npcGroup} from './npc-groups.mjs';
import {tokenResources} from './token-resources.mjs';
import {resourceAction} from './resources.mjs';
const types={normal:'n',laser:'l',fire:'f',plasma:'p',explosive:'e',explosion:'e',poison:null,true:null,'true damage':null};
export function damagePreview(actor,attack){
 const type=String(attack.type??'').trim().toLowerCase();
 if(!Object.hasOwn(types,type))throw Error('This attack needs a supported damage type before it can be applied.');
 const damage=Number(attack.amount),reduction=Math.abs(Number(attack.dt)||0);
 if(!Number.isFinite(damage)||damage<0||!Number.isFinite(reduction))throw Error('Invalid damage amount.');
 const s=actor.system,armor=actor.type==='npc'?s.armors?.[0]:(s.armors??[]).find(a=>a.equipped);
 const key=types[type],bypass=key===null;
 const ratings=actor.type==='vehicle'?s.vehicles?.[0]?.ratings:armor?.ratings;
 const baseDT=bypass?0:Math.max(0,Number(ratings?.[key]?.total)||0),dt=Math.max(0,baseDT-reduction);
 const hitCount=Number(attack.appliedHits??1);
 if(!Number.isSafeInteger(hitCount)||hitCount<1||hitCount>Math.max(1,Number(attack.hits)||1))throw Error('Choose a valid number of hits.');
 const perHit=Math.max(0,damage-dt),remaining=perHit*hitCount,[hp,dr]=tokenResources(actor);
 const drLoss=bypass?0:Math.min(dr.value,remaining),hpLoss=Math.min(hp.value,remaining-drLoss);
 return {hitCount,perHit,damage,baseDT,reduction,dt,remaining,drLoss,hpLoss,hpBefore:hp.value,drBefore:dr.value,hpAfter:hp.value-hpLoss,drAfter:dr.value-drLoss,bypass};
}
export async function applyChatDamage(actor,attack,key,expected){
 if(!game.user.isGM&&!actor.isOwner)throw Error('You cannot apply damage to this actor. Ask the GM to apply it.');
 return resourceAction(actor,async()=>{
  const used=actor.getFlag('ashdom','appliedDamage')??[];
  const keys=Array.isArray(key)?key:[key];
  if(keys.some(k=>used.includes(k)))throw Error('This hit has already been applied to this actor.');
  const result=damagePreview(actor,attack);
  if(keys.length!==result.hitCount||new Set(keys).size!==keys.length)throw Error('Invalid hit selection.');
  if(expected&&JSON.stringify(result)!==JSON.stringify(expected))throw Error('The target changed. Click Apply Damage again to review the new totals.');
  const source=actor.toObject().system,update={};
  if(actor.type==='vehicle'){
   const vehicles=structuredClone(source.vehicles??[]);if(!vehicles[0])throw Error('Vehicle details are missing.');vehicles[0].hpCurrent=result.hpAfter;update['system.vehicles']=vehicles;
  }else{
   const group=actor.type==='npc'&&npcGroup(actor.system).active;
   update[group?'system.groupResources.hpCurrent':'system.health.hpCurrent']=result.hpAfter;
   if(result.drLoss>0){
    if(group)update['system.groupResources.drCurrent']=result.drAfter;
    else{const armors=structuredClone(source.armors??[]),index=actor.type==='npc'?0:armors.findIndex(a=>a.equipped);if(index>=0){armors[index].drDamage=result.drAfter;update['system.armors']=armors;}}
   }
  }
  update['flags.ashdom.appliedDamage']=[...used,...keys].slice(-200);
  await actor.update(update,{ashdomDamageKey:key});return result;
 });
}

export function withMiscDamage(attack,value){
 const misc=String(value??'').trim()===''?0:Number(value);
 if(!Number.isFinite(misc)||misc<0)throw Error('Misc. must be a non-negative damage amount.');
 return {...attack,amount:Number(attack.amount)+misc};
}
