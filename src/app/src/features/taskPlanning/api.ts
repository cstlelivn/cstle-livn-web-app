import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
const supabase = createClient();

export async function listTaskResources(taskId: string) {
  const [tools, materials] = await Promise.all([
    supabase.from('task_tools').select('*').eq('task_id', taskId).order('position'),
    supabase.from('task_materials').select('*').eq('task_id', taskId).order('position'),
  ]);
  failIf(tools.error, 'Failed to load task tools'); failIf(materials.error, 'Failed to load task materials');
  return { tools: tools.data ?? [], materials: materials.data ?? [] };
}

export async function addTaskResource(kind: 'tool'|'material', taskId: string, input: any) {
  const table = kind === 'tool' ? 'task_tools' : 'task_materials';
  const { data,error } = await supabase.from(table).insert({ task_id:taskId, ...input, list_status:'Draft' }).select().single();
  failIf(error, `Failed to add ${kind}`); return data;
}

export async function approveTaskResources(taskId: string) {
  const stamp={list_status:'Approved',approved_at:new Date().toISOString()};
  const [tools,materials]=await Promise.all([supabase.from('task_tools').update(stamp).eq('task_id',taskId),supabase.from('task_materials').update(stamp).eq('task_id',taskId)]);
  failIf(tools.error,'Failed to approve tools'); failIf(materials.error,'Failed to approve materials');
}

export async function listReusableTaskResources() {
  const [tools,materials]=await Promise.all([
    supabase.from('task_tools').select('*,tasks!inner(id,title,description,task_type,project_id)').eq('list_status','Approved').limit(500),
    supabase.from('task_materials').select('*,tasks!inner(id,title,description,task_type,project_id)').eq('list_status','Approved').limit(500),
  ]);
  failIf(tools.error,'Failed to search prior tools'); failIf(materials.error,'Failed to search prior materials');
  return {tools:tools.data??[],materials:materials.data??[]};
}

export async function copyTaskResources(sourceTaskId:string,targetTaskId:string,mode:'tools'|'materials'|'both') {
  const source=await listTaskResources(sourceTaskId);
  if(mode!=='materials'&&source.tools.length) {
    const rows=source.tools.map(({id,task_id,created_at,updated_at,approved_at,approved_by,...row}:any)=>({...row,task_id:targetTaskId,list_status:'Draft'}));
    const {error}=await supabase.from('task_tools').insert(rows); failIf(error,'Failed to copy tools');
  }
  if(mode!=='tools'&&source.materials.length) {
    const rows=source.materials.map(({id,task_id,created_at,updated_at,approved_at,approved_by,...row}:any)=>({...row,task_id:targetTaskId,list_status:'Draft'}));
    const {error}=await supabase.from('task_materials').insert(rows); failIf(error,'Failed to copy materials');
  }
}

export async function listTaskDependencies(taskId:string) {
  const {data,error}=await supabase.from('task_dependencies').select('depends_on_task_id,tasks!task_dependencies_depends_on_task_id_fkey(id,title,status)').eq('task_id',taskId);
  failIf(error,'Failed to load dependencies'); return data??[];
}

export async function addTaskDependency(taskId:string,dependsOnTaskId:string) {
  const {error}=await supabase.from('task_dependencies').insert({task_id:taskId,depends_on_task_id:dependsOnTaskId}); failIf(error,'Failed to add dependency');
}

export async function removeTaskDependency(taskId:string,dependsOnTaskId:string) {
  const {error}=await supabase.from('task_dependencies').delete().eq('task_id',taskId).eq('depends_on_task_id',dependsOnTaskId); failIf(error,'Failed to remove dependency');
}
