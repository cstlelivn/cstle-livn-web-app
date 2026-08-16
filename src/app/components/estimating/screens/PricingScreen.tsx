import { useState, useEffect } from "react";
import { toast } from "sonner";
import { type Estimate, updateEstimate } from "../../../src/features/estimating/api";
import { runPricing, type PricingResponse } from "../../../src/features/estimating/aiApi";

interface ScreenProps {
  estimate: Estimate;
  onRefresh: () => void;
  onAdvance: () => void;
}

const dollars = (cents?: number) => `$${Math.round((cents || 0) / 100).toLocaleString("en-US")}`;
const pct = (n?: number) => `${((n || 0) * 100).toFixed(1)}%`;

export default function PricingScreen({ estimate, onRefresh, onAdvance }: ScreenProps) {
  const [extras, setExtras] = useState({
    equipment: String((estimate.pricing_equipment_cents || 0) / 100),
    subcontractor: String((estimate.pricing_subcontractor_cents || 0) / 100),
    delivery: String((estimate.pricing_delivery_cents || 0) / 100),
    disposal: String((estimate.pricing_disposal_cents || 0) / 100),
    crewSize: String(estimate.pricing_crew_size || ""),
  });
  const [result, setResult] = useState<PricingResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const saveExtras = async () => {
    await updateEstimate(estimate.id, {
      pricing_equipment_cents: Math.round((parseFloat(extras.equipment) || 0) * 100),
      pricing_subcontractor_cents: Math.round((parseFloat(extras.subcontractor) || 0) * 100),
      pricing_delivery_cents: Math.round((parseFloat(extras.delivery) || 0) * 100),
      pricing_disposal_cents: Math.round((parseFloat(extras.disposal) || 0) * 100),
      pricing_crew_size: extras.crewSize ? parseInt(extras.crewSize) : null,
    } as any);
  };

  const recalc = async (confirm: boolean) => {
    setBusy(true);
    try {
      await saveExtras();
      const res = await runPricing(estimate.id, confirm);
      setResult(res);
      if (confirm) {
        toast.success("Pricing confirmed");
        onRefresh();
        onAdvance();
      }
    } catch (error: any) {
      toast.error(error?.message || "Pricing failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { recalc(false); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const p = result?.pricing;

  return (
    <div className="space-y-[16px]">
      <div className="grid md:grid-cols-2 gap-[16px]">
        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[12px]">Extras</h2>
          <div className="grid grid-cols-2 gap-[8px]">
            <div><label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">Equipment ($)</label>
              <input type="number" value={extras.equipment} onChange={(e) => setExtras((x) => ({ ...x, equipment: e.target.value }))} className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" /></div>
            <div><label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">Subcontractor ($)</label>
              <input type="number" value={extras.subcontractor} onChange={(e) => setExtras((x) => ({ ...x, subcontractor: e.target.value }))} className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" /></div>
            <div><label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">Delivery ($)</label>
              <input type="number" value={extras.delivery} onChange={(e) => setExtras((x) => ({ ...x, delivery: e.target.value }))} className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" /></div>
            <div><label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">Disposal ($)</label>
              <input type="number" value={extras.disposal} onChange={(e) => setExtras((x) => ({ ...x, disposal: e.target.value }))} className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" /></div>
          </div>
          <label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground block mt-[8px]">Crew size <span className="text-muted-foreground/70">(for duration estimate -- leave blank for company default)</span></label>
          <input type="number" value={extras.crewSize} onChange={(e) => setExtras((x) => ({ ...x, crewSize: e.target.value }))} className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
          <button onClick={() => recalc(false)} disabled={busy} className="mt-[10px] px-[12px] py-[6px] bg-secondary rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-secondary/70 disabled:opacity-50">
            {busy ? "Calculating…" : "Recalculate"}
          </button>
        </div>

        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[10px]">Pricing</h2>
          {p ? (
            <>
              {result?.canViewMargins && (
                <table className="w-full text-[11px] mb-[10px]">
                  <tbody>
                    <tr><td className="py-[2px] text-muted-foreground">Material</td><td className="py-[2px] text-right font-['Roboto_Mono']">{dollars(p.material_total_cents)}</td></tr>
                    <tr><td className="py-[2px] text-muted-foreground">Labor ({(p.labor_hours_total || 0).toFixed(1)} hrs)</td><td className="py-[2px] text-right font-['Roboto_Mono']">{dollars(p.labor_cost_total_cents)}</td></tr>
                    <tr><td className="py-[2px] font-bold">Direct cost</td><td className="py-[2px] text-right font-['Roboto_Mono'] font-bold">{dollars(p.direct_cost_cents)}</td></tr>
                    <tr><td className="py-[2px] text-muted-foreground">Overhead</td><td className="py-[2px] text-right font-['Roboto_Mono']">{dollars(p.overhead_cents)}</td></tr>
                    <tr><td className="py-[2px] text-muted-foreground">Contingency</td><td className="py-[2px] text-right font-['Roboto_Mono']">{dollars(p.contingency_cents)}</td></tr>
                    <tr><td className="py-[2px] font-bold">Total cost</td><td className="py-[2px] text-right font-['Roboto_Mono'] font-bold">{dollars(p.total_cost_cents)}</td></tr>
                  </tbody>
                </table>
              )}
              <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[10px]">
                Tier: <strong className="text-foreground">{p.tier_label}</strong> · duration ~{p.duration_weeks.toFixed(1)} weeks with a {p.crew_size}-person crew
              </p>
              <div className="grid grid-cols-3 gap-[8px]">
                {[
                  { label: "Good", price: p.selling_price_good_cents, gp: p.gp_good_cents, margin: p.margin_good },
                  { label: "Better", price: p.selling_price_better_cents, gp: p.gp_better_cents, margin: p.margin_better },
                  { label: "Best", price: p.selling_price_best_cents, gp: p.gp_best_cents, margin: p.margin_best },
                ].map((t) => (
                  <div key={t.label} className="border border-border rounded-[9px] p-[10px] bg-secondary/20">
                    <p className="font-['Roboto_Mono'] text-[9px] uppercase tracking-wide text-muted-foreground">{t.label}</p>
                    <p className="font-['Roboto_Mono'] font-bold text-[16px]">{dollars(t.price)}</p>
                    {result?.canViewMargins && <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">GP {dollars(t.gp)} ({pct(t.margin)})</p>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">{busy ? "Calculating…" : "No pricing yet."}</p>
          )}
        </div>
      </div>

      {p && (
        <button onClick={() => recalc(true)} disabled={busy} className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
          Confirm pricing & margin →
        </button>
      )}
    </div>
  );
}
