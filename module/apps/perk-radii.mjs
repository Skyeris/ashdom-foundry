import {effectiveRadius} from '../actor/perk-radius-rules.mjs';
export function perkRadii(token){
 if(!token?.controlled||token.visible===false||!token.actor?.isOwner)return [];
 return (token.actor.system.perks??[]).map(p=>({name:p.name||'Perk',radius:effectiveRadius(p,token.actor.system)})).filter(p=>Number.isFinite(p.radius)&&p.radius>0);
}
export function drawPerkRadii(token){
 if(token._ashdomPerkRadii){token.removeChild(token._ashdomPerkRadii);token._ashdomPerkRadii.destroy({children:true});token._ashdomPerkRadii=null;}
 const perks=perkRadii(token);if(!perks.length||!canvas.ready)return;
 const distance=Number(canvas.scene?.grid?.distance),size=Number(canvas.dimensions?.size);if(!(distance>0&&size>0))return;
 const units=String(canvas.scene?.grid?.units??'ft').toLowerCase();const feetPerUnit=/^(m|meter|meters|metre|metres)$/.test(units)?3.280839895:1;
 const container=new PIXI.Container();container.eventMode='none';token._ashdomPerkRadii=container;token.addChild(container);
 const grouped=new Map();for(const p of perks){if(!grouped.has(p.radius))grouped.set(p.radius,[]);grouped.get(p.radius).push(p.name);}
 for(const [feet,names]of grouped){
  const radius=feet/feetPerUnit/distance*size;
  const ring=new PIXI.Graphics();ring.lineStyle(2,0xffd700,0.85).beginFill(0xffd700,0.035).drawCircle(token.w/2,token.h/2,radius).endFill();container.addChild(ring);
  const label=new PIXI.Text(`${names.join(', ')} — ${feet} ft`,{fontFamily:'Arial',fontSize:12,fill:0xffd700,stroke:0x000000,strokeThickness:3});label.anchor.set(0.5,1);label.position.set(token.w/2,token.h/2-radius-3);container.addChild(label);
 }
}
export function registerPerkRadii(){
 const refresh=()=>{if(canvas.ready)for(const token of canvas.tokens?.placeables??[])drawPerkRadii(token);};
 Hooks.on('controlToken',drawPerkRadii);Hooks.on('refreshToken',drawPerkRadii);Hooks.on('drawToken',drawPerkRadii);
 Hooks.on('updateActor',refresh);Hooks.on('updateUser',refresh);Hooks.on('canvasReady',refresh);Hooks.on('updateScene',refresh);
}
