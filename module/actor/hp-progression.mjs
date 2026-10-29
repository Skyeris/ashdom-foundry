export function hpProgression(system){
 const number=v=>Number.isFinite(Number(v))?Number(v):0;
 const initial=15+number(system.primary?.mgt?.base)+2*number(system.primary?.frt?.base);
 const saved=system.hpProgression??{};
 const config=saved.levels?structuredClone(saved):{perLevel:0,levels:{l1:{modifier:number(system.health?.hpMax)>0?number(system.health.hpMax)-initial:0}}};
 let total=0;const rows=[];
 const level=Math.max(1,Math.min(1000,Math.trunc(number(system.details?.level)||1)));
 if(Object.hasOwn(config,'perLevel')){
  for(let i=2;i<=level;i++){const key=`l${i}`;config.levels[key]??={};config.levels[key].levelUpHP??=number(config.perLevel);}
  delete config.perLevel;
 }
 for(let i=1;i<=level;i++){
  const key=`l${i}`,entry=config.levels?.[key]??{},base=i===1?initial:total;
  const gain=i===1?0:number(entry.levelUpHP),modifier=number(entry.modifier),bonus=number(entry.bonus);
  total=Math.max(0,base+gain+modifier+(entry.applies?bonus:0));
  rows.push({key,level:i,base,gain,modifier,total,perkName:entry.perkName??'',bonus,applies:Boolean(entry.applies)});
 }
 return {config,rows,total,perLevel:number(config.perLevel)};
}
export function registerHPProgression(){
 const pending=new WeakSet();
 Hooks.on('renderApplicationV2',async app=>{const actor=app.actor;if(actor?.type!=='character'||!actor.isOwner||(actor._source.system.hpProgression?.levels&&!Object.hasOwn(actor._source.system.hpProgression,'perLevel'))||pending.has(actor))return;
 const result=hpProgression(actor._source.system);pending.add(actor);try{await actor.update({'system.hpProgression':result.config});}finally{pending.delete(actor);}
 });
}
