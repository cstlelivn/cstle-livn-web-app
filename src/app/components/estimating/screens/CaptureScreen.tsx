import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  type Estimate, updateEstimate,
  listEstimateMedia, uploadEstimateMedia, deleteEstimateMedia, type EstimateMedia,
  listMeasurements, addMeasurement, deleteMeasurement, type EstimateMeasurement,
  listDocuments, addDocument, deleteDocument, type EstimateDocument,
} from "../../../src/features/estimating/api";

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

  const handleAddDocument = () => {
    const file = docInputRef.current?.files?.[0];
    if (!file && !docNote.trim()) return;
    addDocument(estimate.id, file ? file.name : "(note only)", docNote.trim() || undefined)
      .then((d) => { setDocuments((prev) => [...prev, d]); setDocNote(""); if (docInputRef.current) docInputRef.current.value = ""; })
      .catch((error: any) => toast.error(error?.message || "Failed to add document"));
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
      toast.success("Capture confirmed");
      onRefresh();
      onAdvance();
    } catch (error: any) {
      toast.error(error?.message || "Failed to confirm capture");
    }
  };

  if (loading) return <div className="h-[200px] bg-card border border-border rounded-[12px] animate-pulse" />;

  return (
    <div className="space-y-[16px]">
      <div className="grid md:grid-cols-2 gap-[16px]">
        <div className="bg-card border border-border rounded-[12px] p-[16px] space-y-[16px]">
          <div>
            <h3 className="font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">Photos</h3>
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">Compressed and stored on this estimate.</p>
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
            <h3 className="font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">Documents</h3>
            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[8px]">Plans/specs -- record the filename and a short summary (parsing isn't automated).</p>
            <div className="flex gap-[6px]">
              <input ref={docInputRef} type="file" className="font-['Roboto_Mono'] text-[10px] flex-1" />
              <input value={docNote} onChange={(e) => setDocNote(e.target.value)} placeholder="What's in it?" className="flex-1 px-[8px] py-[5px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[10px] bg-input-background" />
            </div>
            <button onClick={handleAddDocument} className="mt-[6px] px-[10px] py-[5px] bg-secondary rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-secondary/70">Add document</button>
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
          <div>
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

          <div>
            <h3 className="font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">Notes</h3>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveText} rows={3}
              placeholder="Quick notes from the walkthrough…"
              className="w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
          </div>

          <div>
            <h3 className="font-['Roboto_Mono'] font-bold text-[12px] mb-[4px]">Walkthrough summary</h3>
            <textarea value={walkthrough} onChange={(e) => setWalkthrough(e.target.value)} onBlur={saveText} rows={3}
              placeholder="Summary of what the customer said…"
              className="w-full px-[8px] py-[6px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] bg-input-background" />
            <button onClick={toggleDictation} className={`mt-[6px] flex items-center gap-[4px] px-[10px] py-[5px] rounded-[6px] font-['Roboto_Mono'] text-[10px] ${listening ? "bg-destructive/10 text-destructive" : "bg-secondary hover:bg-secondary/70"}`}>
              <Mic className="w-3 h-3" /> {listening ? "Listening… click to stop" : "Start dictation"}
            </button>
          </div>
        </div>
      </div>

      <button onClick={handleConfirm} className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px]">
        Confirm capture is complete →
      </button>
    </div>
  );
}
