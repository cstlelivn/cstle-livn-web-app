-- ============================================
-- URGENT FIX: Run this RIGHT NOW in Supabase SQL Editor
-- ============================================
-- This will fix the "invalid input syntax for type uuid" error
-- Time: 2-5 minutes

-- ============================================
-- STEP 1: Check what data you have
-- ============================================
SELECT 
  id, 
  title, 
  client,
  CASE 
    WHEN client ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN '✅ Valid UUID'
    ELSE '❌ Invalid TEXT'
  END as status
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- STEP 2: See which clients exist
-- ============================================
SELECT id, name, email, status FROM clients ORDER BY name;

-- ============================================
-- STEP 3: OPTION A - If you just started testing (FASTEST)
-- ============================================
-- Run this if your projects are just test data you can delete:

-- Uncomment these lines to delete test projects with invalid client data:
-- DELETE FROM projects 
-- WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- ============================================
-- STEP 3: OPTION B - If you want to keep your data
-- ============================================
-- Run this to migrate your existing projects:

-- First, create clients for any missing ones
-- Check what client names you have:
SELECT DISTINCT client 
FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- If you see client names that don't exist in Step 2, create them:
-- Example (uncomment and modify for your actual client names):
-- INSERT INTO clients (name, email, phone, status, source)
-- VALUES ('First Call Construction', 'contact@firstcall.com', '', 'Active', 'Manual Import');

-- Then run this migration script:
DO $$ 
DECLARE 
  project_record RECORD;
  matching_client_id uuid;
  client_name text;
BEGIN
  RAISE NOTICE 'Starting client migration...';
  
  FOR project_record IN 
    SELECT id, title, client 
    FROM projects 
    WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  LOOP
    client_name := project_record.client;
    
    -- Try to find matching client by name
    SELECT c.id INTO matching_client_id
    FROM clients c
    WHERE c.name = client_name
    LIMIT 1;
    
    IF matching_client_id IS NOT NULL THEN
      -- Update project with client UUID
      UPDATE projects 
      SET client = matching_client_id::text
      WHERE id = project_record.id;
      
      RAISE NOTICE 'Migrated project "%": "%" → %', 
        project_record.title, client_name, matching_client_id;
    ELSE
      RAISE WARNING '⚠️ No client found for project "%". Client name: "%". Please create this client first.', 
        project_record.title, client_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration complete!';
END $$;

-- ============================================
-- STEP 4: Verify all projects have valid UUIDs
-- ============================================
SELECT 
  COUNT(*) as total_projects,
  COUNT(CASE WHEN client ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_uuid_count,
  COUNT(CASE WHEN client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as invalid_count
FROM projects;

-- ⚠️ IMPORTANT: invalid_count MUST be 0 before proceeding to Step 5!
-- If invalid_count > 0, go back and create the missing clients, then re-run Step 3.

-- ============================================
-- STEP 5: Convert column type to UUID
-- ============================================
-- Only run this after Step 4 shows invalid_count = 0

ALTER TABLE projects 
ALTER COLUMN client TYPE uuid USING client::uuid;

-- ============================================
-- STEP 6: Add foreign key constraint
-- ============================================
-- Skip this step if you get "constraint already exists" error

ALTER TABLE projects
ADD CONSTRAINT fk_projects_client 
FOREIGN KEY (client) REFERENCES clients(id) ON DELETE RESTRICT;

-- ============================================
-- STEP 7: Create performance index
-- ============================================
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);

-- ============================================
-- STEP 8: Add missing column to transactions
-- ============================================
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS phase_name text;

-- ============================================
-- FINAL VERIFICATION
-- ============================================

-- 1. Check column type (should return 'uuid')
SELECT data_type 
FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'client';

-- 2. Check foreign key exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'projects' AND constraint_name = 'fk_projects_client';

-- 3. Test the relationship - should show client names, not UUIDs
SELECT 
  p.id,
  p.title,
  p.client as client_uuid,
  c.name as client_name
FROM projects p
LEFT JOIN clients c ON p.client = c.id
LIMIT 5;

-- ✅ If all three queries above return expected results, YOU'RE DONE!
-- Refresh your app (Ctrl+F5) and try updating a project.

-- ============================================
-- TROUBLESHOOTING
-- ============================================

-- If Step 5 fails with "invalid input syntax":
-- Run this to see which projects still have invalid data:
-- SELECT id, title, client FROM projects 
-- WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- If foreign key constraint fails:
-- Run this to see which projects reference non-existent clients:
-- SELECT p.id, p.title, p.client
-- FROM projects p
-- LEFT JOIN clients c ON p.client::uuid = c.id
-- WHERE c.id IS NULL;
