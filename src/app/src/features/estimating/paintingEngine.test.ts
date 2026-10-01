import { describe, expect, it } from 'vitest';
import { calculatePaintingEstimate, type PaintingRateCard } from './paintingEngine';

const card:PaintingRateCard={id:'card',version_no:1,customer_rates:{walls_1_same:150,walls_2_similar:225,walls_2_change:275,ceiling:75,trim_linear:150,door_conventional:10000,medium_patch:3000,large_patch:7500,minimum_project:50000,tax_percent:6},primer_rates:{none:0,full_walls:50},door_rates:{brush_roll:10000,closet:8500},height_multipliers:{'8':1,'9':1,'10':1.12},material_settings:{wall_surface_factor:2.5,coverage_sqft_per_gallon:350,waste_percent:10,supplier_costs:{wall_paint_per_gallon:5000}},internal_cost_settings:{painter_hourly_cents:4000,helper_hourly_cents:null,painter_count:1,helper_count:0,payroll_burden_percent:0,target_margin_percent:50,minimum_margin_percent:30,overhead_percent:0}};
const area={name:'Bedroom',floor_sqft:100,ceiling_height_ft:8,coats:2,colour_change:'similar' as const,walls_included:true,ceiling_included:false,primer_type:'none' as const,baseboards_included:false,baseboard_linear_ft:0,casing_included:false,casing_linear_ft:0,interior_doors:0,closets:0,prep_level:1};

describe('painting estimate math',()=>{
  it('uses the CSTLE floor-area rate and minimum without inventing production hours',()=>{const result=calculatePaintingEstimate([area],card);expect(result.subtotalCents).toBe(50000);expect(result.estimatedHours).toBeNull();expect(result.wallPaintGallons).toBeCloseTo(1.5714,3);});
  it('keeps margin and markup distinct and calculates the 30% floor',()=>{const result=calculatePaintingEstimate([area],card,{estimatedHours:5});expect(result.estimatedCostCents).toBeGreaterThan(0);expect(result.grossMargin).not.toBe(result.markup);expect(result.lowestPermittedPriceCents).toBe(Math.round(result.estimatedCostCents!/.7));});
  it('calculates tax after discount',()=>{const result=calculatePaintingEstimate([area],card,{discountPercent:10});expect(result.sellingPriceCents).toBe(45000);expect(result.taxCents).toBe(2700);expect(result.customerTotalCents).toBe(47700);});
});
