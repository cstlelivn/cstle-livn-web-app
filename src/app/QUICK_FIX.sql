-- ============================================
-- QUICK FIX: Most Common Scenario
-- ============================================
-- Use this if you want to start fresh with clean data
-- WARNING: This will delete existing projects with invalid client data

-- ============================================
-- OPTION 1: Safe Migration (Recommended)
-- ============================================
-- Run these queries one at a time and check results

-- 1. See what needs to be fixed:
SELECT id, title, client FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. If you see projects, either:
--    A) Create the clients manually (see MIGRATION_GUIDE.md)
--    B) Delete those test projects (see Option 2 below)

-- ============================================
-- OPTION 2: Clean Slate (Delete Invalid Projects)
-- ============================================
-- Only use if projects with text client names are test data you don't need

-- Delete projects with non-UUID client values:
DELETE FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Verify they're gone:
SELECT COUNT(*) FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Should return 0

-- ============================================
-- OPTION 3: Keep All Data (Auto-Migration)
-- ============================================
-- Use this if you want to preserve all project data

-- First, ensure all client names exist in clients table
-- Check what clients are referenced:
SELECT DISTINCT client 
FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Create any missing clients (example):
-- INSERT INTO clients (name, email, status) 
-- VALUES ('First Call Construction', 'contact@firstcall.com', 'Active');

-- Then run the auto-migration:
DO $$ 
DECLARE 
  project_record RECORD;
  matching_client_id uuid;
BEGIN
  FOR project_record IN 
    SELECT id, title, client 
    FROM projects 
    WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    SELECT c.id INTO matching_client_id
    FROM clients c
    WHERE c.name = project_record.client
    LIMIT 1;
    
    IF matching_client_id IS NOT NULL THEN
      UPDATE projects 
      SET client = matching_client_id::text
      WHERE id = project_record.id;
      RAISE NOTICE 'Migrated project "%" to client UUID %', project_record.title, matching_client_id;
    ELSE
      RAISE WARNING 'No matching client found for project "%" with client "%"', 
        project_record.title, project_record.client;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- FINAL STEPS (Run after choosing an option above)
-- ============================================

-- Verify all projects have valid UUIDs:
SELECT 
  COUNT(*) as total_projects,
  COUNT(CASE WHEN client ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_count
FROM projects;
-- valid_count should equal total_projects

-- Convert column to UUID type:
ALTER TABLE projects 
ALTER COLUMN client TYPE uuid USING client::uuid;

-- Add foreign key constraint:
ALTER TABLE projects
ADD CONSTRAINT fk_projects_client 
FOREIGN KEY (client) REFERENCES clients(id) ON DELETE RESTRICT;

-- Create performance index:
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);

-- Add phase_name to transactions:
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS phase_name text;

-- ============================================
-- VERIFY SUCCESS
-- ============================================

-- Check column type (should show 'uuid'):
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'client';

-- Test the relationship:
SELECT p.title, c.name as client_name
FROM projects p
JOIN clients c ON p.client = c.id
LIMIT 5;

-- ✅ DONE! Your app should now work without errors.
