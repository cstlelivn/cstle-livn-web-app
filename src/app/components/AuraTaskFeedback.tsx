import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { getTaskAuraScore, type TaskAuraScore } from "../src/features/auraScoring/api";

interface AuraTaskFeedbackProps {
  taskId: string;
  teamMemberId: string;
}

// Shown to an assignee on a task that's already been through QC -- the
// real, computed breakdown (not a manual dropdown), in plain language per
// the product's own example: "Your Aura is 4.1 out of 5. Your work quality
// is strong, but two recent tasks were submitted late..." Everything here
// reads from task_aura_scores, computed server-side in
// record_task_aura_score() (20240025_aura_scoring_v2.sql) from real QC
// results, measured time vs estimate, and documented delays.
export default function AuraTaskFeedback({ taskId, teamMemberId }: AuraTaskFeedbackProps) {
  const [score, setScore] = useState<TaskAuraScore | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getTaskAuraScore(taskId, teamMemberId)
      .then((s) => {
        if (!cancelled) setScore(s);
      })
      .catch(() => {
        if (!cancelled) setScore(null);
      });
    return () => {
      cancelled = true;
    };
  }, [taskId, teamMemberId]);

  if (score === undefined || score === null) return null;

  const wentWell: string[] = [];
  const reducedScore: string[] = [];

  if (score.qualityScore >= 4.5) wentWell.push("Your work was approved with no corrections needed.");
  else if (score.qualityScore >= 3.5) wentWell.push("Your work was approved.");
  else reducedScore.push(
    score.qcResult === "Rejected"
      ? "This task didn't pass QC and needs rework."
      : "This task was approved, but needed corrections."
  );

  if (score.delayDocumented) {
    wentWell.push("You reported a delay -- documented delays don't count against your score.");
  } else if (score.timingScore >= 4.5) {
    wentWell.push("Completed within the expected time.");
  } else if (score.timingScore <= 3.0) {
    reducedScore.push("This task took noticeably longer than the expected time, and no delay was reported.");
  }

  if (score.reliabilityScore >= 4.0) wentWell.push("Updates and required steps were completed.");
  else reducedScore.push("Some updates, photos, or required steps were missing.");

  const suggestions: string[] = [];
  if (!score.delayDocumented && score.timingScore <= 3.5) {
    suggestions.push("If something is slowing you down, report it as soon as it happens instead of after the fact -- documented delays don't count against your Aura.");
  }
  if (score.reliabilityScore < 4.0) {
    suggestions.push("Add a quick note or photo when you finish a task -- it's part of what your score measures.");
  }
  if (score.qcResult !== "Approved") {
    suggestions.push("Review the reviewer's feedback below before starting similar work again.");
  }
  if (suggestions.length === 0) {
    suggestions.push("Keep doing what you're doing -- this was a strong task.");
  }

  const qualityWord = score.qualityScore >= 4.5 ? "strong" : score.qualityScore >= 3.5 ? "solid" : "needs attention";

  return (
    <div className="p-[16px] bg-card border border-border rounded-[20px] space-y-[12px]">
      <div className="flex items-center gap-[8px]">
        <Sparkles className="w-4 h-4 text-accent" />
        <p className="font-['Roboto_Mono'] font-bold text-[11px] uppercase tracking-wide text-muted-foreground">
          Your Aura for this task
        </p>
      </div>

      <p className="text-foreground" style={{ fontFamily: "Anybody", fontVariationSettings: "'wdth' 137", fontWeight: 700, fontStretch: "137%", fontSize: "20px", lineHeight: 1.3 }}>
        {score.overallScore} out of 5
      </p>
      <p className="font-['Roboto_Mono'] text-[12px] text-muted-foreground leading-[1.5]">
        Your work quality is {qualityWord}
        {reducedScore.length > 0 ? `, but ${reducedScore[0].charAt(0).toLowerCase()}${reducedScore[0].slice(1)}` : "."}
        {suggestions[0] ? ` ${suggestions[0]}` : ""}
      </p>

      {wentWell.length > 0 && (
        <div>
          <p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase tracking-wide text-success mb-[4px]">What went well</p>
          <ul className="space-y-[2px]">
            {wentWell.map((w, i) => (
              <li key={i} className="font-['Roboto_Mono'] text-[11px] text-foreground">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {reducedScore.length > 0 && (
        <div>
          <p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase tracking-wide text-destructive mb-[4px]">What reduced the score</p>
          <ul className="space-y-[2px]">
            {reducedScore.map((w, i) => (
              <li key={i} className="font-['Roboto_Mono'] text-[11px] text-foreground">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {score.reviewerFeedback && (
        <div>
          <p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-[4px]">Reviewer feedback</p>
          <p className="font-['Roboto_Mono'] text-[11px] text-foreground italic">"{score.reviewerFeedback}"</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase tracking-wide text-accent mb-[4px]">To improve</p>
          <ul className="space-y-[2px]">
            {suggestions.slice(0, 2).map((s, i) => (
              <li key={i} className="font-['Roboto_Mono'] text-[11px] text-foreground">• {s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
