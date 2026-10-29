export const CRAFT_RARITIES=['Common','Uncommon','Rare','Radical','Atomic'];
export const CRAFT_PROCESSES={standard:'Standard',weapon:'Weapon',armor:'Armor',ammo:'Ammunition',explosive:'Explosive',mod:'Modification / Gear',chem:'Chem',food:'Cooked Food',material:'Material',drink:'Distilling',cybernetic:'Cybernetic',implant:'Implant',robot:'Robot Upgrade / Variant',robotBody:'Robot Body',vehicle:'Vehicle Frame',chassis:'Vehicle Chassis',engine:'Vehicle Engine',upgrade:'Vehicle Upgrade',trailer:'Trailer',custom:'Custom / Alternative Process'};
export function plainNotes(value){return String(value??'').replace(/<\/(?:p|div|li|h[1-6])>|<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();}
export function materialLines(notes){return [...plainNotes(notes).matchAll(/Materials?\s*:\s*([^\n]+)/gi)].map(m=>m[1].trim());}
export function parseMaterials(text){return String(text??'').split(/\n|,/).map(s=>s.trim()).filter(Boolean).map(line=>{
 if(line.includes('|')){const [name,value,unit='lbs']=line.split('|').map(s=>s.trim());const amount=value===''?null:Number(value);if(!name||amount!==null&&(!Number.isFinite(amount)||amount<=0)||!['lbs','items'].includes(unit))throw Error('Materials use Name | positive amount | lbs or items.');return {name,amount,unit};}
 const m=line.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*(lbs?|pounds?)?\.?$/i);return m?{name:m[1].trim(),amount:Number(m[2]),unit:m[3]?'lbs':'items'}:{name:line,amount:null,unit:'lbs'};
 });}
