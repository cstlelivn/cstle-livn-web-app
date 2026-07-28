/**
 * Aura Performance & Compensation System API
 * Handles task lifecycle with efficiency tracking, quality ratings, and pay calculations
 */

import { supabase } from '../../../utils/supabase/client.tsx';

// ============================================
// TYPES
// ============================================

export interface AuraTask {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  status: 'Planned' | 'In Progress' | 'Completed' | 'Finalized';
  assignee_id: string;
  
  // Aura-specific fields
  task_type?: string;
  expected_hours: number;
  actual_hours?: number;
  hourly_rate: number;
  difficulty: 'Light' | 'Medium' | 'Heavy';
  quality_rating?: number; // 0-5
  rework_hours?: number;
  
  // Calculated fields
  efficiency_ratio?: number;
  base_pay?: number;
  bonus_amount?: number;
  penalty_amount?: number;
  final_task_pay?: number;
  aura_points?: number;
  
  // Metadata
  completion_notes?: string;
  completion_photos?: string[];
  finalized_by?: string;
  finalized_at?: string;
  
  created_at: string;
  updated_at: string;
  due_date?: string;
}

export interface AuraLedgerEntry {
  id: string;
  worker_id: string;
  project_id?: string;
  task_id?: string;
  pay_period_start: string;
  pay_period_end: string;
  
  task_type?: string;
  difficulty?: string;
  
  expected_hours: number;
  actual_hours: number;
  efficiency_ratio: number;
  
  quality_rating: number;
  aura_points: number;
  rework_hours: number;
  
  hourly_rate: number;
  base_pay: number;
  efficiency_bonus_rate: number;
  quality_bonus_rate: number;
  bonus_amount: number;
  penalty_amount: number;
  net_adjustment: number;
  final_task_pay: number;
  
  finalized_by?: string;
  finalized_at: string;
  notes?: string;
  
  created_at: string;
}

export interface AuraSummary {
  id: string;
  worker_id: string;
  pay_period_start: string;
  pay_period_end: string;
  
  total_tasks: number;
  total_hours_expected: number;
  total_hours_actual: number;
  avg_efficiency_ratio: number;
  avg_quality_rating: number;
  
  total_aura_points: number;
  
  total_base_pay: number;
  total_bonus: number;
  total_penalty: number;
  total_final_pay: number;
  
  updated_at: string;
  created_at: string;
}

export interface PayPeriod {
  period_start: string;
  period_end: string;
}

// ============================================
// PAY CALCULATION LOGIC
// ============================================

/**
 * Calculate all pay metrics for a task
 * Follows exact formulas from requirements
 */
export function calculateTaskPay(
  expectedHours: number,
  actualHours: number,
  hourlyRate: number,
  qualityRating: number, // 0-5
  reworkHours: number = 0
): {
  basePay: number;
  efficiencyRatio: number;
  efficiencyBonusRate: number;
  qualityBonusRate: number;
  bonusAmount: number;
  penaltyAmount: number;
  finalTaskPay: number;
  auraPoints: number;
} {
  // Base Pay = expected_hours × hourly_rate
  const basePay = expectedHours * hourlyRate;
  
  // Efficiency Ratio = expected_hours / actual_hours (capped 0.7 - 1.4)
  const efficiencyRatio = Math.max(0.7, Math.min(1.4, expectedHours / actualHours));
  
  // Efficiency Bonus Rate = (efficiency_capped - 1) × 0.25
  const efficiencyBonusRate = (efficiencyRatio - 1) * 0.25;
  
  // Quality Bonus Rate (exact mapping)
  const qualityBonusRateMap: Record<number, number> = {
    5: 0.10,  // +10%
    4: 0.06,  // +6%
    3: 0.02,  // +2%
    2: 0.00,  // 0%
    1: -0.04, // -4%
    0: -0.08  // -8%
  };
  const qualityBonusRate = qualityBonusRateMap[qualityRating] || 0;
  
  // Total Bonus = base_pay × (efficiency + quality) capped at 20% of base
  const rawBonus = basePay * (efficiencyBonusRate + qualityBonusRate);
  const bonusAmount = Math.min(rawBonus, basePay * 0.20);
  
  // Penalty = rework_hours × hourly_rate
  const penaltyAmount = reworkHours * hourlyRate;
  
  // Final Task Pay = base_pay + bonus - penalty
  const finalTaskPay = basePay + bonusAmount - penaltyAmount;
  
  // Aura Points (exact mapping)
  const auraPointsMap: Record<number, number> = {
    5: 5,
    4: 3,
    3: 1,
    2: -1,
    1: -3,
    0: -5
  };
  const auraPoints = auraPointsMap[qualityRating] || 0;
  
  return {
    basePay: Number(basePay.toFixed(2)),
    efficiencyRatio: Number(efficiencyRatio.toFixed(3)),
    efficiencyBonusRate: Number(efficiencyBonusRate.toFixed(3)),
    qualityBonusRate: Number(qualityBonusRate.toFixed(3)),
    bonusAmount: Number(bonusAmount.toFixed(2)),
    penaltyAmount: Number(penaltyAmount.toFixed(2)),
    finalTaskPay: Number(finalTaskPay.toFixed(2)),
    auraPoints
  };
}

