import {acceptsSale,merchantBalance,merchantSettings} from './merchant-policy.mjs';
import {tradePrice,tradeProfile,tradeRate} from './sheet-enhancements.mjs';
import {mirrorEquipmentDrop} from './equipment-inventory.mjs';
export function buildTrade(actor,shop,request){
 const before=actor.toObject(),system=structuredClone(before.system),stock=structuredClone(shop.stock??[]);
 if(!['character','npc'].includes(actor.type))throw Error('Choose a Character or NPC with currency.');
 if(!['buy','sell'].includes(request.mode)||!Array.isArray(request.lines)||!request.lines.length||request.lines.length>100)throw Error('Choose 1–100 trade lines.');
 const currencies=structuredClone(system.currencies??[]),currency=currencies[request.currencyIndex];if(!currency||currency.title!==request.currencyTitle)throw Error('The selected currency changed.');
 const inventory=structuredClone(system.inventoryItems??[]),changes={},seen=new Set(),details=[],soldOut=new Set();let total=0;
 for(const line of request.lines){
  const key=request.mode==='buy'?line.id:line.index;if(seen.has(key))throw Error('Duplicate trade line.');seen.add(key);
  const quantity=Number(line.quantity);if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('Trade quantities must be positive whole numbers.');
  if(request.mode==='buy'){
   const entry=stock.find(r=>r.id===line.id);if(!entry||quantity>entry.quantity)throw Error('Shop stock changed or is insufficient.');
   const profile={...tradeProfile(entry),...(typeof line.schematic==='boolean'?{schematic:line.schematic}:{})},pricing=tradeRate('buy',request.percent,profile);const amount=tradePrice(entry.value,quantity,'buy',request.percent,profile);total+=amount;details.push({name:entry.name,quantity,value:entry.value,amount,...pricing});entry.quantity-=quantity;
   const doc=entry.document;if(!doc?.system)throw Error('Saved item data is missing. Refresh shop stock.');const data={...doc.system,schematic:profile.schematic};
   const row={name:entry.name,sourceUuid:profile.schematic?'':entry.uuid,documentType:doc.type,quantity,weight:Number(data.weight)||0,totalWeight:quantity*(Number(data.weight)||0),rarity:data.rarity??'',category:data.category??'',type:data.category??'',subcategory:data.subcategory??'',specialization:data.specialization??'',condition:data.condition??'Pristine',note:data.note??data.description??'',container:'',equipmentData:structuredClone(data)};
   inventory.push(row);changes['system.inventoryItems']=inventory;
   mirrorEquipmentDrop({...system,...(changes['system.weapons']?{weapons:changes['system.weapons']}:{}),...(changes['system.armors']?{armors:changes['system.armors']}:{}),inventoryItems:inventory},{name:row.name,type:doc.type,uuid:entry.uuid,system:{...data,quantity,equipped:false,capacityCurrent:0}},changes,'inventory',actor.type);
  }else{
   const row=inventory[line.index];if(!row||JSON.stringify(row)!==line.expected)throw Error('An inventory entry changed. Submit a new trade request.');if(quantity>Number(row.quantity))throw Error('Not enough items remain to sell.');
   if(!acceptsSale(shop.merchant,row))throw Error(`This merchant does not buy ${row.name} (${row.condition??'Pristine'}).`);
   const match=e=>(row.sourceUuid&&e.sourceUuid===row.sourceUuid)||e.name===row.name;
   const weapon=(system.weapons??[]).find(match),armor=(system.armors??[]).find(a=>match(a)||[a.helmetName,a.underArmorName].includes(row.name));
   if(weapon?.equipped||armor?.equipped)throw Error(`Unequip ${row.name} before selling it.`);
   const profile=tradeProfile(row),pricing=tradeRate('sell',request.percent,profile);const amount=tradePrice(line.value,quantity,'sell',request.percent,profile);total+=amount;details.push({name:row.name,quantity,value:Number(line.value),amount,...pricing});row.quantity-=quantity;row.totalWeight=row.quantity*(Number(row.weight)||0);
   if(row.quantity===0){soldOut.add(line.index);const otherStack=inventory.some((r,i)=>i!==line.index&&Number(r.quantity)>0&&match(r));if(weapon&&!otherStack)changes['system.weapons']=(changes['system.weapons']??system.weapons).filter(w=>!match(w));if(armor&&!otherStack){const all=structuredClone(changes['system.armors']??system.armors),i=system.armors.indexOf(armor),field=armor.underArmorName===row.name?'underArmorName':armor.helmetName===row.name?'helmetName':'name',column=field==='underArmorName'?'ua':field==='helmetName'?'helmet':'armorSet';all[i][field]='';for(const rating of Object.values(all[i].ratings??{}))rating[column]=0;changes['system.armors']=all;}}
   // A sold item retains its inventory details even without a compendium source.
   const document={name:row.name,type:row.documentType||'gear',system:{...row,...row.equipmentData,value:Number(line.value),weight:row.weight,note:row.note,condition:profile.condition,schematic:profile.schematic,quantity:1}};
   stock.push({id:`sale-${request.id}-${line.index}`,uuid:row.sourceUuid||'',name:row.name,img:'icons/svg/item-bag.svg',rarity:row.rarity,quantity,value:Number(line.value),document});
  }
 }
 total=Math.round(total*100)/100;
 const balance=Number(currency.amount)||0;if(!Number.isFinite(balance)||balance<0)throw Error('Currency balance must be a non-negative finite number.');if(request.mode==='buy'&&balance<total)throw Error('Insufficient currency for the entire cart.');currency.amount=Math.round((balance+(request.mode==='buy'?-total:total))*100)/100;
 const merchantBefore=merchantSettings(shop.merchant).funds,merchantAfter=merchantBalance(shop.merchant,request.mode,total,request.currencyTitle);
 changes['system.currencies']=currencies;changes['system.inventoryItems']=inventory.filter((_r,i)=>!soldOut.has(i));
 return {merchantBefore,merchantAfter,changes,stock:stock.filter(r=>r.quantity>0),details,total,balanceBefore:balance,balanceAfter:currency.amount};
}
