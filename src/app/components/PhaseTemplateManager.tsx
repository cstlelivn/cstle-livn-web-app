import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { projectId, publicAnonKey } from "../utils/supabase/info";

export interface PhaseWithDuration {
  name: string;
  days: number;
}

export interface PhaseTemplate {
  id: string;
  name: string;
  phases: PhaseWithDuration[];
  createdAt: string;
}

// Get all templates from server
export async function fetchPhaseTemplates(): Promise<PhaseTemplate[]> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/phase-templates`,
      {
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to fetch templates");
    }
    
    const data = await response.json();
    return data.templates || [];
  } catch (error) {
    console.error("Error fetching phase templates:", error);
    return [];
  }
}

// Legacy function for backward compatibility - redirects to async version
export function getPhaseTemplates(): PhaseTemplate[] {
  console.warn("getPhaseTemplates() is deprecated. Use fetchPhaseTemplates() instead.");
  return [];
}

// Save template to server
export async function savePhaseTemplateToServer(template: Omit<PhaseTemplate, "id" | "createdAt">): Promise<void> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/phase-templates`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(template),
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to save template");
    }
  } catch (error) {
    console.error("Error saving phase template:", error);
    throw error;
  }
}

// Save template (legacy)
export function savePhaseTemplate(template: Omit<PhaseTemplate, "id" | "createdAt">): void {
  console.warn("savePhaseTemplate() is deprecated. Use savePhaseTemplateToServer() instead.");
}

// Update template on server
export async function updatePhaseTemplateOnServer(id: string, updates: Partial<PhaseTemplate>): Promise<void> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/phase-templates/${id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to update template");
    }
  } catch (error) {
    console.error("Error updating phase template:", error);
    throw error;
  }
}

// Update template (legacy)
export function updatePhaseTemplate(id: string, updates: Partial<PhaseTemplate>): void {
  console.warn("updatePhaseTemplate() is deprecated. Use updatePhaseTemplateOnServer() instead.");
}

// Delete template from server
export async function deletePhaseTemplateFromServer(id: string): Promise<void> {
  try {
    const response = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/phase-templates/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${publicAnonKey}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error("Failed to delete template");
    }
  } catch (error) {
    console.error("Error deleting phase template:", error);
    throw error;
  }
}

// Delete template (legacy)
export function deletePhaseTemplate(id: string): void {
  console.warn("deletePhaseTemplate() is deprecated. Use deletePhaseTemplateFromServer() instead.");
}

