import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export interface TransactionInput {
  projectId?: string | null;
  type: string;
  category?: string;
  amount: number;
  description?: string;
  date: string;
  vendor?: string | null;
  clientId?: string | null;
  status?: string;
  phaseName?: string; // Phase this expense belongs to (for expenses attached to projects)
  recipientOrVendor?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

export interface TransactionUpdate {
  projectId?: string | null;
  type?: string;
  category?: string;
  amount?: number;
  description?: string;
  date?: string;
  vendor?: string | null;
  clientId?: string | null;
  status?: string;
  phaseName?: string; // Phase this expense belongs to
  recipientOrVendor?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
}

// Transform database row to Transaction format (snake_case to camelCase)
function transformTransaction(dbTransaction: any) {
  return {
    ...dbTransaction,
    type: dbTransaction.type,
    projectId: dbTransaction.project_id,
    phaseName: dbTransaction.phase_name,
    clientId: dbTransaction.client_id,
    vendor: dbTransaction.vendor_id,
    recipientOrVendor: dbTransaction.recipient_or_vendor,
    paymentMethod: dbTransaction.payment_method,
  };
}

export async function listTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, project:projects(id,title), client:clients(id,name), vendor:vendors(id,name)')
    .order('date', { ascending: false })
    .limit(300);
  
  failIf(error, 'Failed to list transactions');
  return (data ?? []).map(transformTransaction);
}

export async function getTransaction(id: string) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .single();
  
  failIf(error, 'Failed to get transaction');
  return data ? transformTransaction(data) : null;
}

export async function createTransaction(input: TransactionInput) {
  // Transform camelCase to snake_case for database
  const dbInput: any = {
    project_id: input.projectId,
    type: input.type,
    category: input.category,
    amount: input.amount,
    description: input.description,
    date: input.date,
    vendor_id: input.vendor,
    client_id: input.clientId,
    status: input.status || 'Completed',
    phase_name: input.phaseName,
    recipient_or_vendor: input.recipientOrVendor,
    payment_method: input.paymentMethod,
    notes: input.notes,
    created_at: now(),
    updated_at: now(),
  };

  const { data, error } = await supabase
    .from('transactions')
    .insert(dbInput)
    .select()
    .single();
  
  failIf(error, 'Failed to create transaction');
  return data ? transformTransaction(data) : null;
}

export async function updateTransaction(id: number, updates: TransactionUpdate) {
  // Transform camelCase to snake_case for database
  const dbUpdates: any = {
    updated_at: now(),
  };
  
  if (updates.projectId !== undefined) dbUpdates.project_id = updates.projectId;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.vendor !== undefined) dbUpdates.vendor_id = updates.vendor;
  if (updates.clientId !== undefined) dbUpdates.client_id = updates.clientId;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.phaseName !== undefined) dbUpdates.phase_name = updates.phaseName;
  if (updates.recipientOrVendor !== undefined) dbUpdates.recipient_or_vendor = updates.recipientOrVendor;
  if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { data, error } = await supabase
    .from('transactions')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update transaction');
  return data ? transformTransaction(data) : null;
}

export async function deleteTransaction(id: string) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete transaction');
}
