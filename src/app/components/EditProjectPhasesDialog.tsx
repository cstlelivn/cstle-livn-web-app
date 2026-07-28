import { useState, useEffect } from "react";
import { Plus, GripVertical, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Combobox, type ComboboxOption } from "./ui/combobox";
import { toast } from "sonner";
import { useApp, type PhaseWithDuration, type Project } from "./AppContext";
import { 
  fetchPhaseTemplates, 
  fetchMasterPhases, 
  createMasterPhase,
  createPhaseTemplate,
  type PhaseTemplate,
  type MasterPhase
} from "../src/api/phaseTemplates";
import svgPaths from "../imports/svg-irwlcgai14";
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

interface EditProjectPhasesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: Project;
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
  const [{ isDragging }, drag, preview] = useDrag({
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
      ref={drop}
      className={`flex gap-[8px] items-center group ${isDragging ? 'opacity-50' : 'opacity-100'}`}
    >
      <div className="w-[39px] h-[36px] bg-card rounded-lg flex items-center justify-center">
        <span className="text-foreground">{index + 1}.</span>
      </div>
      <div className="flex-1 h-[36px] bg-card rounded-lg flex items-center px-[12px] relative">
        <input
          type="text"
          value={phase.name || ""}
          onChange={(e) => onUpdatePhase(index, e.target.value, phase.days || 1)}
          className="w-full text-foreground bg-transparent border-none focus:outline-none"
        />
      </div>
      <div className="w-[70px] h-[36px] bg-card rounded-lg flex items-center justify-center">
        <span className="text-foreground">{percentRate}%</span>
      </div>
      <div className="w-[70px] h-[36px] bg-card rounded-lg flex items-center justify-center px-[12px]">
        <input
          type="number"
          value={phase.days || 1}
          onChange={(e) => onUpdatePhase(index, phase.name || "", parseInt(e.target.value) || 1)}
          className="w-full text-foreground bg-transparent border-none focus:outline-none text-center"
          min="1"
        />
      </div>
      <div className="w-[36px] h-[36px] flex items-center justify-center">
        {/* Drag Handle - ONLY this should be draggable */}
        <div ref={drag} className="cursor-move p-[8px]" title="Drag to reorder">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
      <div className="w-[36px] h-[36px] flex items-center justify-center">
        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onRemovePhase(index)}
          className="p-[10px] rounded-lg hover:bg-destructive/10 transition-colors"
          title="Delete phase"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16">
            <path d={svgPaths.pd888200} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" className="text-muted-foreground" />
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

export default function EditProjectPhasesDialog({
  open,
  onOpenChange,
  project,
}: EditProjectPhasesDialogProps) {
  const { updateProject } = useApp();
  const [customPhases, setCustomPhases] = useState<PhaseWithDuration[]>([]);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseDays, setNewPhaseDays] = useState("1");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [saveAsTemplateName, setSaveAsTemplateName] = useState("");
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [masterPhases, setMasterPhases] = useState<MasterPhase[]>([]);

  // Load current project phases when dialog opens
  useEffect(() => {
    if (open && project) {
      // Load existing phases or start empty
      if (project.phases && project.phases.length > 0) {
        setCustomPhases(project.phases.map(p => ({ name: p.name, days: p.days })));
      } else {
        setCustomPhases([]);
      }
      
      // Load templates
      const loadTemplates = async () => {
        const loadedTemplates = await fetchPhaseTemplates();
        setTemplates(loadedTemplates);
      };
      loadTemplates();

      // Load master phases
      const loadMasterPhases = async () => {
        const loadedMasterPhases = await fetchMasterPhases();
        setMasterPhases(loadedMasterPhases);
      };
      loadMasterPhases();
    }
  }, [open, project?.id]); // ✅ Use project.id instead of project object

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template && template.phases) {
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
    
    // Use functional setState to ensure we have the latest state
    setCustomPhases(prev => {
      // Check for duplicates with latest state
      const duplicate = prev.find(p => p.name.toLowerCase() === newPhaseName.trim().toLowerCase());
      if (duplicate) {
        toast.error("Phase with this name already exists in this project");
        return prev;
      }
      
      const newPhases = [...prev, { name: newPhaseName.trim(), days }];
      toast.success(`Phase "${newPhaseName}" added (${days} days)`);
      return newPhases;
    });
    
    setNewPhaseName("");
    setNewPhaseDays("1");
  };

  // Handle phase selection from combobox - immediately add the phase
  const handlePhaseSelect = (phaseId: string) => {
    console.log('🔵 handlePhaseSelect called with phaseId:', phaseId);
    console.log('🔵 masterPhases:', masterPhases);
    
    const selectedPhase = masterPhases.find(p => p.id === phaseId);
    console.log('🔵 selectedPhase found:', selectedPhase);
    
    if (!selectedPhase) {
      console.log('❌ No phase found with id:', phaseId);
      return;
    }
    
    // Use functional setState to ensure we have the latest state
    setCustomPhases(prev => {
      console.log('🔵 Current customPhases:', prev);
      
      // Check for duplicates with latest state
      const duplicate = prev.find(p => p.name.toLowerCase() === selectedPhase.name.toLowerCase());
      if (duplicate) {
        console.log('❌ Duplicate found:', duplicate);
        toast.error("Phase with this name already exists in this project");
        return prev;
      }
      
      const newPhases = [...prev, { name: selectedPhase.name, days: selectedPhase.days }];
      console.log('✅ Adding phase, new list:', newPhases);
      toast.success(`Phase "${selectedPhase.name}" added (${selectedPhase.days} days)`);
      
      return newPhases;
    });
    
    setNewPhaseName("");
    setNewPhaseDays("1");
  };

  // Handle creating a new phase - create in master list and add to project
  const handleCreateNewPhase = async (phaseName: string) => {
    if (!phaseName.trim()) {
      toast.error("Phase name cannot be empty");
      return;
    }

    try {
      const days = parseInt(newPhaseDays) || 1;
      const { phase, existed } = await createMasterPhase(phaseName.trim(), days);
      
      // Refresh master phases list
      const updatedPhases = await fetchMasterPhases();
      setMasterPhases(updatedPhases);
      
      // Use functional setState to ensure we have the latest state
      setCustomPhases(prev => {
        // Check for duplicates in current project with latest state
        const duplicate = prev.find(p => p.name.toLowerCase() === phase.name.toLowerCase());
        if (duplicate) {
          toast.error("Phase with this name already exists in this project");
          return prev;
        }
        
        const newPhases = [...prev, { name: phase.name, days: phase.days }];
        
        if (existed) {
          toast.success(`Phase "${phaseName}" added (${phase.days} days)`);
        } else {
          toast.success(`New phase "${phaseName}" created and added (${phase.days} days)`);
        }
        
        return newPhases;
      });
      
      setNewPhaseName("");
      setNewPhaseDays("1");
    } catch (error: any) {
      console.error('Error creating new phase:', error);
      toast.error(error.message || "Failed to create new phase");
    }
  };

  // Convert master phases to combobox options - FILTER OUT phases already in project
  const phaseOptions: ComboboxOption[] = masterPhases
    .filter(masterPhase => {
      // Only show phases that are NOT already in the current project
      const alreadyExists = customPhases.some(
        existingPhase => existingPhase.name.toLowerCase() === masterPhase.name.toLowerCase()
      );
      return !alreadyExists;
    })
    .map(phase => ({
      value: phase.id,
      label: phase.name,
      days: phase.days,
    }));

  // Remove phase
  const handleRemovePhase = (index: number) => {
    const phaseName = customPhases[index].name;
    setCustomPhases(customPhases.filter((_, i) => i !== index));
    toast.success(`Phase "${phaseName}" removed`);
  };

  // Move phase via drag and drop
  const handleMovePhase = (fromIndex: number, toIndex: number) => {
    const newPhases = [...customPhases];
    const [movedPhase] = newPhases.splice(fromIndex, 1);
    newPhases.splice(toIndex, 0, movedPhase);
    setCustomPhases(newPhases);
    // DO NOT increment renderKey here - it breaks drag and drop!
  };

  // Update phase details
  const handleUpdatePhase = (index: number, name: string, days: number) => {
    const newPhases = [...customPhases];
    newPhases[index] = { name, days };
    setCustomPhases(newPhases);
    // DO NOT increment renderKey here - it breaks editing!
  };

  // Save as new template
  const handleSaveAsTemplate = async () => {
    if (!saveAsTemplateName.trim()) {
      toast.error("Template name is required");
      return;
    }
    
    try {
      // Save to database via API
      await createPhaseTemplate(saveAsTemplateName.trim(), customPhases);
      
      // Refresh templates list
      const updatedTemplates = await fetchPhaseTemplates();
      setTemplates(updatedTemplates);
      
      setSaveAsTemplateName("");
      setShowSaveTemplate(false);
      toast.success(`Template "${saveAsTemplateName}" saved!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to save template");
    }
  };

  const totalDays = customPhases.reduce((sum, p) => sum + p.days, 0);

  const handleSave = async () => {
    if (customPhases.length === 0) {
      toast.error("At least one phase is required");
      return;
    }

    try {
      console.log('🟢 handleSave - Starting save process');
      console.log('🟢 handleSave - Current phases:', customPhases);
      console.log('🟢 handleSave - Project:', { id: project.id, startDate: project.startDate });
      
      // Calculate project end date based on new phases
      const projectData = calculateProjectDates(project.startDate, customPhases);
      console.log('🟢 handleSave - Calculated project data:', projectData);

      // Update project with new phases (only send the fields we're updating)
      const updatePayload = {
        phases: projectData.phasesWithDates,
        endDate: projectData.endDate,
      };
      console.log('🟢 handleSave - Update payload:', updatePayload);
      console.log('🟢 handleSave - Calling updateProject with ID:', project.id, 'Type:', typeof project.id);
      
      await updateProject(project.id, updatePayload);

      console.log('✅ handleSave - Update completed successfully');
      toast.success("Project phases updated successfully!");
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ handleSave - Failed to save project phases:', error);
      toast.error(error.message || "Failed to save project phases");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-['Roboto_Mono'] font-bold text-[14px]">
            Manage Project Phases
          </DialogTitle>
          <DialogDescription className="font-['Roboto_Mono'] text-[10px] text-muted-foreground">
            Add, edit, or remove phases for {project.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-[20px]">
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
              <Combobox
                value={newPhaseName}
                onValueChange={setNewPhaseName}
                onCreateOption={handleCreateNewPhase}
                options={phaseOptions}
                onOptionSelect={handlePhaseSelect}
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
                <div className="w-[39px] h-[36px] bg-card rounded-lg flex items-center justify-center">
                  <span className="text-foreground">SN</span>
                </div>
                <div className="flex-1 h-[36px] bg-card rounded-lg flex items-center px-[12px]">
                  <span className="text-foreground">Phase</span>
                </div>
                <div className="w-[70px] h-[36px] bg-card rounded-lg flex items-center justify-center">
                  <span className="text-foreground">% Rate</span>
                </div>
                <div className="w-[70px] h-[36px] bg-card rounded-lg flex items-center justify-center">
                  <span className="text-foreground">Days</span>
                </div>
                <div className="w-[36px]" />
                <div className="w-[36px]" />
              </div>

              {/* Phase Rows */}
              {customPhases.length > 0 ? (
                <>
                  {customPhases.map((phase, index) => (
                    <PhaseRow
                      key={`${phase.name}-${index}`}
                      phase={phase}
                      index={index}
                      totalDays={totalDays}
                      onUpdatePhase={handleUpdatePhase}
                      onRemovePhase={handleRemovePhase}
                      onMovePhase={handleMovePhase}
                    />
                  ))}
                </>
              ) : (
                <div className="py-[40px] text-center">
                  <p className="text-muted-foreground">
                    No phases added yet. Choose a template or add custom phases above.
                  </p>
                </div>
              )}
            </div>
          </DndProvider>

          {/* Save As Template */}
          {showSaveTemplate && (
            <div className="bg-[#f7f7f7] border border-[#858585] rounded-[8px] p-[16px]">
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

          {/* Footer Buttons */}
          <div className="flex gap-[8px] justify-between items-center pt-[17px] border-t border-[#858585]">
            <div className="flex gap-[8px]">
              <button
                type="button"
                onClick={() => setShowSaveTemplate(!showSaveTemplate)}
                disabled={customPhases.length === 0}
                className="px-[16px] py-[8px] bg-white border border-[#858585] rounded-[6px] hover:bg-[#f7f7f7] transition-colors font-['Roboto_Mono'] font-normal text-[12px] text-[#111111] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save As Template
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomPhases([]);
                  toast.success("All phases cleared");
                }}
                disabled={customPhases.length === 0}
                className="px-[16px] py-[8px] bg-white border border-destructive text-destructive rounded-[6px] hover:bg-destructive/10 transition-colors font-['Roboto_Mono'] font-normal text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear All
              </button>
            </div>
            <div className="flex gap-[8px]">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-[16px] py-[8px] bg-white border border-[#858585] rounded-[6px] hover:bg-[#f7f7f7] transition-colors font-['Roboto_Mono'] font-normal text-[12px] text-[#111111]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={customPhases.length === 0}
                className="flex-1 min-w-[200px] px-[16px] py-[8px] bg-[#748b7b] rounded-[6px] hover:opacity-90 transition-opacity font-['Roboto_Mono'] font-bold text-[12px] text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Phases ({totalDays} days)
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}