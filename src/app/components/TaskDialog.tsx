import { useState, useEffect } from "react";
import { X, Save, Copy, Bookmark, Tag as TagIcon, Calendar as CalendarIcon, User, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useApp, type Task } from "./AppContext";
import { useAuth } from "./AuthContext";
import { canEditTask } from "../src/features/tasks/permissions";
import { toast } from "sonner";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  task?: Task;
  mode: "add" | "edit";
  onSave?: (taskData: any) => void;
  defaultStatus?: Task["status"];
}

export default function TaskDialog({
  open,
  onOpenChange,
  projectId,
  task,
  mode,
  onSave,
  defaultStatus,
}: TaskDialogProps) {
  const { teamMembers, addTask, updateTask, taskTemplates, saveTaskTemplate, getProject } = useApp();
  const { hasPermission, currentUser } = useAuth();

  // Check if user is Manager/Admin
  const isManagerOrAdmin = hasPermission("canEditProjects");
  const canApproveQC = hasPermission("canApproveTaskQC");

  // Editing an existing task the current user doesn't own (and isn't a
  // manager/admin) should be view-only — mirrors the tasks_update RLS policy.
  const isReadOnly =
    mode === "edit" &&
    !canEditTask({ task, currentUserId: currentUser?.id, isManagerOrAdmin, teamMembers });

  // Get project to access phases
  const project = getProject(projectId);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "To Do" as const,
    priority: "Medium" as const,
    assignee: "unassigned",
    dueDate: "",
    startDate: "",
    tags: "",
    phase: "",
    task_type: "Administrative",
  });

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "To Do",
        priority: task.priority || "Medium",
        assignee: task.assignee && task.assignee !== "" ? task.assignee.toString() : "unassigned",
        dueDate: task.dueDate || "",
        startDate: (task as any).start_date || "",
        tags: (task.tags || []).join(", "),
        phase: task.phase || "",
        task_type: (task as any).task_type || "Administrative",
      });
    } else {
      setFormData({
        title: "",
        description: "",
        status: defaultStatus || "To Do",
        priority: "Medium",
        assignee: "unassigned",
        dueDate: "",
        startDate: "",
        tags: "",
        phase: "",
        task_type: "Administrative",
      });
    }
  }, [task, open, defaultStatus]);

  const handleLoadTemplate = (templateId: string) => {
    const template = taskTemplates.find((t) => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        title: template.title,
        description: template.description,
        priority: template.priority,
        tags: template.tags.join(", "),
      });
      setSelectedTemplate(templateId);
      toast.success(`Template "${template.name}" loaded`);
    }
  };

  const handleSave = async () => {
    if (isReadOnly) {
      toast.error("You can only update tasks assigned to you");
      return;
    }
    if (!formData.title.trim()) {
      toast.error("Task title is required");
      return;
    }

    const taskData = {
      projectId,
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      assignee_id: formData.assignee === "unassigned" ? "" : formData.assignee,
      dueDate: formData.dueDate,
      start_date: formData.startDate || undefined,
      tags: formData.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      phase: formData.phase === "no-phase" ? "" : formData.phase,
      task_type: formData.task_type,
    };

    try {
      if (mode === "edit" && task) {
        console.log('💾 Saving task update with data:', taskData);
        await updateTask(task.id, taskData);
        toast.success("Task updated successfully");
      } else {
        console.log('💾 Creating new task with data:', taskData);
        await addTask(taskData);
        toast.success("Task created successfully");
      }

      // Save as template if requested
      if (saveAsTemplate && templateName.trim()) {
        saveTaskTemplate({
          name: templateName,
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          tags: formData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
        });
        toast.success(`Template "${templateName}" saved`);
      }

      if (onSave) {
        onSave(taskData);
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error("Failed to save task. Please try again.");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      status: "To Do",
      priority: "Medium",
      assignee: "unassigned",
      dueDate: "",
      startDate: "",
      tags: "",
      phase: "",
      task_type: "Administrative",
    });
    setSaveAsTemplate(false);
    setTemplateName("");
    setSelectedTemplate("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[14px]">
            {mode === "edit" ? "Edit Task" : "Create New Task"}
          </DialogTitle>
          <DialogDescription className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
            {mode === "edit" 
              ? "Update task details and progress. Changes will be saved immediately." 
              : "Fill in the task details below. You can save this as a template for future use."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[16px] mt-[16px]">
          {isReadOnly && (
            <div className="p-[10px] bg-warning/10 border border-warning/20 rounded-[8px] flex items-center gap-[8px]">
              <AlertCircle className="w-3.5 h-3.5 text-warning shrink-0" />
              <p className="font-['Roboto_Mono'] text-[10px] text-warning">
                This task is assigned to someone else — you can view it but not make changes.
              </p>
            </div>
          )}
          <fieldset disabled={isReadOnly} className="contents">
          {/* Template Selection */}
          {mode === "add" && taskTemplates.length > 0 && (
            <div className="p-[12px] bg-accent/5 rounded-[8px] border border-accent/20">
              <Label className="text-[10px] mb-[8px] flex items-center gap-[4px]">
                <Bookmark className="w-3 h-3" />
                Load from Template
              </Label>
              <Select value={selectedTemplate} onValueChange={handleLoadTemplate}>
                <SelectTrigger className="text-[10px]">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {taskTemplates.map((template) => (
                    <SelectItem
                      key={template.id}
                      value={template.id}
                      className="text-[10px]"
                    >
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Task Title */}
          <div>
            <Label htmlFor="title" className="text-[10px]">
              Task Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              className="mt-[8px] text-[11px]"
            />
          </div>

          {/* Task Description */}
          <div>
            <Label htmlFor="description" className="text-[10px]">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter task description"
              className="mt-[8px] text-[11px]"
              rows={4}
            />
          </div>

          {/* Timing -- when this task was actually started/submitted/
              completed, total time spent, and whether it landed on time. */}
          {task && (task.startedAt || task.submittedAt || task.completedDate) && (
            <div className="p-[16px] bg-secondary/20 border border-border rounded-[8px] space-y-[6px]">
              <p className="font-['Roboto_Mono'] font-bold text-[10px] text-muted-foreground uppercase tracking-wide">
                Timing
              </p>
              <div className="grid grid-cols-2 gap-[8px] font-['Roboto_Mono'] text-[11px]">
                {task.startedAt && (
                  <p className="text-muted-foreground">Started: <span className="text-foreground">{new Date(task.startedAt).toLocaleString()}</span></p>
                )}
                {task.submittedAt && (
                  <p className="text-muted-foreground">Submitted: <span className="text-foreground">{new Date(task.submittedAt).toLocaleString()}</span></p>
                )}
                {task.completedDate && (
                  <p className="text-muted-foreground">Completed: <span className="text-foreground">{new Date(task.completedDate).toLocaleString()}</span></p>
                )}
                {task.startedAt && task.completedDate && (
                  <p className="text-muted-foreground">
                    Total time: <span className="text-foreground">
                      {(() => {
                        const ms = new Date(task.completedDate).getTime() - new Date(task.startedAt).getTime();
                        const hours = ms / 3600000;
                        return hours < 24 ? `${hours.toFixed(1)}h` : `${(hours / 24).toFixed(1)}d`;
                      })()}
                    </span>
                  </p>
                )}
              </div>
              {task.completedDate && task.dueDate && (
                <span className={`inline-block px-[8px] py-[2px] rounded-full text-[9px] font-['Roboto_Mono'] font-medium ${
                  new Date(task.completedDate) <= new Date(task.dueDate)
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {new Date(task.completedDate) <= new Date(task.dueDate) ? "Completed on time" : "Completed late"}
                </span>
              )}
            </div>
          )}

          {/* QC Review Feedback - Show when task has been sent back for revision */}
          {task && task.reviewFeedback && task.status !== "Completed" && (
            <div style={{ 
              padding: '16px', 
              backgroundColor: 'rgba(239, 68, 68, 0.05)', 
              border: '1px solid rgba(239, 68, 68, 0.2)', 
              borderRadius: '8px' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--destructive)' }} />
                <Label style={{ 
                  fontFamily: 'var(--font-family-mono)', 
                  fontSize: '11px', 
                  fontWeight: 'var(--font-weight-bold)', 
                  color: 'var(--destructive)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  margin: 0
                }}>
                  QC Review Feedback - Revision Required
                </Label>
              </div>
              <p style={{ 
                fontFamily: 'var(--font-family-mono)', 
                fontSize: '12px', 
                color: 'var(--color-text-primary)',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                margin: 0
              }}>
                {task.reviewFeedback}
              </p>
              <p style={{ 
                fontFamily: 'var(--font-family-mono)', 
                fontSize: '10px', 
                color: 'var(--color-text-secondary)',
                marginTop: '12px',
                margin: 0
              }}>
                💡 Please address the feedback above and mark as "Pending QC" when complete
              </p>
            </div>
          )}

          {/* Task Type */}
          <div>
            <Label htmlFor="task_type" className="text-[10px]">Task Type</Label>
            <Select value={formData.task_type} onValueChange={v => setFormData({ ...formData, task_type: v })}>
              <SelectTrigger className="mt-[8px] text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Administrative","Client Communication","Planning","Procurement","Site Work","Trade Work","Inspection","Quality Control","Corrective Work","Handover"].map(t => (
                  <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status and Priority */}
          <div className="grid grid-cols-2 gap-[16px]">
            <div>
              <Label htmlFor="status" className="text-[10px]">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(value: any) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger className="mt-[8px] text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="To Do" className="text-[10px]">
                    <span className="flex items-center gap-[8px]">
                      <span className="w-2 h-2 rounded-full bg-muted"></span>
                      To Do
                    </span>
                  </SelectItem>
                  <SelectItem value="In Progress" className="text-[10px]">
                    <span className="flex items-center gap-[8px]">
                      <span className="w-2 h-2 rounded-full bg-primary"></span>
                      In Progress
                    </span>
                  </SelectItem>
                  <SelectItem value="Under Review" className="text-[10px]" disabled={!canApproveQC}>
                    <span className="flex items-center gap-[8px]">
                      <span className="w-2 h-2 rounded-full bg-warning"></span>
                      Under Review{!canApproveQC ? " (supervisor only)" : ""}
                    </span>
                  </SelectItem>
                  <SelectItem value="Pending QC" className="text-[10px]">
                    <span className="flex items-center gap-[8px]">
                      <span className="w-2 h-2 rounded-full bg-accent"></span>
                      Pending QC
                    </span>
                  </SelectItem>
                  <SelectItem value="Completed" className="text-[10px]" disabled={!canApproveQC}>
                    <span className="flex items-center gap-[8px]">
                      <span className="w-2 h-2 rounded-full bg-success"></span>
                      Completed{!canApproveQC ? " (QC only)" : ""}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[9px] text-muted-foreground mt-[4px]">
                💡 Mark "Pending QC" once your work is done — only QC-capable roles can approve it to Completed
              </p>
            </div>

            <div>
              <Label htmlFor="priority" className="text-[10px]">
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="mt-[8px] text-[10px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low" className="text-[10px]">
                    <span className="flex items-center gap-[8px]">
                      <AlertCircle className="w-3 h-3 text-muted-foreground" />
                      Low
                    </span>
                  </SelectItem>
                  <SelectItem value="Medium" className="text-[10px]">
                    <span className="flex items-center gap-[8px]">
                      <AlertCircle className="w-3 h-3 text-primary" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="High" className="text-[10px]">
                    <span className="flex items-center gap-[8px]">
                      <AlertCircle className="w-3 h-3 text-warning" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="Urgent" className="text-[10px]">
                    <span className="flex items-center gap-[8px]">
                      <AlertCircle className="w-3 h-3 text-destructive" />
                      Urgent
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Phase Selection */}
          {project && project.phases && project.phases.length > 0 && (
            <div>
              <Label htmlFor="phase" className="text-[10px]">
                Project Phase
              </Label>
              <Select
                value={formData.phase}
                onValueChange={(value) => setFormData({ ...formData, phase: value })}
              >
                <SelectTrigger className="mt-[8px] text-[10px]">
                  <SelectValue placeholder="Select phase (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-phase" className="text-[10px]">
                    No Phase
                  </SelectItem>
                  {project.phases.map((phase, index) => (
                    <SelectItem key={index} value={phase.name} className="text-[10px]">
                      {phase.name} ({phase.days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Assignee and Due Date */}
          <div className="grid grid-cols-2 gap-[16px]">
            <div>
              <Label htmlFor="assignee" className="text-[10px] flex items-center gap-[4px]">
                <User className="w-3 h-3" />
                Assignee
              </Label>
              <Select
                value={formData.assignee}
                onValueChange={(value) => setFormData({ ...formData, assignee: value })}
              >
                <SelectTrigger className="mt-[8px] text-[10px]">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" className="text-[10px]">
                    Unassigned
                  </SelectItem>
                  {teamMembers
                    .filter((member) => member.active)
                    .map((member) => (
                      <SelectItem key={member.id} value={member.id.toString()} className="text-[10px]">
                        {member.name} - {member.role}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate" className="text-[10px] flex items-center gap-[4px]">
                <CalendarIcon className="w-3 h-3" />
                Due Date
              </Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="mt-[8px] text-[10px]"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags" className="text-[10px] flex items-center gap-[4px]">
              <TagIcon className="w-3 h-3" />
              Tags (comma separated)
            </Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., urgent, client-facing, review"
              className="mt-[8px] text-[11px]"
            />
          </div>

          {/* Save as Template */}
          {mode === "add" && (
            <div className="p-[12px] bg-secondary/50 rounded-[8px] border border-border">
              <div className="flex items-center gap-[8px] mb-[8px]">
                <input
                  type="checkbox"
                  id="saveAsTemplate"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="saveAsTemplate" className="text-[10px] cursor-pointer">
                  Save as template for future use
                </Label>
              </div>
              {saveAsTemplate && (
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Template name (e.g., 'Electrical Inspection')"
                  className="text-[10px]"
                />
              )}
            </div>
          )}
          </fieldset>

          {/* Actions */}
          <div className="flex gap-[12px] pt-[16px] border-t border-border">
            <button
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              className="flex-1 px-[16px] py-[10px] bg-secondary text-secondary-foreground rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-medium text-[11px]"
            >
              {isReadOnly ? "Close" : "Cancel"}
            </button>
            {!isReadOnly && (
              <button
                onClick={handleSave}
                className="flex-1 px-[16px] py-[10px] bg-accent text-accent-foreground rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-medium text-[11px] flex items-center justify-center gap-[8px]"
              >
                <Save className="w-4 h-4" />
                {mode === "edit" ? "Update Task" : "Create Task"}
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}