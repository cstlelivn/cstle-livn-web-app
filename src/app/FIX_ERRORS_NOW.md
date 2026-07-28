# ⚡ Fix Schema Cache Errors - 30 Seconds

## The Issue
```
Error: Could not find the 'quantity_after' column in the schema cache
```

**The column EXISTS in the database**, but the API layer's cache is stale.

---

## Quick Fix (Choose One Method)

### 🚀 Method 1: All-in-One SQL Script (RECOMMENDED)

1. **Open Supabase Dashboard** → **SQL Editor** → **New Query**
2. **Copy and paste this entire script:**

```sql
-- Ensure all columns exist
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS quantity_after numeric NOT NULL DEFAULT 0;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS phase_name text;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now();

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_id 
ON public.inventory_transactions(project_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
ON public.inventory_transactions(type);

-- CRITICAL: Reload schema cache
NOTIFY pgrst, 'reload schema';
```

3. **Click Run** ▶️
4. **Wait 10 seconds**
5. **Hard refresh browser** (Ctrl+Shift+R or Cmd+Shift+R)

---

### ⚡ Method 2: Just Reload Schema (If columns already exist)

If you're certain the columns exist, just reload:

```sql
NOTIFY pgrst, 'reload schema';
```

Then **hard refresh your browser**.

---

### 🔍 Method 3: Verify First, Then Reload

Check if column exists:

```sql
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'inventory_transactions' 
  AND column_name = 'quantity_after';
```

- **If you see `quantity_after`** → Run Method 2 (just reload)
- **If you see nothing** → Run Method 1 (full script)

---

## After Running

1. ✅ Errors should be gone
2. ✅ Can create inventory items
3. ✅ Can link to projects
4. ✅ Purchases tab works

---

## If Still Getting Errors

1. **Restart PostgREST**: Dashboard → Settings → API → Restart Service
2. **Wait 30 seconds**
3. **Hard refresh browser** again
4. Try creating an inventory item

---

## Why This Happens

PostgREST (Supabase's API layer) caches the database schema for performance. When you add columns via SQL, you **must** tell it to reload using `NOTIFY pgrst, 'reload schema'`.

This is normal behavior - not a bug! 🎯
