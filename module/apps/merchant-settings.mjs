import {merchantSettings,MERCHANT_TYPES} from '../actor/merchant-policy.mjs';
import {library,libraryAction,writeLibrary} from './saved-generators.mjs';
import {utilityDialog,check,esc} from '../sheets/utility-dialog.mjs';
export async function editMerchant(id) {
 const record=library().find(r=>r.kind==='shop'&&r.id===id);if(!record)throw Error('Choose a saved shop.');
 const p=merchantSettings(record.merchant);
 const result=await utilityDialog(`${record.name} — Merchant Settings`,`<p>Blank funds mean unlimited. Purchases add funds; approved sales spend them. Restocking does not reset the balance. Only matching currency can be used with a limited budget.</p><label>Currency name<input name="currency" value="${esc(p.currency)}"></label><label>Available funds<input name="funds" type="number" min="0" step="0.01" value="${p.funds??''}" placeholder="Unlimited"></label>${check('broken','Buy Broken items',p.acceptBroken)}<p>Choose the item types this merchant buys. No selections means the merchant buys nothing.</p><div class="ashdom-utility-checks">${Object.entries(MERCHANT_TYPES).map(([key,name])=>check(key,name,p.types===null||p.types.includes(key))).join('')}</div>`,[{action:'save',label:'Save',callback:(_e,b)=>{const f=b.form.elements;return merchantSettings({currency:f.currency.value,funds:f.funds.value,acceptBroken:f.broken.checked,types:Object.keys(MERCHANT_TYPES).filter(k=>f[k].checked)});}}]);
 if(!result||typeof result!=='object')return;
 await libraryAction(async()=>{const rows=library(),shop=rows.find(r=>r.id===id);if(!shop||shop.revision!==record.revision)throw Error('The shop changed; reopen Merchant Settings.');shop.merchant=result;shop.revision++;shop.updated=Date.now();await writeLibrary(rows);});
 ui.notifications.info('Merchant funds and buying preferences saved.');
}
