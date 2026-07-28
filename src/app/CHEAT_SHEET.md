# 🚀 Quick Fix Cheat Sheet

## The Problem
```
ERROR: operator does not exist: text = uuid
```

## The Cause
`projects.client` column is TEXT, should be UUID

## The Fix (Choose ONE)

---

### ⚡ OPTION 1: Clean Slate (2 min)
**Use if:** You just started testing, okay to delete test projects

```sql
-- 1. Delete projects with text client values
DELETE FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Convert column type
ALTER TABLE projects 
ALTER COLUMN client TYPE uuid USING client::uuid;

-- 3. Add foreign key
ALTER TABLE projects
ADD CONSTRAINT fk_projects_client 
FOREIGN KEY (client) REFERENCES clients(id) ON DELETE RESTRICT;

-- 4. Add index
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);

-- 5. Add transactions column
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS phase_name text;
```

**Done!** Refresh app and test.

---

### 🛡️ OPTION 2: Keep All Data (10 min)
**Use if:** You have real project data to preserve

```sql
-- 1. See what needs migration
SELECT p.title, p.client, c.id as client_uuid
FROM projects p
LEFT JOIN clients c ON c.name = p.client
WHERE p.client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- 2. Create missing clients (if any shown as NULL)
-- Example:
INSERT INTO clients (name, email, status) 
VALUES ('Client Name Here', 'email@example.com', 'Active');

-- 3. Auto-migrate projects
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

-- 4. Verify all valid
SELECT COUNT(*) FROM projects 
WHERE client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Should be 0

-- 5. Convert type
ALTER TABLE projects 
ALTER COLUMN client TYPE uuid USING client::uuid;

-- 6. Add foreign key
ALTER TABLE projects
ADD CONSTRAINT fk_projects_client 
FOREIGN KEY (client) REFERENCES clients(id) ON DELETE RESTRICT;

-- 7. Add index
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client);

-- 8. Add transactions column
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS phase_name text;
```

**Done!** Refresh app and test.

---

### 🔍 OPTION 3: Check First (5 min)
**Use if:** Not sure what data you have

```sql
-- See your data situation
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN client ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as valid_uuids,
  COUNT(CASE WHEN client !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as text_values
FROM projects;
```

**Then:**
- If `text_values = 0` → Use OPTION 1 (skip delete step)
- If `text_values > 0` and recent → Use OPTION 1
- If `text_values > 0` and important → Use OPTION 2

---

## ✅ Verify Success

```sql
-- 1. Check column type (should be 'uuid')
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'projects' AND column_name = 'client';

-- 2. Check foreign key exists
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'projects' AND constraint_name = 'fk_projects_client';

-- 3. Test the relationship
SELECT p.title, c.name as client_name
FROM projects p
JOIN clients c ON p.client = c.id
LIMIT 5;
```

All should return results with no errors.

---

## 🆘 Troubleshooting

### "invalid input syntax for type uuid"
**Fix:** Still have text values. Run Option 1 or 2 again.

### "foreign key constraint fails"  
**Fix:** Project references non-existent client. Create the client first.

### "constraint already exists"
**Fix:** Already ran this before. Skip that step, it's fine.

---

## 📍 Where to Run

1. Go to **https://supabase.com/dashboard**
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **New Query**
5. Paste the SQL from your chosen option
6. Click **Run** ▶️

---

## ⏱️ Time Required

- **Option 1:** 2 minutes
- **Option 2:** 10 minutes
- **Option 3:** 5 minutes (then choose 1 or 2)

---

## 🎯 Recommended

**Most users:** Start with **Option 3**, see your data, then choose.

**Just testing:** Use **Option 1** and move on.

**Production data:** Use **Option 2** to be safe.

---

## 📚 Need More Help?

- **Quick start:** `/START_HERE_NOW.md`
- **Detailed guide:** `/MIGRATION_GUIDE.md`
- **All files:** `/INDEX.md`

---

**Print this page and keep it handy!** 📄
