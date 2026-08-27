import { useCallback, useEffect, useState } from 'react';
import { Calendar, Check, Circle, Clock3, Plus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../AuthContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { addLeadActivity, addLeadAppointment, addLeadTask, listLeadOperations, setLeadTaskCompleted } from '../../src/features/revenue/api';
import { formatDateTimeInOrgTz } from '../../src/lib/timezone';

export function LeadOperationsPanel({ lead, onUpdateLead }: { lead: any; onUpdateLead: (updates: any) => Promise<void> | void }) {
  const { users, currentUser } = useAuth();
  const [data, setData] = useState({ activities: [] as any[], tasks: [] as any[], appointments: [] as any[] });
  const [loading, setLoading] = useState(true);
  const [taskTitle, setTaskTitle] = useState(''); const [taskDue, setTaskDue] = useState('');
  const [appointmentType, setAppointmentType] = useState('Consultation'); const [appointmentAt, setAppointmentAt] = useState(''); const [appointmentLocation, setAppointmentLocation] = useState('');
  const [note, setNote] = useState('');
  const load = useCallback(async () => { setLoading(true); try { setData(await listLeadOperations(String(lead.id))); } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to load sales operations'); } finally { setLoading(false); } }, [lead.id]);
  useEffect(() => { load(); }, [load]);
  const personName = (id?: string | null) => users.find((u) => u.id === id)?.name || 'Unassigned';
  const when = (value: string) => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'Date unavailable' : formatDateTimeInOrgTz(d); };
  const addTask = async () => { if (!taskTitle.trim()) return; await addLeadTask({ leadId: String(lead.id), title: taskTitle.trim(), dueAt: taskDue ? new Date(taskDue).toISOString() : undefined, assignedTo: lead.owner_user_id, createdBy: currentUser?.id }); setTaskTitle(''); setTaskDue(''); await load(); };
  const addAppointment = async () => { if (!appointmentAt) return toast.error('Choose an appointment time'); await addLeadAppointment({ leadId: String(lead.id), type: appointmentType, startsAt: new Date(appointmentAt).toISOString(), location: appointmentLocation, assignedTo: lead.owner_user_id, createdBy: currentUser?.id }); setAppointmentAt(''); setAppointmentLocation(''); await onUpdateLead({ pipeline_stage: appointmentType === 'Site Visit' ? 'Site Visit' : 'Consultation Booked' }); await load(); };
  const addNote = async () => { if (!note.trim()) return; await addLeadActivity(String(lead.id), note.trim(), currentUser?.id); setNote(''); await load(); };
  return <Card className="p-4 space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">Sales Operations</h3><p className="text-xs text-muted-foreground mt-1">Ownership, next action, appointments and history.</p></div><Badge variant="outline">{data.tasks.filter(t => !t.completed_at).length} open</Badge></div>
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-end"><div><Label>Lead owner</Label><Select value={lead.owner_user_id || 'unassigned'} onValueChange={(v) => onUpdateLead({ owner_user_id: v === 'unassigned' ? null : v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unassigned">Unassigned</SelectItem>{users.filter(u => ['Super Admin','Admin','Manager'].includes(u.role)).map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div><div className="flex items-center gap-2 text-xs text-muted-foreground pb-2"><UserRound className="size-4" />{personName(lead.owner_user_id)}</div></div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded-lg border p-3 space-y-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase"><Clock3 className="size-4" />Next actions</div>{data.tasks.length === 0 && !loading && <p className="text-xs text-muted-foreground">No next action yet.</p>}{data.tasks.map(t => <button key={t.id} onClick={async () => { await setLeadTaskCompleted(t.id, !t.completed_at); await load(); }} className="w-full flex items-start gap-2 text-left"><span className="mt-0.5">{t.completed_at ? <Check className="size-4 text-success" /> : <Circle className="size-4 text-muted-foreground" />}</span><span className={t.completed_at ? 'line-through text-muted-foreground text-xs' : 'text-xs'}>{t.title}{t.due_at && <span className="block text-[10px] text-muted-foreground mt-0.5">{when(t.due_at)}</span>}</span></button>)}<div className="grid grid-cols-1 sm:grid-cols-[1fr_170px] gap-2"><Input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Call about budget…" /><Input type="datetime-local" value={taskDue} onChange={e => setTaskDue(e.target.value)} /></div><Button size="sm" variant="outline" onClick={addTask}><Plus className="size-4 mr-1" />Add next action</Button></div>
      <div className="rounded-lg border p-3 space-y-3"><div className="flex items-center gap-2 text-xs font-semibold uppercase"><Calendar className="size-4" />Appointments</div>{data.appointments.length === 0 && !loading && <p className="text-xs text-muted-foreground">No consultation or site visit scheduled.</p>}{data.appointments.slice(0,4).map(a => <div key={a.id} className="text-xs"><span className="font-semibold">{a.appointment_type}</span><span className="block text-[10px] text-muted-foreground">{when(a.starts_at)}{a.location ? ` · ${a.location}` : ''}</span></div>)}<Select value={appointmentType} onValueChange={setAppointmentType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['Consultation','Site Visit','Estimate Review'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select><div className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Input type="datetime-local" value={appointmentAt} onChange={e => setAppointmentAt(e.target.value)} /><Input value={appointmentLocation} onChange={e => setAppointmentLocation(e.target.value)} placeholder="Address or meeting link" /></div><Button size="sm" variant="outline" onClick={addAppointment}>Schedule</Button></div>
    </div>
    <div className="rounded-lg bg-secondary/40 p-3 space-y-2"><Label>Activity note</Label><div className="flex gap-2"><Input value={note} onChange={e => setNote(e.target.value)} placeholder="What happened, and what matters next?" /><Button size="sm" onClick={addNote}>Add</Button></div>{data.activities.slice(0,6).map(a => <div key={a.id} className="border-t pt-2 text-xs"><span>{a.summary}</span><span className="block text-[10px] text-muted-foreground mt-0.5">{when(a.occurred_at)}</span></div>)}</div>
  </Card>;
}
