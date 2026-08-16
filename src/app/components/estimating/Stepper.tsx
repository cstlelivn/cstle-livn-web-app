import { Check } from "lucide-react";

export interface StepDef {
  key: string;
  label: string;
  /** Estimate field name that must be true before this step can be opened. Omit for the first step. */
  gate?: string;
}

interface StepperProps {
  steps: StepDef[];
  gates: Record<string, boolean>;
  activeKey: string;
  onSelect: (key: string) => void;
}

/**
 * Sequential-gate stepper -- no reusable version of this existed anywhere
 * in the app before (per the frontend-conventions research: MobileTaskWorkspace
 * and TaskDialog each hand-roll their own gating instead of sharing a
 * component). A step is only clickable once its own gate flag is true;
 * clicking a locked step does nothing.
 */
export default function Stepper({ steps, gates, activeKey, onSelect }: StepperProps) {
  return (
    <div className="flex gap-[6px] flex-wrap mb-[18px]">
      {steps.map((step, i) => {
        const unlocked = !step.gate || gates[step.gate];
        const done = step.gate ? gates[step.gate] : false;
        const active = activeKey === step.key;
        return (
          <button
            key={step.key}
            type="button"
            disabled={!unlocked}
            onClick={() => unlocked && onSelect(step.key)}
            className={`flex items-center gap-[6px] px-[12px] py-[8px] rounded-[7px] border font-['Roboto_Mono'] font-bold text-[11px] transition-colors ${
              active
                ? "border-accent text-accent bg-accent/10"
                : unlocked
                  ? "border-border bg-card text-muted-foreground hover:bg-accent/5"
                  : "border-border bg-card text-muted-foreground/40 cursor-not-allowed opacity-60"
            }`}
          >
            <span className={`w-[16px] h-[16px] rounded-full flex items-center justify-center text-[9px] shrink-0 ${
              done ? "bg-success text-white" : "bg-muted text-muted-foreground"
            }`}>
              {done ? <Check className="w-2.5 h-2.5" /> : i + 1}
            </span>
            {step.label}
          </button>
        );
      })}
    </div>
  );
}
