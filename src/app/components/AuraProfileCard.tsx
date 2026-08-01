import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Award } from "lucide-react";
import { getAuraProfile, getDemonstratedSkills, type AuraProfile } from "../src/features/auraScoring/api";

interface AuraProfileCardProps {
  teamMemberId: string;
}

const LEVEL_ORDER = ["New Member", "Developing", "Skilled", "Advanced", "Expert"] as const;
const LEVEL_FLOORS: Record<string, number> = { Developing: 0, Skilled: 3.2, Advanced: 4.0, Expert: 4.5 };

export function nextLevelSteps(profile: AuraProfile): string {
  if (profile.scoredTaskCount < 5) {
    return `Complete ${profile.tasksUntilConfident} more reviewed task${profile.tasksUntilConfident === 1 ? "" : "s"} to get a confident Aura rating.`;
  }
  const idx = LEVEL_ORDER.indexOf(profile.level);
  const next = LEVEL_ORDER[idx + 1];
  if (!next) return "You're at the highest level -- keep up strong, consistent work to hold it.";
  const floor = LEVEL_FLOORS[next];
  const gap = profile.avgOverall !== null ? Math.max(0, floor - profile.avgOverall) : floor;
  if (gap <= 0) return `You're already scoring high enough for ${next} -- this should update on your next reviewed task.`;
  const metrics = [
    { value: profile.avgQuality, action: 'focus on passing QC without corrections' },
    { value: profile.avgTiming, action: 'finish within the estimate or report delays early' },
    { value: profile.avgReliability, action: 'complete required updates, checklists and evidence' },
  ].filter((metric) => metric.value !== null).sort((a, b) => Number(a.value) - Number(b.value));
  const focus = metrics[0]?.action;
  return `Reach an average Aura of ${floor.toFixed(1)} to become ${next}${focus ? `; your clearest next step is to ${focus}` : ''}.`;
}

// Performance-only Aura profile (This is separate from any pay/payroll
// view -- reads purely from task_aura_scores via team_member_aura_profile()
// / team_member_demonstrated_skills(), migration 20240025_aura_scoring_v2.sql).
export default function AuraProfileCard({ teamMemberId }: AuraProfileCardProps) {
  const [profile, setProfile] = useState<AuraProfile | null | undefined>(undefined);
  const [skills, setSkills] = useState<{ taskType: string; approvedCount: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAuraProfile(teamMemberId), getDemonstratedSkills(teamMemberId)])
      .then(([p, s]) => {
        if (!cancelled) {
          setProfile(p);
          setSkills(s);
        }
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [teamMemberId]);

  if (profile === undefined) {
    return (
      <div className="p-[24px] text-center">
        <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">Loading Aura profile…</p>
      </div>
    );
  }

  if (profile === null || profile.scoredTaskCount === 0) {
    return (
      <div className="p-[24px] text-center bg-card border border-border rounded-[20px]">
        <Award className="w-8 h-8 mx-auto mb-[8px] text-muted-foreground/40" />
        <p className="font-['Roboto_Mono'] text-[12px] text-foreground">No reviewed tasks yet.</p>
        <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground mt-[4px]">
          An Aura score appears here once a task has been through QC.
        </p>
      </div>
    );
  }

  const trend = profile.recentAvg !== null && profile.priorAvg !== null
    ? profile.recentAvg - profile.priorAvg
    : null;

  return (
    <div className="space-y-[16px]">
      <div className="p-[20px] bg-card border border-border rounded-[20px]">
        <div className="flex items-center justify-between mb-[12px]">
          <div>
            <p className="font-['Roboto_Mono'] text-[10px] uppercase tracking-wide text-muted-foreground mb-[4px]">
              {profile.scoredTaskCount < 5 ? 'Provisional Aura' : 'Current Aura'}
            </p>
            <p style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", fontSize: "32px" }} className="text-foreground">
              {profile.avgOverall !== null ? profile.avgOverall.toFixed(1) : "—"} <span className="text-[16px] text-muted-foreground">/ 5</span>
            </p>
          </div>
          <div className="text-right">
            <p className="font-['Roboto_Mono'] font-bold text-[13px] uppercase tracking-wide text-accent">{profile.level}</p>
            {trend !== null && (
              <div className="flex items-center gap-[4px] justify-end mt-[4px]">
                {trend > 0.05 ? <TrendingUp className="w-3 h-3 text-success" /> : trend < -0.05 ? <TrendingDown className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3 text-muted-foreground" />}
                <span className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                  {trend > 0.05 ? "Improving" : trend < -0.05 ? "Declining" : "Steady"}
                </span>
              </div>
            )}
          </div>
        </div>

        {profile.scoredTaskCount < 5 && (
          <div className="mb-[12px] p-[10px] bg-muted rounded-[8px]">
            <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
              Not enough reviewed tasks yet for a confident rating -- {profile.tasksUntilConfident} more needed.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
          <Stat label="Quality" value={profile.avgQuality} suffix="/5" />
          <Stat label="On-time rate" value={profile.onTimeRate} suffix="%" />
          <Stat label="QC pass rate" value={profile.qcPassRate} suffix="%" />
          <Stat label="Rework rate" value={profile.reworkRate} suffix="%" />
        </div>
      </div>

      <div className="p-[20px] bg-card border border-border rounded-[20px]">
        <p className="font-['Roboto_Mono'] text-[10px] uppercase tracking-wide text-muted-foreground mb-[8px]">
          Next level
        </p>
        <p className="font-['Roboto_Mono'] text-[12px] text-foreground leading-[1.5]">
          {nextLevelSteps(profile)}
        </p>
      </div>

      {skills.length > 0 && (
        <div className="p-[20px] bg-card border border-border rounded-[20px]">
          <p className="font-['Roboto_Mono'] text-[10px] uppercase tracking-wide text-muted-foreground mb-[8px]">
            Skills demonstrated
          </p>
          <div className="flex flex-wrap gap-[8px]">
            {skills.map((s) => (
              <span
                key={s.taskType}
                className="px-[10px] py-[4px] bg-secondary rounded-[999px] font-['Roboto_Mono'] text-[10px] text-secondary-foreground"
              >
                {s.taskType} · {s.approvedCount}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground text-center px-[8px]">
        Aura helps recommend assignments, training, and recognition. It does not decide pay, promotion, discipline, or termination -- those require human review.
      </p>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number | null; suffix: string }) {
  return (
    <div>
      <p className="font-['Roboto_Mono'] text-[9px] uppercase tracking-wide text-muted-foreground mb-[2px]">{label}</p>
      <p className="font-['Roboto_Mono'] font-bold text-[16px] text-foreground">
        {value !== null ? `${value}${suffix}` : "—"}
      </p>
    </div>
  );
}
