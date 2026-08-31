import { useState } from "react";
import { ArrowLeft, Camera, Sparkles, FileText, Check } from "lucide-react";
import { useEstimate } from "../../src/features/estimating/useEstimates";
import CaptureScreen from "./screens/CaptureScreen";
import RapidReviewScreen from "./screens/RapidReviewScreen";
import EstimateSheetScreen from "./screens/EstimateSheetScreen";

const FLOW = [
  { key: "capture", label: "Capture", icon: Camera },
  { key: "review", label: "Review & price", icon: Sparkles },
  { key: "estimate", label: "Estimate", icon: FileText },
] as const;
type FlowKey = typeof FLOW[number]["key"];

export default function EstimateWorkspace({ estimateId, onBack }: { estimateId: string; onBack: () => void }) {
  const { estimate, loading, refresh } = useEstimate(estimateId);
  const [step, setStep] = useState<FlowKey>("capture");
  if (loading) return <div className="h-[260px] animate-pulse rounded-2xl border border-black/5 bg-[#f5f5f1]" />;
  if (!estimate) return <div className="py-12 text-center text-sm text-muted-foreground">Estimate not found.</div>;
  const activeIndex = FLOW.findIndex((item) => item.key === step);
  const go = async (next: FlowKey) => { await refresh(); setStep(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="mx-auto w-full max-w-[1180px] space-y-4 pb-28 sm:pb-10">
    <header className="sticky top-0 z-20 -mx-4 border-b border-black/[0.06] bg-[#f8f8f5]/95 px-4 pb-3 pt-1 backdrop-blur-xl sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-5 sm:py-4">
      <div className="flex items-center gap-3"><button onClick={onBack} aria-label="Back to estimates" className="grid size-10 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-[#262626] shadow-sm transition hover:-translate-y-px hover:shadow-md"><ArrowLeft className="size-4" /></button><div className="min-w-0 flex-1"><p className="truncate text-[16px] font-semibold leading-tight text-[#1d1e1b]">{estimate.name}</p><p className="mt-1 truncate font-['Roboto_Mono'] text-[9px] uppercase tracking-[0.08em] text-black/45">{estimate.site_address || "Address not added"}</p></div><span className="hidden rounded-full bg-[#e9eddd] px-3 py-1.5 font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.08em] text-[#586338] sm:block">20-minute estimate</span></div>
      <nav className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-black/[0.045] p-1" aria-label="Estimate progress">{FLOW.map((item, index) => { const Icon = item.icon; const done = index < activeIndex; const active = item.key === step; return <button key={item.key} onClick={() => index <= activeIndex && setStep(item.key)} className={`flex min-h-10 items-center justify-center gap-1.5 rounded-[9px] px-2 font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.04em] transition ${active ? "bg-white text-[#1f2514] shadow-[0_2px_12px_rgba(31,37,20,.08)]" : done ? "text-[#5e693d]" : "text-black/35"}`}><span className={`grid size-5 place-items-center rounded-full ${active ? "bg-[#65733d] text-white" : done ? "bg-[#dce3c8] text-[#4e5b2e]" : "bg-black/[0.05]"}`}>{done ? <Check className="size-3" /> : <Icon className="size-3" />}</span><span className="hidden min-[380px]:inline">{item.label}</span></button>; })}</nav>
    </header>
    {step === "capture" && <CaptureScreen estimate={estimate} onRefresh={refresh} onAdvance={() => go("review")} />}
    {step === "review" && <RapidReviewScreen estimate={estimate} onRefresh={refresh} onAdvance={() => go("estimate")} />}
    {step === "estimate" && <EstimateSheetScreen estimate={estimate} onRefresh={refresh} />}
  </div>;
}
