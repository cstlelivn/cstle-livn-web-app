-- ============================================
-- BACKUP EXISTING DATA (Optional)
-- ============================================
-- Run this BEFORE dropping the table if you want to preserve data
-- ============================================

-- STEP 1: Check if table exists and has data
SELECT 
  'Current records in inventory_transactions:' AS info,
  COUNT(*) AS record_count
FROM public.inventory_transactions;

-- STEP 2: Create a backup table
CREATE TABLE IF NOT EXISTS public.inventory_transactions_backup AS
SELECT * FROM public.inventory_transactions;

-- STEP 3: Verify backup was created
SELECT 
  'Backup created with records:' AS info,
  COUNT(*) AS record_count
FROM public.inventory_transactions_backup;

-- ============================================
-- TO RESTORE DATA AFTER RECREATION:
-- ============================================
-- After running NUCLEAR_FIX_SCHEMA.sql, you can restore data with:
--
-- INSERT INTO public.inventory_transactions 
-- SELECT * FROM public.inventory_transactions_backup;
--
-- Then verify:
-- SELECT COUNT(*) FROM public.inventory_transactions;
-- ============================================
