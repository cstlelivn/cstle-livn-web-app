import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Stepper, { type StepDef } from "./Stepper";
import { useEstimate } from "../../src/features/estimating/useEstimates";
import CaptureScreen from "./screens/CaptureScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import ScopeTakeoffScreen from "./screens/ScopeTakeoffScreen";
import PlanScreen from "./screens/PlanScreen";
import PricingScreen from "./screens/PricingScreen";
import ProposalScreen from "./screens/ProposalScreen";
import ApprovalScreen from "./screens/ApprovalScreen";
import ActualsScreen from "./screens/ActualsScreen";

const STEPS: StepDef[] = [
  { key: "capture", label: "Site Capture" },
  { key: "analysis", label: "AI Analysis", gate: "capture_confirmed" },
  { key: "scope", label: "Scope & Takeoff", gate: "analysis_confirmed" },
  { key: "plan", label: "Project Plan", gate: "scope_confirmed" },
  { key: "pricing", label: "Pricing", gate: "plan_confirmed" },
  { key: "proposal", label: "Proposal", gate: "pricing_confirmed" },
  { key: "approval", label: "Customer Approval", gate: "proposal_approved" },
  { key: "actuals", label: "Estimated vs Actual", gate: "customer_approved" },
];

interface EstimateWorkspaceProps {
  estimateId: string;
  onBack: () => void;
}

export default function EstimateWorkspace({ estimateId, onBack }: EstimateWorkspaceProps) {
  const { estimate, loading, refresh, setEstimate } = useEstimate(estimateId);
  const [step, setStep] = useState("capture");

  if (loading) {
    return <div className="h-[200px] bg-card border border-border rounded-[12px] animate-pulse" />;
  }
  if (!estimate) {
    return (
      <div className="text-center py-[48px]">
        <p className="font-['Roboto_Mono'] text-[12px] text-muted-foreground">Estimate not found.</p>
        <button onClick={onBack} className="mt-[12px] font-['Roboto_Mono'] text-[11px] text-accent underline">← Back to list</button>
      </div>
    );
  }

  const gates: Record<string, boolean> = {
    capture_confirmed: estimate.capture_confirmed,
    analysis_confirmed: estimate.analysis_confirmed,
    scope_confirmed: estimate.scope_confirmed,
    plan_confirmed: estimate.plan_confirmed,
    pricing_confirmed: estimate.pricing_confirmed,
    proposal_approved: estimate.proposal_approved,
    customer_approved: estimate.customer_approved,
  };

  const advance = (next: string) => setStep(next);

  return (
    <div className="space-y-[16px]">
      <div className="flex items-center gap-[10px]">
        <button onClick={onBack} className="p-[6px] hover:bg-accent/10 rounded-[6px] transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div>
          <h3 className="font-['Roboto_Mono'] font-bold text-[13px] text-foreground">{estimate.name}</h3>
        </div>
      </div>

      <Stepper steps={STEPS} gates={gates} activeKey={step} onSelect={setStep} />

      {step === "capture" && <CaptureScreen estimate={estimate} onRefresh={refresh} onAdvance={() => advance("analysis")} />}
      {step === "analysis" && <AnalysisScreen estimate={estimate} onRefresh={refresh} onAdvance={() => advance("scope")} />}
      {step === "scope" && <ScopeTakeoffScreen estimate={estimate} onRefresh={refresh} onAdvance={() => advance("plan")} />}
      {step === "plan" && <PlanScreen estimate={estimate} onRefresh={refresh} onAdvance={() => advance("pricing")} />}
      {step === "pricing" && <PricingScreen estimate={estimate} onRefresh={refresh} onAdvance={() => advance("proposal")} />}
      {step === "proposal" && <ProposalScreen estimate={estimate} onRefresh={refresh} onAdvance={() => advance("approval")} />}
      {step === "approval" && <ApprovalScreen estimate={estimate} onRefresh={refresh} onAdvance={() => advance("actuals")} />}
      {step === "actuals" && <ActualsScreen estimate={estimate} />}
    </div>
  );
}
