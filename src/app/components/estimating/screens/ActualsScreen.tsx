import { useState, useEffect } from "react";
import { useApp } from "../../AppContext";
import { useAuth } from "../../AuthContext";
import { createClient } from "../../../utils/supabase/client.tsx";
import { type Estimate, getPricingSummary, getLatestPricingSnapshotFull, type PricingSummaryRow } from "../../../src/features/estimating/api";

interface ScreenProps {
  estimate: Estimate;
}

const dollars = (cents?: number) => `$${Math.round((cents || 0) / 100).toLocaleString("en-US")}`;
const supabase = createClient();

export default function ActualsScreen({ estimate }: ScreenProps) {
  const { hasPermission } = useAuth();
  const { tasks } = useApp();
  const canViewMargins = hasPermission("canViewEstimatingMargins");
  const [pricing, setPricing] = useState<PricingSummaryRow | null>(null);
  const [costDetail, setCostDetail] = useState<any>(null);
  const [actualHours, setActualHours] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!estimate.converted_project_id) { setLoading(false); return; }
    const projectTaskIds = tasks.filter((t: any) => String(t.projectId) === String(estimate.converted_project_id)).map((t: any) => String(t.id));

    (async () => {
      setLoading(true);
      try {
        const [summary, detail] = await Promise.all([
          getPricingSummary(estimate.id),
          canViewMargins ? getLatestPricingSnapshotFull(estimate.id) : Promise.resolve(null),
        ]);
        setPricing(summary);
        setCostDetail(detail);

        if (projectTaskIds.length > 0) {
          const { data } = await supabase
            .from("task_work_sessions")
            .select("active_seconds")
            .in("task_id", projectTaskIds);
          const totalSeconds = (data ?? []).reduce((sum: number, s: any) => sum + (s.active_seconds || 0), 0);
          setActualHours(totalSeconds / 3600);
        } else {
          setActualHours(0);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estimate.id, estimate.converted_project_id, tasks.length]);

  if (!estimate.converted_project_id) {
    return (
      <div className="bg-card border border-dashed border-border rounded-[12px] p-[32px] text-center">
        <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
          This estimate hasn't been converted to a project yet -- record customer approval and convert it on the previous step first.
        </p>
      </div>
    );
  }

  if (loading) return <div className="h-[200px] bg-card border border-border rounded-[12px] animate-pulse" />;

  const estimatedHours = costDetail?.labor_hours_total ?? null;

  return (
    <div className="bg-card border border-border rounded-[12px] p-[16px]">
      <h2 className="font-['Roboto_Mono'] font-bold text-[13px] mb-[4px]">Estimated vs. actual</h2>
      <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[12px]">
        Actual labor hours are pulled live from this project's real work sessions -- not re-typed by hand.
      </p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-left font-['Roboto_Mono'] text-[9px] text-muted-foreground uppercase">
            <th className="pb-[6px]"></th><th className="pb-[6px] text-right">Estimated</th><th className="pb-[6px] text-right">Actual</th>
          </tr>
        </thead>
        <tbody>
          {canViewMargins && estimatedHours != null && (
            <tr className="border-t border-border">
              <td className="py-[6px] font-['Roboto_Mono']">Labor hours</td>
              <td className="py-[6px] text-right font-['Roboto_Mono']">{estimatedHours.toFixed(1)}</td>
              <td className="py-[6px] text-right font-['Roboto_Mono']">{(actualHours ?? 0).toFixed(1)}</td>
            </tr>
          )}
          {!canViewMargins && (
            <tr className="border-t border-border">
              <td className="py-[6px] font-['Roboto_Mono']">Labor hours (actual)</td>
              <td className="py-[6px] text-right font-['Roboto_Mono'] text-muted-foreground">—</td>
              <td className="py-[6px] text-right font-['Roboto_Mono']">{(actualHours ?? 0).toFixed(1)}</td>
            </tr>
          )}
          {pricing && (
            <tr className="border-t border-border">
              <td className="py-[6px] font-['Roboto_Mono']">Duration (weeks)</td>
              <td className="py-[6px] text-right font-['Roboto_Mono']">{pricing.duration_weeks.toFixed(1)}</td>
              <td className="py-[6px] text-right font-['Roboto_Mono'] text-muted-foreground">
                {actualHours != null && pricing.crew_size ? (actualHours / (pricing.crew_size * 40)).toFixed(1) : "—"}
              </td>
            </tr>
          )}
          {pricing && (
            <tr className="border-t border-border">
              <td className="py-[6px] font-['Roboto_Mono']">Sell price</td>
              <td className="py-[6px] text-right font-['Roboto_Mono']">{dollars(pricing.selling_price_good_cents)}</td>
              <td className="py-[6px] text-right font-['Roboto_Mono']">{dollars(pricing.selling_price_good_cents)}</td>
            </tr>
          )}
          {canViewMargins && costDetail && (
            <tr className="border-t border-border">
              <td className="py-[6px] font-['Roboto_Mono'] font-bold">Gross profit</td>
              <td className="py-[6px] text-right font-['Roboto_Mono'] font-bold">{dollars(costDetail.gp_good_cents)}</td>
              <td className="py-[6px] text-right font-['Roboto_Mono'] font-bold text-muted-foreground">
                {actualHours != null && costDetail.material_total_cents != null
                  ? dollars(costDetail.selling_price_good_cents - (costDetail.material_total_cents + Math.round(actualHours * (costDetail.labor_cost_total_cents / (costDetail.labor_hours_total || 1)))))
                  : "—"}
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!canViewMargins && (
        <p className="mt-[10px] font-['Roboto_Mono'] text-[9px] text-muted-foreground">Cost and margin figures are visible to Super Admin only.</p>
      )}
    </div>
  );
}
