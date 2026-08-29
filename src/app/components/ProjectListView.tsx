import { useState } from "react";
import { ArrowUpRight, MapPin, Trash2 } from "lucide-react";
import type { Project } from "./AppContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { formatDate } from "../src/lib/dates";

const STATUSES: Project["status"][] = ["Planning", "In Progress", "On Hold", "Delayed", "Completed"];

export default function ProjectListView({ projects, canViewFinance, canEditProjects, onOpen, onDelete, onStatusChange }: { projects: Project[]; canViewFinance: boolean; canEditProjects: boolean; onOpen: (id: number) => void; onDelete: (id: number, event: React.MouseEvent) => void; onStatusChange: (project: Project, status: Project["status"]) => void }) {
  const [widths, setWidths] = useState(canViewFinance ? [270, 210, 250, 150, 120, 140, 120, 92] : [290, 220, 270, 130, 150, 130, 92]);
  const template = canViewFinance
    ? `minmax(${widths[0]}px,1.45fr) minmax(${widths[1]}px,1.05fr) minmax(${widths[2]}px,1.3fr) ${widths[3]}px ${widths[4]}px ${widths[5]}px ${widths[6]}px ${widths[7]}px`
    : `minmax(${widths[0]}px,1.45fr) minmax(${widths[1]}px,1.05fr) minmax(${widths[2]}px,1.3fr) ${widths[3]}px ${widths[4]}px ${widths[5]}px ${widths[6]}px`;
  const labels = canViewFinance ? ["Project", "Customer", "Location", "Budget", "Progress", "Status", "Due", "Actions"] : ["Project", "Customer", "Location", "Progress", "Status", "Due", "Actions"];
  const minWidth = widths.reduce((total, width) => total + width, 0) + (widths.length - 1) * 16 + 32;

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
        {labels.map((label, index) => <div key={label} className="relative min-w-0"><p className={`truncate font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground ${label === "Actions" ? "text-right" : ""}`}>{label}</p>{index < labels.length - 1 && <button type="button" onPointerDown={(event) => resize(index, event)} className="absolute -right-2 top-1/2 h-7 w-3 -translate-y-1/2 cursor-col-resize touch-none rounded-full bg-[#65733d]/10 opacity-30 transition-opacity hover:opacity-100" aria-label={`Resize ${label} column`} />}</div>)}
      </div>
      {projects.map((project) => (
        <div key={project.id} role="button" tabIndex={0} onClick={() => onOpen(project.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(project.id); }} className="grid w-full cursor-pointer items-center gap-4 border-b border-black/[0.055] px-4 py-2.5 transition-colors hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65733d] last:border-b-0" style={{ gridTemplateColumns: template, minWidth }}>
          <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#191919]">{project.title}</p><p className="mt-0.5 truncate font-['Roboto_Mono'] text-[9px] uppercase text-muted-foreground">{project.phase || "Phase not set"}</p></div>
          <p className="truncate text-[11px] font-medium text-[#303030]">{project.client || "Customer not linked"}</p>
          <div className="flex min-w-0 items-center gap-2"><MapPin className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate text-[10px] text-muted-foreground">{project.location || "Location not added"}</span></div>
          {canViewFinance && <div className="min-w-0"><p className="truncate text-[11px] font-semibold tabular-nums">${Number(project.spent || 0).toLocaleString()}</p><p className="truncate font-['Roboto_Mono'] text-[8px] text-muted-foreground">of ${Number(project.budget || 0).toLocaleString()}</p></div>}
          <div className="min-w-0"><div className="mb-1 flex items-center justify-between"><span className="text-[10px] font-semibold tabular-nums">{project.progress}%</span></div><div className="h-1.5 overflow-hidden rounded-full bg-black/[0.07]"><div className="h-full rounded-full bg-[#65733d]" style={{ width: `${Math.max(0, Math.min(100, project.progress || 0))}%` }} /></div></div>
          <div className="min-w-0" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>{canEditProjects ? <Select value={project.status} onValueChange={(status) => onStatusChange(project, status as Project["status"])}><SelectTrigger className="h-8 w-full justify-start gap-2 overflow-hidden border-0 bg-[#eef1e3] px-2 text-left text-[10px] text-[#53602f] shadow-none [&>span]:truncate"><SelectValue /></SelectTrigger><SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select> : <span className="block truncate rounded-full border border-[#65733d]/20 bg-[#eef1e3] px-2 py-1 text-[9px] font-medium text-[#53602f]">{project.status}</span>}</div>
          <p className="truncate text-[10px] text-muted-foreground">{project.endDate ? formatDate(project.endDate) : "Not scheduled"}</p>
          <div className="flex items-center justify-end gap-1 border-l border-black/[0.07] pl-2"><button type="button" onClick={(event) => { event.stopPropagation(); onOpen(project.id); }} className="flex h-8 items-center gap-1 rounded-md px-2 font-['Roboto_Mono'] text-[9px] font-bold text-[#53602f] hover:bg-[#eef1e3]" aria-label={`Open ${project.title}`}>Open <ArrowUpRight className="size-3" /></button>{canEditProjects && <button type="button" onClick={(event) => onDelete(project.id, event)} className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${project.title}`}><Trash2 className="size-3.5" /></button>}</div>
        </div>
      ))}
    </div>
  );
}
