import {useEffect,useState} from 'react';
import {AlertTriangle,X} from 'lucide-react';
import {toast} from 'sonner';
import {useAuth} from './AuthContext';
import {addTaskDependency,listTaskDependencies,removeTaskDependency} from '../src/features/taskPlanning/api';
export default function TaskDependencies({taskId,projectTasks,isSupervisorHere}:{taskId:string;projectTasks:any[];isSupervisorHere?:boolean}){
 const {hasPermission}=useAuth();const canManage=hasPermission('canEditProjects')||!!isSupervisorHere;const [items,setItems]=useState<any[]>([]),[selected,setSelected]=useState('');
 const load=()=>listTaskDependencies(taskId).then(setItems).catch(()=>{});useEffect(()=>{load();},[taskId]);
 const add=async()=>{if(!selected)return;try{await addTaskDependency(taskId,selected);setSelected('');load();}catch(e:any){toast.error(e.message);}};
 const remove=async(id:string)=>{try{await removeTaskDependency(taskId,id);load();}catch(e:any){toast.error(e.message);}};
 const unfinished=items.filter(row=>row.tasks?.status!=='Completed');
 return <section className="rounded-[8px] border border-border p-3"><p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase">Dependencies</p>{unfinished.length>0&&<div className="mt-2 flex gap-2 rounded bg-warning/10 p-2 text-warning"><AlertTriangle className="h-4 w-4 shrink-0"/><p className="font-['Roboto_Mono'] text-[9px]">This task has an unfinished dependency: {unfinished.map(row=>row.tasks?.title).join(', ')}. A Supervisor or Admin may decide whether work proceeds.</p></div>}<div className="mt-2 space-y-1">{items.map(row=><div key={row.depends_on_task_id} className="flex justify-between font-['Roboto_Mono'] text-[10px]"><span>{row.tasks?.title} · {row.tasks?.status}</span>{canManage&&<button type="button" onClick={()=>remove(row.depends_on_task_id)}><X className="h-3 w-3"/></button>}</div>)}{items.length===0&&<p className="text-[9px] text-muted-foreground">No dependencies.</p>}</div>{canManage&&<div className="mt-2 flex gap-2"><select value={selected} onChange={e=>setSelected(e.target.value)} className="h-9 flex-1 rounded border bg-background px-2 font-['Roboto_Mono'] text-[10px]"><option value="">Choose project task</option>{projectTasks.filter(task=>String(task.id)!==taskId&&!items.some(row=>String(row.depends_on_task_id)===String(task.id))).map(task=><option key={task.id} value={task.id}>{task.title}</option>)}</select><button type="button" onClick={add} className="rounded bg-accent px-3 font-['Roboto_Mono'] text-[9px] text-white">Add</button></div>}</section>;
}
