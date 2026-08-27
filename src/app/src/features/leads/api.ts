import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

const supabase = createClient();

export interface LeadInput {
  offer_id?: string | null;
  source_form?: string | null;
  source_page?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name: string;
  // Email is deliberately optional -- a lead can be created with just a
  // name and filled in later (see 20240053: leads.email is nullable).
  // clients.email stays required, so a lead needs an email before it can
  // be converted to a client -- see convertLeadToClient in AppContext.tsx.
  email?: string | null;
  phone?: string | null;
  project_address?: string | null;
  province?: string | null;
  estimated_value?: number | null;
  consultation_date?: string | null;
  consultation_time?: string | null;
  service_type?: string | null;
  project_type?: string | null;
  project_details?: string | null;
  message?: string | null;
  links?: string | null;
  company?: string | null;
  status?: string | null;
  source?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  last_contact?: string | null;
  pipeline_stage?: string | null;
  qualification_band?: 'Hot' | 'Warm' | 'Nurture' | 'Reject' | null;
  qualification_score?: number | null;
  qualification_reasons?: string[] | null;
  qualification_answers?: Record<string, unknown> | null;
  owner_user_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  landing_page?: string | null;
  referrer?: string | null;
}

export interface LeadUpdate {
  offer_id?: string | null;
  source_form?: string | null;
  source_page?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  project_address?: string | null;
  province?: string | null;
  estimated_value?: number | null;
  consultation_date?: string | null;
  consultation_time?: string | null;
  service_type?: string | null;
  project_type?: string | null;
  project_details?: string | null;
  message?: string | null;
  links?: string | null;
  company?: string | null;
  status?: string | null;
  source?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  last_contact?: string | null;
  pipeline_stage?: string | null;
  qualification_band?: 'Hot' | 'Warm' | 'Nurture' | 'Reject' | null;
  qualification_score?: number | null;
  qualification_reasons?: string[] | null;
  qualification_answers?: Record<string, unknown> | null;
  owner_user_id?: string | null;
  lost_reason?: string | null;
}

export async function listLeads() {
  // Won/Lost leads are deliberately NOT excluded here -- they stay visible
  // and filterable in the CRM (status "Won"/"Lost") so a converted deal
  // remains auditable instead of silently disappearing from the pipeline.
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(300);
  
  failIf(error, 'Failed to list leads');
  
  // Debug logging
  console.log('🔍 Leads API - listLeads():', {
    count: data?.length || 0,
    leads: data,
    statuses: data?.map(l => l.status),
  });
  
  return data ?? [];
}

export async function getLead(id: string) {
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .single();
  
  failIf(error, 'Failed to get lead');
  return data;
}

export async function createLead(input: LeadInput) {
  console.log('➕ Creating lead with input:', input);
  
  // Clean up the input - convert empty strings to null for optional fields.
  // `name` is the only truly required field (an empty lead isn't useful);
  // email is optional -- a lead can be created with just a name.
  const cleanedInput = Object.entries(input).reduce((acc, [key, value]) => {
    if (key === 'name') {
      acc[key] = value;
    } else {
      acc[key] = value === '' ? null : value;
    }
    return acc;
  }, {} as any);
  
  const { data, error } = await supabase
    .from('leads')
    .insert({
      ...cleanedInput,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Error creating lead:', error);
  } else {
    console.log('✅ Lead created successfully:', data);
  }
  
  failIf(error, 'Failed to create lead');
  
  // Send notification and email
  if (data) {
    // Show toast notification
    toast.success('New Lead Created!', {
      description: `${data.name} has been added to your CRM.`,
      duration: 5000,
    });
    
    // Send email notification via server
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-bcab437c/notifications/new-lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          leadId: data.id,
          leadName: data.name,
          leadEmail: data.email,
          leadPhone: data.phone,
          source: data.source || 'Unknown',
          sourceForm: data.source_form || null,
          sourcePage: data.source_page || null,
          serviceType: data.service_type || data.project_type || 'Not specified',
          projectAddress: data.project_address || null,
          province: data.province || null,
          consultationDate: data.consultation_date || null,
          consultationTime: data.consultation_time || null,
          projectDetails: data.project_details || data.message || null,
          company: data.company || null,
          submittedAt: data.created_at || new Date().toISOString(),
        }),
      });
    } catch (emailError) {
      // Don't fail the lead creation if email fails
      console.error('Failed to send email notification:', emailError);
    }
  }
  
  return data;
}

export async function updateLead(id: string, updates: LeadUpdate) {
  console.log('🔄 API updateLead called:', { id, updates });
  
  // Clean up the updates - convert empty strings to null for optional
  // fields. `name` stays required; email can be cleared back to null.
  const cleanedUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
    if (key === 'name') {
      acc[key] = value;
    } else {
      acc[key] = value === '' ? null : value;
    }
    return acc;
  }, {} as any);
  
  const payload = {
    ...cleanedUpdates,
    updated_at: now(),
  };
  
  console.log('📤 Supabase update payload:', payload);
  
  const { data, error } = await supabase
    .from('leads')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  
  if (error) {
    console.error('❌ Supabase update error:', error);
  } else {
    console.log('✅ Supabase update success:', data);
  }
  
  failIf(error, 'Failed to update lead');
  return data;
}

export async function deleteLead(id: string) {
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete lead');
}
