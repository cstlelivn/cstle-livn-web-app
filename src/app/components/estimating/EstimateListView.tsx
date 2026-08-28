import { useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Estimate } from "../../src/features/estimating/api";
import { formatDate } from "../../src/lib/dates";

const STATUS_LABELS: Record<string, string> = {
  lead: "Lead",
  estimating: "Estimating",
  proposal_sent: "Proposal sent",
  approved: "Approved",
  converted: "Converted",
  declined: "Declined",
  lost: "Lost",
};

const MILESTONES: Array<keyof Estimate> = [
  "capture_confirmed",
  "analysis_confirmed",
  "scope_confirmed",
  "plan_confirmed",
  "pricing_confirmed",
  "proposal_approved",
  "customer_approved",
];

export default function EstimateListView({ estimates, clientName, onOpen }: { estimates: Estimate[]; clientName: (id: string) => string; onOpen: (id: string) => void }) {
  const [widths, setWidths] = useState([260, 210, 250, 120, 140, 120, 84]);
  const template = `minmax(${widths[0]}px,1.5fr) minmax(${widths[1]}px,1.1fr) minmax(${widths[2]}px,1.35fr) ${widths[3]}px ${widths[4]}px ${widths[5]}px ${widths[6]}px`;
  const minWidth = widths.reduce((total, width) => total + width, 0) + (widths.length - 1) * 16 + 32;
  const labels = ["Estimate", "Customer", "Site address", "Progress", "Status", "Updated", "Actions"];

  const resize = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const initial = [...widths];
    const move = (next: PointerEvent) => {
      const delta = next.clientX - startX;
      const adjusted = Math.max(84 - initial[index], Math.min(delta, initial[index + 1] - 84));
      setWidths(initial.map((width, column) => column === index ? width + adjusted : column === index + 1 ? width - adjusted : width));
    };
    const end = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
  };

  return (
    <div className="overflow-x-auto rounded-[14px] border border-black/[0.07] bg-card shadow-[0_14px_36px_rgba(25,25,25,0.06)]">
      <div className="grid w-full gap-4 border-b border-black/[0.07] bg-[#f4f5ef] px-4 py-2.5" style={{ gridTemplateColumns: template, minWidth }}>
        {labels.map((label, index) => (
          <div key={label} className="relative min-w-0">
            <p className={`truncate font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}>{label}</p>
            {index < labels.length - 1 && <button type="button" onPointerDown={(event) => resize(index, event)} className="absolute -right-2 top-1/2 h-7 w-3 -translate-y-1/2 cursor-col-resize touch-none rounded-full bg-[#65733d]/10 opacity-30 transition-opacity hover:opacity-100" aria-label={`Resize ${label} column`} />}
          </div>
        ))}
      </div>
      {estimates.map((estimate) => {
        const complete = MILESTONES.filter((key) => Boolean(estimate[key])).length;
        const progress = Math.round((complete / MILESTONES.length) * 100);
        return (
          <div key={estimate.id} role="button" tabIndex={0} onClick={() => onOpen(estimate.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(estimate.id); }} className="grid w-full cursor-pointer items-center gap-4 border-b border-black/[0.055] px-4 py-2.5 transition-colors hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65733d] last:border-b-0" style={{ gridTemplateColumns: template, minWidth }}>
            <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#191919]">{estimate.name}</p><p className="mt-0.5 truncate font-['Roboto_Mono'] text-[9px] uppercase text-muted-foreground">EST-{estimate.id.slice(0, 8)}</p></div>
            <p className="truncate text-[11px] font-medium text-[#303030]">{clientName(estimate.client_id)}</p>
            <div className="flex min-w-0 items-center gap-2"><MapPin className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate text-[10px] text-muted-foreground">{estimate.site_address || "Address not added"}</span></div>
            <div className="min-w-0"><div className="mb-1 flex items-center justify-between gap-2"><span className="text-[10px] font-semibold tabular-nums">{progress}%</span><span className="font-['Roboto_Mono'] text-[8px] text-muted-foreground">{complete}/7</span></div><div className="h-1.5 overflow-hidden rounded-full bg-black/[0.07]"><div className="h-full rounded-full bg-[#65733d]" style={{ width: `${progress}%` }} /></div></div>
            <span className="w-fit max-w-full truncate rounded-full border border-[#65733d]/20 bg-[#eef1e3] px-2 py-1 text-[9px] font-medium text-[#53602f]">{STATUS_LABELS[estimate.status] || estimate.status}</span>
            <p className="truncate text-[10px] text-muted-foreground">{formatDate(estimate.updated_at || estimate.created_at)}</p>
            <div className="flex items-center justify-end border-l border-black/[0.07] pl-2"><button type="button" onClick={(event) => { event.stopPropagation(); onOpen(estimate.id); }} className="flex h-8 items-center gap-1 rounded-md px-2 font-['Roboto_Mono'] text-[9px] font-bold text-[#53602f] hover:bg-[#eef1e3]" aria-label={`Open ${estimate.name}`}>Open <ArrowUpRight className="size-3" /></button></div>
          </div>
        );
      })}
    </div>
  );
}
