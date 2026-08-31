import { useState } from "react";
import { Eye, EyeOff, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { type Estimate, updateEstimate, listTakeoffLines, confirmTakeoffLine } from "../../../src/features/estimating/api";
import { runPricing, type PricingResponse } from "../../../src/features/estimating/aiApi";

const money = (cents?: number) => `$${Math.round((cents || 0) / 100).toLocaleString("en-CA")}`;

export default function RapidReviewScreen({ estimate, onRefresh, onAdvance }: { estimate: Estimate; onRefresh: () => void; onAdvance: () => void }) {
  const [scope, setScope] = useState(estimate.scope_of_work || estimate.ai_analysis?.scopeOfWork || "");
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [agreed, setAgreed] = useState(estimate.agreed_price_cents ? String(estimate.agreed_price_cents / 100) : "");
  const [privateView, setPrivateView] = useState(true);
  const [busy, setBusy] = useState(false);

  const calculate = async () => {
    if (!scope.trim()) return toast.error("Add the scope before pricing");
    setBusy(true);
    try {
      await updateEstimate(estimate.id, { scope_of_work: scope.trim(), scope_confirmed: true, plan_confirmed: true } as any);
      const lines = await listTakeoffLines(estimate.id);
      await Promise.all(lines.filter((line) => line.source !== "confirmed").map((line) => confirmTakeoffLine(line.id)));
      const result = await runPricing(estimate.id, true);
      setPricing(result);
      if (!agreed) setAgreed(String(Math.round(result.pricing.selling_price_good_cents / 100)));
      toast.success("Price recommendation ready");
    } catch (error: any) { toast.error(error?.message || "Pricing could not be calculated"); }
    finally { setBusy(false); }
  };

  const p = pricing?.pricing;
  const finish = async () => {
    const price = Math.round((Number(agreed) || 0) * 100);
    if (!price) return toast.error("Enter the client price");
    try { await updateEstimate(estimate.id, { scope_of_work: scope.trim(), agreed_price_cents: price, pricing_confirmed: true } as any); await onRefresh(); onAdvance(); }
    catch (error: any) { toast.error(error?.message?.includes("agreed_price_cents") ? "The rapid-estimate database update must be activated first." : error?.message || "Could not save pricing"); }
  };

  return <div className="space-y-4">
    <section className="rounded-2xl border border-black/[0.07] bg-white p-5 shadow-[0_20px_60px_rgba(30,32,22,.06)] sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.12em] text-[#65733d]">02 · Review</p><h1 className="mt-2 text-[23px] font-semibold leading-tight tracking-[-0.035em] text-[#191919] sm:text-[30px]">The scope, cleaned up.<br />Nothing quietly added.</h1></div><Sparkles className="size-5 shrink-0 text-[#65733d]" /></div>
      <textarea value={scope} onChange={(e) => setScope(e.target.value)} rows={7} className="mt-5 w-full resize-y rounded-xl border border-black/10 bg-[#fafaf7] p-4 text-[13px] leading-relaxed text-[#242424] outline-none transition focus:border-[#65733d]/55 focus:ring-4 focus:ring-[#65733d]/10" />
      {estimate.ai_analysis?.questions?.length > 0 && <details className="mt-3 rounded-xl border border-amber-900/10 bg-[#fbf8ef] p-3"><summary className="cursor-pointer text-[11px] font-medium text-[#6d5d2d]">{estimate.ai_analysis.questions.length} item{estimate.ai_analysis.questions.length === 1 ? "" : "s"} worth confirming</summary><ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] leading-relaxed text-black/55">{estimate.ai_analysis.questions.map((q: string, i: number) => <li key={i}>{q}</li>)}</ul></details>}
    </section>

    <section className="overflow-hidden rounded-2xl border border-[#65733d]/20 bg-[#22251c] text-white shadow-[0_24px_70px_rgba(24,28,15,.18)]">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(134,151,82,.35),transparent_45%)] p-5 sm:p-7">
        <div className="flex items-center justify-between"><p className="font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.12em] text-[#cbd5ac]">Recommended client price</p><button onClick={() => setPrivateView((v) => !v)} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1.5 font-['Roboto_Mono'] text-[8px] uppercase text-white/65">{privateView ? <Eye className="size-3" /> : <EyeOff className="size-3" />}{privateView ? "Private details" : "Hide details"}</button></div>
        <p className="mt-3 text-[42px] font-semibold leading-none tracking-[-0.055em] tabular-nums sm:text-[58px]">{p ? money(p.selling_price_good_cents) : busy ? "Pricing…" : "Review scope first"}</p>
        <p className="mt-3 max-w-lg text-[10px] leading-relaxed text-white/48">Based on Cstle’s active rate card, assemblies, labour, overhead and margin rules. Review supplier-sensitive items before sending.</p>
        {!privateView && pricing?.canViewMargins && p && <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4 font-['Roboto_Mono'] text-[9px] text-white/45"><span>Cost <b className="text-white/75">{money(p.total_cost_cents)}</b></span><span>Gross profit <b className="text-white/75">{money(p.gp_good_cents)}</b></span><span>Margin <b className="text-white/75">{((p.margin_good || 0) * 100).toFixed(1)}%</b></span></div>}
      </div>
      <div className="border-t border-white/10 bg-black/10 p-5 sm:flex sm:items-end sm:justify-between sm:gap-5 sm:p-7"><div className="flex-1"><label className="font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.1em] text-white/50">Price going to the client</label><div className="mt-2 flex items-center rounded-xl border border-white/15 bg-white/[0.07] px-4 focus-within:border-[#b9c98a]"><span className="text-[18px] text-white/45">$</span><input inputMode="decimal" value={agreed} onChange={(e) => setAgreed(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" className="min-w-0 flex-1 bg-transparent px-2 py-3 text-[22px] font-semibold tabular-nums text-white outline-none placeholder:text-white/20" /></div></div><button onClick={calculate} disabled={busy} className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 text-[10px] font-medium text-white/75 hover:bg-white/10 sm:mt-0"><RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} /> {p ? "Recalculate" : "Calculate price"}</button></div>
    </section>
    <button onClick={finish} disabled={busy || !agreed} className="sticky bottom-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#65733d] px-5 text-[12px] font-semibold text-white shadow-[0_14px_30px_rgba(66,77,36,.28)] disabled:opacity-40 sm:static sm:ml-auto sm:w-auto sm:min-w-[260px]">Create estimate <ArrowRight className="size-4" /></button>
  </div>;
}
