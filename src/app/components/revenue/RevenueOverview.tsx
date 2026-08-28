import { Card } from '../ui/card';
import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { getAutomationStatus, getRevenueOperationalMetrics, retryLeadAutomations, type AutomationStatus, type RevenueOperationalMetrics } from '../../src/features/revenue/api';
import { toast } from 'sonner';

const STAGES = ['New','Contacted','Qualified','Consultation Booked','Site Visit','Estimate','Won','Lost'] as const;

export function RevenueOverview({ leads, onStage }: { leads: any[]; onStage: (stage: string) => void }) {
  const [automation, setAutomation] = useState<AutomationStatus | null>(null);
  const [operations, setOperations] = useState<RevenueOperationalMetrics | null>(null);
  const [retrying, setRetrying] = useState(false);
  const loadAutomation = () => getAutomationStatus().then(setAutomation).catch(() => setAutomation(null));
  useEffect(() => { loadAutomation(); getRevenueOperationalMetrics().then(setOperations).catch(() => setOperations(null)); }, [leads.length]);
  const retry = async () => {
    setRetrying(true);
    try { await retryLeadAutomations(); await loadAutomation(); toast.success('Lead follow-up queue processed'); }
    catch (error: any) { toast.error(error?.message || 'Could not retry lead follow-up'); }
    finally { setRetrying(false); }
  };
  const open = leads.filter((l) => !['Won','Lost'].includes(l.status));
  const won = leads.filter((l) => l.status === 'Won');
  const decided = leads.filter((l) => ['Won','Lost'].includes(l.status));
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const createdThisMonth = (l: any) => l.created_at && new Date(l.created_at) >= monthStart;
  const qualified = leads.filter((l) => ['Hot','Warm'].includes(l.qualification_band) && createdThisMonth(l));
  const responded = leads.filter((l) => createdThisMonth(l) && l.first_responded_at && l.created_at);
  const averageResponseMinutes = responded.length ? responded.reduce((sum, l) => sum + Math.max(0, (new Date(l.first_responded_at).getTime() - new Date(l.created_at).getTime()) / 60000), 0) / responded.length : null;
  const wonThisMonth = won.filter((l) => l.won_at ? new Date(l.won_at) >= monthStart : createdThisMonth(l));
  const money = (n: number) => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n);
  const responseLabel = averageResponseMinutes == null ? '—' : averageResponseMinutes < 60 ? `${Math.round(averageResponseMinutes)} min` : `${(averageResponseMinutes / 60).toFixed(1)} hr`;
  const cac = operations?.adSpendCentsMtd ? (wonThisMonth.length ? money(operations.adSpendCentsMtd / 100 / wonThisMonth.length) : 'Pending wins') : 'No spend data';
  const metrics = [
    ['Qualified leads · MTD', qualified.length.toString()],
    ['Avg. response · MTD', responseLabel],
    ['Appointments · MTD', operations ? operations.appointmentsMtd.toString() : '—'],
    ['Estimates · MTD', operations ? operations.estimatesMtd.toString() : '—'],
    ['Pipeline value', money(open.reduce((sum,l) => sum + Number(l.estimated_value || 0), 0))],
    ['Won revenue', money(won.reduce((sum,l) => sum + Number(l.estimated_value || 0), 0))],
    ['Close rate', decided.length ? `${Math.round(won.length / decided.length * 100)}%` : '—'],
    ['CAC · MTD', cac],
  ];
  const acquisitionRows = Object.values(leads.filter(createdThisMonth).reduce((groups: Record<string, any>, lead: any) => {
    const source = (lead.utm_source || (lead.gclid ? 'Google Ads' : lead.fbclid ? 'Meta Ads' : lead.source) || 'Direct / unknown').trim();
    const campaign = (lead.utm_campaign || 'Unspecified campaign').trim();
    const key = `${source.toLowerCase()}|${campaign.toLowerCase()}`;
    groups[key] ||= { source, campaign, leads: 0, qualified: 0, won: 0, revenue: 0, spend: 0 };
    groups[key].leads += 1;
    if (['Hot','Warm'].includes(lead.qualification_band)) groups[key].qualified += 1;
    if (lead.status === 'Won') { groups[key].won += 1; groups[key].revenue += Number(lead.estimated_value || 0); }
    return groups;
  }, {})).map((row: any) => {
    const matchingSpend = (operations?.adSpend || []).filter((spend) => spend.platform.toLowerCase() === row.source.toLowerCase() && (!spend.campaign_name || spend.campaign_name.toLowerCase() === row.campaign.toLowerCase()));
    row.spend = matchingSpend.reduce((sum, spend) => sum + Number(spend.spend_cents || 0) / 100, 0);
    return row;
  }).sort((a: any, b: any) => b.qualified - a.qualified || b.leads - a.leads);
  return <div className="space-y-4">
    {automation && automation.attentionCount > 0 && <Card className="p-4 border-amber-300/70 bg-amber-50/70">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3"><AlertTriangle className="w-4 h-4 mt-0.5 text-amber-700" /><div><p className="text-sm font-semibold text-amber-950">Follow-up needs attention</p><p className="text-xs text-amber-900/70 mt-0.5">{automation.attentionCount} lead notification{automation.attentionCount === 1 ? '' : 's'} waiting safely in Cstle.</p></div></div>
        <button type="button" onClick={retry} disabled={retrying} className="inline-flex items-center gap-2 rounded-lg border border-amber-400/70 bg-white px-3 py-2 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60">{retrying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}Retry now</button>
      </div>
    </Card>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map(([label,value]) => <Card key={label} className="p-4 min-w-0"><p className="text-[10px] text-muted-foreground truncate">{label}</p><p className="text-lg font-semibold mt-1 leading-tight break-words">{value}</p></Card>)}</div>
    <Card className="p-4"><div className="mb-3"><h3>Revenue Pipeline</h3><p className="text-xs text-muted-foreground">Regina Basement Development · click a stage to filter</p></div><div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">{STAGES.map(stage => <button key={stage} type="button" onClick={() => onStage(stage)} className="rounded-lg bg-secondary/50 hover:bg-secondary p-3 text-left"><span className="text-xl font-semibold">{leads.filter(l => l.status === stage).length}</span><span className="block text-[10px] text-muted-foreground mt-1">{stage}</span></button>)}</div></Card>
    <Card className="p-4 overflow-hidden"><div className="mb-3"><h3>Acquisition performance</h3><p className="text-xs text-muted-foreground">This month · source and campaign attribution</p></div>
      {acquisitionRows.length === 0 ? <p className="text-xs text-muted-foreground py-4">No attributed leads this month yet.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b text-[9px] uppercase tracking-wide text-muted-foreground"><th className="py-2 pr-3 font-medium">Source / campaign</th><th className="py-2 px-2 font-medium">Leads</th><th className="py-2 px-2 font-medium">Qualified</th><th className="py-2 px-2 font-medium">Wins</th><th className="py-2 px-2 font-medium">Revenue</th><th className="py-2 px-2 font-medium">CPL</th><th className="py-2 pl-2 font-medium">CAC</th></tr></thead><tbody>{acquisitionRows.map((row: any) => <tr key={`${row.source}-${row.campaign}`} className="border-b last:border-0 text-xs"><td className="py-3 pr-3"><span className="font-medium block">{row.source}</span><span className="text-[10px] text-muted-foreground">{row.campaign}</span></td><td className="py-3 px-2">{row.leads}</td><td className="py-3 px-2">{row.qualified}</td><td className="py-3 px-2">{row.won}</td><td className="py-3 px-2">{money(row.revenue)}</td><td className="py-3 px-2">{row.spend ? money(row.spend / row.leads) : '—'}</td><td className="py-3 pl-2">{row.spend && row.won ? money(row.spend / row.won) : '—'}</td></tr>)}</tbody></table></div>}
    </Card>
  </div>;
}
