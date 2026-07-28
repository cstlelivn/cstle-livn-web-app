-- ============================================
-- AURA PERFORMANCE & COMPENSATION SYSTEM
-- ============================================
-- This migration adds task management with efficiency tracking,
-- quality ratings, bonuses, penalties, and Aura points.

-- ============================================
-- EXTEND TASKS TABLE
-- ============================================
-- Add Aura-specific fields to existing tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_type text, -- e.g. "Priming", "Painting", "Flooring", "Install"
ADD COLUMN IF NOT EXISTS expected_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_hours numeric,
ADD COLUMN IF NOT EXISTS hourly_rate numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'Medium', -- 'Light', 'Medium', 'Heavy'
ADD COLUMN IF NOT EXISTS quality_rating integer, -- 0-5 stars
ADD COLUMN IF NOT EXISTS rework_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS efficiency_ratio numeric,
ADD COLUMN IF NOT EXISTS base_pay numeric,
ADD COLUMN IF NOT EXISTS bonus_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS penalty_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_task_pay numeric,
ADD COLUMN IF NOT EXISTS aura_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_notes text,
ADD COLUMN IF NOT EXISTS completion_photos jsonb, -- array of photo URLs
ADD COLUMN IF NOT EXISTS finalized_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS finalized_at timestamptz;

-- Update status field to support new lifecycle: Planned, In Progress, Completed, Finalized
-- Existing statuses map as: "To Do" -> "Planned", "In Progress" -> "In Progress", "Done" -> "Completed"

-- ============================================
-- CREATE AURA LEDGER TABLE
-- ============================================
-- Immutable ledger of all finalized tasks with pay calculations
CREATE TABLE IF NOT EXISTS public.aura_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  pay_period_start timestamptz NOT NULL, -- Start of pay period
  pay_period_end timestamptz NOT NULL, -- End of pay period
  
  -- Task details (snapshot at finalization)
  task_type text,
  difficulty text,
  
  -- Time tracking
  expected_hours numeric NOT NULL,
  actual_hours numeric NOT NULL,
  efficiency_ratio numeric NOT NULL,
  
  -- Quality & Aura
  quality_rating integer NOT NULL, -- 0-5 stars
  aura_points integer NOT NULL,
  rework_hours numeric DEFAULT 0,
  
  -- Financial calculations
  hourly_rate numeric NOT NULL,
  base_pay numeric NOT NULL,
  efficiency_bonus_rate numeric NOT NULL,
  quality_bonus_rate numeric NOT NULL,
  bonus_amount numeric NOT NULL,
  penalty_amount numeric NOT NULL,
  net_adjustment numeric NOT NULL, -- bonus - penalty
  final_task_pay numeric NOT NULL,
  
  -- Metadata
  finalized_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  finalized_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- CREATE AURA SUMMARY TABLE
-- ============================================
-- Aggregated Aura stats per worker per pay period
CREATE TABLE IF NOT EXISTS public.aura_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pay_period_start timestamptz NOT NULL,
  pay_period_end timestamptz NOT NULL,
  
  -- Aggregated stats
  total_tasks integer DEFAULT 0,
  total_hours_expected numeric DEFAULT 0,
  total_hours_actual numeric DEFAULT 0,
  avg_efficiency_ratio numeric,
  avg_quality_rating numeric,
  
  -- Aura tracking
  total_aura_points integer DEFAULT 0,
  
  -- Financial totals
  total_base_pay numeric DEFAULT 0,
  total_bonus numeric DEFAULT 0,
  total_penalty numeric DEFAULT 0,
  total_final_pay numeric DEFAULT 0,
  
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one summary per worker per pay period
  UNIQUE(worker_id, pay_period_start, pay_period_end)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON public.tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON public.tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_finalized_at ON public.tasks(finalized_at);

