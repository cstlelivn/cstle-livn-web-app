import { useEffect, useState } from 'react';
import { ListChecks, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { createChecklistItem, deleteChecklistItem, listTaskChecklist } from '../src/features/taskUpdates/api';

export default function TaskChecklistEditor({ taskId }: { taskId: string }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('canEditProjects') || hasPermission('canApproveTaskQC');
  const [items, setItems] = useState<any[]>([]);
  const [label, setLabel] = useState('');
  useEffect(() => { listTaskChecklist(taskId).then(setItems).catch(() => {}); }, [taskId]);
  if (!canManage && items.length === 0) return null;
  const add = async () => {
    if (!label.trim()) return;
    try { const item = await createChecklistItem(taskId, label, true, items.length); setItems((rows) => [...rows, item]); setLabel(''); }
    catch (error: any) { toast.error(error?.message || 'Could not add checklist item'); }
  };
  const remove = async (id: string) => {
    try { await deleteChecklistItem(id); setItems((rows) => rows.filter((row) => row.id !== id)); }
    catch (error: any) { toast.error(error?.message || 'Could not remove checklist item'); }
  };
  return <section className="border border-border rounded-[8px] p-3 space-y-2 bg-secondary/10"><p className="font-['Roboto_Mono'] text-[10px] uppercase font-bold flex items-center gap-2"><ListChecks className="w-4 h-4"/>Required checklist</p>{items.map((item)=><div key={item.id} className="flex items-center gap-2 border-t border-border pt-2"><span className="font-['Roboto_Mono'] text-[10px] flex-1">{item.label}{item.is_required ? ' *' : ''}</span>{canManage && <button type="button" onClick={()=>remove(item.id)} aria-label="Remove checklist item"><Trash2 className="w-3.5 h-3.5 text-muted-foreground"/></button>}</div>)}{canManage && <div className="flex gap-2"><input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Add required step" className="flex-1 h-9 px-3 bg-background border border-border rounded-[6px] font-['Roboto_Mono'] text-[10px]"/><button type="button" onClick={add} className="w-9 h-9 bg-accent text-white rounded-[6px] flex items-center justify-center"><Plus className="w-4 h-4"/></button></div>}</section>;
}
