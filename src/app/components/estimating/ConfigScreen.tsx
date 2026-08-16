import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  listMarginTiers, updateMarginTier,
  getRateCard, updateRateCard,
  listAssembliesFull, createAssembly, updateAssembly, deleteAssembly,
} from "../../src/features/estimating/api";
import type { MarginTier } from "../../src/features/estimating/pricingEngine";

const dollars = (cents: number) => (cents / 100).toFixed(2);
const toCents = (dollarStr: string) => Math.round((parseFloat(dollarStr) || 0) * 100);

export default function ConfigScreen() {
  const [tab, setTab] = useState<"tiers" | "ratecard">("tiers");
  const [tiers, setTiers] = useState<MarginTier[]>([]);
  const [rateCard, setRateCard] = useState<any>(null);
  const [assemblies, setAssemblies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, rc, a] = await Promise.all([listMarginTiers(), getRateCard(), listAssembliesFull()]);
      setTiers(t); setRateCard(rc); setAssemblies(a);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load estimating config");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const saveTier = async (id: string, updates: Partial<MarginTier>) => {
    setTiers((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    try {
      await updateMarginTier(id, updates);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save tier");
      load();
    }
  };

  const saveRateCard = async () => {
    setSaving(true);
    try {
      await updateRateCard(rateCard.id, rateCard);
      toast.success("Rate card saved");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save rate card");
    } finally {
      setSaving(false);
    }
  };

  const addAssembly = async () => {
    try {
      await createAssembly({ category: "General", name: "New assembly", unit: "each", material_cost_per_unit_cents: 0, labor_hours_per_unit: 0, waste_factor: 0, active: true });
      load();
    } catch (error: any) {
      toast.error(error?.message || "Failed to add assembly");
    }
  };

  const saveAssembly = async (id: string, updates: any) => {
    setAssemblies((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));
    try {
      await updateAssembly(id, updates);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save assembly");
      load();
    }
  };

  const removeAssembly = async (id: string) => {
    try {
      await deleteAssembly(id);
      setAssemblies((prev) => prev.filter((a) => a.id !== id));
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove assembly");
    }
  };

  if (loading) return <div className="h-[200px] bg-card border border-border rounded-[12px] animate-pulse" />;

  return (
    <div className="space-y-[16px]">
      <div className="flex gap-[6px]">
        <button onClick={() => setTab("tiers")} className={`px-[12px] py-[6px] rounded-[6px] border font-['Roboto_Mono'] text-[11px] ${tab === "tiers" ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground"}`}>Margin Tiers</button>
        <button onClick={() => setTab("ratecard")} className={`px-[12px] py-[6px] rounded-[6px] border font-['Roboto_Mono'] text-[11px] ${tab === "ratecard" ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground"}`}>Rate Card & Assemblies</button>
      </div>

      {tab === "tiers" ? (
        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[4px]">Margin tiers</h2>
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[12px]">
            The pricing backbone -- from the company's profitability framework. Smaller jobs need a higher percentage margin since mobilization/admin cost is roughly fixed.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase">
                  <th className="pb-[8px]">Tier</th>
                  <th className="pb-[8px]">Min margin</th>
                  <th className="pb-[8px]">Target margin</th>
                  <th className="pb-[8px]">Typical weeks</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="py-[6px] font-['Roboto_Mono']">{t.label}</td>
                    <td className="py-[6px]">
                      <input type="number" step="0.01" defaultValue={t.min_margin} onBlur={(e) => saveTier(t.id, { min_margin: parseFloat(e.target.value) || 0 })}
                        className="w-[70px] px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
                    </td>
                    <td className="py-[6px]">
                      <input type="number" step="0.01" defaultValue={t.target_margin} onBlur={(e) => saveTier(t.id, { target_margin: parseFloat(e.target.value) || 0 })}
                        className="w-[70px] px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
                    </td>
                    <td className="py-[6px]">
                      <input type="number" step="0.1" defaultValue={t.typical_weeks} onBlur={(e) => saveTier(t.id, { typical_weeks: parseFloat(e.target.value) || 0 })}
                        className="w-[70px] px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <>
          {rateCard && (
            <div className="bg-card border border-border rounded-[12px] p-[16px]">
              <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[12px]">Rate card</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-[10px]">
                {[
                  ["labor_rate_cents", "Burdened labor rate ($/hr)"],
                  ["minimum_charge_cents", "Minimum charge ($)"],
                  ["delivery_flat_cents", "Default delivery fee ($)"],
                  ["disposal_flat_cents", "Default disposal fee ($)"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">{label}</label>
                    <input
                      type="number" step="0.01" defaultValue={dollars(rateCard[key])}
                      onChange={(e) => setRateCard((rc: any) => ({ ...rc, [key]: toCents(e.target.value) }))}
                      className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background"
                    />
                  </div>
                ))}
                {[
                  ["overhead_pct", "Overhead (%)"],
                  ["contingency_pct", "Contingency (%)"],
                  ["tax_pct", "Tax (%)"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">{label}</label>
                    <input
                      type="number" step="0.01" defaultValue={rateCard[key]}
                      onChange={(e) => setRateCard((rc: any) => ({ ...rc, [key]: parseFloat(e.target.value) || 0 }))}
                      className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background"
                    />
                  </div>
                ))}
                <div>
                  <label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">Default crew size</label>
                  <input
                    type="number" defaultValue={rateCard.default_crew_size}
                    onChange={(e) => setRateCard((rc: any) => ({ ...rc, default_crew_size: parseInt(e.target.value) || 1 }))}
                    className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background"
                  />
                </div>
              </div>
              <button onClick={saveRateCard} disabled={saving} className="mt-[12px] px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
                {saving ? "Saving…" : "Save Rate Card"}
              </button>
            </div>
          )}

          <div className="bg-card border border-border rounded-[12px] p-[16px]">
            <div className="flex items-center justify-between mb-[12px]">
              <h2 className="font-['Roboto_Mono'] font-bold text-[13px]">Reusable assemblies</h2>
              <button onClick={addAssembly} className="flex items-center gap-[4px] px-[10px] py-[5px] bg-secondary rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-secondary/70">
                <Plus className="w-3 h-3" /> Add assembly
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-left font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase">
                    <th className="pb-[8px]">Name</th>
                    <th className="pb-[8px]">Category</th>
                    <th className="pb-[8px]">Unit</th>
                    <th className="pb-[8px]">Material $/unit</th>
                    <th className="pb-[8px]">Labor hrs/unit</th>
                    <th className="pb-[8px]">Waste %</th>
                    <th className="pb-[8px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {assemblies.map((a) => (
                    <tr key={a.id} className="border-t border-border">
                      <td className="py-[6px]"><input defaultValue={a.name} onBlur={(e) => saveAssembly(a.id, { name: e.target.value })} className="w-full px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px] bg-input-background" /></td>
                      <td className="py-[6px]"><input defaultValue={a.category} onBlur={(e) => saveAssembly(a.id, { category: e.target.value })} className="w-[100px] px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px] bg-input-background" /></td>
                      <td className="py-[6px]"><input defaultValue={a.unit} onBlur={(e) => saveAssembly(a.id, { unit: e.target.value })} className="w-[80px] px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px] bg-input-background" /></td>
                      <td className="py-[6px]"><input type="number" step="0.01" defaultValue={dollars(a.material_cost_per_unit_cents)} onBlur={(e) => saveAssembly(a.id, { material_cost_per_unit_cents: toCents(e.target.value) })} className="w-[80px] px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px] bg-input-background" /></td>
                      <td className="py-[6px]"><input type="number" step="0.01" defaultValue={a.labor_hours_per_unit} onBlur={(e) => saveAssembly(a.id, { labor_hours_per_unit: parseFloat(e.target.value) || 0 })} className="w-[70px] px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px] bg-input-background" /></td>
                      <td className="py-[6px]"><input type="number" step="0.01" defaultValue={a.waste_factor} onBlur={(e) => saveAssembly(a.id, { waste_factor: parseFloat(e.target.value) || 0 })} className="w-[70px] px-[6px] py-[3px] border border-border rounded-[4px] font-['Roboto_Mono'] text-[10px] bg-input-background" /></td>
                      <td className="py-[6px]">
                        <button onClick={() => removeAssembly(a.id)} className="p-[4px] hover:bg-destructive/10 rounded-[4px]">
                          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
