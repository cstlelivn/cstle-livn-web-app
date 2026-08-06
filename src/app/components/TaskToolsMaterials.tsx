import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Copy, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import {
  addTaskResource,
  approveTaskResources,
  copyTaskResources,
  listReusableTaskResources,
  listTaskResources,
} from '../src/features/taskPlanning/api';

const PROVIDED_BY = ['Cstle Livn', 'Client', 'Subcontractor', 'Existing On Site', 'To Be Confirmed'];

export default function TaskToolsMaterials({ taskId }: { taskId: string }) {
  const { hasPermission, currentUser } = useAuth();
  const canManage = hasPermission('canEditProjects') || currentUser?.role === 'Supervisor';
  const [open, setOpen] = useState(false);
  const [tools, setTools] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [kind, setKind] = useState<'tool' | 'material'>('tool');
  const [form, setForm] = useState({ name: '', quantity: '1', unit: 'unit', providedBy: 'To Be Confirmed', detail: '', notes: '' });
  const [copyOpen, setCopyOpen] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [copyMode, setCopyMode] = useState<'tools' | 'materials' | 'both'>('both');
  const [search, setSearch] = useState('');

  const load = async () => {
    const rows = await listTaskResources(taskId);
    setTools(rows.tools);
    setMaterials(rows.materials);
  };
  useEffect(() => { load().catch(() => {}); }, [taskId]);

  const approved = useMemo(() => [...tools, ...materials].filter((row) => row.list_status === 'Approved').length, [tools, materials]);
  const filteredSources = sources.filter((task) => `${task.title} ${task.description || ''} ${task.task_type || ''}`.toLowerCase().includes(search.toLowerCase()));

  const add = async () => {
    if (!form.name.trim()) return;
    try {
      const common = { name: form.name.trim(), quantity: Number(form.quantity) || 1, provided_by: form.providedBy, notes: form.notes.trim() || null };
      await addTaskResource(kind, taskId, kind === 'tool'
        ? { ...common, availability: form.detail.trim() || null }
        : { ...common, specification: form.detail.trim() || null, unit: form.unit.trim() || 'unit', purchase_status: 'To Be Confirmed' });
      setForm({ name: '', quantity: '1', unit: 'unit', providedBy: 'To Be Confirmed', detail: '', notes: '' });
      await load();
      toast.success(`${kind === 'tool' ? 'Tool' : 'Material'} added as draft`);
    } catch (error: any) { toast.error(error.message); }
  };

  const showCopy = async () => {
    try {
      const rows = await listReusableTaskResources();
      const map = new Map<string, any>();
      [...rows.tools, ...rows.materials].forEach((row: any) => map.set(String(row.tasks.id), row.tasks));
      setSources([...map.values()].filter((task) => String(task.id) !== taskId));
      setCopyOpen(true);
    } catch (error: any) { toast.error(error.message); }
  };

  const copy = async () => {
    if (!sourceId) return;
    try {
      await copyTaskResources(sourceId, taskId, copyMode);
      setCopyOpen(false);
      await load();
      toast.success('Independent editable draft copied');
    } catch (error: any) { toast.error(error.message); }
  };

  const approve = async () => {
    try {
      await approveTaskResources(taskId);
      await load();
      toast.success('Tools and materials approved');
    } catch (error: any) { toast.error(error.message); }
  };

  return (
    <section className="rounded-[8px] border border-border bg-secondary/10">
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left">
        <span><span className="font-['Roboto_Mono'] text-[10px] font-bold uppercase">Tools and Materials</span><span className="ml-2 font-['Roboto_Mono'] text-[9px] text-muted-foreground">{tools.length} tools · {materials.length} materials · {approved} approved</span></span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="space-y-4 border-t border-border p-4">
        {canManage && <button type="button" onClick={showCopy} className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 font-['Roboto_Mono'] text-[9px] uppercase text-white"><Copy className="h-3 w-3" />Copy from existing task</button>}
        {copyOpen && <div className="space-y-2 rounded-[8px] border border-border p-3">
          <p className="font-['Roboto_Mono'] text-[9px] uppercase">Copy an approved list as an independent editable draft</p>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search task name, category, or description" className="h-10 w-full rounded border bg-background px-3 font-['Roboto_Mono'] text-[10px]" />
          <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="h-10 w-full rounded border bg-background px-2 font-['Roboto_Mono'] text-[10px]"><option value="">Choose previous task</option>{filteredSources.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select>
          <select value={copyMode} onChange={(event) => setCopyMode(event.target.value as any)} className="h-10 w-full rounded border bg-background px-2 font-['Roboto_Mono'] text-[10px]"><option value="both">Copy both</option><option value="tools">Copy tools</option><option value="materials">Copy materials</option></select>
          <button type="button" onClick={copy} className="min-h-11 rounded-full bg-accent px-4 font-['Roboto_Mono'] text-[9px] uppercase text-white">Copy selected</button>
        </div>}
        <div className="grid gap-4 sm:grid-cols-2">
          <ResourceList title="Tools" rows={tools} />
          <ResourceList title="Materials" rows={materials} />
        </div>
        {canManage && <div className="space-y-2 rounded-[8px] border border-border p-3">
          <p className="font-['Roboto_Mono'] text-[9px] font-bold uppercase">Add manually · saved as draft</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <select value={kind} onChange={(event) => setKind(event.target.value as any)} className="h-10 rounded border bg-background px-2 text-[10px]"><option value="tool">Tool</option><option value="material">Material</option></select>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" className="h-10 rounded border bg-background px-2 font-['Roboto_Mono'] text-[10px]" />
            <input value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} type="number" min="0" placeholder="Quantity" className="h-10 rounded border bg-background px-2 text-[10px]" />
            {kind === 'material' && <input value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="Unit" className="h-10 rounded border bg-background px-2 text-[10px]" />}
            <select value={form.providedBy} onChange={(event) => setForm({ ...form, providedBy: event.target.value })} className="h-10 rounded border bg-background px-2 text-[10px]">{PROVIDED_BY.map((value) => <option key={value}>{value}</option>)}</select>
            <input value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} placeholder={kind === 'tool' ? 'Availability' : 'Specification'} className="h-10 rounded border bg-background px-2 text-[10px]" />
            <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" className="h-10 rounded border bg-background px-2 text-[10px]" />
          </div>
          <button type="button" onClick={add} className="flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 font-['Roboto_Mono'] text-[9px] uppercase text-white"><Plus className="h-4 w-4" />Add {kind}</button>
        </div>}
        {canManage && (tools.some((row) => row.list_status === 'Draft') || materials.some((row) => row.list_status === 'Draft')) && <button type="button" onClick={approve} className="min-h-11 rounded-full border border-accent px-4 font-['Roboto_Mono'] text-[9px] uppercase text-accent">Approve current lists</button>}
      </div>}
    </section>
  );
}

function ResourceList({ title, rows }: { title: string; rows: any[] }) {
  return <div><p className="font-['Roboto_Mono'] text-[9px] font-bold uppercase">{title}</p>{rows.length ? rows.map((row) => <div key={row.id} className="border-t py-2 font-['Roboto_Mono'] text-[10px]"><p>{row.name} · {row.quantity} {row.unit || ''}</p><p className="text-[8px] text-muted-foreground">{row.provided_by} · {row.list_status}{row.availability ? ` · ${row.availability}` : ''}{row.purchase_status ? ` · ${row.purchase_status}` : ''}</p></div>) : <p className="py-2 font-['Roboto_Mono'] text-[9px] text-muted-foreground">Not added</p>}</div>;
}
