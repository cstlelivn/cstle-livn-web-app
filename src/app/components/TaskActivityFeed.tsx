import { useEffect, useState } from 'react';
import { MessageSquareMore } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { listTaskUpdates, setTaskUpdateStatus } from '../src/features/taskUpdates/api';

const names: Record<string,string> = { progress:'Site update',query:'Query',suggestion:'Suggestion',issue:'Issue',change_request:'Change request' };
export default function TaskActivityFeed({ taskId }: { taskId: string }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission('canEditProjects') || hasPermission('canApproveTaskQC');
  const [items,setItems] = useState<any[]>([]);
  useEffect(()=>{ listTaskUpdates(taskId).then(setItems).catch(()=>{}); },[taskId]);
  if (items.length===0) return null;
  const decide = async (id:string,status:'acknowledged'|'resolved'|'declined') => { try { const result=await setTaskUpdateStatus(id,status); setItems(rows=>rows.map(row=>row.id===id?{...row,...result}:row)); } catch(error:any){ toast.error(error?.message||'Could not update report'); } };
  return <section className="border border-border rounded-[8px] p-3 space-y-2"><p className="font-['Roboto_Mono'] text-[10px] uppercase font-bold flex items-center gap-2"><MessageSquareMore className="w-4 h-4"/>Task reports & updates</p>{items.map(item=><article key={item.id} className="border-t border-border pt-2"><div className="flex justify-between gap-2"><p className="font-['Roboto_Mono'] text-[9px] uppercase text-accent">{names[item.update_type]||item.update_type}</p><span className="font-['Roboto_Mono'] text-[8px] uppercase text-muted-foreground">{item.status}</span></div><p className="font-['Roboto_Mono'] text-[10px] mt-1 whitespace-pre-wrap">{item.body}</p>{canManage&&item.status==='open'&&<div className="flex gap-2 mt-2"><button type="button" onClick={()=>decide(item.id,'acknowledged')} className="px-2 py-1 border rounded-full font-['Roboto_Mono'] text-[8px] uppercase">Acknowledge</button><button type="button" onClick={()=>decide(item.id,'resolved')} className="px-2 py-1 bg-success text-white rounded-full font-['Roboto_Mono'] text-[8px] uppercase">Resolve</button><button type="button" onClick={()=>decide(item.id,'declined')} className="px-2 py-1 text-destructive font-['Roboto_Mono'] text-[8px] uppercase">Decline</button></div>}</article>)}</section>;
}
