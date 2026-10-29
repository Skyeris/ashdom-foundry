import {acceptsSale,merchantSettings} from '../actor/merchant-policy.mjs';
import {library,libraryAction,writeLibrary,requireActiveGM} from './saved-generators.mjs';
import {buildTrade} from '../actor/shop-trade.mjs';
import {tradePrice,tradeProfile,tradeRate} from '../actor/sheet-enhancements.mjs';
import {resourceAction} from '../actor/resources.mjs';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dialog=(title,content,buttons,extra={})=>foundry.applications.api.DialogV2.wait({classes:['ashdom','ashdom-roll-modifier-window'],window:{title},position:{width:650},content,buttons,rejectClose:false,modal:true,...extra});
const cancelled={action:'cancel',label:'Cancel',callback:()=>false};
function tradeContent(actor,request,result){return `<section class="ashdom-themed-chat-card"><h3>${escape(request.shopName)} — ${request.mode==='buy'?'Purchase':'Sale'} request</h3><p>${escape(actor.name)} · ${escape(request.percent)}% ${request.mode==='buy'?'discount':'selling increase (percentage points)'}</p><table><thead><tr><th>Item</th><th>Qty</th><th>Pristine base value each</th><th>Rate</th><th>Total</th></tr></thead><tbody>${result.details.map(r=>`<tr><td>${escape(r.name)}</td><td>${r.quantity}</td><td>${r.value}</td><td>${r.rate}% (${r.condition}${r.schematic?' schematic':''}${r.limited?'; limit applied':''})</td><td>${r.amount}</td></tr>`).join('')}</tbody></table><p>Total: ${result.total} ${escape(request.currencyTitle)} · Balance: ${result.balanceBefore} → ${result.balanceAfter}</p><p>Merchant funds: ${result.merchantBefore==null?'Unlimited':`${result.merchantBefore} → ${result.merchantAfter}`}</p><p>Requires GM approval. Selling base values are proposed values for the GM to review.</p></section>`;}
export async function openShopTrade(id){
 try{
 const shop=library().find(s=>s.id===id&&s.kind==='shop');if(!shop||(!game.user.isGM&&!shop.published))throw Error('This shop is not available for trading.');
 const actors=[...game.actors].filter(a=>a.isOwner&&['character','npc'].includes(a.type));if(!actors.length)throw Error('You need an editable Character or NPC with currency.');
 const choice=await dialog('Shop: Buy or Sell',`<label>Actor<select name="actor">${actors.map(a=>`<option value="${escape(a.uuid)}">${escape(a.name)}</option>`).join('')}</select></label><label>Action<select name="mode"><option value="buy">Buy</option><option value="sell">Sell</option></select></label>`,[{action:'next',label:'Choose Items',callback:(_e,b)=>({actor:b.form.elements.actor.value,mode:b.form.elements.mode.value})},cancelled]);if(!choice||typeof choice!=='object')return;
 const actor=actors.find(a=>a.uuid===choice.actor);if(!actor)throw Error('Actor unavailable.');const raw=actor.toObject().system,currencies=raw.currencies??[];if(!currencies.length)throw Error('Add a currency entry on the actor sheet first.');
 const options=choice.mode==='buy'?shop.stock:(raw.inventoryItems??[]).map((row,index)=>({...row,index,expected:JSON.stringify(row)})).filter(r=>r.quantity>0&&acceptsSale(shop.merchant,r));
 if(choice.mode==='sell')for(const row of options){let doc;try{doc=row.sourceUuid?await fromUuid(row.sourceUuid):null;}catch{}row.value=Number(doc?.system?.value??row.equipmentData?.value??0)||0;}
 if(!options.length)throw Error('No items are available.');
 const policy=merchantSettings(shop.merchant);
 const content=`<p>Merchant funds: ${policy.funds===null?'Unlimited':`${policy.funds} ${escape(policy.currency)}`}. Only items accepted by this merchant appear when selling.</p><p>Enter quantities for any number of items. Zero leaves an item out. ${choice.mode==='sell'?'Sales start at 50% for Pristine items or 10% for Broken items. +10% raises 50% to 60%. Review the Pristine base values below. Broken items require the GM’s approval of their value to the vendor.':'Buying starts at 100% for Pristine items, 50% for Broken items, or 25% for schematics. Mark schematic rows when needed; their base value must be the Pristine item’s full value.'}</p><label>Currency<select name="currency">${currencies.map((c,i)=>`<option value="${i}">${escape(c.title)} (${c.amount})</option>`).join('')}</select></label><label>${choice.mode==='buy'?'Discount':'Selling increase'} (%)<input type="number" name="percent" value="0" min="0" max="${choice.mode==='buy'?90:190}" step="0.01"></label><p>Adjustments add or subtract percentage points. Minimum: 10%. Selling maximum: Pristine 200%, Broken 100%. Buying maximum: Pristine 100%, Broken 50%, schematics 25%. Each row shows its effective rate.</p><div class="ashdom-trade-lines"><table><thead><tr><th>Item</th><th>Available</th><th>Pristine base value</th><th>Rate</th><th>Quantity</th></tr></thead><tbody>${options.map((r,i)=>`<tr><td>${escape(r.name)}<br>${escape(tradeProfile(r).condition)}${choice.mode==='buy'?`<label>Schematic <span class="ashdom-tag-checkbox"><input type="checkbox" name="schematic${i}" ${tradeProfile(r).schematic?'checked':''}><span aria-hidden="true">✓</span></span></label>`:''}</td><td>${r.quantity}</td><td>${choice.mode==='sell'?`<input name="value${i}" type="number" min="0" step="0.01" value="${r.value}">`:r.value}</td><td data-rate="${i}">${tradeRate(choice.mode,0,tradeProfile(r)).rate}%</td><td><input name="qty${i}" type="number" min="0" max="${Math.floor(r.quantity)}" step="1" value="0"></td></tr>`).join('')}</tbody></table></div><p data-cart-total>Total: 0</p>`;
 const cart=await dialog(`${shop.name} — ${choice.mode==='buy'?'Buy':'Sell'} Items`,content,[{action:'submit',label:'Review Cart',callback:(_e,b)=>{const f=b.form.elements;return {percent:Number(f.percent.value),currencyIndex:Number(f.currency.value),lines:options.flatMap((r,i)=>{const quantity=Number(f[`qty${i}`].value);return quantity?[{id:r.id,index:r.index,expected:r.expected,quantity,schematic:choice.mode==='buy'?f[`schematic${i}`].checked:tradeProfile(r).schematic,value:choice.mode==='sell'?Number(f[`value${i}`].value):r.value}]:[]})};}},cancelled],{render:(_event,app)=>{const form=app.element.querySelector('form')??app.element;form.addEventListener('input',()=>{try{let total=0;const percent=Number(form.querySelector('[name=percent]').value);options.forEach((r,i)=>{const q=Number(form.querySelector(`[name=qty${i}]`).value);const profile={...tradeProfile(r),...(choice.mode==='buy'?{schematic:form.querySelector(`[name=schematic${i}]`).checked}:{})};const pricing=tradeRate(choice.mode,percent,profile);form.querySelector(`[data-rate="${i}"]`).textContent=`${pricing.rate}%${pricing.limited?' (limit)':''}`;if(q)total+=tradePrice(choice.mode==='sell'?Number(form.querySelector(`[name=value${i}]`).value):r.value,q,choice.mode,percent,profile);});form.querySelector('[data-cart-total]').textContent=`Total: ${Math.round(total*100)/100}`;}catch(error){form.querySelector('[data-cart-total]').textContent=error.message;}});}});
 if(!cart||typeof cart!=='object')return;
 const request={...cart,id:foundry.utils.randomID(),shopId:shop.id,shopName:shop.name,revision:shop.revision,actorUuid:actor.uuid,mode:choice.mode,currencyTitle:currencies[cart.currencyIndex]?.title,status:'pending'};
 const result=buildTrade(actor,shop,request),html=tradeContent(actor,request,result);
 const yes=await dialog('Submit bulk trade for GM approval',html,[{action:'send',label:'Submit to GM',callback:()=>true},cancelled]);if(yes!==true)return;
 await ChatMessage.create({content:html,whisper:[...new Set([game.user.id,...[...game.users].filter(u=>u.isGM).map(u=>u.id)])],flags:{ashdom:{tradeRequest:request}}});ui.notifications.info('Bulk trade submitted for GM approval.');
 }catch(error){ui.notifications.warn(error.message);}
}
export async function approveTrade(message){return libraryAction(async()=>{
 const request=message.getFlag('ashdom','tradeRequest');if(!request||request.status!=='pending')throw Error('This request is no longer pending.');
 const actor=await fromUuid(request.actorUuid);if(!actor)throw Error('Actor no longer exists.');const author=message.author;if(!author||(!author.isGM&&!actor.testUserPermission(author,'OWNER')))throw Error('The requester no longer owns this actor.');
 return resourceAction(actor,async()=>{
 const records=library(),shop=records.find(r=>r.id===request.shopId);if(!shop||shop.revision!==request.revision)throw Error('Shop stock changed. Submit a new cart.');
 if((actor.getFlag('ashdom','completedTrades')??[]).includes(request.id))throw Error('This trade was already applied.');
 const result=buildTrade(actor,shop,request),before=actor.toObject();
 const confirmed=await dialog('Approve bulk trade',tradeContent(actor,request,result),[{action:'approve',label:'Approve Entire Cart',callback:()=>true},cancelled]);if(confirmed!==true)return;
 // Recheck after the review dialog so stale actor edits cannot be overwritten.
 if(JSON.stringify(actor.toObject().system)!==JSON.stringify(before.system))throw Error('Actor changed during review. Review the request again.');
 const restore=Object.fromEntries(Object.keys(result.changes).map(k=>[k,foundry.utils.getProperty(before,k)]));restore['flags.ashdom.completedTrades']=before.flags?.ashdom?.completedTrades??[];
 await actor.update({...result.changes,'flags.ashdom.completedTrades':[...(actor.getFlag('ashdom','completedTrades')??[]),request.id].slice(-1000)},{ashdomTransfer:`${request.mode==='buy'?'Purchased':'Sold'} ${result.details.length} item types at ${shop.name}`});
 const appliedState=actor.toObject();
 shop.stock=result.stock;shop.merchant={...merchantSettings(shop.merchant),funds:result.merchantAfter};shop.revision++;shop.updated=Date.now();shop.snapshot.results=shop.stock.map(({document,value,id,...r})=>r);
 try{await writeLibrary(records);}catch(error){
  const current=actor.toObject();const changed=Object.keys(result.changes).some(path=>JSON.stringify(foundry.utils.getProperty(current,path))!==JSON.stringify(foundry.utils.getProperty(appliedState,path)));
  if(changed){ui.notifications.warn('Shop save failed and the actor changed concurrently. Ask the GM to reconcile this trade; automatic rollback was stopped to preserve newer edits.');throw error;}
  await actor.update(restore,{ashdomTransfer:'Shop save failed; trade rolled back'});throw error;
 }
 try{await message.update({'flags.ashdom.tradeRequest.status':'approved',content:tradeContent(actor,request,result)+'<p><strong>Approved and completed.</strong></p>'});}catch{ui.notifications.warn('Trade completed, but the chat status could not update. It cannot be applied twice.');}
 ui.notifications.info('Bulk trade completed.');
 });
 });}
