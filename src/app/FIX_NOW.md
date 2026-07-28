# 🚀 Fix Database Error NOW

## The Error You're Seeing
```
Database error: Failed to update project: invalid input syntax for type uuid: "First Call Construction"
```

## Quick Fix (5 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your Cstle Livn project
3. Click **SQL Editor** in left sidebar
4. Click **New Query**

### Step 2: Check Your Data
Paste and run this:
```sql
SELECT id, title, client FROM projects LIMIT 5;
```

**What you'll see:**
- If `client` shows company names like "First Call Construction" → You have the issue
- If `client` shows UUIDs like "abc-123-uuid" → Already good (skip to Step 4)

### Step 3A: If You Want to Delete Test Projects (FASTEST - 30 seconds)

```sql
-- Delete projects with text client names
DELETE FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

### Step 3B: If You Want to Keep Your Projects (3 minutes)

First, create the clients if they don't exist:
```sql
-- Check which clients you need
SELECT DISTINCT client FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Create missing clients (modify names as needed)
INSERT INTO clients (name, email, status)
VALUES ('First Call Construction', 'contact@firstcall.com', 'Active');
-- Add more INSERT statements for each client name you saw above
```

Then migrate the data:
```sql
DO $$ 
DECLARE 
  project_record RECORD;
  matching_client_id uuid;
BEGIN
  FOR project_record IN 
    SELECT id, client 
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
    END IF;
  END LOOP;
END $$;
```

### Step 4: Convert Column Type

```sql
-- Convert the column to UUID type
ALTER TABLE projects 
ALTER COLUMN client TYPE uuid USING client::uuid;

-- Add foreign key constraint
ALTER TABLE projects
ADD CONSTRAINT fk_projects_client 
FOREIGN KEY (client) REFERENCES clients(id) ON DELETE RESTRICT;

-- Add performance index
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);
```

### Step 5: Verify Success

```sql
-- Should return 'uuid'
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'client';

-- Should show client names, not errors
SELECT p.title, c.name as client_name
FROM projects p
JOIN clients c ON p.client = c.id
LIMIT 3;
```

### Step 6: Refresh Your App

1. Press **Ctrl+F5** (or Cmd+Shift+R on Mac)
2. Try updating a project
3. **Error should be gone!** ✅

---

## What We Fixed

### Code Fix ✅
I already fixed the code so it uses `clientId` (UUID) instead of `client` (name) when updating projects.

### Database Fix (You need to run)
The database column type needs to be converted from TEXT to UUID.

---

## Still Getting Errors?

If Step 4 fails with "invalid input syntax", run this to see the problem:
```sql
SELECT id, title, client FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

Then either:
- Delete those projects, OR
- Create the missing clients and run Step 3B again

---

## ⏱️ Time Estimate
- **Option A (Delete):** 30 seconds
- **Option B (Keep Data):** 3 minutes
- **Total with verification:** 5 minutes

---

**File:** See `/RUN_THIS_NOW.sql` for the complete script with all options.
