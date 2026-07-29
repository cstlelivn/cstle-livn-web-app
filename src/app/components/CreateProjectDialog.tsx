import { useState, useEffect } from "react";
import { Plus, X, GripVertical, ChevronDown, ChevronRight, CheckSquare, Square, Layers, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { toast } from "sonner";
import { useApp, type PhaseWithDuration } from "./AppContext";
import { useAuth } from "./AuthContext";
import { fetchPhaseTemplates, type PhaseTemplate, savePhaseTemplateToServer, updatePhaseTemplateOnServer } from "./PhaseTemplateManager";
import svgPaths from "../imports/svg-irwlcgai14";
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { listProjectTemplates, applyTemplateToProject } from "../src/features/projectTemplates/api";
import { createProject } from "../src/features/projects/api";

interface CreateProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (data: any) => void;
  canViewFinance: boolean;
}

// Project template types (from DB)
interface TaskTemplate {
  id: string;
  name: string;
  task_type: string;
  default_duration_days: number;
  required: boolean;
}

interface PhaseTemplateRow {
  id: string;
  name: string;
  description?: string;
  default_duration_days: number;
  required: boolean;
  position: number;
  task_templates: TaskTemplate[];
}

// Draggable Phase Row Component
interface PhaseRowProps {
  phase: PhaseWithDuration;
  index: number;
  totalDays: number;
  onUpdatePhase: (index: number, name: string, days: number) => void;
  onRemovePhase: (index: number) => void;
  onMovePhase: (fromIndex: number, toIndex: number) => void;
}

const PHASE_ROW_TYPE = 'PHASE_ROW';

