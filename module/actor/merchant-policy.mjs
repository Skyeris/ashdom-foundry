import {tradeProfile} from './sheet-enhancements.mjs';
export const MERCHANT_TYPES={weapon:'Weapons',armor:'Armor',ammunition:'Ammunition',consumable:'Consumables',gear:'Gear',mod:'Modifications',robotPart:'Robot Parts',cybernetic:'Cybernetics',implant:'Implants',literature:'Literature',misc:'Miscellaneous',vehicleMod:'Vehicle Mods',vehicle:'Vehicles',legendary:'Legendary Items',skillSpec:'Skill Specs',perk:'Perks',disease:'Diseases',unknown:'Other / unclassified'};
export function merchantSettings(value={}) {
 const blank=value.funds===null||value.funds===undefined||String(value.funds).trim()==='';
 const funds=blank?null:Number(value.funds);
 if(funds!==null&&(!Number.isFinite(funds)||funds<0))throw Error('Merchant funds must be blank or a non-negative number.');
 return {funds:funds===null?null:Math.round(funds*100)/100,currency:String(value.currency??'Coins').trim()||'Coins',acceptBroken:value.acceptBroken!==false,types:Array.isArray(value.types)?value.types.filter(t=>Object.hasOwn(MERCHANT_TYPES,t)):null};
}
export function saleType(row) {return row.documentType||row.document?.type||'unknown';}
export function acceptsSale(settings,row) {
 const policy=merchantSettings(settings);
 return (policy.acceptBroken||String(tradeProfile(row).condition).toLowerCase()!=='broken')&&(policy.types===null||policy.types.includes(saleType(row)));
}
export function merchantBalance(settings,mode,total,currency) {
 const p=merchantSettings(settings);if(p.funds===null)return null;
 if(p.currency.toLowerCase()!==String(currency).trim().toLowerCase())throw Error(`Use the merchant currency (${p.currency}); currency conversion is not automatic.`);
 if(!Number.isFinite(total)||total<0)throw Error('Invalid trade total.');
 if(mode==='sell'&&total>p.funds)throw Error('The merchant has insufficient funds for this sale.');
 return Math.round((p.funds+(mode==='buy'?total:-total))*100)/100;
}