export function materialText(rows){return rows.map(r=>`${r.name} | ${r.amount??''} | ${r.unit}`).join('\n');}
export function materialAvailability(material,inventory){const names=material.name.toLowerCase().split(/\s+or\s+|\s*\/\s*/);return inventory.reduce((sum,row)=>names.includes(String(row.name??'').trim().toLowerCase())?sum+Math.max(0,Number(row.quantity)||0)*(material.unit==='lbs'?Math.max(0,Number(row.weight)||0):1):sum,0);}
export function craftingDefaults(item,process){const system=item.system??{},vehicle=system.vehicles?.[0]??system,notes=plainNotes([...new Set([system.concealedNote,system.note,vehicle.note].filter(Boolean))].join('\n'));const type=item.type??'',category=String(system.category??'').toLowerCase(),sub=String(system.subcategory??'').toLowerCase();const rank=Math.max(0,CRAFT_RARITIES.indexOf(system.rarity));let hours=null,skill='engineer',checks=rank>=3?4:2,penalty=-10-rank*5;
 process??=type==='vehicle'?(String(vehicle.type??vehicle.vehicleType).includes('Trailer')?'trailer':'vehicle'):type==='weapon'?(category==='explosives'?'explosive':'weapon'):type==='armor'?'armor':type==='ammunition'?'ammo':type==='cybernetic'?'cybernetic':type==='implant'?'implant':type==='robotPart'?(category==='body'?'robotBody':'robot'):type==='vehicleMod'?(category==='chassis'?'chassis':category==='engine'?'engine':'upgrade'):['mod','modification'].includes(type)?'mod':category.includes('explos')?'explosive':category.includes('cooked')?'food':category.includes('chem')?'chem':category.includes('drink')?'drink':category.includes('material')?'material':type==='gear'?'mod':'custom';
 if(process==='weapon'){hours=Number(system.weight)||null;skill=/energy/i.test(category+' '+sub)?'electronics':/gun/i.test(category+' '+sub)?'gunsmith':'blacksmith';}
 if(process==='armor'){hours=Number(system.weight)||null;skill='blacksmith';}
 if(process==='ammo'){hours=rank+1;skill=category==='energy'?'electronics':category==='special'?'engineer':'gunsmith';penalty+=5;}
 if(process==='mod'){hours=(rank+1)*2;skill=/armor|archery|melee|unarmed/i.test(category)?'blacksmith':/energy/i.test(category)?'electronics':/gun/i.test(category)?'gunsmith':'engineer';}
 if(process==='chem'){hours=(rank+1)*4;skill='chemistry';}
 if(process==='explosive'){hours=rank+2;skill='engineer';}
 if(process==='food'){skill='survival';checks=1;}
 if(process==='material'){checks=1;penalty+=10;}
 if(process==='drink'){hours=1;skill='chemistry';checks=1;penalty=-15;}
 if(process==='implant'){skill='chemistry';checks=2;penalty=-20;}
 if(process==='cybernetic'){hours=48;skill='engineer';checks=4;if(!/increase.*crafting time to 24/i.test(notes))hours=24;}
 if(process==='robot'||process==='robotBody'){skill='electronics';if(process==='robot')hours=(rank+1)*5;}
 if(process==='vehicle'){skill='pilot';checks=8;const name=String(vehicle.type??vehicle.vehicleType??category);hours=/lightweight|sea/i.test(name)?200:/civilian/i.test(name)?400:/heavy|military/i.test(name)?600:/air/i.test(name)?800:/tank/i.test(name)?1000:null;penalty=hours&&hours<=400?-10:-15;}
 if(['chassis','engine','upgrade','trailer'].includes(process)){hours={chassis:60,engine:50,upgrade:4,trailer:24}[process];skill='engineer';}
 const explicit=notes.match(/(?:crafting time (?:is|of)|takes)\s+(\d+(?:\.\d+)?)\s*(hrs?|hours?|min(?:utes)?)/i);if(explicit)hours=Number(explicit[1])*(explicit[2].startsWith('min')?1/60:1);
 const statedPenalty=notes.match(/crafting penalty (?:is|of)\s*(-\d+)/i);if(statedPenalty)penalty=Number(statedPenalty[1]);
 const artisan=notes.match(/Artisan\s*\(([^)]+)\)/i);if(artisan)skill=artisan[1].split(',')[0].trim().toLowerCase();
 const skills=process==='explosive'?Array.from({length:checks},(_,i)=>i<checks/2?'engineer':'chemistry'):process==='cybernetic'?['engineer','engineer','electronics','electronics']:Array(checks).fill(skill);
 let materials=parseMaterials(materialLines(notes)[0]??'');if(process==='vehicle'&&!materials.length)materials=vehicleFrameMaterials(vehicle,notes);
 return {name:item.name??'New Recipe',sourceUuid:item.uuid??'',process,rarity:system.rarity??'Common',hours,penalty,skills,materials,reference:notes,notes:process==='drink'?'After the successful mixing check, wait seven days; yields 40 servings. Bottles and a cask are required.':process==='cybernetic'?'Two stages: Engineer construction, then Electronics at a Computer Station. Review item-specific time overrides.':'',known:false,quantity:process==='drink'?40:1};
}
export function newProject(recipe,downtime=false){if(!recipe.known)throw Error('Mark this recipe as learned after learning its schematic or receiving GM permission.');if(!(Number(recipe.hours)>0)||!recipe.skills.length)throw Error('Enter crafting hours and checkpoint skills before starting.');if(recipe.materials.some(r=>r.amount===null))throw Error('Enter any missing material amounts before starting.');return {recipe:structuredClone(recipe),hours:Number(recipe.hours)*(downtime?2:1),elapsed:0,passed:0,status:'active',downtime,log:[],materialsLost:false};}
export function nextCheckpoint(project){return project.downtime?project.hours:project.hours*(project.passed+1)/project.recipe.skills.length;}
export function addWork(project,hours){if(project.status!=='active')throw Error('This project is not active.');if(!Number.isFinite(hours)||hours<=0)throw Error('Enter positive work hours.');const next=nextCheckpoint(project);if(project.elapsed+hours>next+1e-8)throw Error('Record the next checkpoint before adding more work.');project.elapsed=Math.min(next,project.elapsed+hours);return project;}
export function recordCheck(project,success){if(project.status!=='active'||project.elapsed+1e-8<nextCheckpoint(project))throw Error('Finish the work for this checkpoint first.');project.log.push({time:Date.now(),checkpoint:project.passed+1,success});if(project.downtime){if(!success)throw Error('Downtime crafting does not use checks.');project.status='completed';return project;}
 if(success){project.passed++;if(project.passed>=project.recipe.skills.length)project.status='completed';}else if(!project.passed){project.status='failed';project.elapsed=0;project.materialsLost=true;}else project.elapsed=project.hours*project.passed/project.recipe.skills.length;return project;}

export function vehicleFrameMaterials(vehicle,notes=''){
 const type=String(vehicle.type??vehicle.vehicleType??vehicle.category??'');const factors=/lightweight|sea/i.test(type)?[2,2,1000,100,50]:/civilian|heavy/i.test(type)?[5,4,2000,200,100]:/air|military/i.test(type)?[10,8,3000,300,150]:/tank/i.test(type)?[15,16,5000,500,250]:null;if(!factors)return [];
 const size=plainNotes(notes).match(/Size:\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*ft/i);
 const ac=Number(vehicle.ratings?.ac?.total??vehicle.ratings?.ac?.base),seating=Number(vehicle.seating);
 const amounts=[Number.isFinite(ac)?ac*factors[0]:null,Number.isFinite(seating)?seating*factors[1]:null,...[0,1,2].map(i=>size?Math.ceil(Number(size[i+1])/5)*factors[i+2]:null)];
 return ['Computer Parts','Fabric','Scrap Metal','Scrap Parts','Scrap Machinery'].map((name,i)=>({name,amount:amounts[i]>0?amounts[i]:null,unit:'lbs'}));
}
