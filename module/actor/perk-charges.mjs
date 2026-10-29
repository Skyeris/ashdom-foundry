const STATS=['FRT','OBS','REF','MGT','UND','LCK','APL'];
export function evaluateChargeFormula(formula,primary){
 const input=String(formula).toUpperCase().replace(/\s+/g,'');
 const tokens=input.match(/\d+(?:\.\d+)?|[A-Z]+|[()+*/,-]/g)||[];
 if(tokens.join('')!==input||tokens.length>100)throw Error('Invalid charge formula');
 let i=0;
 function atom(){const t=tokens[i++];if(t==='-')return -atom();if(t==='+')return atom();if(t==='('){const n=sum();if(tokens[i++]!==')')throw Error('Missing )');return n;}if(['CEIL','FLOOR','ROUND'].includes(t)){if(tokens[i++]!=='(')throw Error('Expected (');const n=sum();if(tokens[i++]!==')')throw Error('Missing )');return Math[t.toLowerCase()](n);}if(STATS.includes(t))return Number(primary?.[t.toLowerCase()]?.total??0);if(/^\d+(\.\d+)?$/.test(t??''))return Number(t);throw Error('Use FORMULA stats, numbers, arithmetic and ceil/floor/round');}
 function product(){let n=atom();while(['*','/'].includes(tokens[i])){const op=tokens[i++],v=atom();n=op==='*'?n*v:n/v;}return n;}
 function sum(){let n=product();while(['+','-'].includes(tokens[i])){const op=tokens[i++],v=product();n=op==='+'?n+v:n-v;}return n;}
 const result=sum();if(i!==tokens.length||!Number.isFinite(result))throw Error('Invalid charge formula');return Math.max(0,Math.ceil(result));
}
export function inferChargeFormula(note){
 const text=String(note??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ');
 if(!/charges?|up to (?:your )?(?:FRT|OBS|REF|MGT|UND|LCK|APL)/i.test(text))return null;
 if(/\b(?:rank|level)\s*\d|increases? .*charges|restore.*charge|Max Perk Charges/i.test(text))return {formula:'',review:true};
 const match=text.match(/(?:up to|charges? (?:equal to|of))\s+(?:your\s+)?(FRT|OBS|REF|MGT|UND|LCK|APL)\s*\/\s*(\d+)/i);
 if(match)return {formula:`ceil(${match[1].toUpperCase()} / ${match[2]})`,review:false};
 return /charges/i.test(text)?{formula:'',review:true}:null;
}
export function preparePerkCharges(system){for(const tracker of system.chargeTrackers??[]){tracker.formulaError='';if(!tracker.formula)continue;try{tracker.max=evaluateChargeFormula(tracker.formula,system.primary);}catch(e){tracker.formulaError=e.message;}}}
export function syncPerkCharges(system){
 system.chargeSources??={};system.chargeTrackers??=[];const counts={};
 for(const perk of system.perks??[]){const key=JSON.stringify([perk.name,counts[perk.name]=(counts[perk.name]??0)+1]);const note=String(perk.note??'');if(system.chargeSources[key]===note)continue;
 const inferred=inferChargeFormula(note);let tracker=system.chargeTrackers.find(t=>t.sourceKey===key);
 if(inferred){if(!tracker){tracker={name:perk.name,current:0,max:0,formula:inferred.formula,autoFormula:inferred.formula,sourceKey:key,review:inferred.review};system.chargeTrackers.push(tracker);try{tracker.current=evaluateChargeFormula(tracker.formula,system.primary);}catch{}}else if(tracker.formula===tracker.autoFormula){tracker.formula=inferred.formula;tracker.autoFormula=inferred.formula;tracker.review=inferred.review;}}
 system.chargeSources[key]=note;
 }preparePerkCharges(system);
}
export function registerPerkCharges(){
 const pending=new WeakSet();
 Hooks.on('renderApplicationV2',async app=>{const actor=app.actor;if(!actor?.isOwner||!['character','npc'].includes(actor.type)||pending.has(actor))return;
 const system=foundry.utils.deepClone(actor._source.system);system.primary=foundry.utils.deepClone(actor.system.primary);syncPerkCharges(system);
 if(JSON.stringify(system.chargeSources)===JSON.stringify(actor._source.system.chargeSources??{}))return;
 pending.add(actor);try{await actor.update({'system.chargeSources':system.chargeSources,'system.chargeTrackers':system.chargeTrackers});}finally{pending.delete(actor);}
 });
}