export function registerShopTrading(){
 Hooks.once('ready',()=>{game.ashdom??={};game.ashdom.openShopTrade=openShopTrade;});
 Hooks.on('renderChatMessageHTML',(message,html)=>{const root=html instanceof HTMLElement?html:html[0];if(!root)return;const host=root.querySelector('.message-content')??root;
 const add=(text,fn)=>{const b=document.createElement('button');b.type='button';b.className='ashdom-trade-chat-button';b.textContent=text;b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){ui.notifications.warn(e.message);}finally{b.disabled=false;}});host.append(b);};
 const link=message.getFlag('ashdom','shopLink');if(link&&!host.querySelector('.ashdom-trade-chat-button'))add('Open Shop — Buy / Sell',()=>openShopTrade(link));
 const request=message.getFlag('ashdom','tradeRequest');if(!request||request.status!=='pending'||!game.user.isGM||host.querySelector('.ashdom-trade-chat-button'))return;
 add('Review & Approve Cart',()=>approveTrade(message));add('Reject',()=>libraryAction(async()=>{if(message.getFlag('ashdom','tradeRequest')?.status!=='pending')throw Error('Request is no longer pending.');await message.update({'flags.ashdom.tradeRequest.status':'rejected',content:message.content+'<p><strong>Rejected by GM.</strong></p>'});}));
 });
}
