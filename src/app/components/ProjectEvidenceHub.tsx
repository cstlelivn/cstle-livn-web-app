import { useEffect, useMemo, useState } from 'react';
import { Camera, ExternalLink, FileText, Loader2, MessageSquareMore, Mic, Video } from 'lucide-react';
import { listProjectMedia, type TaskMedia } from '../src/features/media/api';
import { downloadMediaForSocial } from '../src/features/media/api';
import { listProjectUpdates, type TaskUpdateType } from '../src/features/taskUpdates/api';
import { toast } from 'sonner';

const updateLabels: Record<TaskUpdateType, string> = {
  progress: 'Site update', query: 'Question', suggestion: 'Suggestion', issue: 'Issue', change_request: 'Change request',
};

function MediaIcon({ kind }: { kind: TaskMedia['media_kind'] }) {
  if (kind === 'photo') return <Camera className="h-4 w-4" />;
  if (kind === 'video') return <Video className="h-4 w-4" />;
  if (kind === 'audio') return <Mic className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export default function ProjectEvidenceHub({ projectId, tasks, teamMembers, onOpenTask }: { projectId: string; tasks: any[]; teamMembers: any[]; onOpenTask: (task: any) => void }) {
  const [media, setMedia] = useState<TaskMedia[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    Promise.all([listProjectMedia(projectId, tasks.map((task) => String(task.id))), listProjectUpdates(projectId)])
      .then(([files, activity]) => { setMedia(files); setUpdates(activity); })
      .finally(() => setLoading(false));
  }, [projectId, tasks]);
  const taskNames = useMemo(() => new Map(tasks.map((task) => [String(task.id), task.title])), [tasks]);
  const memberNames = useMemo(() => new Map(teamMembers.map((member) => [String(member.id), member.name])), [teamMembers]);
  const downloadForSocial = async (event: React.MouseEvent, item: TaskMedia) => {
    event.stopPropagation();
    try {
      await downloadMediaForSocial(item);
      toast.success(item.media_kind === 'photo' ? 'Social JPEG downloaded' : 'File downloaded');
    } catch (error: any) {
      toast.error(error?.message || 'Could not prepare download');
    }
  };

  if (loading) return <div className="flex items-center gap-2 p-6 font-['Roboto_Mono'] text-[11px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading project record</div>;
  return <div className="grid gap-[20px] xl:grid-cols-[1.2fr_.8fr]">
    <section className="rounded-[16px] border border-border bg-card p-[16px]">
      <h3 className="flex items-center gap-2" style={{ fontFamily: 'Anybody', fontVariationSettings: "'wdth' 137", fontWeight: 700 }}><FileText className="h-5 w-5" />Project files & proof of work</h3>
      <p className="mt-1 font-['Roboto_Mono'] text-[10px] text-muted-foreground">Every file uploaded directly to this project or through any of its tasks.</p>
      {media.length === 0 ? <p className="mt-5 font-['Roboto_Mono'] text-[11px] text-muted-foreground">No project files yet.</p> : <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {media.map((item) => { const linkedTask = item.task_id ? tasks.find((task) => String(task.id) === String(item.task_id)) : null; return <article key={item.id} role={linkedTask ? 'button' : undefined} tabIndex={linkedTask ? 0 : undefined} onClick={() => linkedTask && onOpenTask(linkedTask)} onKeyDown={(event) => { if (linkedTask && (event.key === 'Enter' || event.key === ' ')) onOpenTask(linkedTask); }} className={`overflow-hidden rounded-[10px] border border-border bg-background ${linkedTask ? 'cursor-pointer hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent' : ''}`}>
          {item.media_kind === 'photo' && <img src={item.url} alt={item.caption || item.original_filename} className="h-[150px] w-full object-cover" />}
          {item.media_kind === 'video' && <video src={item.url} className="h-[150px] w-full bg-black object-contain" preload="metadata" />}
          <div className="p-3"><p className="flex items-center gap-2 truncate font-['Roboto_Mono'] text-[10px]"><MediaIcon kind={item.media_kind} />{item.original_filename}</p><p className="mt-1 font-['Roboto_Mono'] text-[9px] text-muted-foreground">{item.task_id ? taskNames.get(String(item.task_id)) || 'Task file' : 'Project file'} · {new Date(item.created_at).toLocaleString()}</p>{item.caption && <p className="mt-2 font-['Roboto_Mono'] text-[10px]">{item.caption}</p>}<button type="button" onClick={(event) => downloadForSocial(event, item)} className="mt-2 w-full rounded-full border border-border px-3 py-2 font-['Roboto_Mono'] text-[8px] uppercase text-accent hover:border-accent">{item.media_kind === 'photo' ? 'Download social JPEG' : 'Download for social'}</button><div className="mt-2 flex items-center justify-between gap-2"><span className="font-['Roboto_Mono'] text-[8px] uppercase text-accent">{linkedTask ? 'Open associated task' : 'Project-level file'}</span><a href={item.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="flex items-center gap-1 font-['Roboto_Mono'] text-[8px] text-muted-foreground hover:text-accent"><ExternalLink className="h-3 w-3" />Open file</a></div></div>
        </article>; })}
      </div>}
    </section>
    <section className="rounded-[16px] border border-border bg-card p-[16px]">
      <h3 className="flex items-center gap-2" style={{ fontFamily: 'Anybody', fontVariationSettings: "'wdth' 137", fontWeight: 700 }}><MessageSquareMore className="h-5 w-5" />Reports, questions & decisions</h3>
      <p className="mt-1 font-['Roboto_Mono'] text-[10px] text-muted-foreground">A dated project record showing who reported what and on which task.</p>
      {updates.length === 0 ? <p className="mt-5 font-['Roboto_Mono'] text-[11px] text-muted-foreground">No reports or questions yet.</p> : <div className="mt-4 space-y-3">
        {updates.map((item) => { const attachments = media.filter((file) => String(file.task_update_id) === String(item.id)); const linkedTask = tasks.find((task) => String(task.id) === String(item.task_id)); return <article key={item.id} role={linkedTask ? 'button' : undefined} tabIndex={linkedTask ? 0 : undefined} onClick={() => linkedTask && onOpenTask(linkedTask)} onKeyDown={(event) => { if (linkedTask && (event.key === 'Enter' || event.key === ' ')) onOpenTask(linkedTask); }} className={`border-t border-border pt-3 first:border-0 first:pt-0 ${linkedTask ? 'cursor-pointer rounded-[8px] px-2 pb-2 hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-accent' : ''}`}><div className="flex justify-between gap-3"><p className="font-['Roboto_Mono'] text-[9px] uppercase text-accent">{updateLabels[item.update_type as TaskUpdateType] || item.update_type} · {item.status}</p><time className="shrink-0 font-['Roboto_Mono'] text-[8px] text-muted-foreground">{new Date(item.created_at).toLocaleString()}</time></div><p className="mt-1 font-['Roboto_Mono'] text-[11px] whitespace-pre-wrap">{item.body}</p>{attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{attachments.map((file) => <a key={file.id} href={file.url} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="rounded-full border border-border px-2 py-1 font-['Roboto_Mono'] text-[8px] text-accent hover:border-accent">{file.original_filename}</a>)}</div>}<p className="mt-2 font-['Roboto_Mono'] text-[9px] text-muted-foreground">{taskNames.get(String(item.task_id)) || 'Unknown task'} · {memberNames.get(String(item.team_member_id)) || 'Unknown reporter'}{linkedTask ? ' · Open task' : ''}</p></article>; })}
      </div>}
    </section>
  </div>;
}
