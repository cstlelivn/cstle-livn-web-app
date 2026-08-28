import { Card } from '../ui/card';
import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { getAutomationStatus, retryLeadAutomations, type AutomationStatus } from '../../src/features/revenue/api';
import { toast } from 'sonner';

const STAGES = ['New','Contacted','Qualified','Consultation Booked','Site Visit','Estimate','Won','Lost'] as const;

export function RevenueOverview({ leads, onStage }: { leads: any[]; onStage: (stage: string) => void }) {
  const [automation, setAutomation] = useState<AutomationStatus | null>(null);
  const [retrying, setRetrying] = useState(false);
  const loadAutomation = () => getAutomationStatus().then(setAutomation).catch(() => setAutomation(null));
  useEffect(() => { loadAutomation(); }, [leads.length]);
  const retry = async () => {
    setRetrying(true);
    try { await retryLeadAutomations(); await loadAutomation(); toast.success('Lead follow-up queue processed'); }
    catch (error: any) { toast.error(error?.message || 'Could not retry lead follow-up'); }
    finally { setRetrying(false); }
  };
  const open = leads.filter((l) => !['Won','Lost'].includes(l.status));
  const won = leads.filter((l) => l.status === 'Won');
  const decided = leads.filter((l) => ['Won','Lost'].includes(l.status));
  const qualified = leads.filter((l) => ['Hot','Warm'].includes(l.qualification_band));
  const money = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
  const metrics = [
    ['Qualified leads', qualified.length.toString()],
    ['Pipeline value', money(open.reduce((sum,l) => sum + Number(l.estimated_value || 0), 0))],
    ['Won revenue', money(won.reduce((sum,l) => sum + Number(l.estimated_value || 0), 0))],
    ['Close rate', decided.length ? `${Math.round(won.length / decided.length * 100)}%` : '—'],
  ];
  return <div className="space-y-4">
    {automation && automation.attentionCount > 0 && <Card className="p-4 border-amber-300/70 bg-amber-50/70">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3"><AlertTriangle className="w-4 h-4 mt-0.5 text-amber-700" /><div><p className="text-sm font-semibold text-amber-950">Follow-up needs attention</p><p className="text-xs text-amber-900/70 mt-0.5">{automation.attentionCount} lead notification{automation.attentionCount === 1 ? '' : 's'} waiting safely in Cstle.</p></div></div>
        <button type="button" onClick={retry} disabled={retrying} className="inline-flex items-center gap-2 rounded-lg border border-amber-400/70 bg-white px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60">{retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Retry now</button>
      </div>
    </Card>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map(([label,value]) => <Card key={label} className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold mt-1">{value}</p></Card>)}</div>
    <Card className="p-4"><div className="mb-3"><h3>Revenue Pipeline</h3><p className="text-xs text-muted-foreground">Regina Basement Development · click a stage to filter</p></div><div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">{STAGES.map(stage => <button key={stage} type="button" onClick={() => onStage(stage)} className="rounded-lg bg-secondary/50 hover:bg-secondary p-3 text-left"><span className="text-xl font-semibold">{leads.filter(l => l.status === stage).length}</span><span className="block text-[10px] text-muted-foreground mt-1">{stage}</span></button>)}</div></Card>
  </div>;
}
