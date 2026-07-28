# Project Purchases Database Setup Guide

## Overview
This guide will help you set up the `project_purchases` table in your Supabase database. This table follows the same pattern as the inventory system and provides full receipt-style purchase tracking with optional inventory linkage.

## Step 1: Run the Migration Script

Open your Supabase SQL Editor and run the migration script:

**Location:** `/src/db/migrations/004_project_purchases.sql`

```sql
-- Copy and paste the entire contents of the migration file
-- Or run it directly if you have CLI access
```

This will create:
- ✅ `project_purchases` table with proper schema
- ✅ Indexes for optimal query performance
- ✅ Row Level Security (RLS) policies
- ✅ Updated_at trigger function

## Step 2: Enable Realtime

Run the updated enable-realtime script:

**Location:** `/src/db/enable-realtime.sql`

```sql
-- This script now includes project_purchases
-- Run the entire script to enable realtime for all tables
```

## Step 3: Verify Table Creation

Run this query to verify the table exists with correct schema:

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'project_purchases'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- project_id (uuid)
- phase_name (text)
- item_name (text)
- vendor (text)
- quantity (numeric)
- unit_cost (numeric)
- total_cost (numeric)
- purchase_date (date)
- notes (text)
- inventory_id (uuid)
- created_by (uuid)
- created_at (timestamptz)
- updated_at (timestamptz)

## Step 4: Verify Realtime is Enabled

```sql
SELECT * 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'project_purchases';
```

Should return 1 row confirming project_purchases is in the publication.

## Step 5: Test the System

### Test 1: Create a Purchase (No Inventory)

1. Navigate to any project → Purchases tab
2. Click "Add Purchase"
3. Fill in:
   - Item Name: "Test Item"
   - Vendor: "Test Vendor"
   - Phase: Select any phase
   - Quantity: 10
   - Unit Cost: 5.00
   - Leave "Add to Inventory?" toggle OFF
4. Click "Save Purchase"

**Expected:**
- ✅ Success toast appears
- ✅ Purchase appears in table
- ✅ Total Cost = $50.00
- ✅ Project spent increases by $50.00

### Test 2: Create Purchase WITH Inventory

1. Click "Add Purchase" again
2. Fill in purchase details
3. Toggle "Add to Inventory?" ON
4. Fill in:
   - Inventory Type: Material
   - Location: "Test Location"
   - Unit: "pcs"
   - Reorder Level: 5
5. Click "Save Purchase"

**Expected:**
- ✅ Purchase created
- ✅ New inventory item created
- ✅ Purchase shows "Inv" badge
- ✅ Inventory quantity matches purchase quantity

### Test 3: Edit a Purchase

1. Click on any purchase row (or Edit button)
2. Change quantity from 10 to 15
3. Click "Update Purchase"

**Expected:**
- ✅ Total cost recalculates
- ✅ Project spent updates
- ✅ Changes appear immediately

### Test 4: Delete a Purchase

1. Click delete button on a purchase
2. Confirm deletion

**Expected:**
- ✅ Purchase removed from table
- ✅ Project spent decreases
- ✅ Inventory item NOT deleted (only link removed)

### Test 5: Realtime Updates

1. Open project in two browser tabs
2. Add purchase in Tab 1
3. Watch Tab 2

**Expected:**
- ✅ Tab 2 updates automatically
- ✅ Purchase appears without manual refresh

## Troubleshooting

### Error: "Could not find table project_purchases"

**Solution:** Run the migration script (Step 1)

### Error: "Column does not exist"

**Solution:** Verify you ran the correct migration script, not an old version

### Realtime not working

**Solution:** 
1. Verify realtime is enabled: Run Step 4 verification query
2. Check Supabase Dashboard → Database → Replication
3. Re-run enable-realtime.sql script

### Purchases not showing in table

**Solution:**
1. Check browser console for errors
2. Verify project_id is correct
3. Run: `SELECT * FROM project_purchases WHERE project_id = '<your-project-id>';`

### Project spent not updating

**Solution:**
1. Check if project exists: `SELECT id, spent FROM projects WHERE id = '<project-id>';`
2. Verify the purchase was created successfully
3. Manually recalculate if needed:
```sql
UPDATE projects 
SET spent = (
  SELECT COALESCE(SUM(total_cost), 0) 
  FROM project_purchases 
  WHERE project_id = projects.id
)
WHERE id = '<project-id>';
```

## Database Schema Reference

```sql
CREATE TABLE project_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_name text NOT NULL,
  item_name text NOT NULL,
  vendor text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_cost numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  purchase_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  inventory_id uuid REFERENCES inventory(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

## Key Features

✅ **Receipt-Style Data Entry**
- Item name, vendor, quantity, unit cost
- Auto-calculated total cost
- Purchase date and notes

✅ **Phase Tracking**
- Link purchases to project phases
- Filter by phase
- Calculate spend per phase

✅ **Optional Inventory Creation**
- Toggle "Add to Inventory?" during purchase entry
- Automatically creates inventory item
- Links purchase to inventory via inventory_id

✅ **Automatic Finance Updates**
- Project spent updates automatically
- Recalculates on edit/delete
- Real-time updates across all views

✅ **Full CRUD Operations**
- Create, Read, Update, Delete
- Edit quantities and costs
- Proper validation and error handling

✅ **Realtime Sync**
- WebSocket subscriptions
- Instant updates across tabs
- Collaborative-friendly

## API Functions

All functions are in `/src/features/purchases/projectPurchasesApi.ts`:

```typescript
// Create
createProjectPurchase(input: CreateProjectPurchaseInput): Promise<ProjectPurchase>

// Read
getProjectPurchases(projectId: string): Promise<ProjectPurchase[]>
getPhasePurchases(projectId: string, phaseName: string): Promise<ProjectPurchase[]>

// Update
updateProjectPurchase(id: string, updates: UpdateProjectPurchaseInput): Promise<ProjectPurchase>

// Delete
deleteProjectPurchase(id: string): Promise<void>

// Calculate
calculateProjectPurchaseSpend(projectId: string): Promise<number>
calculatePhasePurchaseSpend(projectId: string, phaseName: string): Promise<number>
```

## Success Checklist

- [ ] Migration script run successfully
- [ ] Realtime enabled and verified
- [ ] Can create purchase without inventory
- [ ] Can create purchase with inventory
- [ ] Can edit purchases
- [ ] Can delete purchases
- [ ] Project finances update correctly
- [ ] Realtime updates work across tabs
- [ ] Filters work (phase, date range)
- [ ] All UI uses design system CSS variables

---

**Status:** Ready for Production  
**Last Updated:** 2024-11-24  
**Tested:** [ ] Yes / [ ] No  
