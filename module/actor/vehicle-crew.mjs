import {npcGroup} from './npc-groups.mjs';
export const CREW_ROLES={driver:'Driver',gunner:'Gunner',passenger:'Passenger'};
export function validateCrew(rows,actors){
 const seen=new Set();let drivers=0;
 for(const row of rows){
  const actor=actors.find(a=>a.uuid===row.uuid);if(!actor||!['character','npc'].includes(actor.type))throw Error('A crew actor is missing; remove its assignment.');
  if(seen.has(row.uuid))throw Error('This actor is already assigned to this vehicle.');seen.add(row.uuid);
  if(!CREW_ROLES[row.role])throw Error('Choose Driver, Gunner or Passenger.');
  if(!Number.isSafeInteger(row.seats)||row.seats<1)throw Error('Enter a positive whole number of seats.');
  if(row.role==='driver'){drivers++;if(actor.type==='npc'&&npcGroup(actor.system).active)throw Error('Groups cannot be drivers. Assign a separate individual NPC.');}
 }
 if(drivers>1)throw Error('Assign only one driver.');return rows;
}
export function crewSummary(rows,capacity,actors){
 const used=rows.reduce((sum,r)=>sum+Math.max(0,Number(r.seats)||0),0),issues=[];
 try{validateCrew(rows,actors);}catch(e){issues.push(e.message);}
 if(rows.length&&!rows.some(r=>r.role==='driver'))issues.push('No driver assigned.');
 const overloaded=used>Math.max(0,Number(capacity)||0);if(overloaded)issues.push('Crew seating exceeds vehicle capacity.');
 return {used,capacity:Number(capacity)||0,overloaded,issues};
}
