import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { type Estimate, updateEstimate, getLatestProposal, updateProposalMessage, getPricingSummary, type EstimateProposal, type PricingSummaryRow } from "../../../src/features/estimating/api";
import { generateProposal } from "../../../src/features/estimating/aiApi";

interface ScreenProps {
  estimate: Estimate;
  onRefresh: () => void;
  onAdvance: () => void;
}

const dollars = (cents?: number) => `$${Math.round((cents || 0) / 100).toLocaleString("en-US")}`;

export default function ProposalScreen({ estimate, onRefresh, onAdvance }: ScreenProps) {
  const [proposal, setProposal] = useState<EstimateProposal | null>(null);
  const [pricing, setPricing] = useState<PricingSummaryRow | null>(null);
  const [selectedTier, setSelectedTier] = useState<"good" | "better" | "best">("good");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prop, price] = await Promise.all([getLatestProposal(estimate.id), getPricingSummary(estimate.id)]);
      setProposal(prop);
      setPricing(price);
      if (prop) { setSelectedTier(prop.selected_tier || "good"); setMessage(prop.customer_message || ""); }
    } finally {
      setLoading(false);
    }
  }, [estimate.id]);
  useEffect(() => { load(); }, [load]);

  const run = async () => {
    setRunning(true);
    try {
      const saved = await generateProposal(estimate.id);
      setProposal(saved);
      setMessage(saved.customer_message || "");
      toast.success("Proposal drafted");
    } catch (error: any) {
      toast.error(error?.message || "Proposal drafting failed");
    } finally {
      setRunning(false);
    }
  };

  const selectTier = async (tier: "good" | "better" | "best") => {
    setSelectedTier(tier);
    if (proposal) {
      try { await updateProposalMessage(proposal.id, { selected_tier: tier }); } catch { /* non-critical */ }
    }
  };

  const saveMessage = async () => {
    if (!proposal) return;
    try { await updateProposalMessage(proposal.id, { customer_message: message }); } catch (error: any) { toast.error(error?.message || "Failed to save message"); }
  };

  const confirm = async () => {
    try {
      await updateEstimate(estimate.id, { proposal_approved: true, status: "proposal_sent" } as any);
      onRefresh();
      onAdvance();
    } catch (error: any) {
      toast.error(error?.message || "Failed to confirm");
    }
  };

  if (loading) return <div className="h-[200px] bg-card border border-border rounded-[12px] animate-pulse" />;

  const tierPrice = (t: "good" | "better" | "best") =>
    t === "better" ? pricing?.selling_price_better_cents : t === "best" ? pricing?.selling_price_best_cents : pricing?.selling_price_good_cents;

  return (
    <div className="space-y-[16px]">
      <div className="bg-card border border-border rounded-[12px] p-[16px]">
        <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[4px]">Customer-facing proposal</h2>
        <button onClick={run} disabled={running} className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50 mt-[8px]">
          {running ? "Drafting…" : proposal ? "Re-draft proposal" : "Draft proposal"}
        </button>

        {proposal ? (
          <div className="mt-[16px] space-y-[14px]">
            <div className="grid grid-cols-3 gap-[8px]">
              {(["good", "better", "best"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => selectTier(t)}
                  className={`text-left border rounded-[9px] p-[12px] transition-colors ${selectedTier === t ? "border-accent bg-accent/10" : "border-border bg-secondary/20"}`}
                >
                  <p className="font-['Roboto_Mono'] text-[9px] uppercase tracking-wide text-muted-foreground">{t}</p>
                  <p className="font-['Roboto_Mono'] font-bold text-[16px] mb-[4px]">{dollars(tierPrice(t))}</p>
                  <p className="font-['Roboto_Mono'] font-bold text-[11px]">{(proposal as any)[`${t}_headline`]}</p>
                  <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mt-[4px]">{(proposal as any)[`${t}_body`]}</p>
                </button>
              ))}
            </div>
            <div>
              <h3 className="font-['Roboto_Mono'] font-bold text-[11px] mb-[4px]">Customer text / email</h3>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} onBlur={saveMessage} rows={3}
                className="w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
            </div>
          </div>
        ) : (
          <p className="mt-[16px] font-['Roboto_Mono'] text-[11px] text-muted-foreground">Not drafted yet.</p>
        )}
      </div>

      {proposal && (
        <button onClick={confirm} className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px]">
          Approve proposal for sending →
        </button>
      )}
    </div>
  );
}
