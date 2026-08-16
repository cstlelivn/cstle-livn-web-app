import { useState, useEffect } from "react";
import { Plus, ScrollText, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { toast } from "sonner";
import { useAuth } from "../AuthContext";
import { useEstimates } from "../../src/features/estimating/useEstimates";
import { createEstimate } from "../../src/features/estimating/api";
import { listClients, createClient as createClientRecord } from "../../src/features/clients/api";
import { listLeads } from "../../src/features/leads/api";
import { formatDate } from "../../src/lib/dates";

function statusColor(s: string) {
  switch (s) {
    case "approved":
    case "converted": return "bg-success/10 text-success border-success/20";
    case "proposal_sent": return "bg-warning/10 text-warning border-warning/20";
    case "estimating": return "bg-primary/10 text-primary border-primary/20";
    case "declined":
    case "lost": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted/10 text-muted-foreground border-muted/20";
  }
}
function statusLabel(s: string) {
  return ({ lead: "Lead", estimating: "Estimating", proposal_sent: "Proposal sent", approved: "Approved", converted: "Converted to project", declined: "Declined", lost: "Lost" } as Record<string, string>)[s] || s;
}

interface LeadsListScreenProps {
  onOpen: (estimateId: string) => void;
}

export default function LeadsListScreen({ onOpen }: LeadsListScreenProps) {
  const { currentUser, hasPermission } = useAuth();
  const canRun = hasPermission("canRunEstimating");
  const { estimates, loading, refresh } = useEstimates();
  const [clients, setClients] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [form, setForm] = useState({ clientId: "", leadId: "", name: "", siteAddress: "", newClientName: "", newClientEmail: "", newClientPhone: "" });

  useEffect(() => {
    listClients().then(setClients).catch(() => setClients([]));
    listLeads().then(setLeads).catch(() => setLeads([]));
  }, []);

  const openDialog = () => {
    setMode("existing");
    setForm({ clientId: "", leadId: "", name: "", siteAddress: "", newClientName: "", newClientEmail: "", newClientPhone: "" });
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Job/project name is required"); return; }
    setSaving(true);
    try {
      let clientId = form.clientId;
      if (mode === "new") {
        if (!form.newClientName.trim() || !form.newClientEmail.trim()) {
          toast.error("New client needs a name and email"); setSaving(false); return;
        }
        const created = await createClientRecord({ name: form.newClientName.trim(), email: form.newClientEmail.trim(), phone: form.newClientPhone.trim() || undefined });
        clientId = created.id;
      }
      if (!clientId) { toast.error("Select or create a client first"); setSaving(false); return; }

      const estimate = await createEstimate({
        client_id: clientId,
        lead_id: form.leadId || undefined,
        name: form.name.trim(),
        site_address: form.siteAddress.trim() || undefined,
        created_by: currentUser?.id ? String(currentUser.id) : undefined,
      });
      toast.success("Estimate created");
      setOpen(false);
      refresh();
      onOpen(estimate.id);
    } catch (error: any) {
      toast.error(error?.message || "Failed to create estimate");
    } finally {
      setSaving(false);
    }
  };

  const clientName = (id: string) => clients.find((c) => String(c.id) === String(id))?.name || "—";
  const filtered = estimates.filter((e) =>
    !search.trim() ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    clientName(e.client_id).toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-[12px]">
        {[1, 2].map((i) => <div key={i} className="h-[64px] bg-card border border-border rounded-[12px] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-[16px]">
      <div className="flex items-center justify-between gap-[12px] flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search estimates…"
            className="w-full pl-[34px] pr-[10px] py-[8px] border border-border rounded-[8px] font-['Roboto_Mono'] text-[11px] bg-input-background"
          />
        </div>
        {canRun && (
          <button
            onClick={openDialog}
            className="flex items-center gap-[6px] px-[12px] py-[6px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors font-['Roboto_Mono'] text-[11px]"
          >
            <Plus className="w-3 h-3" /> New Estimate
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-card border border-dashed border-border rounded-[12px] p-[48px] text-center">
          <ScrollText className="w-8 h-8 text-muted-foreground mx-auto mb-[12px]" />
          <p className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[4px]">No estimates yet</p>
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
            Start one from an existing CRM lead/client, or create a new client on the spot.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-[12px] divide-y divide-border">
          {filtered.map((e) => (
            <button
              key={e.id}
              onClick={() => onOpen(e.id)}
              className="w-full flex items-center justify-between gap-[12px] px-[16px] py-[14px] text-left hover:bg-accent/5 transition-colors"
            >
              <div className="min-w-0">
                <p className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground truncate">{e.name}</p>
                <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                  {clientName(e.client_id)} · created {formatDate(e.created_at)}
                </p>
              </div>
              <span className={`px-[8px] py-[2px] rounded-full text-[9px] font-['Roboto_Mono'] border shrink-0 ${statusColor(e.status)}`}>
                {statusLabel(e.status)}
              </span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">New Estimate</DialogTitle>
          </DialogHeader>
          <div className="space-y-[12px] py-[4px]">
            <div className="flex gap-[6px]">
              <button
                onClick={() => setMode("existing")}
                className={`flex-1 px-[10px] py-[6px] rounded-[6px] border font-['Roboto_Mono'] text-[11px] ${mode === "existing" ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground"}`}
              >
                Existing client/lead
              </button>
              <button
                onClick={() => setMode("new")}
                className={`flex-1 px-[10px] py-[6px] rounded-[6px] border font-['Roboto_Mono'] text-[11px] ${mode === "new" ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground"}`}
              >
                New client
              </button>
            </div>

            {mode === "existing" ? (
              <>
                <div>
                  <Label className="font-['Roboto_Mono'] text-[11px]">Client *</Label>
                  <Select value={form.clientId} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v }))}>
                    <SelectTrigger className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => <SelectItem key={c.id} value={String(c.id)} className="font-['Roboto_Mono'] text-[11px]">{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {leads.length > 0 && (
                  <div>
                    <Label className="font-['Roboto_Mono'] text-[11px]">Started from lead <span className="text-muted-foreground font-normal">(optional)</span></Label>
                    <Select value={form.leadId} onValueChange={(v) => setForm((f) => ({ ...f, leadId: v }))}>
                      <SelectTrigger className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        {leads.map((l) => <SelectItem key={l.id} value={String(l.id)} className="font-['Roboto_Mono'] text-[11px]">{l.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            ) : (
              <div className="row2 grid grid-cols-2 gap-[8px]">
                <div className="col-span-2">
                  <Label className="font-['Roboto_Mono'] text-[11px]">Client name *</Label>
                  <Input value={form.newClientName} onChange={(e) => setForm((f) => ({ ...f, newClientName: e.target.value }))} className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
                </div>
                <div>
                  <Label className="font-['Roboto_Mono'] text-[11px]">Email *</Label>
                  <Input value={form.newClientEmail} onChange={(e) => setForm((f) => ({ ...f, newClientEmail: e.target.value }))} className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
                </div>
                <div>
                  <Label className="font-['Roboto_Mono'] text-[11px]">Phone</Label>
                  <Input value={form.newClientPhone} onChange={(e) => setForm((f) => ({ ...f, newClientPhone: e.target.value }))} className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
                </div>
              </div>
            )}

            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Job / project name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Basement development" className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Site address <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input value={form.siteAddress} onChange={(e) => setForm((f) => ({ ...f, siteAddress: e.target.value }))} className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] hover:bg-accent/10">Cancel</button>
            <button onClick={handleCreate} disabled={saving} className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Creating…" : "Create Estimate"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