CREATE INDEX IF NOT EXISTS idx_aura_ledger_worker ON public.aura_ledger(worker_id);
CREATE INDEX IF NOT EXISTS idx_aura_ledger_pay_period ON public.aura_ledger(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_aura_ledger_worker_period ON public.aura_ledger(worker_id, pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_aura_ledger_finalized_at ON public.aura_ledger(finalized_at);

CREATE INDEX IF NOT EXISTS idx_aura_summary_worker ON public.aura_summary(worker_id);
CREATE INDEX IF NOT EXISTS idx_aura_summary_period ON public.aura_summary(pay_period_start, pay_period_end);

-- ============================================
-- RLS POLICIES
-- ============================================

-- Tasks: Workers can view their own tasks, QC/Admin can view all
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Existing policies should be kept, add these for Aura fields
DROP POLICY IF EXISTS "Users can view their assigned tasks" ON public.tasks;
CREATE POLICY "Users can view their assigned tasks" ON public.tasks
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE id = assignee_id
    )
    OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('Admin', 'Manager', 'QC')
    )
  );

DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.tasks;
CREATE POLICY "Users can update their assigned tasks" ON public.tasks
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE id = assignee_id
    )
    OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('Admin', 'Manager', 'QC')
    )
  );

-- Aura Ledger: Workers can view their own, QC/Admin can view all
ALTER TABLE public.aura_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view their own aura ledger" ON public.aura_ledger
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE id = worker_id
    )
    OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('Admin', 'Manager', 'QC')
    )
  );

CREATE POLICY "QC and Admin can insert aura ledger entries" ON public.aura_ledger
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('Admin', 'QC')
    )
  );

-- Aura Summary: Workers can view their own, QC/Admin can view all
ALTER TABLE public.aura_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workers can view their own aura summary" ON public.aura_summary
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE id = worker_id
    )
    OR
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('Admin', 'Manager', 'QC')
    )
  );

CREATE POLICY "System can manage aura summaries" ON public.aura_summary
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get current pay period (bi-weekly, starting from a reference date)
CREATE OR REPLACE FUNCTION public.get_current_pay_period()
RETURNS TABLE(period_start timestamptz, period_end timestamptz)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  reference_date timestamptz := '2024-01-01'::timestamptz; -- Reference Monday
  days_since_ref integer;
  period_number integer;
BEGIN
  days_since_ref := EXTRACT(DAY FROM now() - reference_date)::integer;
  period_number := FLOOR(days_since_ref / 14.0)::integer;
  
  period_start := reference_date + (period_number * interval '14 days');
  period_end := period_start + interval '14 days' - interval '1 second';
  
  RETURN QUERY SELECT period_start, period_end;
END;
$$;

-- Function to calculate pay period for a given date
CREATE OR REPLACE FUNCTION public.get_pay_period_for_date(target_date timestamptz)
RETURNS TABLE(period_start timestamptz, period_end timestamptz)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  reference_date timestamptz := '2024-01-01'::timestamptz;
  days_since_ref integer;
  period_number integer;
BEGIN
  days_since_ref := EXTRACT(DAY FROM target_date - reference_date)::integer;
  period_number := FLOOR(days_since_ref / 14.0)::integer;
  
  period_start := reference_date + (period_number * interval '14 days');
  period_end := period_start + interval '14 days' - interval '1 second';
  
  RETURN QUERY SELECT period_start, period_end;
END;
$$;

