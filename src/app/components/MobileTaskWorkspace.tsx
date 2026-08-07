import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Camera, Check, ChevronDown, CircleAlert, HelpCircle, Mic, Pause, Pencil, Play, Send, ShieldCheck, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from './AppContext';
import { useAuth } from './AuthContext';
import { useTaskAssignees, assigneeIdsForTask } from '../src/features/taskAssignees/useTaskAssignees';
import { useWorkSessions } from '../src/features/workSessions/useWorkSessions';
import { useElapsedTime, formatElapsed } from '../src/features/workSessions/useElapsedTime';
import { effectiveSession, queueSessionAction, useOfflineOverlay } from '../src/features/workSessions/offlineQueue';
import { countReadyTaskPhotos, createTaskUpdate, listTaskChecklist, listTaskUpdates, setChecklistItem, type TaskUpdateType } from '../src/features/taskUpdates/api';
import TaskMediaEvidence from './TaskMediaEvidence';
import AuraTaskFeedback from './AuraTaskFeedback';
import { optimizeMediaFile, uploadTaskMedia } from '../src/features/media/api';
import TaskToolsMaterials from './TaskToolsMaterials';
import TaskDependencies from './TaskDependencies';

const display = { fontFamily: 'Anybody', fontVariationSettings: "'wdth' 137", fontStretch: '137%', fontWeight: 800, letterSpacing: '-0.04em' } as const;
const labels: Record<TaskUpdateType, string> = { progress: 'Site update', query: 'Ask a question', suggestion: 'Suggestion', issue: 'Report issue', change_request: 'Request change' };

