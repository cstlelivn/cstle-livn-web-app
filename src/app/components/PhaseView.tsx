import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, ChevronRight, Plus, Trash2,
  AlertCircle, Package, ClipboardCheck, Search,
  MoreHorizontal, ArrowUpDown, Calendar, User,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { toast } from "sonner";
import { useApp } from "./AppContext";
import { useAuth } from "./AuthContext";
import { canEditTask } from "../src/features/tasks/permissions";
import { calculateCompletion } from "../src/lib/progress";
import TaskStatusControl from "./TaskStatusControl";
import { useProjectPhases } from "../src/features/projectPhases/useProjectPhases";
import {
  createProjectPhase,
  updateProjectPhase,
  deleteProjectPhase,
  reorderProjectPhases,
  listProjectPhases,
} from "../src/features/projectPhases/api";
import {
  submitPhaseQC,
  reviewPhaseQC,
  getPhaseQCRecord,
  checkPhaseQCReadiness,
} from "../src/features/phaseQC/api";
import {
  listProjectProcurement,
  updateProcurementItem,
} from "../src/features/procurement/api";
import { createClient } from "../utils/supabase/client.tsx";
import PhaseCompletionEmailModal from "./PhaseCompletionEmailModal";
import { getClient } from "../src/features/clients/api";

const supabase = createClient();

const PHASE_STATUSES = ["Not Started", "In Progress", "On Hold", "Completed", "Blocked"];
const QC_STATUSES = ["Not Started", "Ready for Review", "Under Review", "Approved", "Rejected", "Approved with Conditions"];

const TASK_TYPES = [
  "Administrative", "Client Communication", "Planning", "Procurement",
  "Site Work", "Trade Work", "Inspection", "Quality Control", "Corrective Work", "Handover",
];

function statusColor(s: string) {
  switch (s) {
    case "Completed": return "bg-success/10 text-success border-success/20";
    case "In Progress": return "bg-primary/10 text-primary border-primary/20";
    case "On Hold": return "bg-warning/10 text-warning border-warning/20";
    case "Blocked": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted/10 text-muted-foreground border-muted/20";
  }
}

function qcColor(s: string) {
  switch (s) {
    case "Approved": return "bg-success/10 text-success border-success/20";
    case "Approved with Conditions": return "bg-warning/10 text-warning border-warning/20";
    case "Rejected": return "bg-destructive/10 text-destructive border-destructive/20";
    case "Under Review": return "bg-primary/10 text-primary border-primary/20";
    case "Ready for Review": return "bg-accent/10 text-accent border-accent/20";
    default: return "bg-muted/10 text-muted-foreground border-muted/20";
  }
}

interface PhaseViewProps {
  projectId: number;
}

