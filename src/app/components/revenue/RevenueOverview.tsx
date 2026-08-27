import { Card } from '../ui/card';

const STAGES = ['New','Contacted','Qualified','Consultation Booked','Site Visit','Estimate','Won','Lost'] as const;

export function RevenueOverview({ leads, onStage }: { leads: any[]; onStage: (stage: string) => void }) {
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{metrics.map(([label,value]) => <Card key={label} className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold mt-1">{value}</p></Card>)}</div>
    <Card className="p-4"><div className="mb-3"><h3>Revenue Pipeline</h3><p className="text-xs text-muted-foreground">Regina Basement Development · click a stage to filter</p></div><div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">{STAGES.map(stage => <button key={stage} type="button" onClick={() => onStage(stage)} className="rounded-lg bg-secondary/50 hover:bg-secondary p-3 text-left"><span className="text-xl font-semibold">{leads.filter(l => l.status === stage).length}</span><span className="block text-[10px] text-muted-foreground mt-1">{stage}</span></button>)}</div></Card>
  </div>;
}
