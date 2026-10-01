export type PrimerType = 'none'|'spot'|'full_walls'|'full_room'|'ceiling'|'stain_blocking';
export type ColourChange = 'same'|'similar'|'significant';

export interface PaintingAreaInput {
  id?: string; name: string; floor_sqft: number; ceiling_height_ft: number; coats: number;
  colour_change: ColourChange; existing_colour?: string; new_colour?: string;
  walls_included: boolean; ceiling_included: boolean; primer_type: PrimerType;
  baseboards_included: boolean; baseboard_linear_ft: number; casing_included: boolean;
  casing_linear_ft: number; interior_doors: number; closets: number; prep_level: number;
  door_details?: { method?: 'brush_roll'|'spray'; sides?: number; location?: 'on_site'|'off_site'; prep_level?: number; sanding?: boolean; priming?: boolean; finish_coats?: number };
  site_conditions?: string[]; notes?: string;
  repairs?: Array<{ category: string; quantity: number; unit_price_cents?: number|null; notes?: string }>;
}

export interface PaintingRateCard {
  id: string; version_no: number;
  customer_rates: Record<string, number>; primer_rates: Record<string, number>;
  door_rates: Record<string, number>; height_multipliers: Record<string, number>;
  condition_pricing?: Record<string, number>;
  material_settings: { wall_surface_factor?: number; coverage_sqft_per_gallon?: number; waste_percent?: number; supplier_costs?: Record<string,number> };
  internal_cost_settings?: Record<string, any>;
}

export interface PaintingCalculation {
  areaTotals: Array<{ name:string; cents:number; wallSqft:number }>;
  subtotalCents:number; discountCents:number; sellingPriceCents:number; taxCents:number; customerTotalCents:number;
  wallPaintGallons:number; ceilingPaintGallons:number; primerGallons:number;
  estimatedCostCents:number|null; grossProfitCents:number|null; grossMargin:number|null; markup:number|null;
  marginStatus:'Target'|'Acceptable'|'Caution'|'Below Minimum'|'Not configured';
  lowestPermittedPriceCents:number|null; maximumSafeDiscountCents:number|null; maximumSafeDiscountPercent:number|null;
  priceAt30Cents:number|null; priceAt40Cents:number|null; priceAt50Cents:number|null;
  estimatedHours:number|null; affordableHoursAtTarget:number|null;
}