-- Function to update aura summary when a task is finalized
CREATE OR REPLACE FUNCTION public.update_aura_summary()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_worker_id uuid;
BEGIN
  -- Only process finalized tasks
  IF NEW.status != 'Finalized' OR NEW.finalized_at IS NULL THEN
    RETURN NEW;
  END IF;
  
  v_worker_id := NEW.assignee_id;
  
  -- Get pay period for finalization date
  SELECT period_start, period_end INTO v_period_start, v_period_end
  FROM public.get_pay_period_for_date(NEW.finalized_at);
  
  -- Insert or update aura summary
  INSERT INTO public.aura_summary (
    worker_id,
    pay_period_start,
    pay_period_end,
    total_tasks,
    total_hours_expected,
    total_hours_actual,
    avg_efficiency_ratio,
    avg_quality_rating,
    total_aura_points,
    total_base_pay,
    total_bonus,
    total_penalty,
    total_final_pay
  )
  SELECT
    v_worker_id,
    v_period_start,
    v_period_end,
    COUNT(*),
    COALESCE(SUM(expected_hours), 0),
    COALESCE(SUM(actual_hours), 0),
    COALESCE(AVG(efficiency_ratio), 0),
    COALESCE(AVG(quality_rating), 0),
    COALESCE(SUM(aura_points), 0),
    COALESCE(SUM(base_pay), 0),
    COALESCE(SUM(bonus_amount), 0),
    COALESCE(SUM(penalty_amount), 0),
    COALESCE(SUM(final_task_pay), 0)
  FROM public.tasks
  WHERE assignee_id = v_worker_id
    AND status = 'Finalized'
    AND finalized_at >= v_period_start
    AND finalized_at <= v_period_end
  ON CONFLICT (worker_id, pay_period_start, pay_period_end)
  DO UPDATE SET
    total_tasks = EXCLUDED.total_tasks,
    total_hours_expected = EXCLUDED.total_hours_expected,
    total_hours_actual = EXCLUDED.total_hours_actual,
    avg_efficiency_ratio = EXCLUDED.avg_efficiency_ratio,
    avg_quality_rating = EXCLUDED.avg_quality_rating,
    total_aura_points = EXCLUDED.total_aura_points,
    total_base_pay = EXCLUDED.total_base_pay,
    total_bonus = EXCLUDED.total_bonus,
    total_penalty = EXCLUDED.total_penalty,
    total_final_pay = EXCLUDED.total_final_pay,
    updated_at = now();
    
  RETURN NEW;
END;
$$;

-- Trigger to update aura summary on task finalization
DROP TRIGGER IF EXISTS trigger_update_aura_summary ON public.tasks;
CREATE TRIGGER trigger_update_aura_summary
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_aura_summary();

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE ON public.tasks TO authenticated;
GRANT SELECT ON public.aura_ledger TO authenticated;
GRANT INSERT ON public.aura_ledger TO authenticated;
GRANT SELECT ON public.aura_summary TO authenticated;
GRANT ALL ON public.aura_summary TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE public.aura_ledger IS 'Immutable ledger of finalized tasks with complete pay calculations';
COMMENT ON TABLE public.aura_summary IS 'Aggregated Aura performance and pay stats per worker per pay period';
COMMENT ON COLUMN public.tasks.expected_hours IS 'Planned hours for task (used for base pay calculation)';
COMMENT ON COLUMN public.tasks.actual_hours IS 'Actual hours spent on task (used for efficiency calculation)';
COMMENT ON COLUMN public.tasks.efficiency_ratio IS 'expected_hours / actual_hours (capped 0.7-1.4)';
COMMENT ON COLUMN public.tasks.quality_rating IS 'QC rating: 0-5 stars';
COMMENT ON COLUMN public.tasks.rework_hours IS 'Hours of rework required (0-3, creates penalty)';
COMMENT ON COLUMN public.tasks.base_pay IS 'expected_hours × hourly_rate';
COMMENT ON COLUMN public.tasks.bonus_amount IS 'Efficiency + quality bonus (capped at 20% of base pay)';
COMMENT ON COLUMN public.tasks.penalty_amount IS 'rework_hours × hourly_rate';
COMMENT ON COLUMN public.tasks.final_task_pay IS 'base_pay + bonus_amount - penalty_amount';
COMMENT ON COLUMN public.tasks.aura_points IS 'Points earned: 5★→+5, 4★→+3, 3★→+1, 2★→-1, 1★→-3, 0★→-5';
