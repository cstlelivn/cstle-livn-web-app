import { useState } from "react";
import {
  ChevronDown, ChevronRight, Plus, Trash2, Edit2, Phone, Mail,
  FileText, ClipboardCheck, StickyNote, ScrollText, Calendar,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { useApp } from "./AppContext";
import { usePermits } from "../src/features/permits/usePermits";
import {
  PERMIT_STATUSES, PERMIT_TYPE_PRESETS, PERMIT_EVENT_TYPES,
  createProjectPermit, updateProjectPermit, deleteProjectPermit,
  listPermitEvents, createPermitEvent,
  type ProjectPermit, type PermitEvent,
} from "../src/features/permits/api";
import { formatDate } from "../src/lib/dates";

function statusColor(s: string) {
  switch (s) {
    case "Issued":
    case "Approved":
      return "bg-success/10 text-success border-success/20";
    case "Under Review":
    case "Application Submitted":
      return "bg-primary/10 text-primary border-primary/20";
    case "Additional Info Requested":
    case "Inspection Required":
      return "bg-warning/10 text-warning border-warning/20";
    case "Rejected":
    case "Expired":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "Closed":
      return "bg-muted/20 text-muted-foreground border-muted/30";
    default:
      return "bg-muted/10 text-muted-foreground border-muted/20";
  }
}

const eventIcon = (type: string) => {
  switch (type) {
    case "Call": return Phone;
    case "Email": return Mail;
    case "Submission": return FileText;
    case "Inspection": return ClipboardCheck;
    default: return StickyNote;
  }
};

interface ProjectPermitsTabProps {
  projectId: number | string;
}

export default function ProjectPermitsTab({ projectId }: ProjectPermitsTabProps) {
  const { currentUser, hasPermission } = useAuth();
  const { teamMembers, getProject } = useApp();
  const isManagerOrAdmin = hasPermission("canEditProjects");
  // Mirrors ProjectDetailsReal's canCreateTask pattern: broad-viewer roles,
  // or the Supervisor of this specific project -- matches what the RLS
  // policies in 20240042_project_permits.sql actually allow to write.
  const project = getProject(projectId);
  const myTeamMember = teamMembers.find((m: any) => String(m.authUserId) === String(currentUser?.id));
  // Supervisor is a Team Role, not a login role -- whether this person
  // supervises this specific project is determined by project.supervisorId,
  // not by their System Role string.
  const isSupervisorHere = !!myTeamMember &&
    String((project as any)?.supervisorId) === String(myTeamMember.id);
  const canManage = isManagerOrAdmin || isSupervisorHere;

  const { permits, loading, refresh } = usePermits(projectId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [events, setEvents] = useState<Record<string, PermitEvent[]>>({});
  const [eventsLoading, setEventsLoading] = useState<Set<string>>(new Set());

  const [permitDialogOpen, setPermitDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<ProjectPermit | null>(null);
  const [deletePermitId, setDeletePermitId] = useState<string | null>(null);
  const [eventDialogPermitId, setEventDialogPermitId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [permitForm, setPermitForm] = useState({
    permit_type: "", status: "Inquiry", permit_number: "",
    applied_date: "", issued_date: "", expiry_date: "", notes: "",
  });
  const [eventForm, setEventForm] = useState({
    event_type: "Call", event_date: new Date().toISOString().slice(0, 10),
    reference_number: "", contact_name: "", summary: "",
  });

  const loadEvents = async (permitId: string) => {
    setEventsLoading((prev) => new Set(prev).add(permitId));
    try {
      setEvents((prev) => ({ ...prev, [permitId]: [] }));
      const data = await listPermitEvents(permitId);
      setEvents((prev) => ({ ...prev, [permitId]: data }));
    } catch (error: any) {
      toast.error(error?.message || "Failed to load permit history");
    } finally {
      setEventsLoading((prev) => { const next = new Set(prev); next.delete(permitId); return next; });
    }
  };

  const toggleExpand = (permitId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(permitId)) {
        next.delete(permitId);
      } else {
        next.add(permitId);
        loadEvents(permitId);
      }
      return next;
    });
  };

  const openAddPermit = () => {
    setEditingPermit(null);
    setPermitForm({ permit_type: "", status: "Inquiry", permit_number: "", applied_date: "", issued_date: "", expiry_date: "", notes: "" });
    setPermitDialogOpen(true);
  };

  const openEditPermit = (permit: ProjectPermit) => {
    setEditingPermit(permit);
    setPermitForm({
      permit_type: permit.permit_type,
      status: permit.status,
      permit_number: permit.permit_number || "",
      applied_date: permit.applied_date ? permit.applied_date.slice(0, 10) : "",
      issued_date: permit.issued_date ? permit.issued_date.slice(0, 10) : "",
      expiry_date: permit.expiry_date ? permit.expiry_date.slice(0, 10) : "",
      notes: permit.notes || "",
    });
    setPermitDialogOpen(true);
  };

  const handleSavePermit = async () => {
    if (!permitForm.permit_type.trim()) { toast.error("Permit type is required"); return; }
    setSaving(true);
    try {
      const payload = {
        permit_type: permitForm.permit_type.trim(),
        status: permitForm.status,
        permit_number: permitForm.permit_number.trim() || null,
        applied_date: permitForm.applied_date || null,
        issued_date: permitForm.issued_date || null,
        expiry_date: permitForm.expiry_date || null,
        notes: permitForm.notes.trim() || null,
      };
      if (editingPermit) {
        await updateProjectPermit(editingPermit.id, payload);
        toast.success("Permit updated");
      } else {
        await createProjectPermit({ project_id: String(projectId), ...payload, created_by: currentUser?.id ? String(currentUser.id) : undefined } as any);
        toast.success("Permit added");
      }
      setPermitDialogOpen(false);
      refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save permit");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePermit = async (id: string) => {
    setSaving(true);
    try {
      await deleteProjectPermit(id);
      toast.success("Permit deleted");
      setDeletePermitId(null);
      refresh();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete permit");
    } finally {
      setSaving(false);
    }
  };

  const openAddEvent = (permitId: string) => {
    setEventForm({ event_type: "Call", event_date: new Date().toISOString().slice(0, 10), reference_number: "", contact_name: "", summary: "" });
    setEventDialogPermitId(permitId);
  };

  const handleSaveEvent = async () => {
    if (!eventDialogPermitId) return;
    if (!eventForm.summary.trim()) { toast.error("A short summary of the call/update is required"); return; }
    setSaving(true);
    try {
      await createPermitEvent({
        permit_id: eventDialogPermitId,
        event_type: eventForm.event_type,
        event_date: eventForm.event_date,
        reference_number: eventForm.reference_number.trim() || undefined,
        contact_name: eventForm.contact_name.trim() || undefined,
        summary: eventForm.summary.trim(),
        created_by: currentUser?.id ? String(currentUser.id) : undefined,
      });
      toast.success("Logged");
      setEventDialogPermitId(null);
      loadEvents(eventDialogPermitId);
    } catch (error: any) {
      toast.error(error?.message || "Failed to log update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-[12px]">
        {[1, 2].map((i) => (
          <div key={i} className="h-[64px] bg-card border border-border rounded-[12px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-[16px]">
      <div className="flex items-center justify-between">
        <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
          {permits.length} permit{permits.length !== 1 ? "s" : ""} · every call and reference number is kept, permanently
        </p>
        {canManage && (
          <button
            onClick={openAddPermit}
            className="flex items-center gap-[6px] px-[12px] py-[6px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors font-['Roboto_Mono'] text-[11px]"
          >
            <Plus className="w-3 h-3" />
            Add Permit
          </button>
        )}
      </div>

      {permits.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-[12px] p-[48px] text-center">
          <ScrollText className="w-8 h-8 text-muted-foreground mx-auto mb-[12px]" />
          <p className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[4px]">No permits tracked yet</p>
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[16px]">
            Track every permit this project needs -- building, electrical, plumbing, and more -- along with every city call and reference number.
          </p>
          {canManage && (
            <button
              onClick={openAddPermit}
              className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px]"
            >
              Add First Permit
            </button>
          )}
        </div>
      )}

      {permits.map((permit) => {
        const isExpanded = expanded.has(permit.id);
        const permitEvents = events[permit.id] ?? [];
        const isLoadingEvents = eventsLoading.has(permit.id);

        return (
          <div key={permit.id} className="bg-card border border-border rounded-[12px] overflow-hidden transition-shadow hover:shadow-sm">
            <div
              className="flex items-center gap-[12px] p-[16px] cursor-pointer select-none"
              onClick={() => toggleExpand(permit.id)}
            >
              <div className="shrink-0 text-muted-foreground">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[8px] flex-wrap">
                  <h4 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground">{permit.permit_type}</h4>
                  <span className={`px-[8px] py-[2px] rounded-full text-[9px] font-['Roboto_Mono'] border ${statusColor(permit.status)}`}>
                    {permit.status}
                  </span>
                  {permit.permit_number && (
                    <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                      # {permit.permit_number}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-[12px] mt-[4px] flex-wrap">
                  {permit.applied_date && (
                    <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground flex items-center gap-[4px]">
                      <Calendar className="w-3 h-3" /> Applied {formatDate(permit.applied_date)}
                    </span>
                  )}
                  {permit.issued_date && (
                    <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">Issued {formatDate(permit.issued_date)}</span>
                  )}
                  {permit.expiry_date && (
                    <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">Expires {formatDate(permit.expiry_date)}</span>
                  )}
                </div>
              </div>
              {canManage && (
                <div className="flex items-center gap-[4px] shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEditPermit(permit)} className="p-[6px] hover:bg-accent/10 rounded-[4px] transition-colors" title="Edit permit">
                    <Edit2 className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                  </button>
                  {isManagerOrAdmin && (
                    <button onClick={() => setDeletePermitId(permit.id)} className="p-[6px] hover:bg-destructive/10 rounded-[4px] transition-colors" title="Delete permit">
                      <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-border px-[16px] py-[16px] space-y-[12px]">
                {permit.notes && (
                  <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground italic">"{permit.notes}"</p>
                )}
                <div className="flex items-center justify-between">
                  <h5 className="font-['Roboto_Mono'] font-bold text-[10px] text-muted-foreground uppercase tracking-wider">
                    History ({permitEvents.length})
                  </h5>
                  {canManage && (
                    <button
                      onClick={() => openAddEvent(permit.id)}
                      className="flex items-center gap-[4px] px-[8px] py-[3px] bg-secondary rounded-[6px] hover:bg-secondary/70 transition-colors font-['Roboto_Mono'] text-[9px]"
                    >
                      <Plus className="w-3 h-3" /> Log Call / Update
                    </button>
                  )}
                </div>

                {isLoadingEvents ? (
                  <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">Loading…</p>
                ) : permitEvents.length === 0 ? (
                  <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
                    No calls or updates logged yet{canManage ? " -- log the first one above." : "."}
                  </p>
                ) : (
                  <div className="space-y-[8px]">
                    {permitEvents.map((event) => {
                      const Icon = eventIcon(event.event_type);
                      return (
                        <div key={event.id} className="flex items-start gap-[8px] text-[10px] bg-secondary/20 border border-border rounded-[8px] p-[10px]">
                          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-[1px]" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-[8px] flex-wrap">
                              <span className="font-['Roboto_Mono'] font-bold text-[10px] text-foreground">{event.event_type}</span>
                              <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">{formatDate(event.event_date)}</span>
                              {event.reference_number && (
                                <span className="font-['Roboto_Mono'] text-[9px] text-accent">Ref: {event.reference_number}</span>
                              )}
                              {event.contact_name && (
                                <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">with {event.contact_name}</span>
                              )}
                            </div>
                            <p className="font-['Roboto_Mono'] text-[10px] text-foreground mt-[4px]">{event.summary}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Add/Edit Permit Dialog */}
      <Dialog open={permitDialogOpen} onOpenChange={setPermitDialogOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">
              {editingPermit ? "Edit Permit" : "Add Permit"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-[12px] py-[4px]">
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Permit Type *</Label>
              <Input
                list="permit-type-presets"
                value={permitForm.permit_type}
                onChange={(e) => setPermitForm((f) => ({ ...f, permit_type: e.target.value }))}
                placeholder="e.g. Building"
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
              />
              <datalist id="permit-type-presets">
                {PERMIT_TYPE_PRESETS.map((t) => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Status</Label>
              <Select value={permitForm.status} onValueChange={(v) => setPermitForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERMIT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="font-['Roboto_Mono'] text-[11px]">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Permit Number</Label>
              <Input
                value={permitForm.permit_number}
                onChange={(e) => setPermitForm((f) => ({ ...f, permit_number: e.target.value }))}
                placeholder="Once issued by the city"
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
              />
            </div>
            <div className="grid grid-cols-3 gap-[8px]">
              <div>
                <Label className="font-['Roboto_Mono'] text-[11px]">Applied</Label>
                <Input type="date" value={permitForm.applied_date}
                  onChange={(e) => setPermitForm((f) => ({ ...f, applied_date: e.target.value }))}
                  className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
              </div>
              <div>
                <Label className="font-['Roboto_Mono'] text-[11px]">Issued</Label>
                <Input type="date" value={permitForm.issued_date}
                  onChange={(e) => setPermitForm((f) => ({ ...f, issued_date: e.target.value }))}
                  className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
              </div>
              <div>
                <Label className="font-['Roboto_Mono'] text-[11px]">Expires</Label>
                <Input type="date" value={permitForm.expiry_date}
                  onChange={(e) => setPermitForm((f) => ({ ...f, expiry_date: e.target.value }))}
                  className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
              </div>
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Notes</Label>
              <Textarea
                value={permitForm.notes}
                onChange={(e) => setPermitForm((f) => ({ ...f, notes: e.target.value }))}
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setPermitDialogOpen(false)} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] hover:bg-accent/10">Cancel</button>
            <button onClick={handleSavePermit} disabled={saving} className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Saving…" : editingPermit ? "Save Changes" : "Add Permit"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Call/Update Dialog */}
      <Dialog open={!!eventDialogPermitId} onOpenChange={(open) => { if (!open) setEventDialogPermitId(null); }}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">Log Call / Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-[12px] py-[4px]">
            <div className="grid grid-cols-2 gap-[8px]">
              <div>
                <Label className="font-['Roboto_Mono'] text-[11px]">Type</Label>
                <Select value={eventForm.event_type} onValueChange={(v) => setEventForm((f) => ({ ...f, event_type: v }))}>
                  <SelectTrigger className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERMIT_EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="font-['Roboto_Mono'] text-[11px]">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="font-['Roboto_Mono'] text-[11px]">Date</Label>
                <Input type="date" value={eventForm.event_date}
                  onChange={(e) => setEventForm((f) => ({ ...f, event_date: e.target.value }))}
                  className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
              </div>
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">City Reference Number</Label>
              <Input
                value={eventForm.reference_number}
                onChange={(e) => setEventForm((f) => ({ ...f, reference_number: e.target.value }))}
                placeholder="Whatever number they gave you for this call/request"
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
              />
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Who You Spoke To</Label>
              <Input
                value={eventForm.contact_name}
                onChange={(e) => setEventForm((f) => ({ ...f, contact_name: e.target.value }))}
                placeholder="Optional"
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
              />
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Summary *</Label>
              <Textarea
                value={eventForm.summary}
                onChange={(e) => setEventForm((f) => ({ ...f, summary: e.target.value }))}
                placeholder="What was said or requested"
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setEventDialogPermitId(null)} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] hover:bg-accent/10">Cancel</button>
            <button onClick={handleSaveEvent} disabled={saving} className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Saving…" : "Log It"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Permit Confirm */}
      <Dialog open={!!deletePermitId} onOpenChange={() => setDeletePermitId(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">Delete Permit?</DialogTitle>
          </DialogHeader>
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
            This also deletes its entire call/update history. This cannot be undone.
          </p>
          <DialogFooter>
            <button onClick={() => setDeletePermitId(null)} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
            <button onClick={() => deletePermitId && handleDeletePermit(deletePermitId)} disabled={saving}
              className="px-[14px] py-[7px] bg-destructive text-destructive-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Deleting…" : "Delete Permit"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
