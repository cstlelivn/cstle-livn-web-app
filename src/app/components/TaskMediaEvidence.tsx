import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, FileText, Loader2, Mic, Paperclip, Trash2, Upload, Video } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useAuth } from './AuthContext';
import {
  deleteTaskMedia,
  downloadMediaForSocial,
  EvidenceStage,
  listTaskMedia,
  TaskMedia,
  updateMediaApproval,
  optimizeMediaFile,
  uploadTaskMedia,
} from '../src/features/media/api';

interface Props {
  projectId: string;
  taskId: string;
  initialStage?: EvidenceStage;
  // When set, the stage picker is hidden entirely and every upload is
  // tagged with this stage -- used for the mobile Start/Finish photo
  // flows so there's no dropdown to fumble with (and no way to
  // accidentally tag a finish photo as "progress", which used to leave
  // the finish-photo requirement stuck even after adding a photo).
  lockedStage?: EvidenceStage;
  onUploaded?: () => void;
}

const stageLabels: Record<EvidenceStage, string> = {
  before: 'Before work',
  progress: 'Progress update',
  after: 'After / completed',
  general: 'General file',
};

function MediaIcon({ kind }: { kind: TaskMedia['media_kind'] }) {
  if (kind === 'photo') return <Camera className="h-4 w-4" />;
  if (kind === 'video') return <Video className="h-4 w-4" />;
  if (kind === 'audio') return <Mic className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

export default function TaskMediaEvidence({ projectId, taskId, initialStage = 'progress', lockedStage, onUploaded }: Props) {
  const { hasPermission } = useAuth();
  const canApprove = hasPermission('canApproveTaskQC') || hasPermission('canEditProjects');
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<TaskMedia[]>([]);
  const [stage, setStage] = useState<EvidenceStage>(lockedStage ?? initialStage);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saveForMarketing, setSaveForMarketing] = useState(false);

  useEffect(() => { if (!lockedStage) setStage(initialStage); }, [initialStage, lockedStage]);

  const refresh = useCallback(async () => {
    try {
      setItems(await listTaskMedia(projectId, taskId));
    } catch (error) {
      console.error('Failed to load task media:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, taskId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    let uploaded = 0;
    try {
      for (const file of Array.from(files)) {
        const optimized = await optimizeMediaFile(file, saveForMarketing);
        const uploadedItem = await uploadTaskMedia(projectId, taskId, optimized, stage, caption);
        if (saveForMarketing && canApprove) await updateMediaApproval(uploadedItem.id, uploadedItem.client_visible, true);
        uploaded += 1;
      }
      toast.success(`${uploaded} file${uploaded === 1 ? '' : 's'} added to the task`);
      setCaption('');
      if (inputRef.current) inputRef.current.value = '';
      await refresh();
      onUploaded?.();
    } catch (error: any) {
      toast.error(error?.message || 'File upload failed');
      await refresh();
    } finally {
      setUploading(false);
    }
  };

  const setApproval = async (item: TaskMedia, field: 'client' | 'social', checked: boolean) => {
    try {
      const updated = await updateMediaApproval(
        item.id,
        field === 'client' ? checked : item.client_visible,
        field === 'social' ? checked : item.social_approved,
      );
      setItems((curr) => curr.map((row) => row.id === item.id ? { ...row, ...updated } : row));
    } catch (error: any) {
      toast.error(error?.message || 'Could not update approval');
    }
  };

  const remove = async (item: TaskMedia) => {
    if (!window.confirm(`Delete ${item.original_filename}?`)) return;
    try {
      await deleteTaskMedia(item.id);
      setItems((curr) => curr.filter((row) => row.id !== item.id));
      toast.success('File deleted');
    } catch (error: any) {
      toast.error(error?.message || 'Could not delete file');
    }
  };

  const downloadForSocial = async (item: TaskMedia) => {
    try {
      await downloadMediaForSocial(item);
      toast.success(item.media_kind === 'photo' ? 'Social JPEG downloaded' : 'File downloaded');
    } catch (error: any) {
      toast.error(error?.message || 'Could not prepare download');
    }
  };

  return (
    <section className="rounded-[8px] border border-border bg-secondary/10 p-[14px] space-y-[12px]">
      <div>
        <div className="flex items-center gap-[6px]">
          <Paperclip className="h-4 w-4 text-accent" />
          <h3 className="font-['Roboto_Mono'] text-[11px] font-bold">
            {lockedStage ? stageLabels[lockedStage].toUpperCase() : 'PROOF OF WORK & UPDATES'}
          </h3>
        </div>
        <p className="mt-[3px] font-['Roboto_Mono'] text-[9px] text-muted-foreground">
          {lockedStage
            ? `Files added here are tagged "${stageLabels[lockedStage]}" automatically.`
            : 'Add photos, video, audio, PDFs, and before/after evidence. Files are internal unless approved.'}
        </p>
      </div>

      <div className={`grid gap-[8px] ${lockedStage ? 'sm:grid-cols-[1fr_auto]' : 'sm:grid-cols-[170px_1fr_auto]'}`}>
        {!lockedStage && (
          <Select value={stage} onValueChange={(value) => setStage(value as EvidenceStage)}>
            <SelectTrigger className="text-[10px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(stageLabels).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-[10px]">{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          placeholder="What does this show?"
          className="text-[10px]"
        />
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,audio/*,application/pdf"
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
          <Button type="button" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {uploading ? 'Uploading' : 'Add files'}
          </Button>
          <p className="mt-1 text-right text-[8px] text-muted-foreground">Photos optimize automatically</p>
        </div>
      </div>
      {canApprove && <label className="flex items-center gap-2 font-['Roboto_Mono'] text-[9px]"><input type="checkbox" checked={saveForMarketing} onChange={(event)=>setSaveForMarketing(event.target.checked)}/>Save for Marketing (up to 2400px, higher quality)</label>}

      {loading ? (
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading evidence</div>
      ) : items.length === 0 ? (
        <p className="text-[10px] text-muted-foreground">No evidence has been added yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-[8px] sm:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-[7px] border border-border bg-background">
              {item.media_kind === 'photo' && <img src={item.url} alt={item.caption || item.original_filename} className="h-[80px] w-full object-cover" />}
              {item.media_kind === 'video' && <video src={item.url} controls preload="metadata" className="h-[80px] w-full bg-black object-contain" />}
              {item.media_kind === 'audio' && <audio src={item.url} controls preload="metadata" className="w-full p-[10px]" />}
              {item.media_kind === 'document' && (
                <a href={item.url} target="_blank" rel="noreferrer" className="flex h-[90px] items-center justify-center gap-2 text-[10px] text-accent hover:underline">
                  <FileText className="h-5 w-5" /> Open PDF
                </a>
              )}
              <div className="space-y-[7px] p-[9px]">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate text-[10px] font-medium"><MediaIcon kind={item.media_kind} />{item.original_filename}</p>
                    <p className="text-[9px] text-muted-foreground">{stageLabels[item.evidence_stage]}</p>
                  </div>
                  <button type="button" onClick={() => remove(item)} className="text-muted-foreground hover:text-destructive" aria-label="Delete file"><Trash2 className="h-4 w-4" /></button>
                </div>
                {item.caption && <p className="text-[10px]">{item.caption}</p>}
                <button type="button" onClick={() => downloadForSocial(item)} className="w-full rounded-full border border-border px-3 py-2 font-['Roboto_Mono'] text-[9px] uppercase text-accent hover:border-accent">
                  {item.media_kind === 'photo' ? 'Download social JPEG' : 'Download for social'}
                </button>
                {canApprove && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-border pt-[7px] text-[9px]">
                    <Label className="flex items-center gap-1 text-[9px]"><input type="checkbox" checked={item.client_visible} onChange={(e) => setApproval(item, 'client', e.target.checked)} /> Client visible</Label>
                    <Label className="flex items-center gap-1 text-[9px]"><input type="checkbox" checked={item.social_approved} onChange={(e) => setApproval(item, 'social', e.target.checked)} /> Social approved</Label>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
