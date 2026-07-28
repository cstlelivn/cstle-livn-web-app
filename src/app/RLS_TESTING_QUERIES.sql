-- =====================================================
-- RLS OPTIMIZATION - TESTING & VERIFICATION QUERIES
-- =====================================================
-- Use these queries to verify the optimization worked
-- Run BEFORE and AFTER migration to see improvements
-- =====================================================

-- =====================================================
-- PART 1: CHECK CURRENT POLICIES
-- =====================================================

-- View all current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
ORDER BY tablename, policyname;

-- Count policies per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public' 
GROUP BY tablename
ORDER BY tablename;

-- Check for optimized policies (should have 'opt_' prefix after migration)
SELECT 
  tablename,
  COUNT(*) as optimized_policies
FROM pg_policies 
WHERE schemaname = 'public' 
  AND policyname LIKE 'opt_%'
GROUP BY tablename
ORDER BY tablename;

-- =====================================================
-- PART 2: CHECK INDEXES
-- =====================================================

-- View all indexes on public schema
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Count indexes per table
SELECT 
  tablename,
  COUNT(*) as index_count
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Check for missing indexes on foreign keys
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  CASE 
    WHEN i.indexname IS NOT NULL THEN 'INDEXED ✅'
    ELSE 'MISSING INDEX ❌'
  END as index_status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_indexes i 
  ON i.tablename = tc.table_name 
  AND i.indexdef LIKE '%' || kcu.column_name || '%'
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- PART 3: PERFORMANCE TESTING - QUERY PLANS
-- =====================================================

-- Test 1: Simple SELECT (should use index after optimization)
EXPLAIN ANALYZE 
SELECT * FROM public.clients 
WHERE status = 'Active';

-- Test 2: Foreign key JOIN (should use index scans)
EXPLAIN ANALYZE
SELECT p.*, c.name as client_name
FROM public.projects p
JOIN public.clients c ON p.client = c.id
WHERE p.status = 'Active'
LIMIT 100;

-- Test 3: Tasks by project (should use idx_tasks_project_id)
EXPLAIN ANALYZE
SELECT * FROM public.tasks
WHERE project_id = (SELECT id FROM public.projects LIMIT 1);

-- Test 4: Transactions with multiple joins
EXPLAIN ANALYZE
SELECT 
  t.*,
  p.title as project_title,
  c.name as client_name,
  v.name as vendor_name
FROM public.transactions t
LEFT JOIN public.projects p ON t.project_id = p.id
LEFT JOIN public.clients c ON t.client_id = c.id
LEFT JOIN public.vendors v ON t.vendor_id = v.id
WHERE t.date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY t.date DESC
LIMIT 50;

-- Test 5: Inventory transactions (check for RLS warnings)
EXPLAIN ANALYZE
SELECT * FROM public.inventory_transactions
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
LIMIT 100;

-- Test 6: Payments received (check for auth.role warnings)
EXPLAIN ANALYZE
SELECT * FROM public.payments_received
WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
LIMIT 100;

-- Test 7: Project expenses (check for auth.role warnings)
EXPLAIN ANALYZE
SELECT * FROM public.project_expenses
WHERE expense_date >= CURRENT_DATE - INTERVAL '30 days'
LIMIT 100;

-- Test 8: Project purchases (check for auth.role warnings)
EXPLAIN ANALYZE
SELECT * FROM public.project_purchases
WHERE purchase_date >= CURRENT_DATE - INTERVAL '30 days'
LIMIT 100;

-- =====================================================
-- PART 4: CHECK FOR RLS WARNINGS
-- =====================================================

-- Look for "Auth RLS Initialization Plan" in query plans
-- Run these and check if "InitPlan" or "SubPlan" appear with auth functions

-- Check clients table
EXPLAIN (VERBOSE, COSTS, BUFFERS) 
SELECT * FROM public.clients WHERE status = 'Active';

-- Check projects table  
EXPLAIN (VERBOSE, COSTS, BUFFERS)
SELECT * FROM public.projects WHERE status = 'Active';

