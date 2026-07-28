import { createClient as createSupabaseClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';
import { withJWTRefresh } from '../../lib/jwt-refresh';

const supabase = createSupabaseClient();

export interface ClientInput {
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  projects_count?: number | null;
  total_value?: number | null;
  source?: string | null;
  notes?: string | null;
  last_contact?: string | null;
}

export interface ClientUpdate {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  status?: string | null;
  projects_count?: number | null;
  total_value?: number | null;
  source?: string | null;
  notes?: string | null;
  last_contact?: string | null;
}

export async function listClients() {
  try {
    console.log('📋 Fetching clients...');
    
    const { data, error } = await withJWTRefresh(
      () => supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
        .limit(300),
      'fetch clients'
    );
    
    if (error) {
      console.error('❌ Error fetching clients:', error);
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }
    
    console.log(`✅ Successfully fetched ${data?.length || 0} clients`);
    return data ?? [];
  } catch (error: any) {
    console.error('Database error:', error);
    // Re-throw with more context
    if (error.message?.includes('fetch')) {
      throw new Error('Network error: Unable to connect to database. Please check your connection and try again.');
    }
    throw error;
  }
}

export async function getClient(id: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single();
  
  failIf(error, 'Failed to get client');
  return data;
}

export async function createClient(input: ClientInput) {
  console.log('➕ API createClient called:', input);
  
  // Clean up the input - convert empty strings to null for optional fields
  const cleanedInput = Object.entries(input).reduce((acc, [key, value]) => {
    // Keep required fields even if empty
    if (key === 'name' || key === 'email') {
      acc[key] = value;
    } else {
      // Convert empty strings to null for optional fields
      acc[key] = value === '' ? null : value;
    }
    return acc;
  }, {} as any);
  
  const payload = {
    ...cleanedInput,
    created_at: now(),
    updated_at: now(),
  };
  
  console.log('📤 Supabase insert payload:', payload);
  
  const { data, error } = await supabase
    .from('clients')
    .insert(payload)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Supabase insert error:', error);
  } else {
    console.log('✅ Supabase insert success:', data);
  }
  
  failIf(error, 'Failed to create client');
  return data;
}

export async function updateClient(id: string, updates: ClientUpdate) {
  // Clean up the updates - convert empty strings to null for optional fields
  const cleanedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
    // Keep required fields even if empty
    if (key === 'name' || key === 'email') {
      acc[key] = value;
    } else {
      // Convert empty strings to null for optional fields
      acc[key] = value === '' ? null : value;
    }
    return acc;
  }, {} as any);
  
  const { data, error } = await supabase
    .from('clients')
    .update({
      ...cleanedUpdates,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update client');
  return data;
}

export async function deleteClient(id: string) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete client');
}