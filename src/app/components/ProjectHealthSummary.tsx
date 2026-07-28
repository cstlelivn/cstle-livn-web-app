import { useMemo } from "react";
import {
  AlertCircle, Clock, CheckCircle2, Package, ClipboardCheck,
  TrendingUp, Users, Calendar,
} from "lucide-react";

interface Task {
  id: number;
  title: string;
  status: string;
  dueDate?: string;
  assignee?: string;
  phase?: string;
  phase_id?: string;
  blocked_by?: string;
}

interface Phase {
  id: string;
  name: string;
  status: string;
  qc_status: string;
}

interface ProjectHealthSummaryProps {
  tasks: Task[];
  phases: Phase[];
  projectEndDate?: string;
}

function isoToday() {
  return new Date().toISOString().split("T")[0];
}

function isoDaysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export default function ProjectHealthSummary({ tasks, phases, projectEndDate }: ProjectHealthSummaryProps) {
  const today = isoToday();
  const endOfWeek = isoDaysFromNow(7);

  const stats = useMemo(() => {
    const overdue = tasks.filter(t =>
      t.status !== "Completed" && t.dueDate && t.dueDate < today
    );
    const dueToday = tasks.filter(t =>
      t.status !== "Completed" && t.dueDate === today
    );
    const dueThisWeek = tasks.filter(t =>
      t.status !== "Completed" && t.dueDate && t.dueDate > today && t.dueDate <= endOfWeek
    );
    const blocked = tasks.filter(t => t.blocked_by && t.blocked_by !== "");
    const unassigned = tasks.filter(t =>
      t.status !== "Completed" && (!t.assignee || t.assignee === "")
    );
    const pendingQC = phases.filter(p =>
      p.qc_status === "Ready for Review" || p.qc_status === "Under Review"
    );
    const rejectedQC = phases.filter(p => p.qc_status === "Rejected");
    const currentPhase = phases.find(p => p.status === "In Progress") ??
      phases.find(p => p.status !== "Completed");
    const nextPhase = currentPhase
      ? phases.find((p, i) => i > phases.indexOf(currentPhase!) && p.status !== "Completed")
      : null;

    return { overdue, dueToday, dueThisWeek, blocked, unassigned, pendingQC, rejectedQC, currentPhase, nextPhase };
  }, [tasks, phases, today, endOfWeek]);

  const hasIssues = stats.overdue.length > 0 || stats.blocked.length > 0 ||
    stats.rejectedQC.length > 0 || stats.unassigned.length > 0;

  return (
    <div className="bg-card border border-border rounded-[12px] p-[16px]">
      <div className="flex items-center gap-[8px] mb-[14px]">
        <TrendingUp className="w-4 h-4 text-accent" />
        <h3 className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground uppercase tracking-wider">
          Project Health
        </h3>
        {hasIssues && (
          <span className="ml-auto px-[8px] py-[2px] bg-destructive/10 text-destructive rounded-full font-['Roboto_Mono'] text-[9px] font-bold">
            Action Required
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px] mb-[12px]">
        {/* Overdue */}
        <Tile
          icon={<AlertCircle className={`w-3 h-3 ${stats.overdue.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />}
          label="Overdue"
          value={stats.overdue.length}
          urgent={stats.overdue.length > 0}
        />
        {/* Due Today */}
        <Tile
          icon={<Clock className={`w-3 h-3 ${stats.dueToday.length > 0 ? 'text-warning' : 'text-muted-foreground'}`} />}
          label="Due Today"
          value={stats.dueToday.length}
          urgent={stats.dueToday.length > 0}
        />
        {/* Blocked */}
        <Tile
          icon={<AlertCircle className={`w-3 h-3 ${stats.blocked.length > 0 ? 'text-warning' : 'text-muted-foreground'}`} />}
          label="Blocked"
          value={stats.blocked.length}
          urgent={stats.blocked.length > 0}
        />
        {/* Unassigned */}
        <Tile
          icon={<Users className={`w-3 h-3 ${stats.unassigned.length > 0 ? 'text-warning' : 'text-muted-foreground'}`} />}
          label="Unassigned"
          value={stats.unassigned.length}
          urgent={stats.unassigned.length > 0}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-[8px] mb-[12px]">
        {/* Due this week */}
        <Tile
          icon={<Calendar className="w-3 h-3 text-muted-foreground" />}
          label="Due This Week"
          value={stats.dueThisWeek.length}
        />
        {/* Pending QC */}
        <Tile
          icon={<ClipboardCheck className={`w-3 h-3 ${stats.pendingQC.length > 0 ? 'text-accent' : 'text-muted-foreground'}`} />}
          label="Pending QC"
          value={stats.pendingQC.length}
        />
        {/* Rejected QC */}
        <Tile
          icon={<ClipboardCheck className={`w-3 h-3 ${stats.rejectedQC.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />}
          label="QC Rejected"
          value={stats.rejectedQC.length}
          urgent={stats.rejectedQC.length > 0}
        />
        {/* Completed tasks */}
        <Tile
          icon={<CheckCircle2 className="w-3 h-3 text-success" />}
          label="Completed"
          value={tasks.filter(t => t.status === "Completed").length}
        />
      </div>

      {/* Current / Next phase */}
      {(stats.currentPhase || stats.nextPhase) && (
        <div className="flex items-center gap-[16px] pt-[10px] border-t border-border flex-wrap">
          {stats.currentPhase && (
            <div className="flex items-center gap-[6px]">
              <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase tracking-wider">Current Phase</span>
              <span className="font-['Roboto_Mono'] font-bold text-[10px] text-foreground">{stats.currentPhase.name}</span>
            </div>
          )}
          {stats.nextPhase && (
            <div className="flex items-center gap-[6px]">
              <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase tracking-wider">Next Phase</span>
              <span className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">{stats.nextPhase.name}</span>
            </div>
          )}
          {projectEndDate && (
            <div className="flex items-center gap-[6px] ml-auto">
              <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase tracking-wider">Target End</span>
              <span className="font-['Roboto_Mono'] text-[10px] text-foreground">{projectEndDate}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ icon, label, value, urgent }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  urgent?: boolean;
}) {
  return (
    <div className={`rounded-[8px] p-[10px] border ${
      urgent ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-background'
    }`}>
      <div className="flex items-center gap-[6px] mb-[4px]">
        {icon}
        <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <span className={`font-['Roboto_Mono'] font-bold text-[18px] ${urgent && value > 0 ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}
