import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, Plus, X, Sparkles, Camera, FileUp } from "lucide-react";
import { toast } from "sonner";
import {
  type Estimate, updateEstimate,
  listEstimateMedia, uploadEstimateMedia, deleteEstimateMedia, type EstimateMedia,
  listMeasurements, addMeasurement, deleteMeasurement, type EstimateMeasurement,
  listDocuments, addDocument, deleteDocument, type EstimateDocument,
} from "../../../src/features/estimating/api";
import { analyzeCapture } from "../../../src/features/estimating/aiApi";
import { optimizeEstimatePdf } from "../../../src/features/estimating/pdfOptimizer";

interface ScreenProps {
  estimate: Estimate;
  onRefresh: () => void;
  onAdvance: () => void;
}

export default function CaptureScreen({ estimate, onRefresh, onAdvance }: ScreenProps) {
  const [photos, setPhotos] = useState<EstimateMedia[]>([]);
  const [measurements, setMeasurements] = useState<EstimateMeasurement[]>([]);
  const [documents, setDocuments] = useState<EstimateDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documentProgress, setDocumentProgress] = useState<{ value: number; label: string } | null>(null);
  const [notes, setNotes] = useState(estimate.capture_notes || "");
  const [walkthrough, setWalkthrough] = useState(estimate.capture_walkthrough || "");
  const [listening, setListening] = useState(false);
  const [mForm, setMForm] = useState({ label: "", value: "", unit: "" });
  const [docNote, setDocNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m, d] = await Promise.all([
        listEstimateMedia(estimate.id).catch(() => []),
        listMeasurements(estimate.id),
        listDocuments(estimate.id),
      ]);
      setPhotos(p); setMeasurements(m); setDocuments(d);
    } finally {
      setLoading(false);
    }
  }, [estimate.id]);
  useEffect(() => { load(); }, [load]);

  const handlePhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await uploadEstimateMedia(estimate.id, file);
      }
      toast.success(`${files.length} photo${files.length === 1 ? "" : "s"} added`);
      load();
    } catch (error: any) {
      toast.error(error?.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = async (id: string) => {
    try {
      await deleteEstimateMedia(id);
      setPhotos((prev) => prev.filter((p) => p.id !== id));
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove photo");
    }
  };

  const handleAddMeasurement = async () => {
    if (!mForm.label.trim() || !mForm.value.trim()) return;
    try {
      const m = await addMeasurement(estimate.id, mForm.label.trim(), mForm.value.trim(), mForm.unit.trim() || undefined);
      setMeasurements((prev) => [...prev, m]);
      setMForm({ label: "", value: "", unit: "" });
    } catch (error: any) {
      toast.error(error?.message || "Failed to add measurement");
    }
  };

  const handleAddDocument = async () => {
    const file = docInputRef.current?.files?.[0];
    if (!file && !docNote.trim()) return;
    setUploading(true);
    try {
      let uploadFile = file;
      if (file?.type === "application/pdf" || file?.name.toLowerCase().endsWith(".pdf")) {
        uploadFile = await optimizeEstimatePdf(file, (value, label) => setDocumentProgress({ value, label }));
      }
      if (uploadFile) await uploadEstimateMedia(estimate.id, uploadFile, docNote.trim() || undefined);
      const d = await addDocument(estimate.id, file ? file.name : "Site note", docNote.trim() || undefined);
      setDocuments((prev) => [...prev, d]); setDocNote(""); if (docInputRef.current) docInputRef.current.value = "";
      toast.success(file ? "Document uploaded" : "Site note added");
    } catch (error: any) { toast.error(error?.message || "Failed to upload document"); }
    finally { setUploading(false); setDocumentProgress(null); }
  };

  const saveText = async () => {
    try {
      await updateEstimate(estimate.id, { capture_notes: notes, capture_walkthrough: walkthrough } as any);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save notes");
    }
  };

  const toggleDictation = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Dictation isn't supported in this browser -- type instead"); return; }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "en-CA"; rec.interimResults = false; rec.continuous = true;
    rec.onresult = (ev: any) => {
      let txt = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) txt += ev.results[i][0].transcript;
      setWalkthrough((prev) => (prev + " " + txt).trim());
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognitionRef.current = rec;
    setListening(true);
  };

  const handleConfirm = async () => {
    try {
      await saveText();
      await updateEstimate(estimate.id, { capture_confirmed: true, status: "estimating" } as any);
      toast.message("Refining the scope…");
      await analyzeCapture(estimate.id);
      await updateEstimate(estimate.id, { analysis_confirmed: true } as any);
      toast.success("Scope refined and ready to review");
      onRefresh();
      onAdvance();
    } catch (error: any) {
      toast.error(error?.message || "Failed to confirm capture");
    }
  };

  const continueWithoutAI = async () => {
    const roughScope = [notes.trim(), walkthrough.trim()].filter(Boolean).join("\n\n");
    if (!roughScope) return toast.error("Add a rough scope or dictate one first");
    try {
      await updateEstimate(estimate.id, { capture_notes: notes, capture_walkthrough: walkthrough, scope_of_work: roughScope, capture_confirmed: true, analysis_confirmed: true, status: "estimating" } as any);
      toast.success("Ready to review — no AI credits used"); onRefresh(); onAdvance();
    } catch (error: any) { toast.error(error?.message || "Could not save the scope"); }
  };

  if (loading) return <div className="h-[200px] bg-card border border-border rounded-[12px] animate-pulse" />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#65733d]/15 bg-gradient-to-br from-[#f3f5eb] to-white p-5 shadow-[0_18px_50px_rgba(44,50,27,.06)] sm:p-6">
        <p className="font-['Roboto_Mono'] text-[9px] font-bold uppercase tracking-[0.12em] text-[#65733d]">01 · On site</p>
        <h1 className="mt-2 text-[24px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#191919] sm:text-[30px]">Capture what you can see.<br className="hidden sm:block" /> Say what needs doing.</h1>
        <p className="mt-3 max-w-xl text-[12px] leading-relaxed text-black/55">Photos, a plan, and rough notes are enough. Measurements are optional. Cstle refines your input without quietly adding work.</p>
      </div>
      <div className="grid md:grid-cols-2 gap-[16px]">
        <div className="bg-card border border-border rounded-[12px] p-[16px] space-y-[16px]">
          <div>
            <h3 className="flex items-center gap-2 text-[14px] font-semibold"><Camera className="size-4 text-[#65733d]" /> Photos</h3>
            <p className="mt-1 text-[10px] text-muted-foreground mb-[8px]">Take them now or choose from your phone.</p>
            <input ref={fileInputRef} type="file" accept="image/*" multiple capture="environment"
              onChange={(e) => handlePhotos(e.target.files)} disabled={uploading}
              className="font-['Roboto_Mono'] text-[10px]" />
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-[6px] mt-[10px]">
                {photos.map((p) => (
                  <div key={p.id} className="relative">
                    <img src={p.url} className="w-full aspect-square object-cover rounded-[6px] border border-border" />
                    <button onClick={() => removePhoto(p.id)} className="absolute top-[3px] right-[3px] w-[18px] h-[18px] bg-card border border-border rounded-full flex items-center justify-center">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-[14px] font-semibold"><FileUp className="size-4 text-[#65733d]" /> Plans or PDFs</h3>
            <p className="mt-1 text-[10px] text-muted-foreground mb-[8px]">Optional. The actual file stays attached · 2 MB maximum.</p>
            <div className="flex flex-col gap-[6px] sm:flex-row">
              <input ref={docInputRef} type="file" accept="application/pdf,image/*" className="font-['Roboto_Mono'] text-[10px] flex-1" />
              <input value={docNote} onChange={(e) => setDocNote(e.target.value)} placeholder="What's in it?" className="flex-1 px-[8px] py-[5px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[10px] bg-input-background" />
            </div>
            <button onClick={handleAddDocument} className="mt-[6px] px-[10px] py-[5px] bg-secondary rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-secondary/70">Add document</button>
            {documentProgress && <div className="mt-3 rounded-lg bg-[#eef1e4] p-2.5"><div className="flex items-center justify-between font-['Roboto_Mono'] text-[8px] font-bold uppercase tracking-[0.06em] text-[#5d683c]"><span>{documentProgress.label}</span><span>{documentProgress.value}%</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-black/10"><div className="h-full rounded-full bg-[#65733d] transition-[width]" style={{ width: `${documentProgress.value}%` }} /></div></div>}
            {documents.length > 0 && (
              <div className="mt-[8px] space-y-[4px]">
                {documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-[10px] font-['Roboto_Mono']">
                    <span className="truncate">{d.name} {d.note ? `-- ${d.note}` : ""}</span>
                    <button onClick={() => deleteDocument(d.id).then(() => setDocuments((prev) => prev.filter((x) => x.id !== d.id)))} className="text-muted-foreground hover:text-destructive shrink-0 ml-[8px]">remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-[12px] p-[16px] space-y-[16px]">
          <details className="rounded-xl border border-black/[0.06] bg-black/[0.018] p-3">
            <summary className="cursor-pointer text-[11px] font-medium text-black/60">Add measurements <span className="font-normal text-black/35">(optional)</span></summary>
            <div className="mt-3">
            <h3 className="font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">Measurements</h3>
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">Anything typed here is Confirmed -- it came from you, not a photo guess.</p>
            <div className="grid grid-cols-3 gap-[6px]">
              <input value={mForm.label} onChange={(e) => setMForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Fence length" className="px-[8px] py-[5px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[10px] bg-input-background" />
              <input value={mForm.value} onChange={(e) => setMForm((f) => ({ ...f, value: e.target.value }))} placeholder="85" className="px-[8px] py-[5px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[10px] bg-input-background" />
              <input value={mForm.unit} onChange={(e) => setMForm((f) => ({ ...f, unit: e.target.value }))} placeholder="linear ft" className="px-[8px] py-[5px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[10px] bg-input-background" />
            </div>
            <button onClick={handleAddMeasurement} className="mt-[6px] flex items-center gap-[4px] px-[10px] py-[5px] bg-secondary rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-secondary/70">
              <Plus className="w-3 h-3" /> Add measurement
            </button>
            {measurements.length > 0 && (
              <div className="mt-[8px] space-y-[4px]">
                {measurements.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-[10px] font-['Roboto_Mono']">
                    <span>{m.label}: {m.value} {m.unit}</span>
                    <button onClick={() => deleteMeasurement(m.id).then(() => setMeasurements((prev) => prev.filter((x) => x.id !== m.id)))} className="text-muted-foreground hover:text-destructive">remove</button>
                  </div>
                ))}
              </div>
            )}
            </div>
          </details>

          <div>
            <h3 className="text-[14px] font-semibold mb-[4px]">Rough scope</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveText} rows={3}
              placeholder="Frame two rooms, add one bathroom, drywall and flooring…"
              className="w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
          </div>

          <div>
            <h3 className="text-[12px] font-medium mb-[4px] text-black/60">Or dictate it</h3>
            <textarea value={walkthrough} onChange={(e) => setWalkthrough(e.target.value)} onBlur={saveText} rows={3}
              placeholder="Summary of what the customer said…"
              className="w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
            <button onClick={toggleDictation} className={`mt-[6px] flex items-center gap-[4px] px-[10px] py-[5px] rounded-[6px] font-['Roboto_Mono'] text-[10px] ${listening ? "bg-destructive/10 text-destructive" : "bg-secondary hover:bg-secondary/70"}`}>
              <Mic className="w-3 h-3" /> {listening ? "Listening… click to stop" : "Start dictation"}
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-4 grid gap-2 sm:static sm:flex sm:items-center"><button onClick={handleConfirm} disabled={uploading} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#65733d] px-5 text-[12px] font-semibold text-white shadow-[0_14px_30px_rgba(66,77,36,.28)] transition hover:-translate-y-0.5 hover:bg-[#596637] disabled:opacity-50 sm:w-auto sm:min-w-[260px]"><Sparkles className="size-4" /> Refine with AI</button><button onClick={continueWithoutAI} disabled={uploading} className="min-h-11 rounded-xl border border-black/10 bg-white px-4 text-[10px] font-medium text-black/55 shadow-sm hover:bg-[#f6f6f1]">Continue without AI · free</button></div>
    </div>
  );
}
