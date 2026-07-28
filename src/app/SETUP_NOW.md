# 🚀 SETUP INSTRUCTIONS - Project Purchases

## The Problem
You can't see purchases because the `project_purchases` table doesn't exist in your database yet.

## The Solution (2 Simple Steps)

### Step 1: Create the Table

**Open Supabase SQL Editor** and run this:

```sql
-- Create project_purchases table
CREATE TABLE IF NOT EXISTS public.project_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  item_name text NOT NULL,
  vendor text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  inventory_id uuid REFERENCES public.inventory(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_purchases_project_id ON public.project_purchases(project_id);
CREATE INDEX IF NOT EXISTS idx_project_purchases_phase_name ON public.project_purchases(phase_name);
CREATE INDEX IF NOT EXISTS idx_project_purchases_purchase_date ON public.project_purchases(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_project_purchases_inventory_id ON public.project_purchases(inventory_id);

-- Enable RLS
ALTER TABLE public.project_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all purchases" ON public.project_purchases;
CREATE POLICY "Users can view all purchases"
  ON public.project_purchases FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert purchases" ON public.project_purchases;
CREATE POLICY "Authenticated users can insert purchases"
  ON public.project_purchases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update purchases" ON public.project_purchases;
CREATE POLICY "Authenticated users can update purchases"
  ON public.project_purchases FOR UPDATE
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete purchases" ON public.project_purchases;
CREATE POLICY "Authenticated users can delete purchases"
  ON public.project_purchases FOR DELETE
  USING (auth.role() = 'authenticated');

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_project_purchases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_project_purchases_updated_at ON public.project_purchases;
CREATE TRIGGER trigger_update_project_purchases_updated_at
  BEFORE UPDATE ON public.project_purchases
  FOR EACH ROW
  EXECUTE FUNCTION update_project_purchases_updated_at();
```

### Step 2: Enable Realtime

**In the same SQL Editor**, run this:

```sql
-- Enable realtime for project_purchases
ALTER TABLE public.project_purchases REPLICA IDENTITY FULL;

-- Add to publication
DO $$
DECLARE
  tbl TEXT;
BEGIN
  -- Check if table is already in publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'project_purchases'
  ) THEN
    -- Add table to publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_purchases;
    RAISE NOTICE 'Added project_purchases to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'project_purchases already in supabase_realtime publication';
  END IF;
END $$;
```

## Verify It Worked

Run this to confirm:

```sql
-- Check table exists
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'project_purchases';

-- Check realtime is enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'project_purchases';
```

## Now Test It!

1. Go to your project → Purchases tab
2. Click "Add Purchase"
3. Fill in the form:
   - Item Name: "Test Item"
   - Vendor: "Test Vendor"
   - Phase: Any phase
   - Quantity: 10
   - Unit Cost: 5.00
4. Click "Save Purchase"
5. **You should see it in the table immediately!** ✅

## Check The Console

Open your browser console (F12) and you should see:
```
🔄 Loading purchases for project: <project-id>
✅ Purchases loaded: 1 items [...]
```

## If It Still Doesn't Work

1. **Check browser console** for any errors (red text)
2. **Run this query** to see if data was saved:
   ```sql
   SELECT * FROM project_purchases;
   ```
3. **Share the error message** so I can help!

---

**That's it!** After running these 2 SQL scripts, your purchases system will work perfectly! 🎉
