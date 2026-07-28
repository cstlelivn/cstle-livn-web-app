-- ============================================
-- FIX: Convert projects.client from TEXT to UUID
-- ============================================
-- This fixes the error: "operator does not exist: text = uuid"
-- Run this in your Supabase SQL Editor

-- Step 1: Convert the client column from TEXT to UUID
ALTER TABLE projects 
ALTER COLUMN client TYPE uuid USING client::uuid;

-- Step 2: Add foreign key constraint to ensure referential integrity
ALTER TABLE projects
ADD CONSTRAINT fk_projects_client 
FOREIGN KEY (client) REFERENCES clients(id) ON DELETE RESTRICT;

-- Step 3: Create index for better performance on client lookups
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);

-- Step 4: Ensure transactions table has phase_name column (if missing)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS phase_name text;

-- ============================================
-- Verification
-- ============================================
-- Run this to verify the change worked:
SELECT column_name, data_type, udt_name 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'client';
-- Expected: data_type = 'uuid'

-- Verify foreign key exists:
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'projects' 
  AND constraint_type = 'FOREIGN KEY'
  AND constraint_name = 'fk_projects_client';
-- Expected: One row with fk_projects_client

-- Test the foreign key constraint:
SELECT 
  p.id, 
  p.title, 
  p.client as client_id,
  c.name as client_name
FROM projects p
LEFT JOIN clients c ON p.client = c.id
LIMIT 5;
-- All projects should have matching client names

-- ============================================
-- DONE!
-- ============================================
-- After running this:
-- ✅ projects.client is now UUID type
-- ✅ Foreign key constraint ensures data integrity
-- ✅ Index improves query performance
-- ✅ transactions.phase_name column exists
-- ✅ No more "operator does not exist: text = uuid" errors