function PhaseRow({ phase, index, totalDays, onUpdatePhase, onRemovePhase, onMovePhase }: PhaseRowProps) {
  const [{ isDragging }, drag] = useDrag({
    type: PHASE_ROW_TYPE,
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: PHASE_ROW_TYPE,
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        onMovePhase(item.index, index);
        item.index = index;
      }
    },
  });

  const percentRate = totalDays > 0 ? ((phase.days / totalDays) * 100).toFixed(1) : "0.0";

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`flex gap-[8px] items-center group cursor-move ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="w-[39px] h-[36px] bg-[#f7f7f7] rounded-[6px] flex items-center justify-center">
        <span className="font-['Roboto_Mono'] font-normal text-[12px] text-black">{index + 1}.</span>
      </div>
      <div className="flex-1 h-[36px] bg-[#f7f7f7] rounded-[6px] flex items-center px-[12px] relative">
        <input
          type="text"
          value={phase.name || ""}
          onChange={(e) => onUpdatePhase(index, e.target.value, phase.days || 1)}
          className="w-full font-['Roboto_Mono'] font-normal text-[12px] text-black bg-transparent border-none focus:outline-none"
        />
      </div>
      <div className="w-[70px] h-[36px] bg-[#f7f7f7] rounded-[6px] flex items-center justify-center">
        <span className="font-['Roboto_Mono'] font-normal text-[12px] text-black">{percentRate}%</span>
      </div>
      <div className="w-[70px] h-[36px] bg-[#f7f7f7] rounded-[6px] flex items-center justify-center px-[12px]">
        <input
          type="number"
          value={phase.days || 1}
          onChange={(e) => onUpdatePhase(index, phase.name || "", parseInt(e.target.value) || 1)}
          className="w-full font-['Roboto_Mono'] font-normal text-[12px] text-black bg-transparent border-none focus:outline-none text-center"
          min="1"
        />
      </div>
      <div className="w-[36px] h-[36px] flex items-center justify-center">
        {/* Drag Handle */}
        <div className="cursor-move p-[8px]" title="Drag to reorder">
          <GripVertical className="w-4 h-4 text-[#999999]" />
        </div>
      </div>
      <div className="w-[36px] h-[36px] flex items-center justify-center">
        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onRemovePhase(index)}
          className="p-[10px] rounded-[6px] hover:bg-destructive/10 transition-colors"
          title="Delete phase"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d={svgPaths.pd888200} stroke="#999999" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Helper to calculate project dates from phases
function calculateProjectDates(startDate: string, phases: PhaseWithDuration[]) {
  const start = new Date(startDate);
  let currentDate = new Date(start);
  
  const phasesWithDates: PhaseWithDuration[] = phases.map((phase) => {
    const phaseStart = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + phase.days);
    const phaseEnd = new Date(currentDate);
    
    return {
      ...phase,
      startDate: phaseStart.toISOString().split('T')[0],
      endDate: phaseEnd.toISOString().split('T')[0],
    };
  });
  
  const totalDays = phases.reduce((sum, p) => sum + p.days, 0);
  const projectEnd = new Date(start);
  projectEnd.setDate(projectEnd.getDate() + totalDays);
  
  return {
    phasesWithDates,
    endDate: projectEnd.toISOString().split('T')[0],
    totalDays,
  };
}

export default function CreateProjectDialog({
  isOpen,
  onClose,
  onCreateProject,
  canViewFinance,
}: CreateProjectDialogProps) {
  const { clients, teamMembers } = useApp();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    client: "",
    location: "",
    budget: "",
    startDate: "",
    description: "",
    team: [] as number[],
  });
  
  // Phase management state
  const [customPhases, setCustomPhases] = useState<PhaseWithDuration[]>([]);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseDays, setNewPhaseDays] = useState("1");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [saveAsTemplateName, setSaveAsTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);

  // Project template state (new template system)
  const [projectTemplates, setProjectTemplates] = useState<any[]>([]);
  const [selectedProjectTemplateId, setSelectedProjectTemplateId] = useState<string>("");
  const [enabledPhaseIds, setEnabledPhaseIds] = useState<Set<string>>(new Set());
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);

  // Derived: selected project template object
  const selectedProjectTemplate = projectTemplates.find(t => t.id === selectedProjectTemplateId) ?? null;
  const selectedPhaseTemplates: PhaseTemplateRow[] = selectedProjectTemplate?.phase_templates ?? [];

  // Load templates when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Load phase templates (legacy)
      fetchPhaseTemplates().then(loadedTemplates => {
        setTemplates(loadedTemplates);
        setTemplatesLoading(false);
      });
      // Load project templates (new system)
      listProjectTemplates().then(pt => {
        setProjectTemplates(pt);
      }).catch(() => {
        // Silently fail — table may not exist in this environment
      });
    } else {
      // Reset when dialog closes
      setCustomPhases([]);
      setSelectedTemplate("");
      setNewPhaseName("");
      setNewPhaseDays("1");
      setShowSaveTemplate(false);
      setSaveAsTemplateName("");
      setSelectedProjectTemplateId("");
      setEnabledPhaseIds(new Set());
      setExpandedPhaseId(null);
      setFormData({
        title: "",
        client: "",
        location: "",
        budget: "",
        startDate: "",
        description: "",
        team: [],
      });
    }
  }, [isOpen]);

  // When project template is selected, pre-enable all required phases
  useEffect(() => {
    if (selectedProjectTemplate) {
      const phases: PhaseTemplateRow[] = selectedProjectTemplate.phase_templates ?? [];
      setEnabledPhaseIds(new Set(phases.map((p: PhaseTemplateRow) => p.id)));
    } else {
      setEnabledPhaseIds(new Set());
    }
  }, [selectedProjectTemplateId]);
  
  // Handle template selection - actually load the phases
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && template.phases) {
      // Deep copy the phases to ensure all properties are copied
      const copiedPhases = template.phases.map(p => ({
        name: p.name,
        days: p.days
      }));
      setCustomPhases(copiedPhases);
      toast.success(`Loaded ${copiedPhases.length} phases from "${template.name}"`);
    }
  };
  
  // Add individual phase
  const handleAddPhase = () => {
    if (!newPhaseName.trim()) {
      toast.error("Phase name cannot be empty");
      return;
    }
    const days = parseInt(newPhaseDays) || 1;
    if (days < 1) {
      toast.error("Phase must be at least 1 day");
      return;
    }
    setCustomPhases([...customPhases, { name: newPhaseName.trim(), days }]);
    setNewPhaseName("");
    setNewPhaseDays("1");
    toast.success(`Phase "${newPhaseName}" added (${days} days)`);
  };
  
  // Remove phase
  const handleRemovePhase = (index: number) => {
    if (customPhases.length <= 1) {
      toast.error("At least one phase is required");
      return;
    }
    const phaseName = customPhases[index].name;
    setCustomPhases(customPhases.filter((_, i) => i !== index));
    toast.success(`Phase "${phaseName}" removed`);
  };
  
  // Move phase down
  const handleMovePhaseDown = (index: number) => {
    if (index === customPhases.length - 1) return;
    const newPhases = [...customPhases];
    [newPhases[index], newPhases[index + 1]] = [newPhases[index + 1], newPhases[index]];
    setCustomPhases(newPhases);
  };
  
  // Move phase via drag and drop
  const handleMovePhase = (fromIndex: number, toIndex: number) => {
    const newPhases = [...customPhases];
    const [movedPhase] = newPhases.splice(fromIndex, 1);
    newPhases.splice(toIndex, 0, movedPhase);
    setCustomPhases(newPhases);
  };
  
  // Update phase details
  const handleUpdatePhase = (index: number, name: string, days: number) => {
    const newPhases = [...customPhases];
    newPhases[index] = { name, days };
    setCustomPhases(newPhases);
  };
  
  // Pick phase from template
  const handlePickPhaseFromTemplate = (templateId: string, phase: PhaseWithDuration) => {
    if (customPhases.some(p => p.name === phase.name)) {
      toast.error("Phase with this name already exists");
      return;
    }
    setCustomPhases([...customPhases, { ...phase }]);
    toast.success(`Added "${phase.name}" (${phase.days} days)`);
  };
  
  // Save as new template
  const handleSaveAsTemplate = async () => {
    if (!saveAsTemplateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    
    // Check if template name already exists
    const existingTemplate = templates.find(
      t => t.name.toLowerCase() === saveAsTemplateName.trim().toLowerCase()
    );
    
    if (existingTemplate) {
      // Show confirmation dialog
      setExistingTemplateId(existingTemplate.id);
      setShowOverwriteConfirm(true);
      return;
    }
    
    // Save as new template
    try {
      await savePhaseTemplateToServer({
        name: saveAsTemplateName.trim(),
        phases: customPhases.map(p => ({ name: p.name, days: p.days })),
      });
      
      // Reload templates
      const updatedTemplates = await fetchPhaseTemplates();
      setTemplates(updatedTemplates);
      setSaveAsTemplateName("");
      setShowSaveTemplate(false);
      toast.success(`Template "${saveAsTemplateName}" saved!`);
    } catch (error) {
      toast.error("Failed to save template");
    }
  };
  
  // Confirm overwrite existing template
  const handleConfirmOverwrite = async () => {
    if (!existingTemplateId) return;
    
    try {
      // Update the existing template using server API
      await updatePhaseTemplateOnServer(existingTemplateId, {
        phases: customPhases.map(p => ({ name: p.name, days: p.days })),
        name: saveAsTemplateName.trim()
      });
      
      // Reload templates
      const updatedTemplates = await fetchPhaseTemplates();
      setTemplates(updatedTemplates);
      setSaveAsTemplateName("");
      setShowSaveTemplate(false);
      setShowOverwriteConfirm(false);
      setExistingTemplateId(null);
      toast.success(`Template "${saveAsTemplateName}" updated!`);
    } catch (error) {
      toast.error("Failed to update template");
    }
  };
  
  // Cancel overwrite
  const handleCancelOverwrite = () => {
    setShowOverwriteConfirm(false);
    setExistingTemplateId(null);
  };

  const totalDays = customPhases.reduce((sum, p) => sum + p.days, 0);
  const endDate = formData.startDate && customPhases.length > 0
    ? calculateProjectDates(formData.startDate, customPhases).endDate
    : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate) {
      toast.error("Start date is required");
      return;
    }

    // If using project template: create project directly + apply template
    if (selectedProjectTemplateId && enabledPhaseIds.size > 0) {
      setTemplateSubmitting(true);
      try {
        // Calculate end date from enabled phases
        const enabledPhases = selectedPhaseTemplates.filter(p => enabledPhaseIds.has(p.id));
        const totalTemplateDays = enabledPhases.reduce((s, p) => s + (p.default_duration_days ?? 7), 0);
        const endDateObj = new Date(formData.startDate);
        endDateObj.setDate(endDateObj.getDate() + totalTemplateDays);
        const endDate = endDateObj.toISOString().split('T')[0];

        const projectPayload: any = {
          title: formData.title,
          location: formData.location,
          budget: parseFloat(formData.budget) || 0,
          start_date: formData.startDate,
          end_date: endDate,
          phases: [],
          status: "Planning",
          progress: 0,
          spent: 0,
          phase: enabledPhases[0]?.name ?? "Planning",
          color: "#748B7B",
          description: formData.description,
          team: formData.team,
        };
        if (formData.client && formData.client.trim() !== "") {
          projectPayload.client = formData.client;
        }

        const created = await createProject(projectPayload);
        if (!created) throw new Error("Project creation returned no data");

        // Every task must have an assignee -- default template-cloned tasks
        // to whoever is creating the project until they're reassigned.
        const currentMember = (teamMembers as any[]).find((m) => String(m.authUserId) === String(user?.id));

        await applyTemplateToProject(String(created.id), selectedProjectTemplateId, {
          enabledPhaseTemplateIds: Array.from(enabledPhaseIds),
          startDate: formData.startDate,
          defaultAssigneeId: currentMember ? String(currentMember.id) : undefined,
        });

        toast.success(`Project created with ${enabledPhases.length} phases from "${selectedProjectTemplate?.name}"`);
        onCreateProject(created); // notify parent (realtime will refresh state)
        onClose();
      } catch (err: any) {
        toast.error(`Failed to create project: ${err?.message ?? "Unknown error"}`);
      } finally {
        setTemplateSubmitting(false);
      }
      return;
    }

    // Legacy path: manual phases or no template
    const projectData = customPhases.length > 0
      ? calculateProjectDates(formData.startDate, customPhases)
      : {
          phasesWithDates: [],
          endDate: (() => {
            const end = new Date(formData.startDate);
            end.setDate(end.getDate() + 30);
            return end.toISOString().split('T')[0];
          })(),
          totalDays: 30,
        };

    const projectPayload: any = {
      title: formData.title,
      location: formData.location,
      budget: parseFloat(formData.budget) || 0,
      startDate: formData.startDate,
      endDate: projectData.endDate,
      phases: projectData.phasesWithDates || [],
      status: "Planning",
      progress: 0,
      spent: 0,
      phase: customPhases.length > 0 ? customPhases[0].name : "Planning",
      color: "#748B7B",
      description: formData.description,
      team: formData.team,
    };

    if (formData.client && formData.client.trim() !== "") {
      projectPayload.client = formData.client;
    }

    onCreateProject(projectPayload);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'var(--font-family-heading)', fontVariationSettings: "'wdth' 137", fontWeight: 800 }}>Create New Project</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new project for Cstle Livn.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-[24px]">
          <div className="grid grid-cols-2 gap-[16px]">
            <div className="col-span-2">
              <Label htmlFor="title">Project Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter project title"
                required
              />
            </div>
            
            <div className="col-span-2">
              <Label htmlFor="client">Client</Label>
              <Select
                value={formData.client}
                onValueChange={(value) => setFormData({ ...formData, client: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={String(client.id)}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Project location"
                required
              />
            </div>

            {canViewFinance && (
              <div>
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            {formData.startDate && customPhases.length > 0 && (
              <div>
                <Label htmlFor="endDate">End Date (Auto-calculated)</Label>
                <Input
                  id="endDate"
                  type="text"
                  value={endDate}
                  disabled
                  className="bg-muted"
                />
                <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground mt-[4px]">
                  {totalDays} days total
                </p>
              </div>
            )}

            <div className="col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Project description (optional)"
                rows={3}
              />
            </div>
          </div>
          
          {/* Project Template Section */}
          {projectTemplates.length > 0 && (
            <div className="border-t border-[#858585] pt-[20px] space-y-[14px]">
              <div className="flex items-center gap-[8px]">
                <Layers className="w-4 h-4 text-[#748b7b]" />
                <h3 className="font-['Roboto_Mono'] font-bold text-[12px] text-[#111111]">Project Template</h3>
                <span className="font-['Roboto_Mono'] text-[9px] text-[#999999] ml-auto">Optional — generates phases + tasks automatically</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-[8px]">
                {/* No template option */}
                <button
                  type="button"
                  onClick={() => setSelectedProjectTemplateId("")}
                  className={`text-left p-[12px] rounded-[8px] border transition-colors ${
                    !selectedProjectTemplateId
                      ? "border-[#748b7b] bg-[#748b7b]/8"
                      : "border-[#e0e0e0] hover:border-[#748b7b]/50"
                  }`}
                >
                  <div className="font-['Roboto_Mono'] font-bold text-[11px] text-[#111111] mb-[2px]">Manual Setup</div>
                  <div className="font-['Roboto_Mono'] text-[9px] text-[#999999]">Configure phases manually below</div>
                </button>

                {projectTemplates.map(pt => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setSelectedProjectTemplateId(pt.id)}
                    className={`text-left p-[12px] rounded-[8px] border transition-colors ${
                      selectedProjectTemplateId === pt.id
                        ? "border-[#748b7b] bg-[#748b7b]/8"
                        : "border-[#e0e0e0] hover:border-[#748b7b]/50"
                    }`}
                  >
                    <div className="font-['Roboto_Mono'] font-bold text-[11px] text-[#111111] mb-[2px] leading-tight">{pt.name}</div>
                    <div className="font-['Roboto_Mono'] text-[9px] text-[#999999]">
                      {(pt.phase_templates ?? []).length} phases
                    </div>
                  </button>
                ))}
              </div>

              {/* Phase preview when template selected */}
              {selectedProjectTemplate && (
                <div className="bg-[#f7f7f7] rounded-[8px] border border-[#e0e0e0] overflow-hidden">
                  <div className="px-[14px] py-[10px] border-b border-[#e0e0e0] flex items-center gap-[8px]">
                    <FileText className="w-3 h-3 text-[#748b7b]" />
                    <span className="font-['Roboto_Mono'] font-bold text-[10px] text-[#111111]">Phase Preview</span>
                    <span className="font-['Roboto_Mono'] text-[9px] text-[#999999] ml-auto">
                      {enabledPhaseIds.size} of {selectedPhaseTemplates.length} phases enabled
                      {formData.startDate && (
                        <> · {selectedPhaseTemplates
                          .filter(p => enabledPhaseIds.has(p.id))
                          .reduce((s, p) => s + (p.default_duration_days ?? 7), 0)} days total</>
                      )}
                    </span>
                  </div>
                  <div className="divide-y divide-[#e0e0e0] max-h-[280px] overflow-y-auto">
                    {selectedPhaseTemplates.map((phase, idx) => {
                      const isEnabled = enabledPhaseIds.has(phase.id);
                      const isExpanded = expandedPhaseId === phase.id;
                      const taskCount = (phase.task_templates ?? []).length;
                      return (
                        <div key={phase.id} className={`transition-colors ${isEnabled ? "bg-white" : "bg-[#f0f0f0]"}`}>
                          <div className="flex items-center gap-[8px] px-[14px] py-[10px]">
                            <button
                              type="button"
                              onClick={() => {
                                if (phase.required) return; // can't disable required
                                setEnabledPhaseIds(prev => {
                                  const next = new Set(prev);
                                  if (next.has(phase.id)) next.delete(phase.id);
                                  else next.add(phase.id);
                                  return next;
                                });
                              }}
                              className={`flex-shrink-0 ${phase.required ? "cursor-default opacity-50" : "cursor-pointer"}`}
                              title={phase.required ? "Required phase" : isEnabled ? "Disable phase" : "Enable phase"}
                            >
                              {isEnabled
                                ? <CheckSquare className="w-4 h-4 text-[#748b7b]" />
                                : <Square className="w-4 h-4 text-[#999999]" />
                              }
                            </button>
                            <span className="font-['Roboto_Mono'] text-[9px] text-[#999999] w-[16px] flex-shrink-0">{idx + 1}.</span>
                            <span className={`font-['Roboto_Mono'] font-bold text-[11px] flex-1 ${isEnabled ? "text-[#111111]" : "text-[#999999] line-through"}`}>
                              {phase.name}
                            </span>
                            <span className="font-['Roboto_Mono'] text-[9px] text-[#999999] mr-[4px]">
                              {phase.default_duration_days ?? 7}d · {taskCount} tasks
                            </span>
                            {taskCount > 0 && (
                              <button
                                type="button"
                                onClick={() => setExpandedPhaseId(isExpanded ? null : phase.id)}
                                className="text-[#999999] hover:text-[#111111] transition-colors"
                              >
                                {isExpanded
                                  ? <ChevronDown className="w-3 h-3" />
                                  : <ChevronRight className="w-3 h-3" />
                                }
                              </button>
                            )}
                          </div>
                          {isExpanded && taskCount > 0 && (
                            <div className="px-[14px] pb-[10px] space-y-[4px]">
                              {(phase.task_templates ?? []).map((tt: TaskTemplate) => (
                                <div key={tt.id} className="flex items-center gap-[8px] pl-[24px]">
                                  <div className="w-[4px] h-[4px] rounded-full bg-[#748b7b] flex-shrink-0" />
                                  <span className="font-['Roboto_Mono'] text-[10px] text-[#555555] flex-1">{tt.name}</span>
                                  <span className="font-['Roboto_Mono'] text-[9px] text-[#999999]">{tt.task_type}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Phase Management Section - only shown when NOT using project template */}
          {!selectedProjectTemplateId && (
          <div className="border-t border-[#858585] pt-[25px] space-y-[20px]">
            {/* Header with Template Selector */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-['Roboto_Mono'] font-bold text-[12px] text-[#111111] leading-[21px] mb-[4px]">
                  Project Phases & Timeline
                </h3>
                <p className="font-['Roboto_Mono'] font-normal text-[9px] text-[#999999] leading-[16.5px] max-w-[240px]">
                  Choose a template, pick individual phases, or create custom phases with durations
                </p>
              </div>
              <div className="min-w-[200px]">
                <Label htmlFor="template" className="font-['Roboto_Mono'] font-medium text-[12px] text-[#111111] mb-[4px] block">
                  Choose Template
                </Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="h-[36px] bg-white border-white rounded-[6px]">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Add Phase Input */}
            <div className="flex gap-[8px] items-end">
              <div className="flex-1">
                <Label htmlFor="phaseName" className="font-['Roboto_Mono'] font-medium text-[12px] text-[#111111] mb-[4px] block">
                  Add a Phase
                </Label>
                <Input
                  id="phaseName"
                  value={newPhaseName}
                  onChange={(e) => setNewPhaseName(e.target.value)}
                  placeholder="Phase name..."
                  className="h-[36px] bg-white border-[#858585] rounded-[6px] font-['Roboto_Mono'] text-[12px]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddPhase();
                    }
                  }}
                />
              </div>
              <div className="w-[70px]">
                <Label htmlFor="phaseDays" className="font-['Roboto_Mono'] font-medium text-[12px] text-[#111111] mb-[4px] block">
                  Days
                </Label>
                <Input
                  id="phaseDays"
                  type="number"
                  value={newPhaseDays}
                  onChange={(e) => setNewPhaseDays(e.target.value)}
                  placeholder="1"
                  className="h-[36px] bg-white border-[#858585] rounded-[6px] font-['Roboto_Mono'] text-[12px] text-center"
                  min="1"
                />
              </div>
              <button
                type="button"
                onClick={handleAddPhase}
                className="h-[36px] w-[36px] bg-[#748b7b] rounded-[6px] flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                <Plus className="w-3 h-3 text-white" />
              </button>
            </div>
            
            {/* Phase Table */}
            <DndProvider backend={HTML5Backend}>
              <div className="space-y-[4px]">
                {/* Table Header */}
                <div className="flex gap-[8px] items-center">
                  <div className="w-[39px] h-[36px] bg-[#f7f7f7] rounded-[6px] flex items-center justify-center">
                    <span className="font-['Roboto_Mono'] font-bold text-[12px] text-black">SN</span>
                  </div>
                  <div className="flex-1 h-[36px] bg-[#f7f7f7] rounded-[6px] flex items-center px-[12px]">
                    <span className="font-['Roboto_Mono'] font-bold text-[12px] text-black">Phase</span>
                  </div>
                  <div className="w-[70px] h-[36px] bg-[#f7f7f7] rounded-[6px] flex items-center justify-center">
                    <span className="font-['Roboto_Mono'] font-bold text-[12px] text-black">% Rate</span>
                  </div>
                  <div className="w-[70px] h-[36px] bg-[#f7f7f7] rounded-[6px] flex items-center justify-center">
                    <span className="font-['Roboto_Mono'] font-bold text-[12px] text-black">Days</span>
                  </div>
                  <div className="w-[36px]" />
                  <div className="w-[36px]" />
                </div>
                
                {/* Phase Rows */}
                {customPhases.length > 0 ? (
                  customPhases.map((phase, index) => (
                    <PhaseRow
                      key={index}
                      phase={phase}
                      index={index}
                      totalDays={totalDays}
                      onUpdatePhase={handleUpdatePhase}
                      onRemovePhase={handleRemovePhase}
                      onMovePhase={handleMovePhase}
                    />
                  ))
                ) : (
                  <div className="py-[40px] text-center">
                    <p className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999]">
                      No phases added yet. Choose a template or add custom phases above.
                    </p>
                  </div>
                )}
              </div>
            </DndProvider>
          </div>
          )} {/* end !selectedProjectTemplateId */}

          {/* Footer Buttons */}
          <div className="flex gap-[8px] justify-between items-center pt-[17px] border-t border-[#858585]">
            {!selectedProjectTemplateId && (
              <button
                type="button"
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                disabled={customPhases.length === 0}
                className="px-[16px] py-[8px] bg-white border border-[#858585] rounded-[6px] hover:bg-[#f7f7f7] transition-colors font-['Roboto_Mono'] font-normal text-[12px] text-[#111111] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save As
              </button>
            )}
            {selectedProjectTemplateId && <div />}
            <div className="flex gap-[8px]">
              <button
                type="button"
                onClick={onClose}
                className="px-[16px] py-[8px] bg-white border border-[#858585] rounded-[6px] hover:bg-[#f7f7f7] transition-colors font-['Roboto_Mono'] font-normal text-[12px] text-[#111111]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!formData.startDate || templateSubmitting || (!!selectedProjectTemplateId && enabledPhaseIds.size === 0)}
                className="flex-1 min-w-[200px] px-[16px] py-[8px] bg-[#748b7b] rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-bold text-[12px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {templateSubmitting
                  ? "Creating..."
                  : selectedProjectTemplateId
                    ? `Create Project (${enabledPhaseIds.size} phases)`
                    : customPhases.length > 0
                      ? `Create Project (${totalDays} days)`
                      : "Create Project (Add phases later)"
                }
              </button>
            </div>
          </div>
          
          {/* Save Template Panel (appears above buttons) */}
          {showSaveTemplate && (
            <div className="bg-[#f7f7f7] border border-[#858585] rounded-[8px] p-[16px] -mt-[8px]">
              <div className="flex gap-[8px]">
                <Input
                  value={saveAsTemplateName}
                  onChange={(e) => setSaveAsTemplateName(e.target.value)}
                  placeholder="Template name (e.g., Painting Projects)"
                  className="flex-1 h-[36px] bg-white border-[#858585] font-['Roboto_Mono'] text-[12px]"
                />
                <button
                  type="button"
                  onClick={handleSaveAsTemplate}
                  className="px-[16px] py-[8px] bg-[#748b7b] text-white rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-medium text-[12px]"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSaveTemplate(false);
                    setSaveAsTemplateName("");
                  }}
                  className="px-[12px] py-[8px] bg-white border border-[#858585] rounded-[6px] hover:bg-[#f7f7f7] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Overwrite Confirmation Panel */}
          {showOverwriteConfirm && (
            <div className="bg-[#f7f7f7] border border-[#858585] rounded-[8px] p-[16px] -mt-[8px]">
              <p className="font-['Roboto_Mono'] font-normal text-[12px] text-[#999999] mb-[8px]">
                A template with the name "{saveAsTemplateName}" already exists. Do you want to overwrite it?
              </p>
              <div className="flex gap-[8px]">
                <button
                  type="button"
                  onClick={handleConfirmOverwrite}
                  className="px-[16px] py-[8px] bg-[#748b7b] text-white rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-medium text-[12px]"
                >
                  Overwrite
                </button>
                <button
                  type="button"
                  onClick={handleCancelOverwrite}
                  className="px-[16px] py-[8px] bg-white border border-[#858585] rounded-[6px] hover:bg-[#f7f7f7] transition-colors font-['Roboto_Mono'] font-medium text-[12px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}