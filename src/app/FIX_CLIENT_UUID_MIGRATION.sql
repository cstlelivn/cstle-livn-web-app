-- ============================================
-- FIX: Convert projects.client from TEXT to UUID with Data Migration
-- ============================================
-- This fixes the error: "operator does not exist: text = uuid"
-- AND handles existing text data properly

-- ============================================
-- STEP 1: Find and Display Projects with Non-UUID Client Values
-- ============================================
-- Run this first to see what data needs to be migrated:

SELECT 
  id, 
  title, 
  client as current_client_value,
  CASE 
    WHEN client ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'Valid UUID ✅'
    ELSE 'Invalid - Needs Migration ⚠️'
  END as validation_status
FROM projects
ORDER BY validation_status DESC;

-- ============================================
-- STEP 2: Check if Matching Clients Exist
-- ============================================
-- This will show if we can automatically migrate the data:

SELECT 
  p.id as project_id,
  p.title as project_title,
  p.client as text_client_name,
  c.id as matching_client_uuid,
  c.name as matching_client_name,
  CASE 
    WHEN c.id IS NOT NULL THEN '✅ Can auto-migrate'
    WHEN p.client ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ Already UUID'
    ELSE '⚠️ Need to create client first'
  END as migration_status
FROM projects p
LEFT JOIN clients c ON c.name = p.client
WHERE p.client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ============================================
-- STEP 3a: AUTOMATIC MIGRATION (if clients exist)
-- ============================================
-- Only run this if Step 2 shows all projects have matching clients:

DO $$ 
DECLARE 
  project_record RECORD;
  matching_client_id uuid;
BEGIN
  -- Loop through all projects with text client names
  FOR project_record IN 
    SELECT id, client 
    FROM projects 
    WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    -- Try to find matching client by name
    SELECT c.id INTO matching_client_id
    FROM clients c
    WHERE c.name = project_record.client
    LIMIT 1;
    
    IF matching_client_id IS NOT NULL THEN
      -- Update project with client UUID
      UPDATE projects 
      SET client = matching_client_id::text
      WHERE id = project_record.id;
      
      RAISE NOTICE 'Migrated project % to client UUID %', project_record.id, matching_client_id;
    ELSE
      RAISE WARNING 'No matching client found for project % with client name "%"', 
        project_record.id, project_record.client;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- STEP 3b: MANUAL MIGRATION (if clients don't exist)
-- ============================================
-- If Step 2 shows missing clients, create them first:

-- Example: Create missing clients
-- INSERT INTO clients (name, email, phone, status)
-- VALUES 
--   ('First Call Construction', 'contact@firstcall.com', '', 'Active');

-- Then update projects manually:
-- UPDATE projects 
-- SET client = (SELECT id FROM clients WHERE name = 'First Call Construction')
-- WHERE client = 'First Call Construction';

-- ============================================
-- STEP 4: Verify All Projects Have Valid UUIDs
-- ============================================
-- Run this to confirm all data is ready:

SELECT 
  COUNT(*) as total_projects,
  COUNT(CASE WHEN client ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_uuid_count,
  COUNT(CASE WHEN client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as invalid_count
FROM projects;

-- Expected: invalid_count should be 0 before proceeding

-- ============================================
-- STEP 5: Convert Column Type to UUID
-- ============================================
-- Only run this after Step 4 shows invalid_count = 0:

ALTER TABLE projects 
ALTER COLUMN client TYPE uuid USING client::uuid;

-- ============================================
-- STEP 6: Add Foreign Key Constraint
-- ============================================

ALTER TABLE projects
ADD CONSTRAINT fk_projects_client 
FOREIGN KEY (client) REFERENCES clients(id) ON DELETE RESTRICT;

-- ============================================
-- STEP 7: Create Performance Index
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);

-- ============================================
-- STEP 8: Ensure transactions table has phase_name
-- ============================================

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS phase_name text;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify column type:
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

-- Test the relationship:
SELECT 
  p.id, 
  p.title, 
  p.client as client_id,
  c.name as client_name,
  c.email as client_email
FROM projects p
LEFT JOIN clients c ON p.client = c.id
LIMIT 10;
-- All projects should have matching client names

-- ============================================
-- DONE!
-- ============================================
-- ✅ projects.client is now UUID type
-- ✅ All existing data migrated safely
-- ✅ Foreign key constraint ensures data integrity
-- ✅ Index improves query performance
-- ✅ transactions.phase_name column exists
-- ✅ No more "operator does not exist: text = uuid" errors
