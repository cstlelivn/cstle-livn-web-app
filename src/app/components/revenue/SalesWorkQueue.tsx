import { useEffect, useState } from 'react';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { getSalesWorkQueue, type SalesWorkItem } from '../../src/features/revenue/api';

export function SalesWorkQueue({ leads, onOpenLead }: { leads: any[]; onOpenLead: (lead: any) => void }) {
  const [items, setItems] = useState<SalesWorkItem[]>([]); const [loading, setLoading] = useState(true);
  const queueVersion = leads.map((lead) => [lead.id, lead.status, lead.qualification_band, lead.owner_user_id, lead.first_responded_at].join(':')).join('|');
  useEffect(() => { let active = true; setLoading(true); getSalesWorkQueue(leads).then((next) => active && setItems(next)).catch(() => active && setItems([])).finally(() => active && setLoading(false)); return () => { active = false; }; }, [queueVersion]);
  const leadById = new Map(leads.map((lead) => [String(lead.id), lead]));
  return <Card className="overflow-hidden">
    <div className="flex items-start justify-between gap-4 border-b p-4"><div><h3 className="text-sm font-semibold">Today’s sales work</h3><p className="mt-1 text-xs text-muted-foreground">The opportunities most likely to lose momentum without action.</p></div><Badge variant="outline">{items.length} priorities</Badge></div>
    {loading ? <div className="flex items-center gap-2 p-5 text-xs text-muted-foreground"><Loader2 className="size-4 animate-spin" />Building today’s queue…</div> : items.length === 0 ? <p className="p-5 text-xs text-muted-foreground">Nothing needs immediate attention. New work will appear here automatically.</p> : <div className="divide-y">{items.map((item) => { const lead = leadById.get(item.leadId); if (!lead) return null; return <button key={item.leadId} type="button" onClick={() => onOpenLead(lead)} className="grid w-full grid-cols-[auto_1fr_auto] items-start gap-3 p-4 text-left transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"><span className={`mt-1 h-2 w-2 rounded-full ${item.priority === 'Urgent' ? 'bg-destructive' : item.priority === 'Today' ? 'bg-amber-500' : 'bg-primary/50'}`} /><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{lead.name || 'Unnamed lead'}</span><span className="text-[9px] uppercase text-muted-foreground">{item.priority}</span></span><span className="mt-1 block text-xs">{item.reason}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{item.detail}</span></span><ArrowUpRight className="mt-1 size-4 text-muted-foreground" /></button>; })}</div>}
  </Card>;
}
