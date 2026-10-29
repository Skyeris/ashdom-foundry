// Generated plans remain inventory items, never usable copies of their source equipment.
// Paper (Sheet) in the core compendium weighs 0.01 lb.
export function schematicWeight(rarity){return (Math.max(0,['Common','Uncommon','Rare','Radical','Atomic'].indexOf(rarity))+1)*5/100;}
export function schematicDocument(item){
 const source=item.system?.toObject?.()??item.system??{};
 return {name:`${item.name} Schematic`,type:'misc',img:item.img,system:{category:'Schematics',rarity:source.rarity??'Common',condition:'Pristine',quantity:1,weight:schematicWeight(source.rarity),value:Number(source.value)||0,schematic:true,sourceItemUuid:item.uuid??'',note:`Schematic for ${item.name}. Reference the original item for crafting requirements; this is not the finished item.`}};
}
export function schematicResult(item,quantity=1){return {uuid:item.uuid,name:`${item.name} Schematic`,img:item.img,rarity:item.system.rarity,quantity,schematic:true};}
