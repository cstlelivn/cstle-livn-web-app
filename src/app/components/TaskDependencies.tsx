import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { addParallelRelationship, addTaskDependency, listParallelRelationships, listTaskDependencies, removeParallelRelationship, removeTaskDependency } from "../src/features/taskPlanning/api";

type RelationType = "Starts with" | "Runs concurrently with" | "Parallel work group";

export default function TaskDependencies({ taskId, projectTasks, isSupervisorHere }: { taskId: string; projectTasks: any[]; isSupervisorHere?: boolean }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("canEditProjects") || !!isSupervisorHere;
  const projectId = String(projectTasks.find((task) => String(task.id) === taskId)?.projectId ?? "");
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState("");
  const [related, setRelated] = useState<any[]>([]);
  const [relatedTask, setRelatedTask] = useState("");
  const [relationType, setRelationType] = useState<RelationType>("Runs concurrently with");
  const [groupLabel, setGroupLabel] = useState("");
  const load = () => listTaskDependencies(taskId).then(setItems).catch(() => {});
  const loadRelated = () => {
    if (!projectId) return;
    listParallelRelationships(projectId).then((rows) => setRelated(rows.filter((row: any) => String(row.task_id) === taskId || String(row.related_task_id) === taskId))).catch(() => {});
  };
  useEffect(() => { load(); loadRelated(); }, [taskId, projectId]);
  const add = async () => { if (!selected) return; try { await addTaskDependency(taskId, selected); setSelected(""); load(); } catch (error: any) { toast.error(error.message); } };
  const remove = async (id: string) => { try { await removeTaskDependency(taskId, id); load(); } catch (error: any) { toast.error(error.message); } };
  const addRelated = async () => { if (!relatedTask || !projectId) return; try { await addParallelRelationship({ project_id: projectId, task_id: taskId, related_task_id: relatedTask, relationship_type: relationType, group_label: groupLabel.trim() || null }); setRelatedTask(""); setGroupLabel(""); loadRelated(); toast.success("Related work added"); } catch (error: any) { toast.error(error.message); } };
  const removeRelated = async (id: string) => { try { await removeParallelRelationship(id); loadRelated(); } catch (error: any) { toast.error(error.message); } };
  const taskName = (id: string) => projectTasks.find((task) => String(task.id) === String(id))?.title || "Task";
  const unfinished = items.filter((row) => row.tasks?.status !== "Completed");
  return <section className="space-y-4 rounded-[8px] border border-border p-3">
    <div><p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase">Dependencies</p>
      {unfinished.length > 0 && <div className="mt-2 flex gap-2 rounded bg-warning/10 p-2 text-warning"><AlertTriangle className="h-4 w-4 shrink-0" /><p className="font-['Roboto_Mono'] text-[9px]">This task has an unfinished dependency: {unfinished.map((row) => row.tasks?.title).join(", ")}. A Supervisor or Admin may decide whether work proceeds.</p></div>}
      <div className="mt-2 space-y-1">{items.map((row) => <div key={row.depends_on_task_id} className="flex justify-between font-['Roboto_Mono'] text-[10px]"><span>{row.tasks?.title} · {row.tasks?.status}</span>{canManage && <button type="button" onClick={() => remove(row.depends_on_task_id)}><X className="h-3 w-3" /></button>}</div>)}{items.length === 0 && <p className="text-[9px] text-muted-foreground">No blocking dependencies.</p>}</div>
      {canManage && <div className="mt-2 flex gap-2"><select value={selected} onChange={(event) => setSelected(event.target.value)} className="h-9 flex-1 rounded border bg-background px-2 font-['Roboto_Mono'] text-[10px]"><option value="">Choose predecessor task</option>{projectTasks.filter((task) => String(task.id) !== taskId && !items.some((row) => String(row.depends_on_task_id) === String(task.id))).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><button type="button" onClick={add} className="rounded bg-accent px-3 text-[9px] text-white">Add</button></div>}
    </div>
    <div className="border-t border-border pt-3"><p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase">Parallel & Related Work</p><p className="mt-1 text-[9px] text-muted-foreground">Informational only. These links do not block scheduling.</p>
      <div className="mt-2 space-y-1">{related.map((row) => <div key={row.id} className="flex items-center justify-between gap-2 text-[9px]"><span>{row.relationship_type}: {taskName(String(row.task_id) === taskId ? row.related_task_id : row.task_id)}{row.group_label ? ` · ${row.group_label}` : ""}</span>{canManage && <button type="button" onClick={() => removeRelated(row.id)}><X className="h-3 w-3" /></button>}</div>)}{related.length === 0 && <p className="text-[9px] text-muted-foreground">No parallel work linked.</p>}</div>
      {canManage && <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2"><select value={relationType} onChange={(event) => setRelationType(event.target.value as RelationType)} className="h-9 rounded border bg-background px-2 text-[10px]"><option>Starts with</option><option>Runs concurrently with</option><option>Parallel work group</option></select><select value={relatedTask} onChange={(event) => setRelatedTask(event.target.value)} className="h-9 rounded border bg-background px-2 text-[10px]"><option value="">Choose related task</option>{projectTasks.filter((task) => String(task.id) !== taskId && !related.some((row) => String(row.task_id) === String(task.id) || String(row.related_task_id) === String(task.id))).map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><input value={groupLabel} onChange={(event) => setGroupLabel(event.target.value)} placeholder="Optional group label" className="h-9 rounded border bg-background px-2 text-[10px]" /><button type="button" onClick={addRelated} className="h-9 rounded bg-accent px-3 text-[9px] text-white">Add related work</button></div>}
    </div>
  </section>;
}
