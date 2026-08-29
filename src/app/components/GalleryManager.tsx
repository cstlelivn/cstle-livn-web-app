import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, EyeOff, Image as ImageIcon, RefreshCw, Save, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchManagedGallery,
  saveGalleryAlbum,
  saveGalleryImages,
  triggerGallerySyncWorkflow,
  type ManagedGalleryAlbum,
  type ManagedGalleryImage,
} from '../src/features/gallery/api';

const projectTypes = [
  'Basement renovation',
  'Whole-home renovation',
  'Kitchen renovation',
  'Bathroom renovation',
  'Commercial renovation',
  'Commercial interior',
  'Tenant improvement',
  'New construction',
  'Exterior renovation',
  'Finishing contract',
  'Other',
];

const serviceOptions = [
  'Basement finishing',
  'Whole-home renovations',
  'Commercial renovations',
  'New construction',
  'Kitchens',
  'Bathrooms',
  'Flooring',
  'Painting',
  'Trim & doors',
  'Millwork',
  'Installations',
  'Tenant improvements',
  'Exterior work',
];

function cloneAlbum(album: ManagedGalleryAlbum): ManagedGalleryAlbum {
  return { ...album, services: [...(album.services ?? [])], images: album.images.map((image) => ({ ...image })) };
}

function imageSource(image: ManagedGalleryImage) {
  return image.thumbnail_url || image.url;
}

