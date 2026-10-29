import {damagePreview,applyChatDamage,withMiscDamage} from '../actor/chat-damage.mjs';
function selectedTarget(){
 const targets=[...game.user.targets];
 const chosen=targets.length?targets:(canvas.tokens?.controlled??[]);
 if(chosen.length!==1)throw Error('Target or select exactly one token to receive damage.');
 const token=chosen[0];if(!token.actor)throw Error('This token has no actor.');return token;
}
export function registerChatDamage(){
 Hooks.on('renderChatMessageHTML',(message,html)=>{
  const attack=message.getFlag('ashdom','damage');if(!attack)return;
  const root=html instanceof HTMLElement?html:html[0];if(!root||root.querySelector('.ashdom-apply-damage'))return;
  const controls=document.createElement('div');controls.className='ashdom-apply-damage';
  const hits=Math.min(30,Math.max(1,Number(attack.hits)||1));
  for(let i=0;i<1;i++){
   const button=document.createElement('button');button.type='button';button.textContent='Apply Damage';
   button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
     const token=selectedTarget(),actor=token.actor;
     if(!game.user.isGM&&!actor.isOwner)throw Error('Ask the GM to apply damage to this target.');
     const used=actor.getFlag('ashdom','appliedDamage')??[];
     const available=Array.from({length:hits},(_,i)=>`${message.id}:${i}`).filter(key=>!used.includes(key));
     if(!available.length)throw Error('All hits from this attack have already been applied to this actor.');
     let preview=damagePreview(actor,attack);
     const content=document.createElement('div');
     const targetName=document.createElement('p');targetName.textContent=`Target: ${token.name}`;content.append(targetName);
     const totals=document.createElement('div');totals.dataset.damagePreview='';content.append(totals);
     const hitLabel=document.createElement('label');hitLabel.className='ashdom-misc-damage';hitLabel.textContent='Hits landed';
     const hitInput=document.createElement('input');hitInput.type='number';hitInput.name='hitCount';hitInput.min='1';hitInput.max=String(available.length);hitInput.setAttribute('value','1');hitInput.step='1';hitLabel.append(hitInput);if(hits===1)hitLabel.hidden=true;content.append(hitLabel);
     const label=document.createElement('label');label.className='ashdom-misc-damage';label.textContent='Misc.';
     const input=document.createElement('input');input.type='number';input.name='miscDamage';input.min='0';input.step='any';input.placeholder='0';input.setAttribute('aria-label','Miscellaneous extra damage');label.append(input);content.append(label);
     const help=document.createElement('p');help.className='ashdom-misc-help';help.textContent='Extra damage from outside sources. Added to each selected hit before DT and DR, using the same damage type. Leave blank for 0.';content.append(help);
     const drawPreview=(element,result)=>{
      element.replaceChildren();
      for(const text of [`${result.hitCount} hit(s) × ${result.damage} ${attack.type} damage`,result.bypass?'Bypasses DT and DR':`DT: ${result.baseDT} − ${result.reduction} = ${result.dt}; damage after DT: ${result.perHit} per hit, ${result.remaining} total`,`DR: ${result.drBefore} → ${result.drAfter}`,`HP: ${result.hpBefore} → ${result.hpAfter}`]){const p=document.createElement('p');p.textContent=text;element.append(p);}
     };
     drawPreview(totals,preview);
     const confirm=await foundry.applications.api.DialogV2.wait({
      classes:['ashdom','ashdom-roll-modifier-window'],window:{title:'Apply Damage'},position:{width:400},content:content.innerHTML,
      render:(_event,dialog)=>{
       const field=dialog.element.querySelector('[name="miscDamage"]'),count=dialog.element.querySelector('[name="hitCount"]'),display=dialog.element.querySelector('[data-damage-preview]');
       const refresh=()=>{try{const number=Number(count.value);if(!Number.isInteger(number)||number<1||number>available.length)throw Error('Choose a valid remaining hit count.');preview=damagePreview(actor,{...withMiscDamage(attack,field.value),appliedHits:number});drawPreview(display,preview);count.setCustomValidity('');}catch(error){count.setCustomValidity(error.message);display.textContent=error.message;}};
       field.addEventListener('input',refresh);count.addEventListener('input',refresh);
      },
      buttons:[{action:'apply',label:'Apply Damage',callback:(_event,button)=>({attack:{...withMiscDamage(attack,button.form.elements.miscDamage.value),appliedHits:Number(button.form.elements.hitCount.value)},preview})},{action:'cancel',label:'Cancel',callback:()=>false}],rejectClose:false,modal:true
     });
     if(!confirm||typeof confirm!=='object')return;
     const result=await applyChatDamage(actor,confirm.attack,available.slice(0,confirm.attack.appliedHits),confirm.preview);
     ui.notifications.info(`${token.name}: ${result.drLoss} DR and ${result.hpLoss} HP lost.`);
    }catch(error){ui.notifications.warn(error.message);}finally{button.disabled=false;}
   });controls.append(button);
  }
  (root.querySelector('.message-content')??root).append(controls);
 });
}
