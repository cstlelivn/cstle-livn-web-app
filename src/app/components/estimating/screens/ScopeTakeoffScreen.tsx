import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  type Estimate, updateEstimate,
  listAssembliesForPicker, type AssemblyPickerItem,
  listTakeoffLines, addTakeoffLine, confirmTakeoffLine, deleteTakeoffLine, type TakeoffLine,
} from "../../../src/features/estimating/api";

interface ScreenProps {
  estimate: Estimate;
  onRefresh: () => void;
  onAdvance: () => void;
}

export default function ScopeTakeoffScreen({ estimate, onRefresh, onAdvance }: ScreenProps) {
  const [scope, setScope] = useState(estimate.scope_of_work || "");
  const [assemblies, setAssemblies] = useState<AssemblyPickerItem[]>([]);
  const [lines, setLines] = useState<TakeoffLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ assemblyId: "", qty: "", description: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, l] = await Promise.all([listAssembliesForPicker(), listTakeoffLines(estimate.id)]);
      setAssemblies(a);
      setLines(l);
      if (!form.assemblyId && a.length) setForm((f) => ({ ...f, assemblyId: a[0].id }));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.id]);
  useEffect(() => { load(); }, [load]);

  const saveScope = async () => {
    try {
      await updateEstimate(estimate.id, { scope_of_work: scope } as any);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save scope");
    }
  };

  const handleAddLine = async () => {
    const qty = parseFloat(form.qty);
    if (!qty || qty <= 0) { toast.error("Enter a quantity"); return; }
    const assembly = assemblies.find((a) => a.id === form.assemblyId);
    try {
      const line = await addTakeoffLine({
        estimate_id: estimate.id,
        assembly_id: form.assemblyId || null,
        qty,
        unit: assembly?.unit,
        description: form.description.trim() || undefined,
        source: "confirmed",
      });
      setLines((prev) => [...prev, line]);
      setForm((f) => ({ ...f, qty: "", description: "" }));
    } catch (error: any) {
      toast.error(error?.message || "Failed to add line");
    }
  };

  const handleConfirmLine = async (id: string) => {
    try {
      const updated = await confirmTakeoffLine(id);
      setLines((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (error: any) {
      toast.error(error?.message || "Failed to confirm line");
    }
  };

  const handleRemoveLine = async (id: string) => {
    try {
      await deleteTakeoffLine(id);
      setLines((prev) => prev.filter((l) => l.id !== id));
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove line");
    }
  };

  const handleConfirmScope = async () => {
    if (lines.length === 0) { toast.error("Add at least one takeoff line first"); return; }
    if (lines.some((l) => l.source !== "confirmed")) {
      toast.error("Confirm every AI-assumption line before continuing -- click each badge to confirm it");
      return;
    }
    try {
      await saveScope();
      await updateEstimate(estimate.id, { scope_confirmed: true } as any);
      onRefresh();
      onAdvance();
    } catch (error: any) {
      toast.error(error?.message || "Failed to confirm");
    }
  };

  const assemblyName = (id: string | null) => assemblies.find((a) => a.id === id)?.name || "—";

  if (loading) return <div className="h-[200px] bg-card border border-border rounded-[12px] animate-pulse" />;

  return (
    <div className="space-y-[16px]">
      <div className="bg-card border border-border rounded-[12px] p-[16px]">
        <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[8px]">Scope of work</h2>
        <textarea value={scope} onChange={(e) => setScope(e.target.value)} onBlur={saveScope} rows={4}
          className="w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
      </div>

      <div className="bg-card border border-border rounded-[12px] p-[16px]">
        <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[4px]">Takeoff</h2>
        <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[12px]">
          Rows marked "AI Assumption" came from the AI draft and need your confirmation before pricing.
        </p>
        <div className="grid grid-cols-3 gap-[8px]">
          <select value={form.assemblyId} onChange={(e) => setForm((f) => ({ ...f, assemblyId: e.target.value }))}
            className="px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background">
            {assemblies.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.unit})</option>)}
          </select>
          <input type="number" step="0.1" value={form.qty} onChange={(e) => setForm((f) => ({ ...f, qty: e.target.value }))} placeholder="Quantity"
            className="px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description (optional)"
            className="px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
        </div>
        <button onClick={handleAddLine} className="mt-[8px] px-[10px] py-[5px] bg-secondary rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-secondary/70">Add line</button>

        {lines.length > 0 && (
          <table className="w-full mt-[12px] text-[11px]">
            <thead>
              <tr className="text-left font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase">
                <th className="pb-[6px]">Item</th><th className="pb-[6px]">Qty</th><th className="pb-[6px]">Unit</th><th className="pb-[6px]">Source</th><th></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-[6px] font-['Roboto_Mono']">{l.description || assemblyName(l.assembly_id)}</td>
                  <td className="py-[6px] font-['Roboto_Mono']">{l.qty}</td>
                  <td className="py-[6px] font-['Roboto_Mono']">{l.unit}</td>
                  <td className="py-[6px]">
                    {l.source === "confirmed" ? (
                      <span className="px-[8px] py-[1px] rounded-full text-[9px] bg-success/10 text-success border border-success/20">Confirmed</span>
                    ) : (
                      <button onClick={() => handleConfirmLine(l.id)} className="px-[8px] py-[1px] rounded-full text-[9px] bg-warning/10 text-warning border border-warning/20">
                        AI Assumption -- click to confirm
                      </button>
                    )}
                  </td>
                  <td className="py-[6px]">
                    <button onClick={() => handleRemoveLine(l.id)} className="font-['Roboto_Mono'] text-[9px] text-muted-foreground hover:text-destructive">remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <button onClick={handleConfirmScope} className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px]">
        Confirm scope & takeoff →
      </button>
    </div>
  );
}