export default function PhaseView({ projectId }: PhaseViewProps) {
  const { getTasksByProject, teamMembers, getTeamMember, updateTask, getProject, updateProject } = useApp();
  const { currentUser, hasPermission } = useAuth();
  const isManagerOrAdmin = hasPermission("canEditProjects");
  const canApproveQC = hasPermission("canApproveTaskQC");
  const { phases, loading, refresh, updatePhase } = useProjectPhases(projectId);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [phaseProcurement, setPhaseProcurement] = useState<Record<string, any[]>>({});
  const [phaseQC, setPhaseQC] = useState<Record<string, any>>({});
  const [qcReadiness, setQcReadiness] = useState<Record<string, any>>({});

  // Dialogs
  const [addPhaseOpen, setAddPhaseOpen] = useState(false);
  const [deletePhaseId, setDeletePhaseId] = useState<string | null>(null);
  const [qcSubmitPhaseId, setQcSubmitPhaseId] = useState<string | null>(null);
  const [qcReviewPhaseId, setQcReviewPhaseId] = useState<string | null>(null);
  const [addPhaseForm, setAddPhaseForm] = useState({ name: "", description: "", start_date: "", end_date: "" });
  const [qcNotes, setQcNotes] = useState("");
  const [qcResult, setQcResult] = useState<string>("Approved");
  const [qcRejectionReason, setQcRejectionReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Phase-completion client/owner notification -- opened automatically right
  // after a QC approval completes a phase, and also available on demand from
  // the QC Gate section afterward (not a one-shot popup).
  const [notifyPhaseId, setNotifyPhaseId] = useState<string | null>(null);
  const [notifyClientEmail, setNotifyClientEmail] = useState<string>("");

  const allTasks = getTasksByProject(projectId);

  // Load procurement and QC data for expanded phases
  const loadPhaseDetails = useCallback(async (phaseId: string) => {
    const [proc, qc, readiness] = await Promise.all([
      listProjectProcurement(String(projectId), phaseId).catch(() => []),
      getPhaseQCRecord(phaseId).catch(() => null),
      checkPhaseQCReadiness(phaseId).catch(() => null),
    ]);
    setPhaseProcurement(prev => ({ ...prev, [phaseId]: proc }));
    setPhaseQC(prev => ({ ...prev, [phaseId]: qc }));
    setQcReadiness(prev => ({ ...prev, [phaseId]: readiness }));
  }, [projectId]);

  const togglePhase = useCallback((phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseId)) {
        next.delete(phaseId);
      } else {
        next.add(phaseId);
        loadPhaseDetails(phaseId);
      }
      return next;
    });
  }, [loadPhaseDetails]);

  const handleAddPhase = async () => {
    if (!addPhaseForm.name.trim()) { toast.error("Phase name is required"); return; }
    setSaving(true);
    try {
      await createProjectPhase({
        project_id: String(projectId),
        name: addPhaseForm.name,
        description: addPhaseForm.description,
        position: phases.length,
        start_date: addPhaseForm.start_date || undefined,
        end_date: addPhaseForm.end_date || undefined,
      });
      setAddPhaseForm({ name: "", description: "", start_date: "", end_date: "" });
      setAddPhaseOpen(false);
      toast.success("Phase added");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to add phase");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhase = async (phaseId: string) => {
    const phaseTasks = allTasks.filter((t: any) => t.phase_id === phaseId);
    if (phaseTasks.length > 0) {
      toast.error(`Move or delete the ${phaseTasks.length} task(s) in this phase before deleting it.`);
      setDeletePhaseId(null);
      return;
    }
    setSaving(true);
    try {
      await deleteProjectPhase(phaseId);
      setDeletePhaseId(null);
      toast.success("Phase deleted");
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete phase");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitQC = async (phaseId: string) => {
    if (!currentUser) return;
    const readiness = qcReadiness[phaseId];
    if (readiness && !readiness.ready) {
      toast.error("Phase is not ready for QC: " + readiness.blockers.join(", "));
      return;
    }
    setSaving(true);
    try {
      await submitPhaseQC({
        phase_id: phaseId,
        project_id: String(projectId),
        submitted_by: String(currentUser.id),
        notes: qcNotes,
      });
      setQcSubmitPhaseId(null);
      setQcNotes("");
      toast.success("Phase submitted for QC review");
      loadPhaseDetails(phaseId);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit QC");
    } finally {
      setSaving(false);
    }
  };

  const handleReviewQC = async (phaseId: string) => {
    if (!currentUser) return;
    const qcRecord = phaseQC[phaseId];
    if (!qcRecord) return;
    setSaving(true);
    try {
      await reviewPhaseQC(qcRecord.id, phaseId, {
        result: qcResult as any,
        reviewed_by: String(currentUser.id),
        notes: qcNotes,
        rejection_reason: qcResult === "Rejected" ? qcRejectionReason : undefined,
        conditions: qcResult === "Approved with Conditions" ? qcNotes : undefined,
      });
      setQcReviewPhaseId(null);
      setQcNotes("");
      setQcRejectionReason("");
      toast.success(`QC ${qcResult}`);
      loadPhaseDetails(phaseId);
      refresh();

      // Approval completes the phase -- advance the project's "current
      // phase" indicator to the next incomplete phase. Nothing did this
      // automatically before, so the Phase summary card just stayed on
      // whatever phase was current at project creation forever.
      if (qcResult === "Approved" || qcResult === "Approved with Conditions") {
        try {
          const freshPhases = await listProjectPhases(String(projectId));
          const sorted = [...freshPhases].sort((a: any, b: any) => a.position - b.position);
          const nextIncomplete = sorted.find((p: any) => p.id !== phaseId && p.status !== "Completed");
          const project = getProject(projectId);
          if (nextIncomplete && project?.phase !== nextIncomplete.name) {
            await updateProject(projectId, { phase: nextIncomplete.name });
          }
        } catch (advanceError) {
          console.error("Failed to advance current phase:", advanceError);
        }

        // Offer to notify the owner/client. Never auto-sends: this only
        // opens the editable preview.
        openNotifyModal(phaseId);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to record QC review");
    } finally {
      setSaving(false);
    }
  };

  const openNotifyModal = async (phaseId: string) => {
    setNotifyPhaseId(phaseId);
    setNotifyClientEmail("");
    const project = getProject(projectId);
    if (project?.clientId) {
      try {
        const client = await getClient(String(project.clientId));
        if (client?.email) setNotifyClientEmail(client.email);
      } catch {
        // No client email on file -- the modal still opens with an empty
        // recipient list the user can fill in manually.
      }
    }
  };

  const canReviewQC = hasPermission("canEditPhases");
  const canEditPhases = hasPermission("canEditPhases");

  if (loading) {
    return (
      <div className="space-y-[12px]">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[80px] bg-card border border-border rounded-[12px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-[16px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground">
          {phases.length} phase{phases.length !== 1 ? "s" : ""} · Tasks complete phases · Phases complete the project
        </p>
        {canEditPhases && (
          <button
            onClick={() => setAddPhaseOpen(true)}
            className="flex items-center gap-[6px] px-[12px] py-[6px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors font-['Roboto_Mono'] text-[11px]"
          >
            <Plus className="w-3 h-3" />
            Add Phase
          </button>
        )}
      </div>

      {/* Empty state */}
      {phases.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-[12px] p-[48px] text-center">
          <ClipboardCheck className="w-8 h-8 text-muted-foreground mx-auto mb-[12px]" />
          <p className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[4px]">No phases configured</p>
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mb-[16px]">
            Add phases to structure project work, track QC gates, and control completion.
          </p>
          <button
            onClick={() => setAddPhaseOpen(true)}
            className="px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px]"
          >
            Add First Phase
          </button>
        </div>
      )}

      {/* Phase list */}
      {phases.map((phase, idx) => {
        const phaseTasks = allTasks.filter((t: any) => t.phase_id === phase.id || t.phase === phase.name);
        const requiredTasks = phaseTasks.filter((t: any) => t.is_required !== false);
        const completedRequired = requiredTasks.filter((t: any) => t.status === "Completed");
        // Live from phaseTasks, not the phase.progress DB column -- that
        // column is only ever written by an explicit recalculate call, so it
        // goes stale the moment a task's status changes without one.
        const phaseProgress = calculateCompletion(phaseTasks).percent;
        const isExpanded = expandedPhases.has(phase.id);
        const procurement = phaseProcurement[phase.id] ?? [];
        const qc = phaseQC[phase.id];
        const readiness = qcReadiness[phase.id];

        return (
          <div
            key={phase.id}
            className="bg-card border border-border rounded-[12px] overflow-hidden transition-shadow hover:shadow-sm"
          >
            {/* Phase header */}
            <div
              className="flex items-center gap-[12px] p-[16px] cursor-pointer select-none"
              onClick={() => togglePhase(phase.id)}
            >
              <div className="shrink-0 text-muted-foreground">
                {isExpanded
                  ? <ChevronDown className="w-4 h-4" />
                  : <ChevronRight className="w-4 h-4" />}
              </div>

              <div className="w-[24px] h-[24px] rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <span className="font-['Roboto_Mono'] font-bold text-[10px] text-foreground">{idx + 1}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[8px] flex-wrap">
                  <h4 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground">
                    {phase.name}
                  </h4>
                  <span className={`px-[8px] py-[2px] rounded-full text-[9px] font-['Roboto_Mono'] border ${statusColor(phase.status)}`}>
                    {phase.status}
                  </span>
                  <span className={`px-[8px] py-[2px] rounded-full text-[9px] font-['Roboto_Mono'] border ${qcColor(phase.qc_status ?? 'Not Started')}`}>
                    QC: {phase.qc_status ?? 'Not Started'}
                  </span>
                </div>
                <div className="flex items-center gap-[12px] mt-[4px]">
                  {phase.start_date && (
                    <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground flex items-center gap-[4px]">
                      <Calendar className="w-3 h-3" />
                      {phase.start_date} → {phase.end_date ?? "TBD"}
                    </span>
                  )}
                  <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                    {completedRequired.length}/{requiredTasks.length} required tasks
                  </span>
                  {procurement.length > 0 && (
                    <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground flex items-center gap-[4px]">
                      <Package className="w-3 h-3" />
                      {procurement.filter((p: any) => p.status === 'Received').length}/{procurement.length} materials
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-[8px] shrink-0">
                <div className="w-[80px]">
                  <div className="flex items-center justify-between mb-[2px]">
                    <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">Progress</span>
                    <span className="font-['Roboto_Mono'] font-bold text-[9px] text-foreground">{phaseProgress}%</span>
                  </div>
                  <div className="h-[4px] bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-accent transition-all" style={{ width: `${phaseProgress}%` }} />
                  </div>
                </div>

                {canEditPhases && (
                <div className="flex items-center gap-[4px]" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setDeletePhaseId(phase.id)}
                    className="p-[6px] hover:bg-destructive/10 rounded-[4px] transition-colors"
                    title="Delete phase"
                  >
                    <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
                )}
              </div>
            </div>

            {/* Phase detail (expanded) */}
            {isExpanded && (
              <div className="border-t border-border px-[16px] py-[16px] space-y-[16px]">
                {/* Tasks summary */}
                <div>
                  <h5 className="font-['Roboto_Mono'] font-bold text-[10px] text-muted-foreground uppercase tracking-wider mb-[8px]">
                    Tasks ({phaseTasks.length})
                  </h5>
                  {phaseTasks.length === 0 ? (
                    <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">No tasks in this phase.</p>
                  ) : (
                    <div className="space-y-[6px]">
                      {phaseTasks.slice(0, 8).map((task: any) => {
                        const assignee = getTeamMember(task.assignee);
                        const taskCanEdit = canEditTask({
                          task,
                          currentUserId: currentUser?.id,
                          isManagerOrAdmin,
                          teamMembers,
                        });
                        return (
                          <div key={task.id} className="flex items-center gap-[8px] text-[10px]">
                            <span className="font-['Roboto_Mono'] text-foreground flex-1 truncate">{task.title}</span>
                            <TaskStatusControl
                              status={task.status}
                              canEdit={taskCanEdit}
                              canApproveQC={canApproveQC}
                              onChange={(status) => updateTask(task.id, { status })}
                              showLabel
                              triggerClassName="w-fit h-[20px] px-[6px] gap-[4px] border border-border bg-secondary/40 shadow-none rounded-full shrink-0 cursor-pointer hover:bg-accent/10 hover:border-accent/30 transition-colors [&>svg:last-child]:hidden"
                              iconSize="w-2.5 h-2.5"
                            />
                            {task.task_type && (
                              <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground bg-secondary px-[6px] py-[1px] rounded">{task.task_type}</span>
                            )}
                            {assignee && (
                              <span className="font-['Roboto_Mono'] text-muted-foreground">{assignee.name}</span>
                            )}
                          </div>
                        );
                      })}
                      {phaseTasks.length > 8 && (
                        <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                          +{phaseTasks.length - 8} more tasks — switch to Tasks view to see all
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Procurement summary */}
                {procurement.length > 0 && (
                  <div>
                    <h5 className="font-['Roboto_Mono'] font-bold text-[10px] text-muted-foreground uppercase tracking-wider mb-[8px]">
                      Procurement ({procurement.length})
                    </h5>
                    <div className="space-y-[4px]">
                      {procurement.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-[8px] text-[10px]">
                          <Package className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="font-['Roboto_Mono'] text-foreground flex-1 truncate">{item.item_name}</span>
                          <span className={`font-['Roboto_Mono'] text-[9px] px-[6px] py-[1px] rounded border ${
                            item.status === 'Received' ? 'bg-success/10 text-success border-success/20' :
                            item.status === 'Ordered' ? 'bg-primary/10 text-primary border-primary/20' :
                            'bg-muted/10 text-muted-foreground border-muted/20'
                          }`}>
                            {item.status}
                          </span>
                          {item.required_on_site_date && (
                            <span className="font-['Roboto_Mono'] text-muted-foreground">
                              On-site: {item.required_on_site_date}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* QC gate */}
                <div>
                  <h5 className="font-['Roboto_Mono'] font-bold text-[10px] text-muted-foreground uppercase tracking-wider mb-[8px]">
                    QC Gate
                  </h5>
                  <div className="flex items-center gap-[12px] flex-wrap">
                    <span className={`px-[10px] py-[4px] rounded-full text-[10px] font-['Roboto_Mono'] border ${qcColor(phase.qc_status ?? 'Not Started')}`}>
                      {phase.qc_status ?? 'Not Started'}
                    </span>

                    {readiness && !readiness.ready && (
                      <div className="flex items-center gap-[6px] text-[10px] text-muted-foreground">
                        <AlertCircle className="w-3 h-3 text-warning" />
                        {readiness.blockers.join(" · ")}
                      </div>
                    )}

                    {/* Submit for QC */}
                    {(phase.qc_status === 'Not Started' || phase.qc_status === 'Rejected') && (
                      <button
                        onClick={() => { setQcSubmitPhaseId(phase.id); loadPhaseDetails(phase.id); }}
                        className="px-[10px] py-[4px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-accent/90"
                      >
                        Submit for QC
                      </button>
                    )}

                    {/* Review QC (managers only) */}
                    {canReviewQC && phase.qc_status === 'Ready for Review' && (
                      <button
                        onClick={() => { setQcReviewPhaseId(phase.id); loadPhaseDetails(phase.id); }}
                        className="px-[10px] py-[4px] bg-primary text-primary-foreground rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-primary/90"
                      >
                        Review QC
                      </button>
                    )}

                    {/* Notify owner/client -- also available on demand after
                        completion, not just the one-time prompt on approval */}
                    {canEditPhases && phase.status === 'Completed' && (
                      <button
                        onClick={() => openNotifyModal(phase.id)}
                        className="px-[10px] py-[4px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[10px] hover:bg-accent/10"
                      >
                        Notify Owner/Client
                      </button>
                    )}

                    {qc?.notes && (
                      <p className="font-['Roboto_Mono'] text-[9px] text-muted-foreground italic">"{qc.notes}"</p>
                    )}
                    {qc?.rejection_reason && (
                      <p className="font-['Roboto_Mono'] text-[9px] text-destructive">Rejected: {qc.rejection_reason}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Add Phase Dialog */}
      <Dialog open={addPhaseOpen} onOpenChange={setAddPhaseOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">Add Phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-[12px] py-[4px]">
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Phase Name *</Label>
              <Input
                value={addPhaseForm.name}
                onChange={e => setAddPhaseForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Framing & Rough-In"
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
              />
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Description</Label>
              <Textarea
                value={addPhaseForm.description}
                onChange={e => setAddPhaseForm(f => ({ ...f, description: e.target.value }))}
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-[8px]">
              <div>
                <Label className="font-['Roboto_Mono'] text-[11px]">Start Date</Label>
                <Input type="date" value={addPhaseForm.start_date}
                  onChange={e => setAddPhaseForm(f => ({ ...f, start_date: e.target.value }))}
                  className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
              </div>
              <div>
                <Label className="font-['Roboto_Mono'] text-[11px]">End Date</Label>
                <Input type="date" value={addPhaseForm.end_date}
                  onChange={e => setAddPhaseForm(f => ({ ...f, end_date: e.target.value }))}
                  className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setAddPhaseOpen(false)} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px] hover:bg-accent/10">Cancel</button>
            <button onClick={handleAddPhase} disabled={saving} className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Adding…" : "Add Phase"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Phase Confirm */}
      <Dialog open={!!deletePhaseId} onOpenChange={() => setDeletePhaseId(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">Delete Phase?</DialogTitle>
            <DialogDescription className="font-['Roboto_Mono'] text-[10px]">
              Move or delete all tasks in this phase first. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeletePhaseId(null)} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
            <button onClick={() => deletePhaseId && handleDeletePhase(deletePhaseId)} disabled={saving}
              className="px-[14px] py-[7px] bg-destructive text-destructive-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Deleting…" : "Delete Phase"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit QC Dialog */}
      <Dialog open={!!qcSubmitPhaseId} onOpenChange={() => { setQcSubmitPhaseId(null); setQcNotes(""); }}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">Submit Phase for QC Review</DialogTitle>
            <DialogDescription className="font-['Roboto_Mono'] text-[10px]">
              Confirm all required tasks are complete before submitting. A reviewer will approve or reject.
            </DialogDescription>
          </DialogHeader>
          {qcSubmitPhaseId && qcReadiness[qcSubmitPhaseId] && !qcReadiness[qcSubmitPhaseId].ready && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-[6px] p-[10px]">
              <p className="font-['Roboto_Mono'] text-[10px] text-destructive font-bold mb-[4px]">Blockers:</p>
              {qcReadiness[qcSubmitPhaseId].blockers.map((b: string, i: number) => (
                <p key={i} className="font-['Roboto_Mono'] text-[10px] text-destructive">• {b}</p>
              ))}
            </div>
          )}
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Notes (optional)</Label>
            <Textarea value={qcNotes} onChange={e => setQcNotes(e.target.value)} rows={3}
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" placeholder="Any notes for the reviewer…" />
          </div>
          <DialogFooter>
            <button onClick={() => { setQcSubmitPhaseId(null); setQcNotes(""); }}
              className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
            <button onClick={() => qcSubmitPhaseId && handleSubmitQC(qcSubmitPhaseId)} disabled={saving}
              className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Submitting…" : "Submit for QC"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review QC Dialog */}
      <Dialog open={!!qcReviewPhaseId} onOpenChange={() => { setQcReviewPhaseId(null); setQcNotes(""); setQcRejectionReason(""); }}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">QC Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-[12px]">
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Result *</Label>
              <Select value={qcResult} onValueChange={setQcResult}>
                <SelectTrigger className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Approved", "Approved with Conditions", "Rejected"].map(r => (
                    <SelectItem key={r} value={r} className="font-['Roboto_Mono'] text-[11px]">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {qcResult === "Rejected" && (
              <div>
                <Label className="font-['Roboto_Mono'] text-[11px]">Rejection Reason *</Label>
                <Textarea value={qcRejectionReason} onChange={e => setQcRejectionReason(e.target.value)} rows={3}
                  className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
              </div>
            )}
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">
                {qcResult === "Approved with Conditions" ? "Conditions *" : "Notes"}
              </Label>
              <Textarea value={qcNotes} onChange={e => setQcNotes(e.target.value)} rows={3}
                className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => { setQcReviewPhaseId(null); setQcNotes(""); setQcRejectionReason(""); }}
              className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
            <button onClick={() => qcReviewPhaseId && handleReviewQC(qcReviewPhaseId)} disabled={saving}
              className="px-[14px] py-[7px] bg-primary text-primary-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Saving…" : "Record Review"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Phase-completion notification -- editable preview, never auto-sent */}
      {notifyPhaseId && (() => {
        const notifyPhase = phases.find((p) => p.id === notifyPhaseId);
        if (!notifyPhase) return null;
        const notifyIdx = phases.findIndex((p) => p.id === notifyPhaseId);
        const previousPhaseObj = notifyIdx > 0 ? phases[notifyIdx - 1] : undefined;
        const nextPhaseObj = notifyIdx >= 0 && notifyIdx < phases.length - 1 ? phases[notifyIdx + 1] : undefined;
        const notifyPhaseTasks = allTasks.filter(
          (t: any) => t.phase_id === notifyPhase.id || t.phase === notifyPhase.name
        );
        const completedTaskTitles = notifyPhaseTasks
          .filter((t: any) => t.status === "Completed")
          .map((t: any) => t.title);
        const outstandingTasks = notifyPhaseTasks.filter((t: any) => t.status !== "Completed");
        const outstandingIssues = outstandingTasks.length > 0
          ? outstandingTasks.map((t: any) => t.title).join(", ")
          : "";
        const project = getProject(projectId);

        return (
          <PhaseCompletionEmailModal
            open={!!notifyPhaseId}
            onOpenChange={(open) => { if (!open) setNotifyPhaseId(null); }}
            projectName={project?.title ?? ""}
            projectLocation={project?.location}
            phaseName={notifyPhase.name}
            previousPhase={previousPhaseObj?.name}
            nextPhaseName={nextPhaseObj?.name}
            completedTaskTitles={completedTaskTitles}
            outstandingIssues={outstandingIssues}
            clientEmail={notifyClientEmail}
            projectId={projectId}
            currentUserId={currentUser?.id ? String(currentUser.id) : undefined}
          />
        );
      })()}
    </div>
  );
}