-- Check inventory_transactions table
EXPLAIN (VERBOSE, COSTS, BUFFERS)
SELECT * FROM public.inventory_transactions LIMIT 100;

-- Check payments_received table
EXPLAIN (VERBOSE, COSTS, BUFFERS)
SELECT * FROM public.payments_received LIMIT 100;

-- =====================================================
-- PART 5: PERFORMANCE BENCHMARKS
-- =====================================================

-- Benchmark 1: Count queries (should be fast with indexes)
EXPLAIN ANALYZE SELECT COUNT(*) FROM public.clients;
EXPLAIN ANALYZE SELECT COUNT(*) FROM public.projects;
EXPLAIN ANALYZE SELECT COUNT(*) FROM public.tasks;
EXPLAIN ANALYZE SELECT COUNT(*) FROM public.transactions;

-- Benchmark 2: Filtered counts
EXPLAIN ANALYZE SELECT COUNT(*) FROM public.clients WHERE status = 'Active';
EXPLAIN ANALYZE SELECT COUNT(*) FROM public.projects WHERE status = 'In Progress';
EXPLAIN ANALYZE SELECT COUNT(*) FROM public.tasks WHERE status = 'To Do';

-- Benchmark 3: Aggregations
EXPLAIN ANALYZE 
SELECT 
  status,
  COUNT(*) as count,
  AVG(total_value) as avg_value
FROM public.clients
GROUP BY status;

-- Benchmark 4: Complex aggregation with JOIN
EXPLAIN ANALYZE
SELECT 
  c.name,
  COUNT(p.id) as project_count,
  SUM(p.budget) as total_budget,
  SUM(p.spent) as total_spent
FROM public.clients c
LEFT JOIN public.projects p ON p.client = c.id
GROUP BY c.id, c.name
ORDER BY total_budget DESC
LIMIT 20;

-- =====================================================
-- PART 6: TABLE STATISTICS
-- =====================================================

-- Get table sizes and row counts
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) AS indexes_size,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Get index usage statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find unused indexes (candidates for removal if idx_scan = 0)
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexrelname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC;

-- =====================================================
-- PART 7: VERIFY HELPER FUNCTIONS
-- =====================================================

-- Check if helper functions exist
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('is_authenticated', 'current_user_id');

-- Test helper functions (must be run as authenticated user)
SELECT public.is_authenticated() as is_auth;
SELECT public.current_user_id() as user_id;

-- =====================================================
-- PART 8: CHECK FOR POLICY ISSUES
-- =====================================================

-- Find tables with RLS enabled but no policies (security risk!)
SELECT 
  t.tablename,
  t.rowsecurity,
  COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
GROUP BY t.tablename, t.rowsecurity
HAVING COUNT(p.policyname) = 0;

-- Find tables without RLS enabled (may need protection)
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- Check for conflicting policies (multiple policies for same operation)
SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY policy_count DESC, tablename;

-- =====================================================
-- PART 9: REALTIME PERFORMANCE CHECK
-- =====================================================

-- Check if tables are in realtime publication
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY schemaname, tablename;

-- Check replica identity (required for realtime DELETEs)
SELECT 
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'DEFAULT'
    WHEN 'n' THEN 'NOTHING'
    WHEN 'f' THEN 'FULL'
    WHEN 'i' THEN 'INDEX'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'  -- Regular tables only
ORDER BY schemaname, tablename;

-- =====================================================
-- PART 10: COMPARISON QUERIES (Before/After)
-- =====================================================

-- Run these BEFORE optimization and save results
-- Then run AFTER optimization and compare

-- Query 1: Simple client select
-- BEFORE: Should show SubPlan with auth.role()
-- AFTER: Should show simple Filter with true
EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, TIMING)
SELECT * FROM public.clients WHERE status = 'Active';

-- Query 2: Project with client join
-- BEFORE: May show sequential scans
-- AFTER: Should show index scans on both tables
EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, TIMING)
SELECT p.*, c.name 
FROM public.projects p
JOIN public.clients c ON p.client = c.id
LIMIT 100;

