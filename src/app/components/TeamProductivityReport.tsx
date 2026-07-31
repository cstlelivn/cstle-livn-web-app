import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, Users, TrendingUp, AlertTriangle, CheckCircle2, RotateCcw } from "lucide-react";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { useWorkSessions } from "../src/features/workSessions/useWorkSessions";
import { listTeamMemberProductivity, getTaskTypeEstimates, getProductivityTrend } from "../src/features/reporting/api";

function formatHours(hours: number): string {
  if (!hours || hours <= 0) return "0h";
  return hours < 10 ? `${hours.toFixed(1)}h` : `${Math.round(hours)}h`;
}

export default function TeamProductivityReport() {
  const { teamMembers, tasks } = useApp();
  const { hasPermission } = useAuth();
  const canViewIndividual = hasPermission("canViewTeamPerformance");
  const { workSessions, loading: loadingSessions } = useWorkSessions(true);

  const [productivity, setProductivity] = useState<any[]>([]);
  const [typeEstimates, setTypeEstimates] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 90);
        const [prod, types, trendData] = await Promise.all([
          canViewIndividual ? listTeamMemberProductivity() : Promise.resolve([]),
          getTaskTypeEstimates(),
          getProductivityTrend(start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)),
        ]);
        if (cancelled) return;
        setProductivity(prod);
        setTypeEstimates(types);
        setTrend(trendData);
      } catch (error) {
        console.error("Failed to load productivity report:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canViewIndividual]);

  // Total task time, delays/blockers, QC/rework -- computed directly from
  // the RLS-scoped session list already loaded by useWorkSessions, so this
  // is real stored data (never fabricated placeholders).
  const totalActiveHours = workSessions.reduce((sum: number, s: any) => sum + (s.activeSeconds || 0), 0) / 3600;
  const finishedSessions = workSessions.filter((s: any) => s.status === "finished");
  const sessionsWithDelay = workSessions.filter((s: any) => s.delayReason || s.blocker);
  const qcApproved = workSessions.filter((s: any) => s.qcResult === "Approved" || s.qcResult === "Approved with Conditions").length;
  const qcRejected = workSessions.filter((s: any) => s.qcResult === "Rejected").length;
  const reworkCount = workSessions.filter((s: any) => s.rework).length;

  const productivityChartData = productivity
    .map((p) => ({
      name: teamMembers.find((m: any) => String(m.id) === String(p.teamMemberId))?.name || "Unknown",
      hours: Math.round((p.totalActiveSeconds / 3600) * 10) / 10,
    }))
    .filter((d) => d.hours > 0)
    .sort((a, b) => b.hours - a.hours);

  const estimateChartData = typeEstimates
    .filter((t) => t.taskType)
    .map((t) => ({
      name: t.complexity ? `${t.taskType} (${t.complexity})` : t.taskType,
      estimated: t.avgEstimatedHours ? Math.round(t.avgEstimatedHours * 10) / 10 : 0,
      actual: t.avgActualHours ? Math.round(t.avgActualHours * 10) / 10 : 0,
      sampleSize: t.sampleSize,
    }));

  const trendChartData = trend.map((t) => ({
    week: new Date(t.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    hours: Math.round(t.totalActiveHours * 10) / 10,
  }));

  if (loading || loadingSessions) {
    return (
      <div className="p-[32px] text-center">
        <p className="font-['Roboto_Mono'] text-[12px] text-muted-foreground">Loading productivity data…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[24px] w-full p-[16px] md:p-[32px]">
      <div>
        <h1 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>Team Productivity</h1>
        <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground mt-[4px]">
          Built from every recorded work session -- start/pause/resume/finish history, never estimates presented as fact.
        </p>
      </div>

      {/* Stat cards -- everyone can see these totals; only the per-person
          breakdown further down is gated by canViewTeamPerformance. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[16px]">
        <Card className="p-[16px]">
          <div className="flex items-center gap-[8px] mb-[8px]">
            <Clock className="w-4 h-4 text-accent" />
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground uppercase">Total Tracked Time</p>
          </div>
          <p className="font-['Anybody'] text-[22px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {formatHours(totalActiveHours)}
          </p>
        </Card>
        <Card className="p-[16px]">
          <div className="flex items-center gap-[8px] mb-[8px]">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground uppercase">Sessions Finished</p>
          </div>
          <p className="font-['Anybody'] text-[22px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {finishedSessions.length}
          </p>
        </Card>
        <Card className="p-[16px]">
          <div className="flex items-center gap-[8px] mb-[8px]">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground uppercase">Delays / Blockers Logged</p>
          </div>
          <p className="font-['Anybody'] text-[22px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {sessionsWithDelay.length}
          </p>
        </Card>
        <Card className="p-[16px]">
          <div className="flex items-center gap-[8px] mb-[8px]">
            <RotateCcw className="w-4 h-4 text-destructive" />
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground uppercase">Rework Sessions</p>
          </div>
          <p className="font-['Anybody'] text-[22px]" style={{ fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>
            {reworkCount}
          </p>
        </Card>
      </div>

      {/* QC results */}
      <Card className="p-[16px]">
        <p className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground uppercase tracking-wide mb-[12px]">
          QC Results (from sessions with a recorded outcome)
        </p>
        <div className="flex items-center gap-[24px] font-['Roboto_Mono'] text-[12px]">
          <span className="text-success">Approved: {qcApproved}</span>
          <span className="text-destructive">Rejected: {qcRejected}</span>
          <span className="text-muted-foreground">
            {qcApproved + qcRejected > 0
              ? `${Math.round((qcApproved / (qcApproved + qcRejected)) * 100)}% pass rate`
              : "No QC-reviewed sessions yet"}
          </span>
        </div>
      </Card>

      {/* Estimated vs actual by task type -- de-identified aggregate,
          visible to everyone who can see this report at all. */}
      <Card className="p-[16px]">
        <p className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground uppercase tracking-wide mb-[4px]">
          Estimated vs. Actual Hours by Task Type
        </p>
        <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[12px]">
          Only completed tasks with recorded session time are included; sample size shown per bar group.
        </p>
        {estimateChartData.length === 0 ? (
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground py-[24px] text-center">
            Not enough completed, time-tracked tasks yet to show this comparison.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={estimateChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} label={{ value: "Hours", angle: -90, position: "insideLeft", fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="estimated" fill="var(--muted-foreground)" name="Estimated (avg)" />
              <Bar dataKey="actual" fill="var(--accent)" name="Actual (avg)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Productivity trend -- company-wide, de-identified */}
      <Card className="p-[16px]">
        <p className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground uppercase tracking-wide mb-[12px]">
          Weekly Active Hours (last 90 days)
        </p>
        {trendChartData.length === 0 ? (
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground py-[24px] text-center">
            No finished work sessions in this window yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="hours" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Per-person breakdown -- gated: only authorized roles ever get real
          rows back from the underlying view in the first place (RLS), and
          the UI hides the section entirely for everyone else rather than
          showing an empty/misleading chart. */}
      {canViewIndividual && (
        <Card className="p-[16px]">
          <div className="flex items-center gap-[8px] mb-[12px]">
            <Users className="w-4 h-4 text-accent" />
            <p className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground uppercase tracking-wide">
              Time Contributed by Person
            </p>
          </div>
          {productivityChartData.length === 0 ? (
            <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground py-[24px] text-center">
              No recorded work sessions yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, productivityChartData.length * 36)}>
              <BarChart data={productivityChartData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 10 }} label={{ value: "Hours", position: "insideBottom", offset: -5, fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                <Tooltip />
                <Bar dataKey="hours" fill="var(--accent)" name="Active Hours" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      )}
    </div>
  );
}
