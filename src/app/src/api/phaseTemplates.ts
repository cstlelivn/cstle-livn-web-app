import { projectId, publicAnonKey } from "../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c`;

export interface PhaseWithDuration {
  name: string;
  days: number;
}

export interface PhaseTemplate {
  id: string;
  name: string;
  phases: PhaseWithDuration[];
  createdAt: string;
  updatedAt?: string;
}

export interface MasterPhase {
  id: string;
  name: string;
  days: number;
  createdAt: string;
}

// Fetch all phase templates
export async function fetchPhaseTemplates(): Promise<PhaseTemplate[]> {
  try {
    const response = await fetch(`${API_BASE}/phase-templates`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.templates || [];
  } catch (error: any) {
    console.error("Error fetching phase templates:", error);
    throw error;
  }
}

// Fetch a specific phase template
export async function fetchPhaseTemplate(id: string): Promise<PhaseTemplate> {
  try {
    const response = await fetch(`${API_BASE}/phase-templates/${id}`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.statusText}`);
    }

    const data = await response.json();
    return data.template;
  } catch (error: any) {
    console.error("Error fetching phase template:", error);
    throw error;
  }
}

// Create a new phase template
export async function createPhaseTemplate(
  name: string,
  phases: PhaseWithDuration[]
): Promise<PhaseTemplate> {
  try {
    const response = await fetch(`${API_BASE}/phase-templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ name, phases }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create template");
    }

    const data = await response.json();
    return data.template;
  } catch (error: any) {
    console.error("Error creating phase template:", error);
    throw error;
  }
}

// Update a phase template
export async function updatePhaseTemplate(
  id: string,
  updates: { name?: string; phases?: PhaseWithDuration[] }
): Promise<PhaseTemplate> {
  try {
    const response = await fetch(`${API_BASE}/phase-templates/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update template");
    }

    const data = await response.json();
    return data.template;
  } catch (error: any) {
    console.error("Error updating phase template:", error);
    throw error;
  }
}

// Delete a phase template
export async function deletePhaseTemplate(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/phase-templates/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete template");
    }
  } catch (error: any) {
    console.error("Error deleting phase template:", error);
    throw error;
  }
}

// Fetch all master phases
export async function fetchMasterPhases(): Promise<MasterPhase[]> {
  try {
    const response = await fetch(`${API_BASE}/master-phases`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch master phases: ${response.statusText}`);
    }

    const data = await response.json();
    return data.phases || [];
  } catch (error: any) {
    console.error("Error fetching master phases:", error);
    throw error;
  }
}

// Create a new master phase
export async function createMasterPhase(
  name: string,
  days: number = 1
): Promise<{ phase: MasterPhase; existed: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/master-phases`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ name, days }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create master phase");
    }

    const data = await response.json();
    return { phase: data.phase, existed: data.existed || false };
  } catch (error: any) {
    console.error("Error creating master phase:", error);
    throw error;
  }
}
