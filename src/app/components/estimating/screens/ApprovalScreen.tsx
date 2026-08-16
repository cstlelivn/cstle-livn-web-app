import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "../../AuthContext";
import { type Estimate, updateEstimate, getPricingSummary, getApproval, recordApproval, uploadEstimateMedia, convertEstimateToProject } from "../../../src/features/estimating/api";

interface ScreenProps {
  estimate: Estimate;
  onRefresh: () => void;
  onAdvance: () => void;
}

const dollars = (cents?: number) => `$${Math.round((cents || 0) / 100).toLocaleString("en-US")}`;

export default function ApprovalScreen({ estimate, onRefresh, onAdvance }: ScreenProps) {
  const { currentUser } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [tier, setTier] = useState<"good" | "better" | "best">("good");
  const [depositPct, setDepositPct] = useState(30);
  const [customerName, setCustomerName] = useState("");
  const [priceCents, setPriceCents] = useState<number | undefined>();
  const [approval, setApproval] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    getPricingSummary(estimate.id).then((p) => {
      if (p) setPriceCents(tier === "better" ? p.selling_price_better_cents : tier === "best" ? p.selling_price_best_cents : p.selling_price_good_cents);
    });
    getApproval(estimate.id).then(setApproval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.id, tier]);

  const pos = (e: any) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  };
  const start = (e: any) => {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const move = (e: any) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2; ctx.strokeStyle = "#1c1d24"; ctx.lineCap = "round";
    const p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke();
    e.preventDefault?.();
  };
  const end = () => { drawing.current = false; };
  const clearSig = () => {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
  };

  const deposit = priceCents ? Math.round((priceCents * depositPct) / 100) : 0;

  const handleRecord = async () => {
    const canvas = canvasRef.current!;
    setSaving(true);
    try {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("Could not capture signature");
      const file = new File([blob], "signature.png", { type: "image/png" });
      const media = await uploadEstimateMedia(estimate.id, file, undefined, "signature");
      await recordApproval({
        estimate_id: estimate.id,
        selected_tier: tier,
        deposit_pct: depositPct,
        signature_media_id: media.id,
        customer_name: customerName.trim() || undefined,
        recorded_by: currentUser?.id ? String(currentUser.id) : undefined,
      });
      await updateEstimate(estimate.id, { customer_approved: true, status: "approved" } as any);
      toast.success("Approval recorded -- informal record only, not a legal e-signature");
      onRefresh();
      const fresh = await getApproval(estimate.id);
      setApproval(fresh);
    } catch (error: any) {
      toast.error(error?.message || "Failed to record approval");
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      await convertEstimateToProject(estimate.id);
      toast.success("Converted to an active project");
      onRefresh();
      onAdvance();
    } catch (error: any) {
      toast.error(error?.message || "Failed to convert to a project");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-[16px]">
      <div className="grid md:grid-cols-2 gap-[16px]">
        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[10px]">Recap</h2>
          <div className="flex gap-[6px] mb-[10px]">
            {(["good", "better", "best"] as const).map((t) => (
              <button key={t} onClick={() => setTier(t)} className={`px-[10px] py-[5px] rounded-[6px] border font-['Roboto_Mono'] text-[10px] ${tier === t ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground"}`}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <p className="font-['Roboto_Mono'] text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-[6px] p-[8px] mb-[10px]">
            Selected package: <strong>{tier.toUpperCase()}</strong> -- {dollars(priceCents)}
          </p>
          <label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">Customer name (optional)</label>
          <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
          <label className="font-['Roboto_Mono'] text-[10px] text-muted-foreground block mt-[8px]">Deposit %</label>
          <input type="number" value={depositPct} onChange={(e) => setDepositPct(parseFloat(e.target.value) || 0)} className="mt-[2px] w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
          <p className="font-['Roboto_Mono'] text-[10px] text-success bg-success/10 border border-success/20 rounded-[6px] p-[8px] mt-[8px]">Deposit due: {dollars(deposit)}</p>
        </div>

        <div className="bg-card border border-border rounded-[12px] p-[16px]">
          <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[4px]">Customer signature</h2>
          <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground mb-[8px]">
            Informal record only -- captures intent to proceed, not a legally binding e-signature. No payment is captured here.
          </p>
          <canvas
            ref={canvasRef} width={400} height={150}
            className="border border-dashed border-border rounded-[8px] bg-white touch-none w-full"
            onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
            onTouchStart={start} onTouchMove={move} onTouchEnd={end}
          />
          <button onClick={clearSig} className="mt-[8px] px-[10px] py-[5px] bg-secondary rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-secondary/70">Clear</button>
          {approval && <p className="mt-[8px] font-['Roboto_Mono'] text-[9px] text-success">Approved {new Date(approval.approved_at).toLocaleString()}</p>}
        </div>
      </div>

      <div className="flex gap-[10px] flex-wrap">
        <button onClick={handleRecord} disabled={saving} className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
          {saving ? "Recording…" : "Record customer approval"}
        </button>
        <button onClick={handleConvert} disabled={!estimate.customer_approved || converting} className="px-[16px] py-[8px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-40">
          {converting ? "Converting…" : "Convert to Active Project →"}
        </button>
      </div>
    </div>
  );
}
