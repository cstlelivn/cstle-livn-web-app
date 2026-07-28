# 🚨 URGENT: Database Migration Required

## Error
```
column inventory_transactions.project_id does not exist
```

## Problem
The project-linked purchases feature requires additional columns in the `inventory_transactions` table that haven't been created yet.

## Solution - Run This Migration NOW

### Step 1: Open Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** (left sidebar)

### Step 2: Run the Migration
1. Click **"New Query"**
2. Copy and paste the ENTIRE contents of `/src/db/project_purchases_schema.sql` into the editor
3. Click **"Run"** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### Step 3: Verify Success
You should see a success message. The migration adds these columns to `inventory_transactions`:
- ✅ `project_id` - Links purchases to projects
- ✅ `phase_name` - Links purchases to project phases
- ✅ `unit_cost` - Cost per unit
- ✅ `total_cost` - Total cost (quantity × unit_cost)
- ✅ `vendor_id` - Vendor/supplier reference
- ✅ `date` - Transaction date

Plus indexes for better query performance.

### Step 4: Refresh Your App
After running the migration, refresh your admin panel. The errors should be gone!

---

## Quick Copy-Paste (Alternative)

If you can't access the file, here's the migration SQL:

```sql
-- EXTEND INVENTORY TRANSACTIONS FOR PROJECT PURCHASES
-- This extends the existing inventory_transactions table to support project-linked purchases

-- Add project and phase columns to inventory_transactions
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS phase_name text,
ADD COLUMN IF NOT EXISTS unit_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now();

-- Create indexes for project-related queries
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_id 
ON public.inventory_transactions(project_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_phase_name 
ON public.inventory_transactions(phase_name);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type 
ON public.inventory_transactions(type);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_date 
ON public.inventory_transactions(date DESC);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_project_phase 
ON public.inventory_transactions(project_id, phase_name, type);

-- Comments for documentation
COMMENT ON COLUMN public.inventory_transactions.project_id IS 'Links purchase to a specific project';
COMMENT ON COLUMN public.inventory_transactions.phase_name IS 'Project phase this purchase is for (e.g., Planning, Wall Priming)';
COMMENT ON COLUMN public.inventory_transactions.unit_cost IS 'Cost per unit for this transaction';
COMMENT ON COLUMN public.inventory_transactions.total_cost IS 'Total cost (quantity_change * unit_cost)';
COMMENT ON COLUMN public.inventory_transactions.vendor_id IS 'Vendor/supplier for this purchase';
COMMENT ON COLUMN public.inventory_transactions.date IS 'Date of the transaction (can differ from created_at)';
```

---

## Why This Happened

The project-linked purchases feature was implemented in code, but the database schema migration wasn't run yet. This is a one-time setup step.

## What Happens After

Once the migration runs successfully:
- ✅ You can add purchases to projects
- ✅ Track material costs by project and phase
- ✅ Real-time budget tracking works
- ✅ Inventory updates automatically
- ✅ No more errors!

---

**Do this now, then refresh your app!** 🚀
