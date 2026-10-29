export function enforceRadiationImmunity(system){
 if(!system.health?.immuneToRads)return;
 if(system.secondary?.baseRR)system.secondary.baseRR.total=999;
 for(const armor of system.armors??[])if(armor.ratings?.rr)armor.ratings.rr.total=999;
}
export function hasRadiationImmunity(text){return /\bradiation\b/i.test(String(text??'').replace(/<[^>]*>/g,' '));}
