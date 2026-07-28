-- =====================================================
-- ENABLE REALTIME FOR ALL TABLES - CSTLE LIVN ADMIN PANEL
-- =====================================================
-- Run this script in your Supabase SQL Editor to enable Realtime
-- This will allow WebSocket subscriptions to work properly for live updates
-- across all collaborative features

-- Step 1: Set REPLICA IDENTITY to FULL for all tables
-- This is required for Realtime to track DELETE events properly
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.projects REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_updates REPLICA IDENTITY FULL;
ALTER TABLE public.qc_requests REPLICA IDENTITY FULL;
ALTER TABLE public.phase_qc_reviews REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.team_members REPLICA IDENTITY FULL;
ALTER TABLE public.vendors REPLICA IDENTITY FULL;
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.inventory REPLICA IDENTITY FULL;
ALTER TABLE public.inventory_transactions REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.task_templates REPLICA IDENTITY FULL;
ALTER TABLE public.payments_received REPLICA IDENTITY FULL;
ALTER TABLE public.project_expenses REPLICA IDENTITY FULL;
ALTER TABLE public.project_purchases REPLICA IDENTITY FULL;

-- Step 2: Add tables to the supabase_realtime publication
-- This enables Realtime subscriptions for these tables
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'users',
    'projects', 
    'tasks',
    'task_updates',
    'qc_requests',
    'phase_qc_reviews',
    'messages',
    'team_members',
    'vendors',
    'clients',
    'leads',
    'inventory',
    'inventory_transactions',
    'transactions',
    'activities',
    'task_templates',
    'payments_received',
    'project_expenses',
    'project_purchases'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      RAISE NOTICE 'Added table % to realtime publication', tbl;
    EXCEPTION 
      WHEN duplicate_object THEN
        RAISE NOTICE 'Table % already in realtime publication', tbl;
      WHEN undefined_object THEN
        RAISE WARNING 'Publication supabase_realtime does not exist. Please enable Realtime in your Supabase project settings.';
    END;
  END LOOP;
END $$;

-- Step 3: Verify the setup
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN tablename = ANY(
      SELECT tablename::text 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime'
    ) THEN '✅ Enabled'
    ELSE '❌ Not Enabled'
  END as realtime_status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 'projects', 'tasks', 'task_updates', 'qc_requests',
    'phase_qc_reviews', 'messages', 'team_members', 'vendors',
    'clients', 'leads', 'inventory', 'inventory_transactions',
    'transactions', 'activities', 'task_templates',
    'payments_received', 'project_expenses', 'project_purchases'
  )
ORDER BY tablename;

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
-- If you see "undefined_object" error for supabase_realtime publication:
-- 1. Go to Database > Replication in Supabase Dashboard
-- 2. Enable replication for the tables you want to subscribe to
-- 3. Or contact Supabase support to enable Realtime for your project

-- To check if Realtime is enabled for your project:
-- SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- To see which tables are in the publication:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- To manually add a table to the publication:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.your_table_name;

-- To remove a table from the publication:
-- ALTER PUBLICATION supabase_realtime DROP TABLE public.your_table_name;