/**
 * Map quality rating to Aura points
 */
export function getAuraPoints(qualityRating: number): number {
  const map: Record<number, number> = {
    5: 5, 4: 3, 3: 1, 2: -1, 1: -3, 0: -5
  };
  return map[qualityRating] || 0;
}

// ============================================
// TASK CRUD OPERATIONS
// ============================================

/**
 * Create a new task (Planned status)
 */
export async function createAuraTask(task: Partial<AuraTask>) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      ...task,
      status: 'Planned',
      hourly_rate: task.hourly_rate || 15,
      difficulty: task.difficulty || 'Medium',
      expected_hours: task.expected_hours || 0
    })
    .select()
    .single();
  
  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return data as AuraTask;
}

/**
 * Update task (for workers to mark as In Progress or Completed)
 */
export async function updateAuraTask(taskId: string, updates: Partial<AuraTask>) {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return data as AuraTask;
}

/**
 * Worker marks task as completed
 */
export async function completeTask(
  taskId: string,
  notes?: string,
  photos?: string[]
) {
  const { data, error } = await supabase
    .from('tasks')
    .update({
      status: 'Completed',
      completion_notes: notes,
      completion_photos: photos,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to complete task: ${error.message}`);
  return data as AuraTask;
}

/**
 * QC finalizes task with rating and calculations
 * This is the single-step finalization action
 */
export async function finalizeTask(
  taskId: string,
  actualHours: number,
  qualityRating: number, // 0-5
  reworkHours: number = 0,
  notes?: string,
  finalizedBy?: string
) {
  // First, get the task to access expected_hours and hourly_rate
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  
  if (fetchError) throw new Error(`Failed to fetch task: ${fetchError.message}`);
  if (!task) throw new Error('Task not found');
  
  const expectedHours = task.expected_hours || 0;
  const hourlyRate = task.hourly_rate || 15;
  
  // Calculate all pay metrics
  const calculations = calculateTaskPay(
    expectedHours,
    actualHours,
    hourlyRate,
    qualityRating,
    reworkHours
  );
  
  // Update task with calculations and mark as Finalized
  const { data: finalizedTask, error: updateError } = await supabase
    .from('tasks')
    .update({
      status: 'Finalized',
      actual_hours: actualHours,
      quality_rating: qualityRating,
      rework_hours: reworkHours,
      efficiency_ratio: calculations.efficiencyRatio,
      base_pay: calculations.basePay,
      bonus_amount: calculations.bonusAmount,
      penalty_amount: calculations.penaltyAmount,
      final_task_pay: calculations.finalTaskPay,
      aura_points: calculations.auraPoints,
      finalized_by: finalizedBy,
      finalized_at: new Date().toISOString(),
      review_feedback: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .select()
    .single();
  
  if (updateError) throw new Error(`Failed to finalize task: ${updateError.message}`);
  
  // Get pay period
  const { data: payPeriod, error: periodError } = await supabase
    .rpc('get_pay_period_for_date', { target_date: new Date().toISOString() })
    .single();
  
  if (periodError) {
    console.error('Failed to get pay period, using default:', periodError);
  }
  
  // Create ledger entry
  if (payPeriod && finalizedTask.assignee_id) {
    const ledgerEntry = {
      worker_id: finalizedTask.assignee_id,
      project_id: finalizedTask.project_id,
      task_id: taskId,
      pay_period_start: payPeriod.period_start,
      pay_period_end: payPeriod.period_end,
      task_type: finalizedTask.task_type,
      difficulty: finalizedTask.difficulty,
      expected_hours: expectedHours,
      actual_hours: actualHours,
      efficiency_ratio: calculations.efficiencyRatio,
      quality_rating: qualityRating,
      aura_points: calculations.auraPoints,
      rework_hours: reworkHours,
      hourly_rate: hourlyRate,
      base_pay: calculations.basePay,
      efficiency_bonus_rate: calculations.efficiencyBonusRate,
      quality_bonus_rate: calculations.qualityBonusRate,
      bonus_amount: calculations.bonusAmount,
      penalty_amount: calculations.penaltyAmount,
      net_adjustment: calculations.bonusAmount - calculations.penaltyAmount,
      final_task_pay: calculations.finalTaskPay,
      finalized_by: finalizedBy,
      finalized_at: new Date().toISOString(),
      notes: notes
    };
    
    const { error: ledgerError } = await supabase
      .from('aura_ledger')
      .insert(ledgerEntry);
    
    if (ledgerError) {
      console.error('Failed to create ledger entry:', ledgerError);
    }
  }
  
  return finalizedTask as AuraTask;
}

// ============================================
// QUERY OPERATIONS
// ============================================

/**
 * Get tasks for a worker
 */
export async function getWorkerTasks(workerId: string, status?: string) {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('assignee_id', workerId)
    .order('created_at', { ascending: false });
  
  if (status) {
    query = query.eq('status', status);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to fetch worker tasks: ${error.message}`);
  return (data || []) as AuraTask[];
}

/**
 * Get all tasks for a project
 */
export async function getProjectTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  
  if (error) throw new Error(`Failed to fetch project tasks: ${error.message}`);
  return (data || []) as AuraTask[];
}

