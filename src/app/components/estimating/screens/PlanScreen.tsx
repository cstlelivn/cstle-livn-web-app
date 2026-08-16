import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { useApp } from "../../AppContext";
import { type Estimate, updateEstimate } from "../../../src/features/estimating/api";
import { generatePlan } from "../../../src/features/estimating/aiApi";
import { listActiveTaskAssignees } from "../../../src/features/taskAssignees/api";

interface ScreenProps {
  estimate: Estimate;
  onRefresh: () => void;
  onAdvance: () => void;
}

export default function PlanScreen({ estimate, onRefresh, onAdvance }: ScreenProps) {
  const { teamMembers, tasks } = useApp();
  const [running, setRunning] = useState(false);
  const [assignees, setAssignees] = useState<any[]>([]);
  const plan = estimate.project_plan;

  useEffect(() => { listActiveTaskAssignees().then(setAssignees).catch(() => setAssignees([])); }, []);

  // Workload-aware staffing suggestion: rank Associates/Supervisors by how
  // many currently-open (non-Completed) tasks they're actively assigned to,
  // using data this app already tracks (task_assignees) -- not a headcount
  // formula, a real read on who's already stretched thin. Purely
  // informational; staffing itself happens later, on the real project,
  // where a Manager/Admin can freely override.
  const workload = useMemo(() => {
    const openTaskIds = new Set(tasks.filter((t: any) => t.status !== "Completed").map((t: any) => String(t.id)));
    const counts = new Map<string, number>();
    for (const a of assignees) {
      if (!openTaskIds.has(String(a.taskId))) continue;
      counts.set(String(a.teamMemberId), (counts.get(String(a.teamMemberId)) ?? 0) + 1);
    }
    return teamMembers
      .filter((m: any) => m.active && (m.role === "Associate" || m.role === "Supervisor" || m.role === "Contractor"))
      .map((m: any) => ({ member: m, openTasks: counts.get(String(m.id)) ?? 0 }))
      .sort((a, b) => a.openTasks - b.openTasks);
  }, [teamMembers, tasks, assignees]);

  const run = async () => {
    setRunning(true);
    try {
      await generatePlan(estimate.id);
      toast.success("Plan generated");
      onRefresh();
    } catch (error: any) {
      toast.error(error?.message || "Plan generation failed");
    } finally {
      setRunning(false);
    }
  };

  const confirm = async () => {
    try {
      await updateEstimate(estimate.id, { plan_confirmed: true } as any);
      onRefresh();
      onAdvance();
    } catch (error: any) {
      toast.error(error?.message || "Failed to confirm");
    }
  };

  return (
    <div className="space-y-[16px]">
      <div className="bg-card border border-border rounded-[12px] p-[16px]">
        <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[4px]">Step-by-step project plan</h2>
        <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[12px]">
          Generated from the scope and takeoff. Anything about permits/codes is phrased as something to verify -- never asserted as fact.
        </p>
        <button onClick={run} disabled={running} className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
          {running ? "Generating…" : plan ? "Re-generate plan" : "Generate project plan"}
        </button>

        {plan ? (
          <div className="mt-[16px] space-y-[14px]">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase">
                  <th className="pb-[6px]">Step</th><th className="pb-[6px]">Crew</th><th className="pb-[6px]">Hours</th><th className="pb-[6px]">QC</th><th className="pb-[6px]">Safety</th>
                </tr>
              </thead>
              <tbody>
                {(plan.steps || []).map((s: any, i: number) => (
                  <tr key={i} className="border-t border-border align-top">
                    <td className="py-[6px] font-['Roboto_Mono']"><strong>{s.title}</strong><br /><span className="text-muted-foreground">{s.detail}</span></td>
                    <td className="py-[6px] font-['Roboto_Mono']">{s.crew}</td>
                    <td className="py-[6px] font-['Roboto_Mono']">{s.hours}</td>
                    <td className="py-[6px] font-['Roboto_Mono']">{s.qc}</td>
                    <td className="py-[6px] font-['Roboto_Mono']">{s.safety}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid md:grid-cols-2 gap-[16px]">
              <div>
                <h3 className="font-['Roboto_Mono'] font-bold text-[10px] uppercase tracking-wide mb-[4px]">Preconstruction research</h3>
                <ul className="list-disc pl-[16px]">{(plan.research || []).map((r: string, i: number) => <li key={i} className="font-['Roboto_Mono'] text-[11px]">{r}</li>)}</ul>
                <h3 className="font-['Roboto_Mono'] font-bold text-[10px] uppercase tracking-wide mt-[10px] mb-[4px]">Permits / codes to verify</h3>
                <ul className="list-disc pl-[16px]">{(plan.permits || []).map((r: string, i: number) => <li key={i} className="font-['Roboto_Mono'] text-[11px]">{r}</li>)}</ul>
              </div>
              <div>
                <h3 className="font-['Roboto_Mono'] font-bold text-[10px] uppercase tracking-wide mb-[4px]">Risk controls</h3>
                <ul className="list-disc pl-[16px]">{(plan.risks || []).map((r: string, i: number) => <li key={i} className="font-['Roboto_Mono'] text-[11px]">{r}</li>)}</ul>
                <h3 className="font-['Roboto_Mono'] font-bold text-[10px] uppercase tracking-wide mt-[10px] mb-[4px]">Closeout & documentation</h3>
                <ul className="list-disc pl-[16px]">{(plan.closeout || []).map((r: string, i: number) => <li key={i} className="font-['Roboto_Mono'] text-[11px]">{r}</li>)}</ul>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-[16px] font-['Roboto_Mono'] text-[11px] text-muted-foreground">Not generated yet.</p>
        )}
      </div>

      <div className="bg-card border border-border rounded-[12px] p-[16px]">
        <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[4px]">Who's available</h2>
        <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[10px]">
          Ranked by current open-task load (fewest first) -- staffing itself happens once this becomes a real project, but this is who has room right now.
        </p>
        <div className="space-y-[4px]">
          {workload.map(({ member, openTasks }) => (
            <div key={member.id} className="flex items-center justify-between text-[11px] font-['Roboto_Mono']">
              <span>{member.name} <span className="text-muted-foreground">({member.role})</span></span>
              <span className={`px-[8px] py-[1px] rounded-full text-[9px] border ${openTasks === 0 ? "bg-success/10 text-success border-success/20" : openTasks <= 2 ? "bg-primary/10 text-primary border-primary/20" : "bg-warning/10 text-warning border-warning/20"}`}>
                {openTasks} open task{openTasks === 1 ? "" : "s"}
              </span>
            </div>
          ))}
          {workload.length === 0 && <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">No active Associates/Supervisors/Contractors on the roster.</p>}
        </div>
      </div>

      {plan && (
        <button onClick={confirm} className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px]">
          Confirm plan →
        </button>
      )}
    </div>
  );
}
