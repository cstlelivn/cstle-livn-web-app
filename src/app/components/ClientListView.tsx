import { useState } from 'react';
import { Mail, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { formatDateTime, formatNaturalDateTime } from '../src/lib/dateFormatter';

export function ClientListView({ clients, canViewFinance, onOpen, onDelete, onStatusChange }: { clients: any[]; canViewFinance: boolean; onOpen: (client: any) => void; onDelete: (client: any, event: React.MouseEvent) => void; onStatusChange: (client: any, status: string) => void }) {
  const [widths, setWidths] = useState(canViewFinance ? [240, 120, 110, 260, 150, 92] : [260, 130, 290, 160, 92]);
  const template = canViewFinance
    ? `minmax(${widths[0]}px,1.25fr) ${widths[1]}px ${widths[2]}px minmax(${widths[3]}px,1.55fr) ${widths[4]}px ${widths[5]}px`
    : `minmax(${widths[0]}px,1.25fr) ${widths[1]}px minmax(${widths[2]}px,1.55fr) ${widths[3]}px ${widths[4]}px`;
  const minWidth = widths.reduce((sum, width) => sum + width, 0) + (widths.length - 1) * 16 + 32;
  const resize = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault(); event.stopPropagation(); const startX = event.clientX; const initial = [...widths];
    const move = (next: PointerEvent) => { const delta = next.clientX - startX; const adjusted = Math.max(80 - initial[index], Math.min(delta, initial[index + 1] - 80)); setWidths(initial.map((width, column) => column === index ? width + adjusted : column === index + 1 ? width - adjusted : width)); };
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
  };
  const labels = canViewFinance ? ['Name','Status','Value','Contact','Last contact','Actions'] : ['Name','Status','Contact','Last contact','Actions'];
  return <div className="overflow-x-auto rounded-[14px] border border-black/[0.07] bg-card shadow-[0_14px_36px_rgba(25,25,25,0.06)]">
    <div className="grid w-full gap-4 border-b border-black/[0.07] bg-[#f4f5ef] px-4 py-2.5" style={{ gridTemplateColumns: template, minWidth }}>{labels.map((label, index) => <div key={label} className="relative min-w-0"><p className={`truncate font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground ${label === 'Actions' ? 'text-right' : ''}`}>{label}</p>{index < labels.length - 1 && <button type="button" onPointerDown={(event) => resize(index, event)} className="absolute -right-2 top-1/2 h-7 w-3 -translate-y-1/2 cursor-col-resize touch-none rounded-full bg-[#65733d]/10 opacity-30 transition-opacity hover:opacity-100" aria-label={`Resize ${label} column`} />}</div>)}</div>
    {clients.map((client) => <div key={client.id} role="button" tabIndex={0} onClick={() => onOpen(client)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpen(client); }} className="grid w-full cursor-pointer items-center gap-4 border-b border-black/[0.055] px-4 py-2.5 transition-colors hover:bg-[#f7f8f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#65733d] last:border-b-0" style={{ gridTemplateColumns: template, minWidth }}>
      <div className="min-w-0"><p className="truncate text-[13px] font-semibold text-[#191919]">{client.name}</p><p className="mt-0.5 truncate font-['Roboto_Mono'] text-[9px] uppercase text-muted-foreground">{client.company || client.source || 'Customer'}</p></div>
      <div className="min-w-0" onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}><Select value={client.status || 'Active'} onValueChange={(status) => onStatusChange(client, status)}><SelectTrigger className="h-8 w-full justify-start gap-2 overflow-hidden border-0 bg-[#eef1e3] px-2 text-left text-[10px] text-[#53602f] shadow-none [&>span]:truncate"><SelectValue /></SelectTrigger><SelectContent>{['Active','Past','On Hold','Lost'].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select></div>
      {canViewFinance && <p className="truncate text-[12px] font-semibold tabular-nums">${Number(client.totalSpent || 0).toLocaleString()}</p>}
      <div className="flex min-w-0 items-center gap-2"><Mail className="size-3.5 shrink-0 text-muted-foreground" /><span className="truncate text-[10px] text-muted-foreground">{client.email || 'Email not added'}</span></div>
      <p className="truncate text-[10px] text-muted-foreground" title={client.lastContact ? `${formatDateTime(client.lastContact)} Regina time` : 'No contact recorded'}>{formatNaturalDateTime(client.lastContact)}</p>
      <div className="flex items-center justify-end gap-1 border-l border-black/[0.07] pl-2"><Button variant="ghost" size="sm" disabled={!client.email} onClick={(event) => { event.stopPropagation(); if (client.email) window.location.href = `mailto:${client.email}`; }} className="h-8 w-8 p-0" aria-label={`Email ${client.name}`}><Mail className="size-3.5" /></Button><Button variant="ghost" size="sm" onClick={(event) => onDelete(client, event)} className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label={`Delete ${client.name}`}><Trash2 className="size-3.5" /></Button></div>
    </div>)}
  </div>;
}