export default function MobileTaskWorkspace({ taskId, onBack }: { taskId: string; onBack: () => void }) {
  const { tasks, projects, teamMembers, refreshTasks } = useApp();
  const { currentUser } = useAuth();
  const { taskAssignees } = useTaskAssignees(true);
  const { workSessions, refresh: refreshSessions } = useWorkSessions(true);
  const { overlays } = useOfflineOverlay();
  const task = tasks.find((row: any) => String(row.id) === String(taskId));
  const project = projects.find((row: any) => String(row.id) === String(task?.projectId));
  const member = teamMembers.find((row: any) => String(row.authUserId) === String(currentUser?.id));
  const memberId = member ? String(member.id) : '';
  const assigned = task ? assigneeIdsForTask(taskAssignees, task.id).includes(memberId) : false;
  const realtimeSession = workSessions.find((row: any) => String(row.taskId) === String(taskId) && String(row.teamMemberId) === memberId && row.status !== 'finished');
  const [sessionOverride, setSessionOverride] = useState<any | undefined>(undefined);
  const mergedSession = effectiveSession(String(taskId), memberId, realtimeSession, overlays);
  const session = sessionOverride?.status === 'finished' ? undefined : sessionOverride || mergedSession;
  const elapsed = useElapsedTime(session);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [composer, setComposer] = useState<TaskUpdateType | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [showFinishEvidence, setShowFinishEvidence] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [startPhotoCount, setStartPhotoCount] = useState(0);
  const [completionPhotoCount, setCompletionPhotoCount] = useState(0);
  const [completionNote, setCompletionNote] = useState('');
  const [toolsCleared, setToolsCleared] = useState(false);
  const [updateFiles, setUpdateFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!task) return;
    Promise.all([listTaskChecklist(String(task.id)), listTaskUpdates(String(task.id)), countReadyTaskPhotos(String(task.id)), countReadyTaskPhotos(String(task.id), 'before'), countReadyTaskPhotos(String(task.id), 'after')])
      .then(([items, activity, photos, starts, completions]) => { setChecklist(items); setUpdates(activity); setPhotoCount(photos); setStartPhotoCount(starts); setCompletionPhotoCount(completions); })
      .catch(() => {});
  }, [task?.id]);

  useEffect(() => {
    if (!sessionOverride) return;
    if (sessionOverride.status === 'finished' && !realtimeSession) setSessionOverride(undefined);
    else if (realtimeSession?.id === sessionOverride.id && realtimeSession.status === sessionOverride.status) setSessionOverride(undefined);
  }, [realtimeSession?.id, realtimeSession?.status, sessionOverride]);

  const requiredIncomplete = checklist.filter((item) => item.is_required && !item.completed_at).length;
  const assignedNames = useMemo(() => task ? assigneeIdsForTask(taskAssignees, task.id).map((id) => teamMembers.find((m: any) => String(m.id) === id)?.name).filter(Boolean).join(' + ') : '', [task, taskAssignees, teamMembers]);
  const supervisorName = useMemo(() => task ? teamMembers.find((member: any) => String(member.id) === String((task as any).supervisor_id || (project as any)?.supervisorId))?.name : '', [task, project, teamMembers]);
  const actualSeconds = workSessions.filter((row: any) => String(row.taskId) === String(taskId)).reduce((sum: number,row: any)=>sum+Number(row.activeSeconds||0),0);
  const actualHours = actualSeconds/3600;
  const estimatedHours = Number((task as any)?.estimated_hours||0);

  if (!task) return <div className="p-6 font-['Roboto_Mono'] text-sm">Task not found.</div>;

  const run = async (operation: () => Promise<any>, message: string, after?: (result: any) => void | Promise<void>) => {
    setBusy(true);
    try { const result = await operation(); await after?.(result); toast.success(message); }
    catch (error: any) { toast.error(error?.message || 'Could not update task'); }
    finally { setBusy(false); }
  };

  const applySessionResult = async (result: any) => { if (result) setSessionOverride(result); await refreshSessions(); };
  const refreshPhotoCounts = async () => { const [all, starts, completions] = await Promise.all([countReadyTaskPhotos(String(task.id)), countReadyTaskPhotos(String(task.id), 'before'), countReadyTaskPhotos(String(task.id), 'after')]); setPhotoCount(all); setStartPhotoCount(starts); setCompletionPhotoCount(completions); };
  // A task that's already been submitted (Pending QC) or blocked (Under
  // Review) can only move again through a supervisor/QC action -- never by
  // starting a fresh session. A finished session leaves no "in progress"
  // state behind, so without this check the Start button silently
  // reappeared and let someone re-start work that was already awaiting
  // review.
  const blockedStatus = task.status === 'Pending QC' || task.status === 'Under Review';
  const start = () => {
    if (blockedStatus) { toast.error(task.status === 'Pending QC' ? 'This task is submitted and waiting on QC review.' : 'This task is under review -- a supervisor needs to clear it first.'); return; }
    if (!(task as any).photos_not_required && startPhotoCount < 1) { toast.error('Add at least one start photo before starting the timer'); setShowEvidence(true); return; }
    run(() => queueSessionAction({ type: 'start', taskId: String(task.id), teamMemberId: memberId }), 'Task started', applySessionResult);
  };
  const pause = () => session && run(() => queueSessionAction({ type: 'pause', taskId: String(task.id), teamMemberId: memberId, sessionId: session.id }), 'Task paused', applySessionResult);
  const resume = () => session && run(() => queueSessionAction({ type: 'resume', taskId: String(task.id), teamMemberId: memberId, sessionId: session.id }), 'Task resumed', applySessionResult);
  const finish = () => {
    if (requiredIncomplete > 0) { toast.error(`Complete ${requiredIncomplete} required checklist item${requiredIncomplete === 1 ? '' : 's'} first`); return; }
    if (!(task as any).photos_not_required && completionPhotoCount < 1) { toast.error('Add at least one finish photo before finishing'); setShowFinishEvidence(true); return; }
    if (!completionNote.trim()) { toast.error('Add a short completion note before finishing'); return; }
    if (!toolsCleared) { toast.error('Confirm tools and unused materials are cleared or secured'); return; }
    if (!session) return;
    run(
      () => queueSessionAction({ type: 'finish', taskId: String(task.id), teamMemberId: memberId, sessionId: session.id, notes: completionNote.trim() }),
      'Task submitted for QC',
      async (result) => { if (result) setSessionOverride(result); await Promise.all([refreshSessions(), refreshTasks()]); },
    );
  };
  // A photo is only required mid-task when reporting an issue or requesting
  // a change -- routine site updates/questions/suggestions don't need one.
  const photoRequiredForComposer = composer === 'issue' || composer === 'change_request';
  const submitUpdate = async () => {
    if (!composer || !body.trim() || !memberId) return;
    if (photoRequiredForComposer && updateFiles.length === 0) { toast.error('Attach a photo showing the issue before submitting'); return; }
    await run(async () => {
      const created = await createTaskUpdate(String(task.id), String(task.projectId), memberId, composer, body);
      for (const file of updateFiles) {
        const optimized = await optimizeMediaFile(file);
        await uploadTaskMedia(String(task.projectId), String(task.id), optimized, 'progress', body.trim(), String(created.id));
      }
      if (updateFiles.some((file) => file.type.startsWith('image/'))) setPhotoCount(await countReadyTaskPhotos(String(task.id)));
      setUpdates((current) => [created, ...current]); setBody(''); setComposer(null); setUpdateFiles([]);
    }, `${labels[composer]} submitted`);
  };
  const toggleItem = async (item: any) => {
    const completed = !item.completed_at;
    setChecklist((rows) => rows.map((row) => row.id === item.id ? { ...row, completed_at: completed ? new Date().toISOString() : null } : row));
    try { await setChecklistItem(item.id, completed); } catch (error: any) {
      setChecklist((rows) => rows.map((row) => row.id === item.id ? item : row)); toast.error(error?.message || 'Checklist update failed');
    }
  };

  const inProgress = Boolean(session);
  return (
    <div className="md:hidden min-h-[100dvh] -m-[16px] bg-[var(--grey-50)] text-[var(--grey-900)] pb-[calc(92px+env(safe-area-inset-bottom))] overflow-x-hidden">
      <header className={inProgress ? 'bg-[var(--green-900)] text-white px-6 pt-[calc(20px+env(safe-area-inset-top))] pb-6' : 'px-6 pt-[calc(20px+env(safe-area-inset-top))] pb-3'}>
        <button onClick={onBack} className="w-11 h-11 -ml-3 flex items-center justify-center" aria-label="Back"><ArrowLeft /></button>
        {inProgress ? (
          <><h1 className="text-[42px] leading-[.96] mt-4" style={display}>Task in<br />progress</h1>
          <div className="mt-5 bg-[var(--olive-300)] text-[var(--green-900)] rounded-[18px] px-5 py-5 flex items-center justify-between">
            <div><p className="font-['Roboto_Mono'] text-[35px] leading-none tracking-tight">{formatElapsed(elapsed)}</p><p className="font-['Roboto_Mono'] text-[10px] uppercase mt-3">{session.status === 'paused' ? 'Paused' : `Started ${new Date(session.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}</p></div>
            <div className="w-16 h-16 rounded-full border-[7px] border-white border-l-[var(--green-900)]" /></div></>
        ) : <p className="font-['Roboto_Mono'] text-[10px] uppercase tracking-[.12em] mt-2">{project?.title} · {task.phase || project?.phase}</p>}
      </header>

      <main className="px-5 py-5 space-y-4">
        <h2 className="text-[30px] leading-[1.05]" style={display}>{task.title}</h2>
        <p className="font-['Roboto_Mono'] text-[9px] uppercase text-muted-foreground">{task.phase || 'No phase'} · Associate: {assignedNames || 'Not assigned'} · Crew: {(task as any).crew_required || '—'} · Supervisor: {supervisorName || 'Not assigned'} · Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'not set'}</p>
        {!inProgress && blockedStatus && (
          <div className="flex items-center gap-2 rounded-[12px] bg-[var(--olive-100)] border border-[var(--olive-300)] px-4 py-3">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <p className="font-['Roboto_Mono'] text-[10px]">
              {task.status === 'Pending QC'
                ? 'Submitted -- waiting on QC review. A supervisor must request a revision before this can restart.'
                : 'Under review -- a supervisor needs to clear this before work can continue.'}
            </p>
          </div>
        )}
        {!inProgress && <div className="grid grid-cols-4 border-y border-[var(--olive-300)] py-4">
          {[['Priority', task.priority || 'Normal'], ['Estimate', estimatedHours ? `${estimatedHours} hr` : 'Not set'], ['Actual', `${actualHours.toFixed(1)} hr`], ['Remaining', estimatedHours ? `${(estimatedHours-actualHours).toFixed(1)} hr` : '—']].map(([label,value]) => <div key={label} className="px-2 border-r last:border-0 border-[var(--olive-300)]"><p className="font-['Roboto_Mono'] text-[8px] uppercase">{label}</p><p className="font-['Roboto_Mono'] text-[10px] uppercase mt-2 truncate">{value}</p></div>)}
        </div>}

        {!inProgress && <section className="bg-[var(--green-900)] text-white rounded-[18px] p-5"><p className="font-['Roboto_Mono'] text-[9px] uppercase text-[var(--olive-300)]">What to do</p><p className="font-['Roboto_Mono'] text-[13px] leading-relaxed mt-3 whitespace-pre-wrap">{task.description || 'Complete the assigned work and document your progress.'}</p><p className="font-['Roboto_Mono'] text-[9px] uppercase text-[var(--olive-300)] mt-5">Site · {project?.location || 'See project details'}</p></section>}

        {(task as any).verification_criteria && <section className="rounded-[14px] border border-[var(--olive-300)] bg-white p-4"><p className="font-['Roboto_Mono'] text-[9px] uppercase text-muted-foreground">Verification criteria</p><p className="mt-2 whitespace-pre-wrap font-['Roboto_Mono'] text-[11px]">{(task as any).verification_criteria}</p></section>}

        <TaskDependencies taskId={String(task.id)} projectTasks={tasks.filter((row:any)=>String(row.projectId)===String(task.projectId))}/>
        <TaskToolsMaterials taskId={String(task.id)}/>

        {checklist.length > 0 && <section className="border border-[var(--olive-300)] rounded-[14px] overflow-hidden bg-white"><div className="px-4 py-3 flex justify-between"><span className="font-['Roboto_Mono'] text-[10px] font-bold uppercase">Materials & checklist · {checklist.length} items</span><ChevronDown className="w-4 h-4" /></div>{checklist.map((item) => <button key={item.id} onClick={() => toggleItem(item)} className="w-full border-t border-[var(--olive-300)] px-4 py-3 text-left flex gap-3 items-center"><span className={`w-5 h-5 border rounded-sm flex items-center justify-center ${item.completed_at ? 'bg-[var(--green-900)] text-white' : ''}`}>{item.completed_at && <Check className="w-3 h-3" />}</span><span className="font-['Roboto_Mono'] text-[11px]">{item.label}{item.is_required ? ' *' : ''}</span></button>)}</section>}

        {!inProgress && <>
          <button onClick={() => setShowEvidence(!showEvidence)} className="w-full h-14 rounded-[12px] border border-[var(--olive-300)] bg-white flex items-center justify-center gap-3 font-['Roboto_Mono'] text-[11px] font-bold uppercase"><Camera className="w-5 h-5" />Add start photo{startPhotoCount > 0 ? ` (${startPhotoCount} added)` : ' (required)'}</button>
          {showEvidence && <TaskMediaEvidence projectId={String(task.projectId)} taskId={String(task.id)} lockedStage="before" onUploaded={refreshPhotoCounts} />}
        </>}

        {inProgress && <>
          <p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase">Send an update</p>
          <div className="grid grid-cols-2 gap-3">
            {([{type:'progress',icon:Send},{type:'query',icon:HelpCircle},{type:'suggestion',icon:Mic},{type:'issue',icon:CircleAlert},{type:'change_request',icon:Pencil}] as const).map(({type,icon:Icon}) => <button key={type} onClick={() => setComposer(type)} className={`min-h-14 px-3 rounded-[12px] border font-['Roboto_Mono'] text-[10px] uppercase flex items-center justify-center gap-2 ${composer===type ? 'bg-[var(--green-900)] text-white' : 'bg-white border-[var(--olive-300)]'}`}><Icon className="w-4 h-4" />{labels[type]}</button>)}
          </div>
          {composer && <div className="bg-white border border-[var(--olive-300)] rounded-[14px] p-3"><p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase mb-2">{labels[composer]}</p><textarea value={body} onChange={(e)=>setBody(e.target.value)} rows={3} className="w-full resize-none bg-transparent font-['Roboto_Mono'] text-[12px] outline-none" placeholder="What did you complete or notice?"/><label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[var(--olive-300)] px-3 font-['Roboto_Mono'] text-[10px] uppercase"><Camera className="mr-2 h-4 w-4" />{updateFiles.length ? `${updateFiles.length} file${updateFiles.length === 1 ? '' : 's'} attached` : photoRequiredForComposer ? 'Attach a photo (required)' : 'Attach files (optional)'}<input type="file" multiple className="hidden" accept="image/*,video/*,audio/*,application/pdf" onChange={(event) => setUpdateFiles(Array.from(event.target.files || []))} /></label><button onClick={submitUpdate} disabled={busy || !body.trim() || (photoRequiredForComposer && updateFiles.length === 0)} className="w-full mt-2 h-11 rounded-full bg-[var(--vermillion-500)] text-white font-['Roboto_Mono'] text-[11px] uppercase disabled:opacity-40">Submit</button></div>}
          {updates.length > 0 && <section><p className="font-['Roboto_Mono'] text-[10px] font-bold uppercase mb-2">Recent task activity</p>{updates.slice(0,3).map((u)=><div key={u.id} className="border-t border-[var(--olive-300)] py-3"><p className="font-['Roboto_Mono'] text-[9px] uppercase text-[var(--vermillion-700)]">{labels[u.update_type as TaskUpdateType]} · {u.status}</p><p className="font-['Roboto_Mono'] text-[11px] mt-1">{u.body}</p></div>)}</section>}
          <section className="rounded-[14px] border border-[var(--olive-300)] bg-white p-3 space-y-3">
            <p className="font-['Roboto_Mono'] text-[11px] font-bold uppercase">Finish task requirements</p>
            <textarea value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} rows={2} className="w-full resize-none rounded-[8px] border border-[var(--olive-300)] p-3 font-['Roboto_Mono'] text-[11px]" placeholder="What was completed?"/>
            <label className="flex items-start gap-2 font-['Roboto_Mono'] text-[10px]"><input type="checkbox" checked={toolsCleared} onChange={(event) => setToolsCleared(event.target.checked)} className="mt-0.5"/>Tools and unused materials are cleared or secured.</label>
            <button type="button" onClick={() => setShowFinishEvidence(!showFinishEvidence)} className="w-full h-12 rounded-[10px] border border-[var(--olive-300)] bg-white flex items-center justify-center gap-2 font-['Roboto_Mono'] text-[10px] font-bold uppercase">
              <Camera className="w-4 h-4" />
              {(task as any).photos_not_required
                ? 'Add finish photo (waived by supervisor)'
                : `Add finish photo${completionPhotoCount > 0 ? ` (${completionPhotoCount} added)` : ' (required)'}`}
            </button>
            {showFinishEvidence && <TaskMediaEvidence projectId={String(task.projectId)} taskId={String(task.id)} lockedStage="after" onUploaded={refreshPhotoCounts} />}
          </section>
        </>}

        {memberId && <AuraTaskFeedback taskId={String(task.id)} teamMemberId={memberId} />}
      </main>
      <footer className="fixed md:hidden bottom-0 left-0 right-0 bg-[var(--grey-50)] border-t border-[var(--olive-300)] px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))] grid grid-cols-[.75fr_1.5fr] gap-3 z-30">
        {inProgress ? <button onClick={session?.status === 'paused' ? resume : pause} disabled={busy} className="h-12 border border-[var(--green-900)] rounded-full font-['Roboto_Mono'] text-[11px] uppercase flex items-center justify-center gap-2">{session?.status === 'paused' ? <Play className="w-4"/> : <Pause className="w-4"/>}{session?.status === 'paused' ? 'Resume':'Pause'}</button> : <button onClick={()=>setComposer('query')} className="h-12 border border-[var(--green-900)] rounded-full font-['Roboto_Mono'] text-[11px] uppercase">Request help</button>}
        {inProgress ? <button onClick={finish} disabled={busy} className="h-12 bg-[var(--vermillion-500)] text-white rounded-full font-['Roboto_Mono'] text-[11px] uppercase flex items-center justify-center gap-2"><Square className="w-4"/>Finish task</button> : <button onClick={start} disabled={busy || !assigned || !memberId || blockedStatus} className="h-12 bg-[var(--vermillion-500)] text-white rounded-full font-['Roboto_Mono'] text-[11px] uppercase flex items-center justify-center gap-2 disabled:opacity-40"><Play className="w-4"/>{blockedStatus ? (task.status === 'Pending QC' ? 'Awaiting QC' : 'Under review') : 'Start task'}</button>}
      </footer>
    </div>
  );
}