const n = (value:any, fallback=0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const round = (value:number) => Math.max(0, Math.round(value));
const heightMultiplier = (height:number, values:Record<string,number>) => {
  const keys = Object.keys(values).map(Number).filter(Number.isFinite).sort((a,b)=>a-b);
  if (!keys.length) return 1;
  const key = keys.find((item)=>height <= item) ?? keys[keys.length-1];
  return n(values[String(key)],1);
};

export function calculatePaintingEstimate(areas:PaintingAreaInput[], card:PaintingRateCard, options?:{
  discountCents?:number; discountPercent?:number; equipmentCents?:number; subcontractorsCents?:number;
  transportationCents?:number; otherDirectCostCents?:number; estimatedHours?:number|null;
}):PaintingCalculation {
  const rates=card.customer_rates||{}; const coverage=Math.max(1,n(card.material_settings?.coverage_sqft_per_gallon,350));
  const waste=1+n(card.material_settings?.waste_percent,10)/100; const factor=n(card.material_settings?.wall_surface_factor,2.5);
  let wallPaintGallons=0, ceilingPaintGallons=0, primerGallons=0;
  const areaTotals=areas.map(area=>{
    const floor=Math.max(0,n(area.floor_sqft)); const coats=Math.max(1,n(area.coats,2));
    const hm=heightMultiplier(n(area.ceiling_height_ft,8),card.height_multipliers||{});
    let cents=0;
    if(area.walls_included){
      const wallRate=coats<=1?n(rates.walls_1_same):area.colour_change==='significant'?n(rates.walls_2_change):n(rates.walls_2_similar);
      cents+=floor*wallRate*hm; wallPaintGallons+=(floor*factor*hm*coats/coverage)*waste;
    }
    if(area.ceiling_included){ cents+=floor*n(rates.ceiling); ceilingPaintGallons+=(floor*coats/coverage)*waste; }
    const primerRate=n(card.primer_rates?.[area.primer_type]);
    if(area.primer_type!=='none'){ const primerSurface=area.primer_type==='ceiling'?floor:floor*factor*hm; cents+=primerSurface*primerRate; primerGallons+=(primerSurface/coverage)*waste; }
    if(area.baseboards_included)cents+=n(area.baseboard_linear_ft)*n(rates.trim_linear);
    if(area.casing_included)cents+=n(area.casing_linear_ft)*n(rates.trim_linear);
    const method=area.door_details?.method||'brush_roll';
    const doorRate=method==='spray'?n(card.door_rates?.[area.door_details?.location==='off_site'?'spray_off_site':'spray_on_site']):n(card.door_rates?.brush_roll,rates.door_conventional);
    cents+=Math.max(0,n(area.interior_doors))*doorRate+Math.max(0,n(area.closets))*n(card.door_rates?.closet);
    for(const repair of area.repairs||[]){
      const defaultRate=repair.category==='minor'?0:repair.category==='medium'?n(rates.medium_patch):n(rates.large_patch);
      cents+=Math.max(0,n(repair.quantity))*n(repair.unit_price_cents,defaultRate);
    }
    for(const condition of area.site_conditions||[]) cents+=cents*(n(card.condition_pricing?.[condition])/100);
    return {name:area.name,cents:round(cents),wallSqft:round(floor*factor*hm)};
  });
  const raw=areaTotals.reduce((sum,a)=>sum+a.cents,0); const subtotalCents=Math.max(round(raw),n(rates.minimum_project));
  const discountCents=Math.min(subtotalCents,Math.max(0,options?.discountCents??round(subtotalCents*n(options?.discountPercent)/100)));
  const sellingPriceCents=subtotalCents-discountCents; const taxCents=round(sellingPriceCents*n(rates.tax_percent,6)/100);
  const settings=card.internal_cost_settings; const supplier=settings?card.material_settings?.supplier_costs||{}:{};
  const materialsCents=settings?round(wallPaintGallons*n(supplier.wall_paint_per_gallon)+ceilingPaintGallons*n(supplier.ceiling_paint_per_gallon)+primerGallons*n(supplier.primer_per_gallon)):null;
  const painter=n(settings?.painter_hourly_cents); const helper=n(settings?.helper_hourly_cents); const painters=n(settings?.painter_count,1); const helpers=n(settings?.helper_count);
  const baseHours=options?.estimatedHours??null; const setup=n(settings?.setup_hours)+n(settings?.cleanup_hours)+n(settings?.travel_hours);
  const estimatedHours=baseHours==null?null:n(baseHours)+setup;
  const burden=1+n(settings?.payroll_burden_percent)/100; const blended=(painter*painters+helper*helpers)/Math.max(1,painters+helpers)*burden;
  const labour=estimatedHours==null?0:round(estimatedHours*blended);
  const other=n(options?.equipmentCents)+n(options?.subcontractorsCents)+n(options?.transportationCents)+n(options?.otherDirectCostCents);
  const direct=settings?labour+n(materialsCents)+other:null; const estimatedCostCents=direct==null?null:round(direct*(1+n(settings?.overhead_percent)/100));
  const grossProfitCents=estimatedCostCents==null?null:sellingPriceCents-estimatedCostCents;
  const grossMargin=estimatedCostCents==null||sellingPriceCents<=0?null:(grossProfitCents!/sellingPriceCents)*100;
  const markup=estimatedCostCents==null||estimatedCostCents<=0?null:(grossProfitCents!/estimatedCostCents)*100;
  const minMargin=n(settings?.minimum_margin_percent,30)/100; const targetMargin=n(settings?.target_margin_percent,50)/100;
  const lowest=estimatedCostCents==null?null:round(estimatedCostCents/(1-minMargin));
  const safe=lowest==null?null:Math.max(0,subtotalCents-lowest);
  const affordable=blended>0&&materialsCents!=null?Math.max(0,(subtotalCents*(1-targetMargin)-materialsCents-other)/blended):null;
  const marginStatus=grossMargin==null?'Not configured':grossMargin>=50?'Target':grossMargin>=40?'Acceptable':grossMargin>=30?'Caution':'Below Minimum';
  return {areaTotals,subtotalCents,discountCents,sellingPriceCents,taxCents,customerTotalCents:sellingPriceCents+taxCents,wallPaintGallons,ceilingPaintGallons,primerGallons,estimatedCostCents,grossProfitCents,grossMargin,markup,marginStatus,lowestPermittedPriceCents:lowest,maximumSafeDiscountCents:safe,maximumSafeDiscountPercent:safe==null||subtotalCents<=0?null:safe/subtotalCents*100,priceAt30Cents:estimatedCostCents==null?null:round(estimatedCostCents/.7),priceAt40Cents:estimatedCostCents==null?null:round(estimatedCostCents/.6),priceAt50Cents:estimatedCostCents==null?null:round(estimatedCostCents/.5),estimatedHours,affordableHoursAtTarget:affordable};
}