/**
 * Get current pay period
 */
export async function getCurrentPayPeriod(): Promise<PayPeriod> {
  const { data, error } = await supabase
    .rpc('get_current_pay_period')
    .single();
  
  if (error) throw new Error(`Failed to get current pay period: ${error.message}`);
  return data as PayPeriod;
}

/**
 * Get Aura summary for a worker in current pay period
 */
export async function getWorkerAuraSummary(workerId: string): Promise<AuraSummary | null> {
  const payPeriod = await getCurrentPayPeriod();
  
  const { data, error } = await supabase
    .from('aura_summary')
    .select('*')
    .eq('worker_id', workerId)
    .eq('pay_period_start', payPeriod.period_start)
    .eq('pay_period_end', payPeriod.period_end)
    .maybeSingle();
  
  if (error) throw new Error(`Failed to fetch Aura summary: ${error.message}`);
  return data as AuraSummary | null;
}

/**
 * Get Aura ledger entries for a worker
 */
export async function getWorkerAuraLedger(
  workerId: string,
  payPeriodStart?: string,
  payPeriodEnd?: string
): Promise<AuraLedgerEntry[]> {
  let query = supabase
    .from('aura_ledger')
    .select('*')
    .eq('worker_id', workerId)
    .order('finalized_at', { ascending: false });
  
  if (payPeriodStart && payPeriodEnd) {
    query = query
      .eq('pay_period_start', payPeriodStart)
      .eq('pay_period_end', payPeriodEnd);
  }
  
  const { data, error } = await query;
  
  if (error) throw new Error(`Failed to fetch Aura ledger: ${error.message}`);
  return (data || []) as AuraLedgerEntry[];
}

/**
 * Get all Aura summaries for current pay period (for payroll screen)
 */
export async function getAllAuraSummaries(): Promise<AuraSummary[]> {
  const payPeriod = await getCurrentPayPeriod();
  
  const { data, error } = await supabase
    .from('aura_summary')
    .select('*')
    .eq('pay_period_start', payPeriod.period_start)
    .eq('pay_period_end', payPeriod.period_end)
    .order('total_final_pay', { ascending: false });
  
  if (error) throw new Error(`Failed to fetch all Aura summaries: ${error.message}`);
  return (data || []) as AuraSummary[];
}

/**
 * Delete a task (only if not finalized)
 */
export async function deleteAuraTask(taskId: string) {
  // Check if task is finalized
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('status')
    .eq('id', taskId)
    .single();
  
  if (fetchError) throw new Error(`Failed to fetch task: ${fetchError.message}`);
  if (task?.status === 'Finalized') {
    throw new Error('Cannot delete finalized tasks');
  }
  
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}