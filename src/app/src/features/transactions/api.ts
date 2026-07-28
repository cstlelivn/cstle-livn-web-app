import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export interface TransactionInput {
  projectId?: number;
  type: string;
  category?: string;
  amount: number;
  description?: string;
  date: string;
  vendor?: number;
  status?: string;
  phaseName?: string; // Phase this expense belongs to (for expenses attached to projects)
}

export interface TransactionUpdate {
  projectId?: number;
  type?: string;
  category?: string;
  amount?: number;
  description?: string;
  date?: string;
  vendor?: number;
  status?: string;
  phaseName?: string; // Phase this expense belongs to
}

// Transform database row to Transaction format (snake_case to camelCase)
function transformTransaction(dbTransaction: any) {
  return {
    ...dbTransaction,
    type: dbTransaction.transaction_type, // Map transaction_type back to type
    projectId: dbTransaction.project_id,
    phaseName: dbTransaction.phase_name,
  };
}

export async function listTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
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
    transaction_type: input.type, // Database column is transaction_type, not type
    category: input.category,
    amount: input.amount,
    description: input.description,
    date: input.date,
    vendor_id: input.vendor,
    status: input.status || 'Completed',
    phase_name: input.phaseName,
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
  if (updates.type !== undefined) dbUpdates.transaction_type = updates.type; // Database column is transaction_type, not type
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
  if (updates.description !== undefined) dbUpdates.description = updates.description;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.vendor !== undefined) dbUpdates.vendor_id = updates.vendor;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.phaseName !== undefined) dbUpdates.phase_name = updates.phaseName;

  const { data, error } = await supabase
    .from('transactions')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update transaction');
  return data ? transformTransaction(data) : null;
}

export async function deleteTransaction(id: number) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete transaction');
}