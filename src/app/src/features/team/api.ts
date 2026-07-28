import { createClient } from '../../../utils/supabase/client.tsx';
import { projectId, publicAnonKey } from '../../../utils/supabase/info.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

// Use server endpoints to bypass PostgREST schema cache issues
// DISABLED: Using direct PostgREST for reliability until server endpoints are fully deployed
const USE_SERVER_ENDPOINTS = false;

export interface TeamMemberInput {
  name: string;
  role: string;
  email: string;
  phone?: string;
  aura_rating?: number;
  tasks_completed?: number;
  tasks_on_time?: number;
  efficiency?: number;
  specialties?: string[];
  active?: boolean;
}

export interface TeamMemberUpdate {
  name?: string;
  role?: string;
  email?: string;
  phone?: string;
  aura_rating?: number;
  tasks_completed?: number;
  tasks_on_time?: number;
  efficiency?: number;
  specialties?: string[];
  active?: boolean;
}

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || publicAnonKey;
}

export async function listTeamMembers() {
  if (USE_SERVER_ENDPOINTS) {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/team-members`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.warn('Server endpoint failed, falling back to direct PostgREST');
        throw new Error('Server endpoint not available');
      }
      
      return await response.json();
    } catch (error: any) {
      console.warn('Server endpoint error, using direct PostgREST:', error.message);
      // Fall through to direct PostgREST below
    }
  }
  
  // Fallback to direct PostgREST (or primary method if server endpoints disabled)
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('name', { ascending: true })
    .limit(300);
  
  failIf(error, 'Failed to list team members');
  return data ?? [];
}

export async function getTeamMember(id: string) {
  // Always use direct query for single item fetch
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .eq('id', id)
    .single();
  
  failIf(error, 'Failed to get team member');
  return data;
}

export async function createTeamMember(input: TeamMemberInput) {
  if (USE_SERVER_ENDPOINTS) {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/team-members`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(input),
        }
      );
      
      if (!response.ok) {
        console.warn('Server endpoint failed, falling back to direct PostgREST');
        throw new Error('Server endpoint not available');
      }
      
      const data = await response.json();
      console.log('✅ Team member created successfully via server');
      return data;
    } catch (error: any) {
      console.warn('Server endpoint error, using direct PostgREST:', error.message);
      // Fall through to direct PostgREST below
    }
  }
  
  // Fallback to direct PostgREST
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      ...input,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  
  failIf(error, 'Failed to create team member');
  console.log('✅ Team member created successfully via PostgREST');
  return data;
}

export async function updateTeamMember(id: string, updates: TeamMemberUpdate) {
  if (USE_SERVER_ENDPOINTS) {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/team-members/${id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        }
      );
      
      if (!response.ok) {
        console.warn('Server endpoint failed, falling back to direct PostgREST');
        throw new Error('Server endpoint not available');
      }
      
      const data = await response.json();
      console.log('✅ Team member updated successfully via server');
      return data;
    } catch (error: any) {
      console.warn('Server endpoint error, using direct PostgREST:', error.message);
      // Fall through to direct PostgREST below
    }
  }
  
  // Fallback to direct PostgREST
  const { data, error } = await supabase
    .from('team_members')
    .update({
      ...updates,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update team member');
  console.log('✅ Team member updated successfully via PostgREST');
  return data;
}

export async function deleteTeamMember(id: string) {
  if (USE_SERVER_ENDPOINTS) {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/team-members/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        console.warn('Server endpoint failed, falling back to direct PostgREST');
        throw new Error('Server endpoint not available');
      }
      
      console.log('✅ Team member deleted successfully via server');
      return;
    } catch (error: any) {
      console.warn('Server endpoint error, using direct PostgREST:', error.message);
      // Fall through to direct PostgREST below
    }
  }
  
  // Fallback to direct PostgREST
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete team member');
  console.log('✅ Team member deleted successfully via PostgREST');
}