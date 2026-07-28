import { createClient } from '../../../utils/supabase/client.tsx';
import { projectId, publicAnonKey } from '../../../utils/supabase/info.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

export interface ExpenseInput {
  project_id: string;
  expense_date: string;
  expense_amount: number;
  expense_category: string;
  vendor_id?: string;
  description: string;
  receipt_url?: string;
  notes?: string;
}

export interface ExpenseUpdate {
  project_id?: string;
  expense_date?: string;
  expense_amount?: number;
  expense_category?: string;
  vendor_id?: string;
  description?: string;
  receipt_url?: string;
  notes?: string;
}

export async function listExpenses(filters?: { projectId?: string; vendorId?: string }) {
  try {
    let query = supabase
      .from('project_expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .limit(500);
    
    if (filters?.projectId) {
      query = query.eq('project_id', filters.projectId);
    }
    
    if (filters?.vendorId) {
      query = query.eq('vendor_id', filters.vendorId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('❌ Supabase error loading expenses:', error);
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        throw new Error(
          'Finance tables not set up. Please run /src/db/migrations/003_project_client_finances.sql in your Supabase SQL Editor.'
        );
      }
      failIf(error, 'Failed to list expenses');
    }
    
    return data ?? [];
  } catch (error: any) {
    console.error('Failed to list expenses:', error);
    throw error;
  }
}

export async function getExpense(id: string) {
  const { data, error } = await supabase
    .from('project_expenses')
    .select('*')
    .eq('id', id)
    .single();
  
  failIf(error, 'Failed to get expense');
  return data;
}

export async function createExpense(input: ExpenseInput) {
  const { data, error } = await supabase
    .from('project_expenses')
    .insert({
      ...input,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  
  failIf(error, 'Failed to create expense');
  console.log('✅ Expense created successfully');
  return data;
}

export async function updateExpense(id: string, updates: ExpenseUpdate) {
  const { data, error } = await supabase
    .from('project_expenses')
    .update({
      ...updates,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update expense');
  console.log('✅ Expense updated successfully');
  return data;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase
    .from('project_expenses')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete expense');
  console.log('✅ Expense deleted successfully');
}

// Get expense summary for a project
export async function getProjectExpenseSummary(projectId: string) {
  const { data, error } = await supabase
    .from('project_expenses')
    .select('expense_amount, expense_category')
    .eq('project_id', projectId);
  
  failIf(error, 'Failed to get project expense summary');
  
  const totalExpenses = data?.reduce((sum, expense) => sum + Number(expense.expense_amount), 0) ?? 0;
  
  // Group by category
  const byCategory: Record<string, number> = {};
  data?.forEach(expense => {
    const category = expense.expense_category || 'General';
    byCategory[category] = (byCategory[category] || 0) + Number(expense.expense_amount);
  });
  
  return {
    totalExpenses,
    expenseCount: data?.length ?? 0,
    byCategory,
  };
}