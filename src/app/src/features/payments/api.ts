import { createClient } from '../../../utils/supabase/client.tsx';
import { projectId, publicAnonKey } from '../../../utils/supabase/info.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export interface PaymentInput {
  client_id: string;
  project_id?: string;
  payment_date: string;
  payment_amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface PaymentUpdate {
  client_id?: string;
  project_id?: string;
  payment_date?: string;
  payment_amount?: number;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}

export async function listPayments(filters?: { clientId?: string; projectId?: string }) {
  try {
    let query = supabase
      .from('payments_received')
      .select('*')
      .order('payment_date', { ascending: false })
      .limit(500);
    
    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }
    
    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Supabase error loading payments:', error);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        throw new Error(
          'Finance tables not set up. Please run /src/db/migrations/003_project_client_finances.sql in your Supabase SQL Editor.'
        );
      }
      failIf(error, 'Failed to list payments');
    }
    
    return data ?? [];
  } catch (error: any) {
    console.error('Failed to list payments:', error);
    throw error;
  }
}

export async function getPayment(id: string) {
  const { data, error } = await supabase
    .from('payments_received')
    .select('*')
    .eq('id', id)
    .single();
  
  failIf(error, 'Failed to get payment');
  return data;
}

export async function createPayment(input: PaymentInput) {
  const { data, error } = await supabase
    .from('payments_received')
    .insert({
      ...input,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  
  failIf(error, 'Failed to create payment');
  console.log('✅ Payment created successfully');
  return data;
}

export async function updatePayment(id: string, updates: PaymentUpdate) {
  const { data, error } = await supabase
    .from('payments_received')
    .update({
      ...updates,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update payment');
  console.log('✅ Payment updated successfully');
  return data;
}

export async function deletePayment(id: string) {
  const { error } = await supabase
    .from('payments_received')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete payment');
  console.log('✅ Payment deleted successfully');
}

// Get payment summary for a client
export async function getClientPaymentSummary(clientId: string) {
  const { data, error } = await supabase
    .from('payments_received')
    .select('payment_amount')
    .eq('client_id', clientId);
  
  failIf(error, 'Failed to get client payment summary');
  
  const totalPaid = data?.reduce((sum, payment) => sum + Number(payment.payment_amount), 0) ?? 0;
  
  return {
    totalPaid,
    paymentCount: data?.length ?? 0,
  };
}

// Get payment summary for a project
export async function getProjectPaymentSummary(projectId: string) {
  const { data, error } = await supabase
    .from('payments_received')
    .select('payment_amount')
    .eq('project_id', projectId);
  
  failIf(error, 'Failed to get project payment summary');
  
  const totalPaid = data?.reduce((sum, payment) => sum + Number(payment.payment_amount), 0) ?? 0;
  
  return {
    totalPaid,
    paymentCount: data?.length ?? 0,
  };
}