export default function PhaseTemplateManager() {
  const [templates, setTemplates] = useState<PhaseTemplate[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhases, setEditPhases] = useState<PhaseWithDuration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    const data = await fetchPhaseTemplates();
    setTemplates(data);
    setLoading(false);
  };

  const handleEdit = (template: PhaseTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditPhases([...template.phases]);
  };

  const handleSave = async () => {
    if (!editingId) return;
    
    if (!editName.trim()) {
      toast.error("Template name is required");
      return;
    }
    
    if (editPhases.length === 0) {
      toast.error("At least one phase is required");
      return;
    }

    try {
      await updatePhaseTemplateOnServer(editingId, {
        name: editName,
        phases: editPhases,
      });
      
      setEditingId(null);
      setEditName("");
      setEditPhases([]);
      await loadTemplates();
      toast.success("Template updated");
    } catch (error) {
      toast.error("Failed to update template");
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName("");
    setEditPhases([]);
  };

  const handleDelete = async (id: string) => {
    if (id === "default-cstle-livn" || id === "fcc-projects") {
      toast.error("Cannot delete default templates");
      return;
    }
    
    try {
      await deletePhaseTemplateFromServer(id);
      await loadTemplates();
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleAddPhase = () => {
    setEditPhases([...editPhases, { name: "", days: 1 }]);
  };

  const handleUpdatePhase = (index: number, value: string, days: number) => {
    const updated = [...editPhases];
    updated[index] = { name: value, days: days };
    setEditPhases(updated);
  };

  const handleRemovePhase = (index: number) => {
    if (editPhases.length <= 1) {
      toast.error("At least one phase is required");
      return;
    }
    setEditPhases(editPhases.filter((_, i) => i !== index));
  };

  const handleNewTemplate = async () => {
    const name = prompt("Enter template name (e.g., 'Painting Projects', 'Flooring Projects'):");
    if (!name) return;

    try {
      await savePhaseTemplateToServer({
        name: name.trim(),
        phases: [
          { name: "Planning", days: 3 },
          { name: "Prepping", days: 5 },
          { name: "Production", days: 10 },
          { name: "Finishing", days: 5 },
          { name: "Final Inspection", days: 2 },
          { name: "Delivered/Completed", days: 1 },
        ],
      });
      
      await loadTemplates();
      toast.success("Template created! Click 'Edit' to customize phases.");
    } catch (error) {
      toast.error("Failed to create template");
    }
  };

  if (loading) {
    return (
      <div className="space-y-[20px]">
        <div className="bg-card border border-border rounded-[12px] p-[40px] text-center">
          <p className="font-['Roboto_Mono'] font-normal text-[14px] text-muted-foreground">
            Loading templates...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-[20px]">
      <div className="flex items-center justify-between">
        <div>
          <h3 style={{ fontVariationSettings: "'wdth' 137", fontWeight: 700 }}>
            Phase Templates
          </h3>
          <p className="font-['Roboto_Mono'] font-normal text-[11px] text-muted-foreground mt-[4px]">
            Create reusable phase templates for different project types
          </p>
        </div>
        <div className="flex items-center gap-[8px]">
          <button
            onClick={async () => {
              try {
                toast.loading("Refreshing default templates...");
                const response = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/admin/refresh-default-templates`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${publicAnonKey}`,
                    },
                  }
                );
                
                if (!response.ok) {
                  throw new Error("Failed to refresh templates");
                }
                
                await loadTemplates();
                toast.success("Default templates refreshed!");
              } catch (error) {
                toast.error("Failed to refresh templates");
              }
            }}
            className="flex items-center gap-[8px] px-[16px] py-[8px] bg-background border border-border text-foreground rounded-[6px] hover:bg-card transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <p className="font-['Roboto_Mono'] font-medium text-[14px]">Refresh Defaults</p>
          </button>
          <button
            onClick={handleNewTemplate}
            className="flex items-center gap-[8px] px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <p className="font-['Roboto_Mono'] font-medium text-[14px]">New Template</p>
          </button>
        </div>
      </div>

      <div className="space-y-[12px]">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-card border border-border rounded-[12px] p-[20px]"
          >
            {editingId === template.id ? (
              // Edit mode
              <div className="space-y-[16px]">
                <div>
                  <label className="block font-['Roboto_Mono'] font-medium text-[11px] text-muted-foreground mb-[8px]">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-[12px] py-[8px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[14px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g., Painting Projects"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-[8px]">
                    <label className="block font-['Roboto_Mono'] font-medium text-[11px] text-muted-foreground">
                      Phases (in order)
                    </label>
                    <button
                      onClick={handleAddPhase}
                      className="flex items-center gap-[4px] px-[8px] py-[4px] bg-accent/10 text-accent rounded-[4px] hover:bg-accent/20 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span className="font-['Roboto_Mono'] font-medium text-[11px]">Add Phase</span>
                    </button>
                  </div>
                  <div className="space-y-[8px]">
                    {editPhases.map((phase, index) => (
                      <div key={index} className="flex items-center gap-[8px]">
                        <span className="font-['Roboto_Mono'] font-bold text-[11px] text-muted-foreground min-w-[24px]">
                          {index + 1}.
                        </span>
                        <input
                          type="text"
                          value={phase.name}
                          onChange={(e) => handleUpdatePhase(index, e.target.value, phase.days)}
                          className="flex-1 px-[12px] py-[6px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Phase name"
                        />
                        <input
                          type="number"
                          value={phase.days}
                          onChange={(e) => handleUpdatePhase(index, phase.name, parseInt(e.target.value))}
                          className="w-[50px] px-[12px] py-[6px] bg-background border border-border rounded-[6px] font-['Roboto_Mono'] font-normal text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Days"
                        />
                        <button
                          onClick={() => handleRemovePhase(index)}
                          className="p-[6px] rounded-[4px] hover:bg-destructive/10 transition-colors"
                          title="Remove phase"
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-[8px] pt-[8px]">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-[6px] px-[16px] py-[8px] bg-accent text-accent-foreground rounded-[6px] hover:bg-accent/90 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    <span className="font-['Roboto_Mono'] font-medium text-[13px]">Save</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-[16px] py-[8px] bg-background border border-border rounded-[6px] hover:bg-card transition-colors font-['Roboto_Mono'] font-medium text-[13px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // View mode
              <div>
                <div className="flex items-start justify-between mb-[12px]">
                  <div>
                    <h4 className="font-['Roboto_Mono'] font-bold text-[14px] text-foreground">
                      {template.name}
                    </h4>
                    <p className="font-['Roboto_Mono'] font-normal text-[10px] text-muted-foreground mt-[2px]">
                      {(template.phases || []).length} phases
                    </p>
                  </div>
                  <div className="flex items-center gap-[8px]">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-[6px] rounded-[4px] hover:bg-accent/10 transition-colors"
                      title="Edit template"
                    >
                      <Edit2 className="w-3 h-3 text-accent" />
                    </button>
                    {template.id !== "default-cstle-livn" && template.id !== "fcc-projects" && (
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-[6px] rounded-[4px] hover:bg-destructive/10 transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-[6px]">
                  {(template.phases || []).map((phase, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-[6px] px-[12px] py-[4px] bg-accent/10 rounded-[6px]"
                    >
                      <span className="font-['Roboto_Mono'] font-bold text-[10px] text-accent">
                        {index + 1}
                      </span>
                      <span className="font-['Roboto_Mono'] font-medium text-[11px] text-foreground">
                        {phase.name} ({phase.days} days)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {templates.length === 0 && (
          <div className="bg-card border border-border rounded-[12px] p-[40px] text-center">
            <p className="font-['Roboto_Mono'] font-normal text-[14px] text-muted-foreground">
              No templates yet. Click "New Template" to create one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}