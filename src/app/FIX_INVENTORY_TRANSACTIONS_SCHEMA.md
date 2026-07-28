# Fix Inventory Transactions Schema Error

## Error
```
Could not find the 'quantity_after' column of 'inventory_transactions' in the schema cache
```

## Root Cause
The `inventory_transactions` table is missing required columns. This happens when:
1. The base table was created without all necessary columns, OR
2. The migrations haven't been run yet

## Solution: Run Database Migrations

You need to run TWO SQL migrations in your Supabase Dashboard to add all necessary columns.

---

## Step 1: Run Base Inventory Transactions Migration

**File**: `/src/db/inventory_transactions_schema.sql`

This adds the base table structure with core columns:
- `id` (primary key)
- `inventory_id` (foreign key to inventory)
- `type` ('purchase', 'consumption', 'adjustment', 'transfer')
- `quantity_change` (how much changed)
- `quantity_after` ⭐ **This is the missing column**
- `reference` (invoice number, project name, etc.)
- `notes` (additional details)
- `created_by`, `created_at`, `updated_at`

### How to Run:
1. Open **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create **New Query**
4. Copy entire contents of `/src/db/inventory_transactions_schema.sql`
5. Click **Run**
6. Verify: "Success. No rows returned"

---

## Step 2: Run Project Purchases Extension Migration

**File**: `/src/db/project_purchases_schema.sql`

This extends the table with project-related columns:
- `project_id` (foreign key to projects)
- `phase_name` (which phase this purchase is for)
- `unit_cost` (cost per unit)
- `total_cost` (quantity × unit_cost)
- `vendor_id` (foreign key to vendors)
- `date` (transaction date)

### How to Run:
1. Stay in **SQL Editor**
2. Create **New Query**
3. Copy entire contents of `/src/db/project_purchases_schema.sql`
4. Click **Run**
5. Verify: "Success. No rows returned"

---

## Step 3: Verify Schema

Run this query in SQL Editor to confirm all columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'inventory_transactions'
ORDER BY ordinal_position;
```

### Expected Columns:
✅ id
✅ inventory_id
✅ type
✅ quantity_change
✅ quantity_after ← Must have this
✅ reference
✅ notes
✅ created_by
✅ created_at
✅ updated_at
✅ project_id ← From extension
✅ phase_name ← From extension
✅ unit_cost ← From extension
✅ total_cost ← From extension
✅ vendor_id ← From extension
✅ date ← From extension

---

## Alternative: Run All Migrations at Once

If you haven't run ANY migrations yet, you can run them in this order:

1. **Schema Setup** (`/src/db/schema.sql`) - Creates all base tables
2. **Inventory Transactions** (`/src/db/inventory_transactions_schema.sql`) - Adds transaction tracking
3. **Project Purchases** (`/src/db/project_purchases_schema.sql`) - Adds project linking
4. **Indexes** (`/src/db/indexes.sql`) - Adds performance indexes
5. **Policies** (`/src/db/policies.sql`) - Adds RLS policies
6. **Realtime** (`/src/db/enable-realtime.sql`) - Enables realtime subscriptions

---

## After Running Migrations

Once the migrations are complete:

1. **Refresh your browser** to clear any cached schema
2. **Test creating inventory item** with project link
3. **Verify in database**:
   ```sql
   SELECT * FROM inventory_transactions LIMIT 5;
   ```

---

## What This Fixes

After running these migrations, you'll be able to:

✅ Link inventory items to projects during creation
✅ Edit project links on existing items
✅ See purchase transactions in project Purchases tab
✅ Track project spending from inventory purchases
✅ View financial reports with inventory costs included

---

## Troubleshooting

### "Table already exists" error
This is OK - it means the base table exists. Continue with Step 2.

### "Column already exists" error
This is OK - the migration uses `ADD COLUMN IF NOT EXISTS` which is safe to run multiple times.

### Still getting schema cache error
1. Refresh your browser (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. Verify columns exist with the query in Step 3
3. Check Supabase Dashboard → Database → Tables → inventory_transactions
4. Make sure you're looking at the correct database (not a branch)

### Permissions error
Make sure you're running the SQL as the postgres user (default in SQL Editor).

---

## Quick Check: Is Migration Needed?

Run this query to check if you need the migration:

```sql
SELECT 
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_transactions' 
    AND column_name = 'quantity_after'
  ) as has_quantity_after,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_transactions' 
    AND column_name = 'project_id'
  ) as has_project_id;
```

**Result Interpretation:**
- `has_quantity_after: false` → Run Step 1
- `has_project_id: false` → Run Step 2
- Both `true` → Schema is correct, try refreshing browser

---

## Summary

The error occurs because the database schema doesn't match what the application expects. Running the migrations will add all necessary columns and the error will be resolved. The migrations are safe to run and use `IF NOT EXISTS` clauses to prevent errors if columns already exist.

**Time to fix**: ~5 minutes
**Difficulty**: Easy (copy and paste SQL)
**Risk**: None (migrations are non-destructive)
