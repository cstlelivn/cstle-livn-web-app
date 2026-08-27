import { useEffect, useState } from 'react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { scoreReginaBasementProjectFit, type ProjectFitAnswers } from '../../src/features/revenue/scoring';

export function ProjectFitPanel({ lead, onSave }: { lead: any; onSave: (updates: any) => Promise<void> | void }) {
  const [answers, setAnswers] = useState<ProjectFitAnswers>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setAnswers({ city: lead.city || '', ...(lead.qualification_answers || {}) });
  }, [lead.id, lead.city, lead.qualification_answers]);
  const result = scoreReginaBasementProjectFit(answers);
  const set = <K extends keyof ProjectFitAnswers>(key: K, value: ProjectFitAnswers[K]) => setAnswers((old) => ({ ...old, [key]: value }));
  const save = async () => {
    setSaving(true);
    try {
      await onSave({ qualification_answers: answers, qualification_score: result.score, qualification_band: result.band, qualification_reasons: result.reasons, ...(result.band === 'Hot' || result.band === 'Warm' ? { pipeline_stage: 'Qualified' } : {}) });
    } finally { setSaving(false); }
  };
  const tone = result.band === 'Hot' ? 'bg-success/10 text-success' : result.band === 'Warm' ? 'bg-primary/10 text-primary' : result.band === 'Nurture' ? 'bg-accent/10 text-accent' : 'bg-destructive/10 text-destructive';
  const hasDraftSignal = Boolean(answers.city || answers.budgetRange || answers.timeline || answers.ownsProperty || answers.financingReady || answers.consultationRequested);
  const scoreLabel = lead.qualification_score == null && !hasDraftSignal ? 'Not scored' : `${lead.qualification_score == null ? 'Draft · ' : ''}${result.band} · ${result.score}`;
  return <Card className="p-4 space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">Project Fit — Regina Basement Development</h3><p className="text-xs text-muted-foreground mt-1">A consistent fit check for prioritizing the next sales action.</p></div><Badge className={lead.qualification_score == null && !hasDraftSignal ? 'bg-secondary text-secondary-foreground' : tone}>{scoreLabel}</Badge></div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div><Label>City</Label><Input className="mt-1" value={answers.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
      <div><Label>Budget</Label><Select value={answers.budgetRange || ''} onValueChange={(v) => set('budgetRange', v as any)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{['Under $35,000','$35,000–$49,999','$50,000–$74,999','$75,000+'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
      <div><Label>Timeline</Label><Select value={answers.timeline || ''} onValueChange={(v) => set('timeline', v as any)}><SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{['0–3 months','3–6 months','6–12 months','Researching'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>
    </div>
    <div className="flex flex-wrap gap-5 text-xs">{([['ownsProperty','Property secured'],['financingReady','Funding ready'],['consultationRequested','Consultation requested']] as const).map(([key,label]) => <label key={key} className="flex items-center gap-2"><Checkbox checked={!!answers[key]} onCheckedChange={(v) => set(key, v === true)} />{label}</label>)}</div>
    {result.reasons.length > 0 && <p className="text-xs text-muted-foreground">{result.reasons.join(' · ')}</p>}
    <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Project Fit'}</Button>
  </Card>;
}
