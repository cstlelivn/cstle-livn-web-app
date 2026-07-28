-- ============================================
-- VERIFICATION SCRIPT FOR INVENTORY TRANSACTIONS
-- ============================================
-- Run this in Supabase SQL Editor to verify everything is set up correctly

-- 1) Check if table exists
SELECT 
  'Table exists: inventory_transactions' AS status,
  EXISTS(
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'inventory_transactions'
  ) AS result;

-- 2) List all columns in the table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'inventory_transactions' 
ORDER BY ordinal_position;

-- 3) Check indexes
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'inventory_transactions'
ORDER BY indexname;

-- 4) Check RLS policies
SELECT
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'inventory_transactions'
ORDER BY policyname;

-- 5) Check foreign key relationships
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  a.attname AS column_name,
  af.attname AS referenced_column
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE c.contype = 'f'
  AND c.conrelid::regclass::text = 'inventory_transactions'
ORDER BY constraint_name;

-- 6) Count existing records
SELECT 
  'Total records in inventory_transactions' AS description,
  COUNT(*) AS count
FROM inventory_transactions;

-- 7) RELOAD SCHEMA (CRITICAL!)
NOTIFY pgrst, 'reload schema';

-- ============================================
-- EXPECTED RESULTS:
-- ============================================
-- All columns should include:
-- - id, inventory_id, type, quantity_change, quantity_after
-- - reference, notes, created_by, created_at, updated_at
-- - project_id, phase_name, unit_cost, total_cost, vendor_id, date
--
-- RLS should be enabled
-- At least 4 policies should exist
-- Multiple indexes should exist
-- Foreign keys to: inventory, users, projects, vendors
-- ============================================
