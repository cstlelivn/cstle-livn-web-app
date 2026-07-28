import { useState, useEffect, useCallback } from "react";
import {
  ChevronDown, ChevronRight, Plus, Edit2, Trash2, ArrowUp, ArrowDown,
  LayoutTemplate, Archive, ArchiveRestore,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import {
  listAllProjectTemplates,
  createProjectTemplate,
  updateProjectTemplate,
  archiveProjectTemplate,
  createPhaseTemplate,
  updatePhaseTemplate,
  deletePhaseTemplate,
  reorderPhaseTemplates,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  reorderTaskTemplates,
} from "../src/features/projectTemplates/api";

const TASK_TYPES = [
  "Administrative", "Client Communication", "Planning", "Procurement",
  "Site Work", "Trade Work", "Inspection", "Quality Control", "Corrective Work", "Handover",
];
const PRIORITIES = ["Low", "Medium", "High", "Urgent"];

type ProjectTemplate = any;
type PhaseTemplate = any;
type TaskTemplateRow = any;

export default function TemplateBuilder() {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Dialog state
  const [templateDialog, setTemplateDialog] = useState<{ mode: "add" | "edit"; template?: ProjectTemplate } | null>(null);
  const [phaseDialog, setPhaseDialog] = useState<{ mode: "add" | "edit"; templateId: string; phase?: PhaseTemplate } | null>(null);
  const [taskDialog, setTaskDialog] = useState<{ mode: "add" | "edit"; templateId: string; phaseId: string; task?: TaskTemplateRow } | null>(null);
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<PhaseTemplate | null>(null);
  const [deleteTaskTarget, setDeleteTaskTarget] = useState<TaskTemplateRow | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listAllProjectTemplates();
      setTemplates(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleTemplate = (id: string) => {
    setExpandedTemplates((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePhase = (id: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ---- Project template actions ----
  const handleSaveTemplate = async (form: { name: string; description: string; project_type: string; default_duration_days: number }) => {
    if (!form.name.trim()) { toast.error("Template name is required"); return; }
    setSaving(true);
    try {
      if (templateDialog?.mode === "edit" && templateDialog.template) {
        await updateProjectTemplate(templateDialog.template.id, form);
        toast.success("Template updated");
      } else {
        await createProjectTemplate(form);
        toast.success("Template created");
      }
      setTemplateDialog(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async (template: ProjectTemplate) => {
    setSaving(true);
    try {
      if (template.active) {
        await archiveProjectTemplate(template.id);
        toast.success(`"${template.name}" archived`);
      } else {
        await updateProjectTemplate(template.id, { active: true } as any);
        toast.success(`"${template.name}" restored`);
      }
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update template");
    } finally {
      setSaving(false);
    }
  };

  // ---- Phase template actions ----
  const handleSavePhase = async (form: { name: string; description: string; default_duration_days: number; required: boolean }) => {
    if (!phaseDialog) return;
    if (!form.name.trim()) { toast.error("Phase name is required"); return; }
    setSaving(true);
    try {
      if (phaseDialog.mode === "edit" && phaseDialog.phase) {
        await updatePhaseTemplate(phaseDialog.phase.id, form);
        toast.success("Phase updated");
      } else {
        const template = templates.find((t) => t.id === phaseDialog.templateId);
        const position = template?.phase_templates?.length ?? 0;
        await createPhaseTemplate({ ...form, project_template_id: phaseDialog.templateId, position });
        toast.success("Phase added");
      }
      setPhaseDialog(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save phase");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhase = async () => {
    if (!deletePhaseTarget) return;
    setSaving(true);
    try {
      await deletePhaseTemplate(deletePhaseTarget.id);
      toast.success("Phase deleted");
      setDeletePhaseTarget(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete phase");
    } finally {
      setSaving(false);
    }
  };

  const movePhase = async (template: ProjectTemplate, phase: PhaseTemplate, direction: -1 | 1) => {
    const phases = [...(template.phase_templates ?? [])].sort((a, b) => a.position - b.position);
    const idx = phases.findIndex((p) => p.id === phase.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= phases.length) return;
    [phases[idx], phases[swapIdx]] = [phases[swapIdx], phases[idx]];
    setSaving(true);
    try {
      await reorderPhaseTemplates(phases.map((p) => p.id));
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to reorder phases");
    } finally {
      setSaving(false);
    }
  };

  // ---- Task template actions ----
  const handleSaveTask = async (form: { name: string; task_type: string; priority: string; default_duration_days: number; required: boolean }) => {
    if (!taskDialog) return;
    if (!form.name.trim()) { toast.error("Task name is required"); return; }
    setSaving(true);
    try {
      if (taskDialog.mode === "edit" && taskDialog.task) {
        await updateTaskTemplate(taskDialog.task.id, form);
        toast.success("Task updated");
      } else {
        const template = templates.find((t) => t.id === taskDialog.templateId);
        const phase = template?.phase_templates?.find((p: any) => p.id === taskDialog.phaseId);
        const position = phase?.task_templates?.length ?? 0;
        await createTaskTemplate({
          ...form,
          phase_template_id: taskDialog.phaseId,
          project_template_id: taskDialog.templateId,
          position,
        });
        toast.success("Task added");
      }
      setTaskDialog(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTaskTarget) return;
    setSaving(true);
    try {
      await deleteTaskTemplate(deleteTaskTarget.id);
      toast.success("Task deleted");
      setDeleteTaskTarget(null);
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete task");
    } finally {
      setSaving(false);
    }
  };

  const moveTask = async (phase: PhaseTemplate, task: TaskTemplateRow, direction: -1 | 1) => {
    const tasks = [...(phase.task_templates ?? [])].sort((a: any, b: any) => a.position - b.position);
    const idx = tasks.findIndex((t) => t.id === task.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= tasks.length) return;
    [tasks[idx], tasks[swapIdx]] = [tasks[swapIdx], tasks[idx]];
    setSaving(true);
    try {
      await reorderTaskTemplates(tasks.map((t: any) => t.id));
      refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to reorder tasks");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-[24px] space-y-[12px]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[80px] bg-card border border-border rounded-[12px] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-[24px] space-y-[16px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-['Roboto_Mono'] font-bold text-[16px] text-foreground flex items-center gap-[8px]">
            <LayoutTemplate className="w-4 h-4" />
            Project Templates
          </h2>
          <p className="font-['Roboto_Mono'] text-[11px] text-muted-foreground mt-[4px]">
            Build the phases and tasks that get copied into a new project when someone picks this template.
          </p>
        </div>
        <button
          onClick={() => setTemplateDialog({ mode: "add" })}
          className="flex items-center gap-[6px] px-[14px] py-[8px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors font-['Roboto_Mono'] text-[11px]"
        >
          <Plus className="w-3.5 h-3.5" />
          New Template
        </button>
      </div>

      {templates.length === 0 && (
        <div className="bg-card border border-dashed border-border rounded-[12px] p-[48px] text-center">
          <p className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground mb-[4px]">No templates yet</p>
          <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
            Create your first project template to get started.
          </p>
        </div>
      )}

      {templates.map((template) => {
        const isExpanded = expandedTemplates.has(template.id);
        const phases = [...(template.phase_templates ?? [])].sort((a: any, b: any) => a.position - b.position);
        return (
          <div key={template.id} className={`bg-card border border-border rounded-[12px] overflow-hidden ${!template.active ? "opacity-60" : ""}`}>
            <div
              className="flex items-center gap-[12px] p-[16px] cursor-pointer select-none"
              onClick={() => toggleTemplate(template.id)}
            >
              <div className="shrink-0 text-muted-foreground">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-[8px] flex-wrap">
                  <h4 className="font-['Roboto_Mono'] font-bold text-[12px] text-foreground">{template.name}</h4>
                  {template.project_type && (
                    <span className="px-[8px] py-[2px] rounded-full text-[9px] font-['Roboto_Mono'] bg-muted/20 text-muted-foreground">
                      {template.project_type}
                    </span>
                  )}
                  {!template.active && (
                    <span className="px-[8px] py-[2px] rounded-full text-[9px] font-['Roboto_Mono'] bg-warning/10 text-warning border border-warning/20">
                      Archived
                    </span>
                  )}
                  <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                    {phases.length} phase{phases.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {template.description && (
                  <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground mt-[2px] truncate">{template.description}</p>
                )}
              </div>
              <div className="flex items-center gap-[4px] shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setTemplateDialog({ mode: "edit", template })}
                  className="p-[6px] hover:bg-accent/10 rounded-[4px] transition-colors"
                  title="Edit template"
                >
                  <Edit2 className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleToggleArchive(template)}
                  className="p-[6px] hover:bg-accent/10 rounded-[4px] transition-colors"
                  title={template.active ? "Archive template" : "Restore template"}
                >
                  {template.active
                    ? <Archive className="w-3 h-3 text-muted-foreground" />
                    : <ArchiveRestore className="w-3 h-3 text-muted-foreground" />}
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border px-[16px] py-[16px] space-y-[10px]">
                {phases.map((phase: any, phaseIdx: number) => {
                  const isPhaseExpanded = expandedPhases.has(phase.id);
                  const tasks = [...(phase.task_templates ?? [])].sort((a: any, b: any) => a.position - b.position);
                  return (
                    <div key={phase.id} className="border border-border rounded-[8px] overflow-hidden">
                      <div
                        className="flex items-center gap-[10px] p-[10px] bg-secondary/30 cursor-pointer select-none"
                        onClick={() => togglePhase(phase.id)}
                      >
                        <div className="shrink-0 text-muted-foreground">
                          {isPhaseExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-[8px] flex-wrap">
                          <span className="font-['Roboto_Mono'] font-bold text-[11px] text-foreground">
                            {phaseIdx + 1}. {phase.name}
                          </span>
                          {phase.required && (
                            <span className="px-[6px] py-[1px] rounded-full text-[8px] font-['Roboto_Mono'] bg-accent/10 text-accent">required</span>
                          )}
                          <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">
                            {tasks.length} task{tasks.length !== 1 ? "s" : ""} · {phase.default_duration_days ?? 0}d
                          </span>
                        </div>
                        <div className="flex items-center gap-[2px] shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => movePhase(template, phase, -1)} disabled={phaseIdx === 0} className="p-[4px] hover:bg-accent/10 rounded-[4px] disabled:opacity-30">
                            <ArrowUp className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <button onClick={() => movePhase(template, phase, 1)} disabled={phaseIdx === phases.length - 1} className="p-[4px] hover:bg-accent/10 rounded-[4px] disabled:opacity-30">
                            <ArrowDown className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <button onClick={() => setPhaseDialog({ mode: "edit", templateId: template.id, phase })} className="p-[4px] hover:bg-accent/10 rounded-[4px]">
                            <Edit2 className="w-3 h-3 text-muted-foreground" />
                          </button>
                          <button onClick={() => setDeletePhaseTarget(phase)} className="p-[4px] hover:bg-destructive/10 rounded-[4px]">
                            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </div>

                      {isPhaseExpanded && (
                        <div className="p-[10px] space-y-[6px]">
                          {tasks.map((task: any, taskIdx: number) => (
                            <div key={task.id} className="flex items-center gap-[8px] text-[10px] pl-[20px]">
                              <span className="font-['Roboto_Mono'] text-foreground flex-1 truncate">{task.name}</span>
                              <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground bg-secondary px-[6px] py-[1px] rounded">{task.task_type}</span>
                              <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground">{task.priority}</span>
                              {!task.required && (
                                <span className="font-['Roboto_Mono'] text-[9px] text-muted-foreground italic">optional</span>
                              )}
                              <div className="flex items-center gap-[2px]">
                                <button onClick={() => moveTask(phase, task, -1)} disabled={taskIdx === 0} className="p-[3px] hover:bg-accent/10 rounded-[4px] disabled:opacity-30">
                                  <ArrowUp className="w-2.5 h-2.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => moveTask(phase, task, 1)} disabled={taskIdx === tasks.length - 1} className="p-[3px] hover:bg-accent/10 rounded-[4px] disabled:opacity-30">
                                  <ArrowDown className="w-2.5 h-2.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => setTaskDialog({ mode: "edit", templateId: template.id, phaseId: phase.id, task })} className="p-[3px] hover:bg-accent/10 rounded-[4px]">
                                  <Edit2 className="w-2.5 h-2.5 text-muted-foreground" />
                                </button>
                                <button onClick={() => setDeleteTaskTarget(task)} className="p-[3px] hover:bg-destructive/10 rounded-[4px]">
                                  <Trash2 className="w-2.5 h-2.5 text-muted-foreground hover:text-destructive" />
                                </button>
                              </div>
                            </div>
                          ))}
                          {tasks.length === 0 && (
                            <p className="font-['Roboto_Mono'] text-[10px] text-muted-foreground pl-[20px]">No tasks in this phase yet.</p>
                          )}
                          <button
                            onClick={() => setTaskDialog({ mode: "add", templateId: template.id, phaseId: phase.id })}
                            className="ml-[20px] flex items-center gap-[4px] px-[8px] py-[4px] text-[10px] font-['Roboto_Mono'] text-accent hover:bg-accent/10 rounded-[4px] transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Task
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => setPhaseDialog({ mode: "add", templateId: template.id })}
                  className="flex items-center gap-[6px] px-[10px] py-[6px] text-[11px] font-['Roboto_Mono'] text-accent hover:bg-accent/10 rounded-[6px] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Phase
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add/Edit Project Template Dialog */}
      {templateDialog && (
        <TemplateFormDialog
          mode={templateDialog.mode}
          initial={templateDialog.template}
          saving={saving}
          onCancel={() => setTemplateDialog(null)}
          onSave={handleSaveTemplate}
        />
      )}

      {/* Add/Edit Phase Template Dialog */}
      {phaseDialog && (
        <PhaseFormDialog
          mode={phaseDialog.mode}
          initial={phaseDialog.phase}
          saving={saving}
          onCancel={() => setPhaseDialog(null)}
          onSave={handleSavePhase}
        />
      )}

      {/* Add/Edit Task Template Dialog */}
      {taskDialog && (
        <TaskFormDialog
          mode={taskDialog.mode}
          initial={taskDialog.task}
          saving={saving}
          onCancel={() => setTaskDialog(null)}
          onSave={handleSaveTask}
        />
      )}

      {/* Delete Phase Confirm */}
      <Dialog open={!!deletePhaseTarget} onOpenChange={() => setDeletePhaseTarget(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">Delete Phase?</DialogTitle>
            <DialogDescription className="font-['Roboto_Mono'] text-[10px]">
              This deletes "{deletePhaseTarget?.name}" and all of its tasks from the template. Projects already created from this template are not affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeletePhaseTarget(null)} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
            <button onClick={handleDeletePhase} disabled={saving} className="px-[14px] py-[7px] bg-destructive text-destructive-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Deleting…" : "Delete Phase"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirm */}
      <Dialog open={!!deleteTaskTarget} onOpenChange={() => setDeleteTaskTarget(null)}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">Delete Task?</DialogTitle>
            <DialogDescription className="font-['Roboto_Mono'] text-[10px]">
              This removes "{deleteTaskTarget?.name}" from the template.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button onClick={() => setDeleteTaskTarget(null)} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
            <button onClick={handleDeleteTask} disabled={saving} className="px-[14px] py-[7px] bg-destructive text-destructive-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50">
              {saving ? "Deleting…" : "Delete Task"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Form dialogs
// ---------------------------------------------------------------------------

function TemplateFormDialog({ mode, initial, saving, onCancel, onSave }: {
  mode: "add" | "edit";
  initial?: any;
  saving: boolean;
  onCancel: () => void;
  onSave: (form: { name: string; description: string; project_type: string; default_duration_days: number }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [projectType, setProjectType] = useState(initial?.project_type ?? "");
  const [duration, setDuration] = useState(initial?.default_duration_days ?? 30);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">
            {mode === "edit" ? "Edit Template" : "New Project Template"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-[12px]">
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Template Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Basement Finishing"
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Project Type</Label>
            <Input value={projectType} onChange={(e) => setProjectType(e.target.value)} placeholder="e.g. Basement"
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Typical Duration (days)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
        </div>
        <DialogFooter>
          <button onClick={onCancel} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
          <button
            onClick={() => onSave({ name, description, project_type: projectType, default_duration_days: duration })}
            disabled={saving}
            className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Create Template"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PhaseFormDialog({ mode, initial, saving, onCancel, onSave }: {
  mode: "add" | "edit";
  initial?: any;
  saving: boolean;
  onCancel: () => void;
  onSave: (form: { name: string; description: string; default_duration_days: number; required: boolean }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(initial?.default_duration_days ?? 7);
  const [required, setRequired] = useState(initial?.required ?? true);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">
            {mode === "edit" ? "Edit Phase" : "Add Phase"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-[12px]">
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Phase Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Priming & Painting"
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Typical Duration (days)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-['Roboto_Mono'] text-[11px]">Required (can't be removed when creating a project)</Label>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>
        </div>
        <DialogFooter>
          <button onClick={onCancel} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
          <button
            onClick={() => onSave({ name, description, default_duration_days: duration, required })}
            disabled={saving}
            className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Add Phase"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskFormDialog({ mode, initial, saving, onCancel, onSave }: {
  mode: "add" | "edit";
  initial?: any;
  saving: boolean;
  onCancel: () => void;
  onSave: (form: { name: string; task_type: string; priority: string; default_duration_days: number; required: boolean }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [taskType, setTaskType] = useState(initial?.task_type ?? "Administrative");
  const [priority, setPriority] = useState(initial?.priority ?? "Medium");
  const [duration, setDuration] = useState(initial?.default_duration_days ?? 1);
  const [required, setRequired] = useState(initial?.required ?? true);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[13px]">
            {mode === "edit" ? "Edit Task" : "Add Task"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-[12px]">
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Task Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apply primer"
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
          <div className="grid grid-cols-2 gap-[8px]">
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Type</Label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="font-['Roboto_Mono'] text-[11px]">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="font-['Roboto_Mono'] text-[11px]">Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="font-['Roboto_Mono'] text-[11px]">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="font-['Roboto_Mono'] text-[11px]">Typical Duration (days)</Label>
            <Input type="number" min={1} value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              className="mt-[4px] font-['Roboto_Mono'] text-[11px] rounded-[6px]" />
          </div>
          <div className="flex items-center justify-between">
            <Label className="font-['Roboto_Mono'] text-[11px]">Required (must be completed for the phase to complete)</Label>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>
        </div>
        <DialogFooter>
          <button onClick={onCancel} className="px-[14px] py-[7px] border border-border rounded-[6px] font-['Roboto_Mono'] text-[11px]">Cancel</button>
          <button
            onClick={() => onSave({ name, task_type: taskType, priority, default_duration_days: duration, required })}
            disabled={saving}
            className="px-[14px] py-[7px] bg-accent text-accent-foreground rounded-[6px] font-['Roboto_Mono'] text-[11px] disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "edit" ? "Save Changes" : "Add Task"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
