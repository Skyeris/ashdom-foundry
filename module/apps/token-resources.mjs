import {tokenResources,adjustAP,adjustHP,adjustDR} from '../actor/token-resources.mjs';
const supported=actor=>actor&&['character','npc','vehicle'].includes(actor.type);
const allowed=actor=>game.user.isGM||actor?.isOwner;
let tracker;
export function drawResourceBars(token){
 if(!supported(token.actor))return;
 if(token.bars)token.bars.visible=false;
 if(token._ashdomResourceBars){token.removeChild(token._ashdomResourceBars);token._ashdomResourceBars.destroy({children:true});token._ashdomResourceBars=null;}
 if(!allowed(token.actor))return;
 const container=new PIXI.Container();container.eventMode='none';token._ashdomResourceBars=container;token.addChild(container);
 const width=token.w,height=token.h,bh=Math.max(8,Math.min(14,width/8));
 // Stack above the token, keeping HP first and leaving a small gap.
 const resources=tokenResources(token.actor).filter(resource=>resource.key!=='DR'||resource.value!==0||resource.max!==0);
 resources.forEach((resource,index)=>{
  const y=-resources.length*(bh+2)-4+index*(bh+2),pct=resource.max>0?Math.min(1,resource.value/resource.max):0;
  const bar=new PIXI.Graphics();bar.beginFill(0x000000,0.85).drawRoundedRect(0,y,width,bh,2).endFill();
  if(pct>0)bar.beginFill(resource.color).drawRoundedRect(1,y+1,Math.max(0,(width-2)*pct),bh-2,2).endFill();
  const label=new PIXI.Text(`${resource.key} ${resource.value}/${resource.max}`,{fontFamily:'Arial',fontSize:Math.max(8,bh-2),fill:0xffffff,stroke:0x000000,strokeThickness:2});label.anchor.set(0.5);label.position.set(width/2,y+bh/2);container.addChild(bar,label);
 });
}
function showTracker(){
 const tokens=(canvas.tokens?.controlled??[]).filter(t=>supported(t.actor)&&allowed(t.actor));
 if(tokens.length!==1){if(tracker)tracker.hidden=true;return;}
 const token=tokens[0],ap=tokenResources(token.actor)[2];
 if(!tracker){
  tracker=document.createElement('section');tracker.id='ashdom-ap-tracker';tracker.setAttribute('aria-label','Selected token AP tracker');
  const title=document.createElement('strong');title.className='ashdom-ap-title';tracker.append(title);
  const value=document.createElement('span');value.className='ashdom-ap-value';value.setAttribute('aria-live','polite');tracker.append(value);
  for(const [label,change]of [['−1',-1],['+1',1],['Reset','reset']]){const button=document.createElement('button');button.type='button';button.textContent=label;button.title=change==='reset'?'Reset AP to maximum':`${label} AP`;button.addEventListener('click',async()=>{const selected=(canvas.tokens?.controlled??[]).filter(t=>supported(t.actor)&&allowed(t.actor));if(selected.length!==1)return;try{await adjustAP(selected[0].actor,change);showTracker();}catch(error){ui.notifications.warn(error.message);}});tracker.append(button);}
  const health=document.createElement('div');health.className='ashdom-hp-tools';
  const hpValue=document.createElement('strong');hpValue.className='ashdom-hp-value';hpValue.setAttribute('aria-live','polite');health.append(hpValue);
  const amount=document.createElement('input');amount.type='number';amount.min='0';amount.step='1';amount.value='1';amount.setAttribute('aria-label','Damage or healing amount');health.append(amount);
  for(const [label,healing]of [['Damage',false],['Heal',true]]){
   const button=document.createElement('button');button.type='button';button.textContent=label;button.title=healing?'Restore HP':'Apply directly to HP, without armor reductions';
   button.addEventListener('click',async()=>{
    const selected=(canvas.tokens?.controlled??[]).filter(t=>supported(t.actor)&&allowed(t.actor));if(selected.length!==1)return;
    if(amount.value.trim()==='')return ui.notifications.warn('Enter a damage or healing amount.');
    try{await adjustHP(selected[0].actor,Number(amount.value),healing);showTracker();}catch(error){ui.notifications.warn(error.message);}
   });health.append(button);
  }
  tracker.append(health);
  const defense=document.createElement('div');defense.className='ashdom-hp-tools ashdom-dr-tools';
  const drValue=document.createElement('strong');drValue.className='ashdom-dr-value';drValue.setAttribute('aria-live','polite');defense.append(drValue);
  const drAmount=document.createElement('input');drAmount.type='number';drAmount.min='0';drAmount.step='1';drAmount.value='1';drAmount.setAttribute('aria-label','DR damage or healing amount');defense.append(drAmount);
  for(const [label,healing]of [['Damage DR',false],['Heal DR',true]]){
   const button=document.createElement('button');button.type='button';button.textContent=label;
   button.addEventListener('click',async()=>{
    const selected=(canvas.tokens?.controlled??[]).filter(t=>supported(t.actor)&&allowed(t.actor));if(selected.length!==1)return;
    if(drAmount.value.trim()==='')return ui.notifications.warn('Enter a DR amount.');
    try{await adjustDR(selected[0].actor,Number(drAmount.value),healing);showTracker();}catch(error){ui.notifications.warn(error.message);}
   });defense.append(button);
  }
  tracker.append(defense);
  document.body.append(tracker);
 }
 tracker.hidden=false;tracker.querySelector('.ashdom-ap-title').textContent=token.name;tracker.querySelector('.ashdom-ap-value').textContent=`AP ${ap.value} / ${ap.max}`;
 const hp=tokenResources(token.actor)[0];tracker.querySelector('.ashdom-hp-value').textContent=`HP ${hp.value} / ${hp.max}`;
 const dr=tokenResources(token.actor)[1];tracker.querySelector('.ashdom-dr-value').textContent=`DR ${dr.value} / ${dr.max}`;
 for(const control of tracker.querySelector('.ashdom-dr-tools').querySelectorAll('button,input'))control.disabled=dr.max===0;
}
function refresh(){for(const token of canvas.tokens?.placeables??[])drawResourceBars(token);showTracker();}
export function registerTokenResources(){
 Hooks.on('drawToken',drawResourceBars);Hooks.on('refreshToken',drawResourceBars);
 Hooks.on('canvasReady',refresh);Hooks.on('controlToken',showTracker);Hooks.on('updateActor',refresh);Hooks.on('updateUser',refresh);
 Hooks.on('canvasTearDown',()=>{if(tracker)tracker.hidden=true;});
 Hooks.on('updateCombat',async(combat,changes)=>{
  if(!game.user.isGM||game.users.activeGM?.id!==game.user.id||!combat.started||!(Object.hasOwn(changes,'turn')||Object.hasOwn(changes,'round')))return;
  const actor=combat.combatant?.actor;if(!supported(actor))return;
  try{await adjustAP(actor,'reset');}catch(error){console.error('ASHDOM AP reset',error);}
 });
}
