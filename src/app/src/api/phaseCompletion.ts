import { projectId, publicAnonKey } from "../../utils/supabase/info";

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c`;

export interface PhaseCompletionUpdate {
  isCompleted: boolean;
}

export interface PhaseCompletionResponse {
  success: boolean;
  phase: any;
  projectProgress: number;
  project: any;
}

export interface ProjectProgressResponse {
  phases: any[];
  completedPhases: number;
  totalPhases: number;
  projectProgress: number;
}

// Update phase completion status
export async function updatePhaseCompletion(
  projectId: string | number,
  phaseIndex: number,
  isCompleted: boolean
): Promise<PhaseCompletionResponse> {
  try {
    const response = await fetch(
      `${API_BASE}/projects/${projectId}/phases/${phaseIndex}/completion`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ isCompleted }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to update phase completion");
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error updating phase completion:", error);
    throw error;
  }
}

// Get project progress
export async function getProjectProgress(
  projectId: string | number
): Promise<ProjectProgressResponse> {
  try {
    const response = await fetch(`${API_BASE}/projects/${projectId}/progress`, {
      headers: {
        Authorization: `Bearer ${publicAnonKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch project progress");
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error("Error fetching project progress:", error);
    throw error;
  }
}
