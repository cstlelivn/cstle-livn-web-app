import { useState } from "react";
import { toast } from "sonner";
import { type Estimate, updateEstimate } from "../../../src/features/estimating/api";
import { analyzeCapture } from "../../../src/features/estimating/aiApi";

interface ScreenProps {
  estimate: Estimate;
  onRefresh: () => void;
  onAdvance: () => void;
}

const CONFIDENCE_CLASS: Record<string, string> = {
  Confirmed: "bg-success/10 text-success border-success/20",
  "High Confidence": "bg-primary/10 text-primary border-primary/20",
  "Needs Review": "bg-warning/10 text-warning border-warning/20",
  Missing: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function AnalysisScreen({ estimate, onRefresh, onAdvance }: ScreenProps) {
  const [running, setRunning] = useState(false);
  const analysis = estimate.ai_analysis;

  const run = async () => {
    setRunning(true);
    try {
      await analyzeCapture(estimate.id);
      toast.success("Analysis complete");
      onRefresh();
    } catch (error: any) {
      toast.error(error?.message || "Analysis failed");
    } finally {
      setRunning(false);
    }
  };

  const confirm = async () => {
    try {
      await updateEstimate(estimate.id, { analysis_confirmed: true } as any);
      onRefresh();
      onAdvance();
    } catch (error: any) {
      toast.error(error?.message || "Failed to confirm");
    }
  };

  return (
    <div className="space-y-[16px]">
      <div className="bg-card border border-border rounded-[12px] p-[16px]">
        <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[4px]">AI analysis of captured input</h2>
        <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[12px]">
          Reads photos, notes, measurements, and documents together. Anything not explicitly confirmed by you is labeled.
        </p>
        <button onClick={run} disabled={running} className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
          {running ? "Analyzing…" : analysis ? "Re-run analysis" : "Run AI analysis"}
        </button>

        {analysis ? (
          <div className="mt-[16px] space-y-[14px]">
            <div>
              <h3 className="font-['Roboto_Mono'] font-bold text-[11px] mb-[4px]">Organized notes</h3>
              <p className="font-['Roboto_Mono'] text-[11px] text-foreground">{analysis.organizedNotes}</p>
            </div>
            <div>
              <h3 className="font-['Roboto_Mono'] font-bold text-[11px] mb-[6px]">Extracted facts</h3>
              <div className="space-y-[4px]">
                {(analysis.extractedFacts || []).map((f: any, i: number) => (
                  <div key={i} className="flex items-center justify-between gap-[8px] text-[11px] font-['Roboto_Mono']">
                    <span className="text-foreground">{f.fact}</span>
                    <span className={`px-[8px] py-[1px] rounded-full text-[9px] border shrink-0 ${CONFIDENCE_CLASS[f.confidence] || "bg-muted/10 text-muted-foreground border-muted/20"}`}>{f.confidence}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="font-['Roboto_Mono'] font-bold text-[11px] mb-[4px]">Draft scope of work</h3>
              <p className="font-['Roboto_Mono'] text-[11px] text-foreground">{analysis.scopeOfWork}</p>
            </div>
            <div>
              <h3 className="font-['Roboto_Mono'] font-bold text-[11px] mb-[4px]">Missing-information questions</h3>
              <ul className="list-disc pl-[18px] space-y-[2px]">
                {(analysis.questions || []).map((q: string, i: number) => (
                  <li key={i} className="font-['Roboto_Mono'] text-[11px] text-foreground">{q}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className="mt-[16px] font-['Roboto_Mono'] text-[11px] text-muted-foreground">Not run yet.</p>
        )}
      </div>

      {analysis && (
        <button onClick={confirm} className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px]">
          Confirm reviewed →
        </button>
      )}
    </div>
  );
}
