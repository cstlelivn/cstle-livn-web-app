-- =====================================================
-- COMPLETE REALTIME SETUP FOR CSTLE LIVN ADMIN PANEL
-- =====================================================
-- Instructions:
-- 1. Open Supabase Dashboard (https://supabase.com/dashboard)
-- 2. Select your project
-- 3. Go to SQL Editor (left sidebar)
-- 4. Copy this ENTIRE script
-- 5. Paste and click "Run"
-- 6. Check the results at the bottom - all tables should show "✅ Enabled"
-- 7. Refresh your application
-- =====================================================

-- Step 1: Set REPLICA IDENTITY to FULL for all tables
-- This allows Realtime to track all changes including DELETE events
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

-- Step 2: Add tables to the supabase_realtime publication
-- This enables WebSocket subscriptions for live updates
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
    'task_templates'
  ];
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
      RAISE NOTICE '✅ Added table % to realtime publication', tbl;
    EXCEPTION 
      WHEN duplicate_object THEN
        RAISE NOTICE '✅ Table % already in realtime publication', tbl;
      WHEN undefined_object THEN
        RAISE WARNING '❌ Publication supabase_realtime does not exist. Please enable Realtime in your Supabase project settings first.';
        RAISE WARNING '   Go to: Database > Replication > Enable supabase_realtime publication';
    END;
  END LOOP;
END $$;

-- Step 3: Verify the setup
-- This will show you which tables have Realtime enabled
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
    'transactions', 'activities', 'task_templates'
  )
ORDER BY tablename;

-- =====================================================
-- EXPECTED OUTPUT
-- =====================================================
-- You should see a table with three columns:
-- schemaname | tablename             | realtime_status
-- -----------|-----------------------|----------------
-- public     | activities            | ✅ Enabled
-- public     | clients               | ✅ Enabled
-- public     | inventory             | ✅ Enabled
-- public     | inventory_transactions| ✅ Enabled
-- public     | leads                 | ✅ Enabled
-- ... (all tables should show ✅ Enabled)
--
-- If ANY table shows "❌ Not Enabled":
-- 1. Check the error messages above in the script output
-- 2. You may need to enable Realtime for your project first
-- 3. Go to: Database > Replication in Supabase Dashboard
-- 4. Enable the supabase_realtime publication
-- =====================================================

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================
-- If you see "undefined_object" error:
-- The supabase_realtime publication doesn't exist. This means:
-- 1. Realtime is not enabled for your project
-- 2. Go to your Supabase Dashboard
-- 3. Navigate to Database > Replication
-- 4. Enable Realtime for your project
-- 5. Then re-run this script
--
-- To manually check if Realtime is enabled:
-- SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';
--
-- To see which tables are currently in the publication:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- =====================================================
