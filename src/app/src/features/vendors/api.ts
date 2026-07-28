import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export interface VendorInput {
  name: string;
  category?: string;
  rating?: number;
  total_projects?: number;
  on_time_delivery?: number;
  quality_score?: number;
  contact?: any;
  services?: string[];
  website?: string;
}

export interface VendorUpdate {
  name?: string;
  category?: string;
  rating?: number;
  total_projects?: number;
  on_time_delivery?: number;
  quality_score?: number;
  contact?: any;
  services?: string[];
  website?: string;
}

export async function listVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .order('name', { ascending: true })
    .limit(300);
  
  failIf(error, 'Failed to list vendors');
  return data ?? [];
}

export async function getVendor(id: string) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('id', id)
    .single();
  
  failIf(error, 'Failed to get vendor');
  return data;
}

export async function createVendor(input: VendorInput) {
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      ...input,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  
  failIf(error, 'Failed to create vendor');
  return data;
}

export async function updateVendor(id: string, updates: VendorUpdate) {
  const { data, error } = await supabase
    .from('vendors')
    .update({
      ...updates,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update vendor');
  return data;
}

export async function deleteVendor(id: string) {
  const { error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete vendor');
}