export default function GalleryManager() {
  const [albums, setAlbums] = useState<ManagedGalleryAlbum[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ManagedGalleryAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'save' | 'publish' | 'sync' | null>(null);
  const [customService, setCustomService] = useState('');

  const load = async (preserveSelection = true) => {
    setLoading(true);
    try {
      const rows = await fetchManagedGallery();
      setAlbums(rows);
      const nextId = preserveSelection && selectedId && rows.some((row) => row.id === selectedId)
        ? selectedId
        : rows[0]?.id ?? null;
      setSelectedId(nextId);
      const selected = rows.find((row) => row.id === nextId);
      setDraft(selected ? cloneAlbum(selected) : null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load Gallery Manager');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(false); }, []);

  const counts = useMemo(() => ({
    published: albums.filter((album) => album.published).length,
    drafts: albums.filter((album) => !album.published).length,
  }), [albums]);

  const chooseAlbum = (album: ManagedGalleryAlbum) => {
    setSelectedId(album.id);
    setDraft(cloneAlbum(album));
  };

  const patchDraft = (updates: Partial<ManagedGalleryAlbum>) => {
    setDraft((current) => current ? { ...current, ...updates } : current);
  };

  const patchImage = (imageId: string, updates: Partial<ManagedGalleryImage>) => {
    setDraft((current) => current ? {
      ...current,
      images: current.images.map((image) => image.id === imageId ? { ...image, ...updates } : image),
    } : current);
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const target = index + direction;
    if (target < 0 || target >= draft.images.length) return;
    const next = [...draft.images];
    [next[index], next[target]] = [next[target], next[index]];
    patchDraft({ images: next.map((image, position) => ({ ...image, display_position: position })) });
  };

  const toggleService = (service: string) => {
    if (!draft) return;
    patchDraft({ services: draft.services.includes(service)
      ? draft.services.filter((item) => item !== service)
      : [...draft.services, service] });
  };

  const addCustomService = () => {
    const value = customService.trim();
    if (!value || !draft || draft.services.includes(value)) return;
    patchDraft({ services: [...draft.services, value] });
    setCustomService('');
  };

  const save = async (publishedState: boolean) => {
    if (!draft) return;
    const wasPublished = draft.published;
    setBusy(publishedState ? 'publish' : 'save');
    try {
      await saveGalleryImages(draft.id, draft.images);
      await saveGalleryAlbum({ ...draft, published: publishedState });
      toast.success(publishedState ? (wasPublished ? 'Website project updated' : 'Project published to cstle.ca') : (wasPublished ? 'Project unpublished' : 'Gallery draft saved'));
      await load(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save project');
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy('sync');
    try {
      await triggerGallerySyncWorkflow();
      toast.success('Drive sync started. New folders will arrive here as drafts; use Refresh projects when it finishes.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start Drive sync');
    } finally {
      setBusy(null);
    }
  };

  if (loading && albums.length === 0) {
    return <div className="py-20 text-center font-['Roboto_Mono'] text-[11px] text-muted-foreground">Loading Gallery Manager…</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 pb-12">
      <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.14em] text-accent">Website content</p>
          <h1 className="mt-2 font-['Anybody'] text-[24px] leading-[1.1] tracking-[-0.04em] text-foreground" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 700 }}>Gallery Manager</h1>
          <p className="mt-2 max-w-[690px] font-['Roboto_Mono'] text-[10px] leading-[1.55] text-muted-foreground">Google Drive supplies the photographs. This screen controls what customers see: the public story, project type, services, cover, order and image labels.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load(true)} disabled={loading || !!busy} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 font-['Roboto_Mono'] text-[9px] uppercase text-foreground hover:border-accent/40 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />Refresh projects</button>
          <button type="button" onClick={sync} disabled={!!busy} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-4 font-['Roboto_Mono'] text-[9px] uppercase text-white hover:opacity-90 disabled:opacity-50"><UploadCloud className={`h-3.5 w-3.5 ${busy === 'sync' ? 'animate-pulse' : ''}`} />{busy === 'sync' ? 'Starting sync…' : 'Sync Google Drive'}</button>
          <a href="https://www.cstle.ca/gallery" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 font-['Roboto_Mono'] text-[9px] uppercase text-foreground hover:border-accent/40"><ExternalLink className="h-3.5 w-3.5" />View website</a>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="self-start overflow-hidden rounded-[18px] border border-border bg-card xl:sticky xl:top-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.1em]">Projects</p>
            <p className="font-['Roboto_Mono'] text-[8px] text-muted-foreground">{counts.published} live · {counts.drafts} draft</p>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2">
            {albums.map((album) => (
              <button key={album.id} type="button" onClick={() => chooseAlbum(album)} className={`mb-1 flex w-full items-center gap-3 rounded-[12px] p-2.5 text-left transition-colors ${selectedId === album.id ? 'bg-accent/10' : 'hover:bg-secondary/50'}`}>
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[9px] bg-secondary">
                  {album.images[0] ? <img src={imageSource(album.images.find((image) => image.id === album.cover_image_id) ?? album.images[0])} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="m-4 h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-['Anybody'] text-[12px] leading-[1.2] tracking-[-0.03em]" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 700 }}>{album.public_title || album.name}</p>
                  <p className={`mt-1 font-['Roboto_Mono'] text-[7px] font-bold uppercase tracking-[0.08em] ${album.published ? 'text-accent' : 'text-muted-foreground'}`}>{album.published ? 'Published' : 'Draft'} · {album.images.length} images</p>
                </div>
              </button>
            ))}
            {albums.length === 0 && <p className="p-6 text-center font-['Roboto_Mono'] text-[9px] leading-[1.5] text-muted-foreground">No Drive projects yet. Add a project folder, then run Sync Google Drive.</p>}
          </div>
        </aside>

        {draft ? (
          <main className="min-w-0 space-y-5">
            <section className="grid gap-5 rounded-[18px] border border-border bg-card p-4 md:p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-['Roboto_Mono'] text-[8px] uppercase text-muted-foreground">Drive folder · {draft.source_folder_name || draft.name}</p>
                    <h2 className="mt-1 font-['Anybody'] text-[17px] tracking-[-0.04em]" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 700 }}>Public project story</h2>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 font-['Roboto_Mono'] text-[8px] font-bold uppercase ${draft.published ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'}`}>{draft.published ? 'Live on website' : 'Draft — hidden'}</span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-1.5 md:col-span-2"><span className="font-['Roboto_Mono'] text-[8px] font-bold uppercase text-muted-foreground">Public title</span><input value={draft.public_title ?? ''} onChange={(event) => patchDraft({ public_title: event.target.value })} maxLength={120} className="h-11 w-full rounded-[8px] border border-border bg-background px-3 font-['Anybody'] text-[13px] tracking-[-0.03em] outline-none focus:border-accent" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 700 }} placeholder="A customer-friendly project name" /></label>
                  <label className="space-y-1.5"><span className="font-['Roboto_Mono'] text-[8px] font-bold uppercase text-muted-foreground">Project type</span><select value={draft.project_type ?? 'Other'} onChange={(event) => patchDraft({ project_type: event.target.value })} className="h-11 w-full rounded-[8px] border border-border bg-background px-3 font-['Roboto_Mono'] text-[9px] outline-none focus:border-accent">{projectTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
                  <label className="space-y-1.5"><span className="font-['Roboto_Mono'] text-[8px] font-bold uppercase text-muted-foreground">Project status</span><select value={draft.status === 'in_progress' ? 'in_progress' : 'completed'} onChange={(event) => patchDraft({ status: event.target.value as ManagedGalleryAlbum['status'] })} className="h-11 w-full rounded-[8px] border border-border bg-background px-3 font-['Roboto_Mono'] text-[9px] outline-none focus:border-accent"><option value="completed">Completed project</option><option value="in_progress">In progress</option></select></label>
                  <label className="space-y-1.5"><span className="font-['Roboto_Mono'] text-[8px] font-bold uppercase text-muted-foreground">Safe public location</span><input value={draft.location_label ?? ''} onChange={(event) => patchDraft({ location_label: event.target.value })} className="h-11 w-full rounded-[8px] border border-border bg-background px-3 font-['Roboto_Mono'] text-[9px] outline-none focus:border-accent" placeholder="Regina, Saskatchewan (optional)" /></label>
                  <label className="space-y-1.5"><span className="font-['Roboto_Mono'] text-[8px] font-bold uppercase text-muted-foreground">Display order</span><input type="number" min="0" value={draft.display_position ?? 0} onChange={(event) => patchDraft({ display_position: Number(event.target.value) })} className="h-11 w-full rounded-[8px] border border-border bg-background px-3 font-['Roboto_Mono'] text-[9px] outline-none focus:border-accent" /></label>
                  <label className="space-y-1.5 md:col-span-2"><span className="flex justify-between font-['Roboto_Mono'] text-[8px] font-bold uppercase text-muted-foreground"><span>Short explanation</span><span>{(draft.description ?? '').length}/800</span></span><textarea value={draft.description ?? ''} onChange={(event) => patchDraft({ description: event.target.value })} maxLength={800} rows={4} className="w-full resize-y rounded-[8px] border border-border bg-background p-3 font-['Anybody'] text-[11px] leading-[1.5] outline-none focus:border-accent" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 500 }} placeholder="What changed, what Cstle completed, and why the result matters." /></label>
                </div>

                <div>
                  <p className="font-['Roboto_Mono'] text-[8px] font-bold uppercase text-muted-foreground">Services shown on the website</p>
                  <div className="mt-2 flex flex-wrap gap-2">{serviceOptions.map((service) => <button key={service} type="button" onClick={() => toggleService(service)} className={`rounded-full border px-3 py-2 font-['Roboto_Mono'] text-[7px] font-bold uppercase transition-colors ${draft.services.includes(service) ? 'border-accent bg-accent text-white' : 'border-border bg-background text-muted-foreground hover:border-accent/40'}`}>{draft.services.includes(service) && <Check className="mr-1 inline h-2.5 w-2.5" />}{service}</button>)}</div>
                  <div className="mt-3 flex max-w-md gap-2"><input value={customService} onChange={(event) => setCustomService(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addCustomService(); } }} className="h-9 flex-1 rounded-[8px] border border-border bg-background px-3 font-['Roboto_Mono'] text-[8px] outline-none focus:border-accent" placeholder="Add another service" /><button type="button" onClick={addCustomService} className="rounded-[8px] border border-border px-3 font-['Roboto_Mono'] text-[8px] uppercase hover:border-accent/40">Add</button></div>
                  {draft.services.filter((service) => !serviceOptions.includes(service)).length > 0 && <div className="mt-2 flex flex-wrap gap-2">{draft.services.filter((service) => !serviceOptions.includes(service)).map((service) => <button key={service} type="button" onClick={() => toggleService(service)} className="rounded-full bg-accent/10 px-3 py-1.5 font-['Roboto_Mono'] text-[7px] uppercase text-accent">{service} ×</button>)}</div>}
                </div>
              </div>

              <aside>
                <p className="mb-2 font-['Roboto_Mono'] text-[8px] font-bold uppercase text-muted-foreground">Website card preview</p>
                <div className="overflow-hidden rounded-[18px] border border-border bg-background shadow-sm">
                  <div className="relative h-[230px] bg-secondary">{draft.images.length > 0 && <img src={imageSource(draft.images.find((image) => image.id === draft.cover_image_id) ?? draft.images[0])} alt="" className="h-full w-full object-cover" />}<span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 font-['Roboto_Mono'] text-[7px] font-bold uppercase text-white">{draft.status === 'in_progress' ? 'In progress' : 'Completed project'}</span></div>
                  <div className="p-4 hyphens-none [overflow-wrap:normal] [word-break:normal]"><p className="font-['Roboto_Mono'] text-[7px] font-bold uppercase text-accent">Selected Cstle work · {draft.images.filter((image) => image.published && image.is_active).length} images</p><h3 className="mt-2 font-['Anybody'] text-[13px] leading-[1.2] tracking-[-0.035em]" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 700 }}>{draft.public_title || 'Public project title'}</h3><p className="mt-2 font-['Anybody'] text-[10px] leading-[1.45] text-muted-foreground" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 500 }}>{draft.description || 'Your short project explanation will appear here.'}</p></div>
                </div>
              </aside>
            </section>

            <section className="rounded-[18px] border border-border bg-card p-4 md:p-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="font-['Roboto_Mono'] text-[8px] font-bold uppercase text-accent">Project media</p><h2 className="mt-1 font-['Anybody'] text-[17px] tracking-[-0.04em]" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 700 }}>Choose the cover and tell the image story</h2><p className="mt-1 font-['Roboto_Mono'] text-[9px] leading-[1.5] text-muted-foreground">Reorder with the arrows. Label each image honestly as before, progress, completed or concept.</p></div><p className="font-['Roboto_Mono'] text-[8px] text-muted-foreground">{draft.images.filter((image) => image.published && image.is_active).length} visible</p></div>
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{draft.images.map((image, index) => (
                <article key={image.id} className={`overflow-hidden rounded-[14px] border bg-background ${draft.cover_image_id === image.id ? 'border-accent ring-1 ring-accent/30' : 'border-border'}`}>
                  <div className="relative h-[210px] bg-secondary"><img src={imageSource(image)} alt="" className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 font-['Roboto_Mono'] text-[7px] font-bold uppercase text-white">{image.stage === 'concept' ? 'Concept visualization' : image.stage}</span>{draft.cover_image_id === image.id && <span className="absolute bottom-3 left-3 rounded-full bg-accent px-2.5 py-1 font-['Roboto_Mono'] text-[7px] font-bold uppercase text-white">Cover image</span>}</div>
                  <div className="space-y-3 p-3">
                    <div className="flex items-center justify-between gap-2"><button type="button" onClick={() => patchDraft({ cover_image_id: image.id })} className="font-['Roboto_Mono'] text-[8px] font-bold uppercase text-accent">{draft.cover_image_id === image.id ? 'Selected cover' : 'Use as cover'}</button><div className="flex gap-1"><button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Move image earlier" className="rounded border border-border p-1.5 disabled:opacity-25"><ArrowUp className="h-3 w-3" /></button><button type="button" onClick={() => moveImage(index, 1)} disabled={index === draft.images.length - 1} aria-label="Move image later" className="rounded border border-border p-1.5 disabled:opacity-25"><ArrowDown className="h-3 w-3" /></button><button type="button" onClick={() => patchImage(image.id, { published: !image.published })} aria-label={image.published ? 'Hide image' : 'Show image'} className="rounded border border-border p-1.5">{image.published ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button></div></div>
                    <label className="block space-y-1"><span className="font-['Roboto_Mono'] text-[7px] font-bold uppercase text-muted-foreground">Image stage</span><select value={image.stage || 'completed'} onChange={(event) => patchImage(image.id, { stage: event.target.value as ManagedGalleryImage['stage'] })} className="h-9 w-full rounded-[7px] border border-border bg-card px-2 font-['Roboto_Mono'] text-[8px]"><option value="before">Before</option><option value="progress">Progress</option><option value="completed">Completed</option><option value="concept">Concept visualization</option></select></label>
                    <label className="block space-y-1"><span className="font-['Roboto_Mono'] text-[7px] font-bold uppercase text-muted-foreground">Image label</span><input value={image.display_title ?? image.title ?? ''} onChange={(event) => patchImage(image.id, { display_title: event.target.value })} className="h-9 w-full rounded-[7px] border border-border bg-card px-2 font-['Anybody'] text-[10px]" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 600 }} /></label>
                    <label className="block space-y-1"><span className="font-['Roboto_Mono'] text-[7px] font-bold uppercase text-muted-foreground">Alternative text</span><textarea value={image.alt_text ?? ''} onChange={(event) => patchImage(image.id, { alt_text: event.target.value })} rows={2} className="w-full resize-y rounded-[7px] border border-border bg-card p-2 font-['Roboto_Mono'] text-[8px] leading-[1.4]" placeholder="Describe what is visibly shown" /></label>
                  </div>
                </article>
              ))}</div>
            </section>

            <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-background/95 p-3 shadow-lg backdrop-blur"><p className="font-['Roboto_Mono'] text-[8px] leading-[1.4] text-muted-foreground">Draft projects stay hidden. Publishing validates the story, services, cover and image descriptions.</p><div className="flex gap-2">{draft.published && <button type="button" onClick={() => void save(false)} disabled={!!busy} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 font-['Roboto_Mono'] text-[8px] font-bold uppercase text-foreground disabled:opacity-50"><EyeOff className="h-3.5 w-3.5" />Unpublish</button>}<button type="button" onClick={() => void save(draft.published)} disabled={!!busy} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-accent px-4 font-['Roboto_Mono'] text-[8px] font-bold uppercase text-accent disabled:opacity-50"><Save className="h-3.5 w-3.5" />{busy ? 'Saving…' : draft.published ? 'Save changes' : 'Save draft'}</button>{!draft.published && <button type="button" onClick={() => void save(true)} disabled={!!busy} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-accent px-5 font-['Roboto_Mono'] text-[8px] font-bold uppercase text-white disabled:opacity-50"><Eye className="h-3.5 w-3.5" />{busy === 'publish' ? 'Publishing…' : 'Publish'}</button>}</div></div>
          </main>
        ) : <div className="flex min-h-[420px] items-center justify-center rounded-[18px] border border-dashed border-border bg-card"><div className="max-w-sm text-center"><ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-['Anybody'] text-[14px]" style={{ fontVariationSettings: "'wdth' 135", fontWeight: 700 }}>Add the first Drive project</p><p className="mt-2 font-['Roboto_Mono'] text-[9px] leading-[1.5] text-muted-foreground">Create a numbered project folder in Google Drive, then run Sync Google Drive. It will arrive here as a private draft.</p></div></div>}
      </div>
    </div>
  );
}
