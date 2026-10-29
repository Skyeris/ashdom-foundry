export function descriptionUsesPL(perk){const note=String(perk.note??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ');return /\bwithin\s+(?:(?:your|the)\s+)?PL\b|\b(?:radius|range)\s+(?:of\s+)?(?:your\s+)?PL\b/i.test(note);}
export function usesPL(perk){return typeof perk.radiusUsePL==='boolean'?perk.radiusUsePL:descriptionUsesPL(perk);}
export function writtenRadius(perk){const match=String(perk.name??'').match(/\(\s*(\d+(?:\.\d+)?)\s*(?:ft\.?|feet|foot)\s*\)/i);return match?Number(match[1]):0;}
export function manualRadius(perk){return perk.radius==null?writtenRadius(perk):Math.max(0,Number(perk.radius)||0);}
export function effectiveRadius(perk,system){return usesPL(perk)?Math.max(0,Number(system.secondary?.pl?.total)||0):manualRadius(perk);}
