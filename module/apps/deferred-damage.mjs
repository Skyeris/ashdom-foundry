export function attackMessageData(data,deferred,formula){
 if(!deferred)return data;
 const result={...data,rolls:data.rolls.slice(0,1),flags:{...data.flags,ashdom:{...data.flags.ashdom}}};
 result.flags.ashdom.pendingDamage={...result.flags.ashdom.damage,formula};delete result.flags.ashdom.damage;
 result.content=data.content.replace(/<div><strong>(?:DT|Damage Type|Damage)<\/strong><span[^>]*>.*?<\/span><\/div>/g,'').replace(/Damage: [^\n]* = 0/g,'Damage: awaiting roll');
 return result;
}
export function registerDeferredDamage(){
 const pending=new Set();
 Hooks.on('renderChatMessageHTML',(message,html)=>{
 const attack=message.getFlag('ashdom','pendingDamage');if(!attack||message.getFlag('ashdom','damage')||(!message.isAuthor&&!game.user.isGM))return;
 const root=html instanceof HTMLElement?html:html[0];if(!root||root.querySelector('.ashdom-roll-damage'))return;
 const button=document.createElement('button');button.type='button';button.className='ashdom-roll-damage';button.textContent='Roll Damage';
 button.addEventListener('click',async()=>{if(pending.has(message.id)||message.getFlag('ashdom','damage'))return;pending.add(message.id);button.disabled=true;
 try{const roll=await new Roll(attack.formula).evaluate();const card=document.createElement('div');card.className='ashdom-themed-chat-card ashdom-deferred-damage';for(const text of [`Damage: ${roll.total} (${attack.type})`,`DT Reduction: ${Math.abs(Number(attack.dt)||0)}`]){const p=document.createElement('p');p.textContent=text;card.append(p);}
 await message.update({content:message.content+card.outerHTML,rolls:[...message.rolls,roll], 'flags.ashdom.damage':{amount:roll.total,type:attack.type,dt:attack.dt,hits:attack.hits},'flags.ashdom.-=pendingDamage':null});
 }catch(error){ui.notifications.error(error.message);}finally{pending.delete(message.id);button.disabled=false;}});
 (root.querySelector('.message-content')??root).append(button);
 });
}
