import {npcGroup} from './actor/npc-groups.mjs';
export const TOKEN_FEET={small:2.5,medium:5,large:10,huge:15,gargantuan:20};
export function tokenSize(system,type,gridFeet=5){
 const group=type==='npc'?npcGroup(system):{active:false};
 const size=String(group.active?group.size:system.details?.size??'').trim().toLowerCase();
 const feet=TOKEN_FEET[size];if(!feet)return null;
 const units=feet/(Number(gridFeet)>0?Number(gridFeet):5);return {width:units,height:units};
}
function sceneFeet(scene){const units=String(scene?.grid?.units??'ft').toLowerCase();return ['ft','feet','foot'].includes(units)?scene?.grid?.distance||5:5;}
export function registerTokenSizing(){
 Hooks.on('preCreateActor',(actor)=>{const size=tokenSize(actor.system,actor.type);if(size)actor.updateSource({'prototypeToken.width':size.width,'prototypeToken.height':size.height});});
 Hooks.on('preCreateToken',(token)=>{if(!token.actor)return;const size=tokenSize(token.actor.system,token.actor.type,sceneFeet(token.parent));if(size)token.updateSource(size);});
 Hooks.on('preUpdateActor',(actor,changes,options)=>{
  const current=actor.toObject(),next=foundry.utils.mergeObject(structuredClone(current),foundry.utils.expandObject(changes),{inplace:true});
  const size=tokenSize(next.system,actor.type),old=tokenSize(current.system,actor.type);
  if(size&&JSON.stringify(size)!==JSON.stringify(old)){
   changes['prototypeToken.width']=size.width;changes['prototypeToken.height']=size.height;options.ashdomResizeTokens=true;
  }
 });
 Hooks.on('updateActor',async(actor,_changes,options,userId)=>{
  if(!options.ashdomResizeTokens||userId!==game.user.id)return;
  for(const scene of game.scenes){
   const size=tokenSize(actor.system,actor.type,sceneFeet(scene));if(!size)continue;
   const updates=scene.tokens.filter(t=>t.actor?.uuid===actor.uuid).map(t=>({_id:t.id,...size}));
   if(updates.length)try{await scene.updateEmbeddedDocuments('Token',updates);}catch(error){console.warn('ASHDOM token resize',error);}
  }
 });
}
