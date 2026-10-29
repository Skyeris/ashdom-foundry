// The maximum is derived; changing it never refills or discards current Hope Points.
export function hopePointsMaximum(system) {
 const number=value=>Number.isFinite(Number(value))?Number(value):0;
 const level=Math.max(1,Math.floor(number(system.details?.level))),base=3+Math.floor(level/5);
 const modifier=Math.trunc(number(system.settings?.hopePoints?.maxModifier));
 return {base,modifier,max:Math.max(0,base+modifier)};
}
