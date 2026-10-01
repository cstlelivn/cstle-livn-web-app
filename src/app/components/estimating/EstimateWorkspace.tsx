import { useState } from "react";
import { ArrowLeft, Camera, Sparkles, FileText, Check, Trash2, PaintRoller, ListPlus } from "lucide-react";
import { useEstimate } from "../../src/features/estimating/useEstimates";
import { deleteEstimate } from "../../src/features/estimating/api";
import { useAuth } from "../AuthContext";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { toast } from "sonner";
import CaptureScreen from "./screens/CaptureScreen";
import RapidReviewScreen from "./screens/RapidReviewScreen";
import EstimateSheetScreen from "./screens/EstimateSheetScreen";
import PaintingEstimatorScreen from "./screens/PaintingEstimatorScreen";
import QuoteBuilderScreen from "./screens/QuoteBuilderScreen";

const FLOW = [
  { key: "capture", label: "Capture", icon: Camera },
  { key: "painting", label: "Painting", icon: PaintRoller },
  { key: "review", label: "Review & price", icon: Sparkles },
  { key: "quote", label: "Build quote", icon: ListPlus },
  { key: "estimate", label: "Estimate", icon: FileText },
] as const;
type FlowKey = typeof FLOW[number]["key"];

export default function EstimateWorkspace({ estimateId, onBack }: { estimateId: string; onBack: () => void }) {
  const { currentUser } = useAuth();
  const { estimate, loading, refresh } = useEstimate(estimateId);
  const [step, setStep] = useState<FlowKey>("capture");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);
  if (loading) return <div className="h-[260px] animate-pulse rounded-2xl border border-black/5 bg-[#f5f5f1]" />;
  if (!estimate) return <div className="py-12 text-center text-sm text-muted-foreground">Estimate not found.</div>;
  const activeIndex = FLOW.findIndex((item) => item.key === step);
  const go = async (next: FlowKey) => { await refresh(); setStep(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const confirmDelete = async () => {
    if (deleteText.trim() !== estimate.name) return;
    setDeleting(true);
    try {
      await deleteEstimate(estimate.id);
      toast.success("Estimate permanently deleted");
      onBack();
    } catch (error: any) {
      toast.error("Estimate could not be deleted", { description: error?.message || undefined, duration: 7000 });
      setDeleting(false);
    }
  };
  return <div className="mx-auto w-full max-w-[1180px] space-y-4 pb-28 sm:pb-10">
    <header className="sticky top-0 z-20 -mx-4 border-b border-black/[0.06] bg-[#f8f8f5]/95 px-4 pb-3 pt-1 backdrop-blur-xl sm:static sm:mx-0 sm:rounded-2xl sm:border sm:px-5 sm:py-4">
      <div className="flex items-center gap-3"><button onClick={onBack} aria-label="Back to estimates" className="grid size-10 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-[#262626] shadow-sm transition hover:-translate-y-px hover:shadow-md"><ArrowLeft className="size-4" /></button><div className="min-w-0 flex-1"><p className="truncate text-[16px] font-semibold leading-tight text-[#1d1e1b]">{estimate.name}</p><p className="mt-1 truncate font-['Roboto_Mono'] text-[9px] uppercase tracking-[0.08em] text-black/45">{estimate.site_address || "Address not added"}</p></div><span className="hidden rounded-full bg-[#e9eddd] px-3 py-1.5 font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.08em] text-[#586338] sm:block">20-minute estimate</span>{currentUser?.role === "Super Admin" && <button type="button" onClick={() => { setDeleteText(""); setDeleteOpen(true); }} className="grid size-10 shrink-0 place-items-center rounded-full border border-destructive/25 text-destructive hover:bg-destructive/10" aria-label={`Delete ${estimate.name}`}><Trash2 className="size-4" /></button>}</div>
      <nav className="mt-4 grid grid-cols-5 gap-1 rounded-xl bg-black/[0.045] p-1" aria-label="Estimate progress">{FLOW.map((item, index) => { const Icon = item.icon; const done = index < activeIndex; const active = item.key === step; return <button key={item.key} onClick={() => (index <= activeIndex || item.key === "painting" || item.key === "quote") && setStep(item.key)} className={`flex min-h-10 items-center justify-center gap-1 rounded-[9px] px-1 font-['Roboto_Mono'] text-[8px] font-bold uppercase tracking-[0.02em] transition ${active ? "bg-white text-[#1f2514] shadow-[0_2px_12px_rgba(31,37,20,.08)]" : done ? "text-[#5e693d]" : "text-black/35"}`}><span className={`grid size-5 place-items-center rounded-full ${active ? "bg-[#65733d] text-white" : done ? "bg-[#dce3c8] text-[#4e5b2e]" : "bg-black/[0.05]"}`}>{done ? <Check className="size-3" /> : <Icon className="size-3" />}</span><span className="hidden min-[480px]:inline">{item.label}</span></button>; })}</nav>
    </header>
    {step === "capture" && <CaptureScreen estimate={estimate} onRefresh={refresh} onAdvance={() => go("review")} onPainting={() => go("painting")} />}
    {step === "painting" && <PaintingEstimatorScreen estimate={estimate} onRefresh={refresh} onAdvance={() => go("quote")} />}
    {step === "review" && <RapidReviewScreen estimate={estimate} onRefresh={refresh} onAdvance={() => go("quote")} />}
    {step === "quote" && <QuoteBuilderScreen estimate={estimate} onRefresh={refresh} onAdvance={() => go("estimate")} />}
    {step === "estimate" && <EstimateSheetScreen estimate={estimate} onRefresh={refresh} />}
    <Dialog open={deleteOpen} onOpenChange={(next) => { if (!deleting) setDeleteOpen(next); }}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader><DialogTitle>Permanently delete “{estimate.name}”?</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2"><p className="text-sm text-muted-foreground">This removes the estimate, measurements, proposal, pricing history, approvals, and attached R2 files. A converted project is preserved and must be deleted separately. This cannot be undone.</p><div><Label className="font-['Roboto_Mono'] text-[10px] font-bold uppercase">Type {estimate.name} to confirm</Label><Input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} className="mt-2" autoComplete="off" /></div></div>
        <DialogFooter><button onClick={() => setDeleteOpen(false)} disabled={deleting} className="px-4 py-2 rounded-md border border-border text-sm">Cancel</button><button onClick={confirmDelete} disabled={deleting || deleteText.trim() !== estimate.name} className="px-4 py-2 rounded-md bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-40">{deleting ? "Deleting…" : "Permanently Delete Estimate"}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