-- Query 3: Transactions by project
-- BEFORE: May show expensive auth checks
-- AFTER: Should show index scan on project_id
EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, TIMING)
SELECT * FROM public.transactions
WHERE project_id = (SELECT id FROM public.projects LIMIT 1);

-- Query 4: Inventory transactions with auth
-- BEFORE: Should show "Auth RLS Initialization" warning
-- AFTER: Should show NO auth initialization
EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, TIMING)
SELECT * FROM public.inventory_transactions
WHERE type = 'purchase'
LIMIT 100;

-- Query 5: Complex aggregation
-- BEFORE: Multiple auth checks per row
-- AFTER: Single auth check, indexed aggregation
EXPLAIN (ANALYZE, VERBOSE, COSTS, BUFFERS, TIMING)
SELECT 
  c.id,
  c.name,
  COUNT(DISTINCT p.id) as project_count,
  COUNT(DISTINCT t.id) as transaction_count,
  COALESCE(SUM(t.amount), 0) as total_amount
FROM public.clients c
LEFT JOIN public.projects p ON p.client = c.id
LEFT JOIN public.transactions t ON t.client_id = c.id
GROUP BY c.id, c.name
ORDER BY total_amount DESC
LIMIT 50;

-- =====================================================
-- PART 11: SPECIFIC RLS WARNING CHECKS
-- =====================================================

-- These queries should show NO warnings after optimization

-- Check inventory_transactions
EXPLAIN (VERBOSE)
SELECT * FROM public.inventory_transactions WHERE project_id IS NOT NULL;
-- Look for: "InitPlan" or "auth.uid()" - should be GONE ✅

-- Check payments_received
EXPLAIN (VERBOSE)
SELECT * FROM public.payments_received WHERE client_id IS NOT NULL;
-- Look for: "auth.role()" - should be GONE ✅

-- Check project_expenses
EXPLAIN (VERBOSE)
SELECT * FROM public.project_expenses WHERE project_id IS NOT NULL;
-- Look for: "auth.role()" - should be GONE ✅

-- Check project_purchases
EXPLAIN (VERBOSE)
SELECT * FROM public.project_purchases WHERE project_id IS NOT NULL;
-- Look for: "auth.role()" - should be GONE ✅

-- Check clients
EXPLAIN (VERBOSE)
SELECT * FROM public.clients WHERE status = 'Active';
-- Look for: "auth.role()" - should be GONE ✅

-- Check projects
EXPLAIN (VERBOSE)
SELECT * FROM public.projects WHERE status = 'Active';
-- Look for: "auth.role()" - should be GONE ✅

-- =====================================================
-- PART 12: FINAL VERIFICATION
-- =====================================================

-- Summary of optimization status
SELECT 
  'Total Tables' as metric,
  COUNT(DISTINCT tablename)::text as value
FROM pg_tables 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Tables with RLS',
  COUNT(DISTINCT tablename)::text
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 
  'Total Policies',
  COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Optimized Policies (opt_*)',
  COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'public' AND policyname LIKE 'opt_%'
UNION ALL
SELECT 
  'Total Indexes',
  COUNT(*)::text
FROM pg_indexes 
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Realtime Tables',
  COUNT(DISTINCT tablename)::text
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- =====================================================
-- EXPECTED RESULTS AFTER MIGRATION:
-- =====================================================
-- 
-- ✅ All policies should have 'opt_' prefix
-- ✅ No "Auth RLS Initialization Plan" in EXPLAIN output
-- ✅ Query plans should show "Index Scan" not "Seq Scan"
-- ✅ Execution times should be 10-100x faster
-- ✅ All tables should have foreign key indexes
-- ✅ Helper functions (is_authenticated, current_user_id) exist
-- ✅ All security still enforced (test with anon user)
-- 
-- =====================================================

-- Save this query output BEFORE and AFTER migration for comparison!
