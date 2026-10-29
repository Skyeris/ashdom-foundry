import {splitStack} from '../actor/inventory-allocation.mjs';
import {button,utilityDialog,esc} from './utility-dialog.mjs';
export function splitControl(sheet,index,row){const b=button('SPLIT',async()=>{
 const n=await utilityDialog(`Split ${row.name}`,`<p>Move part of this stack into a separate row in the same inventory. Notes and container are retained.</p><label>Quantity to split<input name="quantity" type="number" min="0.000001" max="${Number(row.quantity)-0.000001}" step="any" value="${Math.min(1,Number(row.quantity)/2)}"></label><p>Available: ${esc(row.quantity)}</p>`,[{action:'split',label:'Split Stack',callback:(_e,b)=>Number(b.form.elements.quantity.value)}]);
 if(typeof n==='number')await splitStack(sheet.actor,index,n,row);
 });b.disabled=!sheet.isEditable||!(Number(row.quantity)>0);return b;}
