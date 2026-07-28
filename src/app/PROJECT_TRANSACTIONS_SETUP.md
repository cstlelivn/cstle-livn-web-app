# 🛠️ Project Transactions Setup Guide

## Current Status: ⚠️ Database Table Not Created

Your Project Transactions feature is **ready to use** but requires a **one-time database setup**.

The error you're seeing:
```
Could not find the table 'public.project_transactions' in the schema cache
```

This means the database table hasn't been created yet. Follow the instructions below to fix this in **under 2 minutes**.

---

## 📋 Quick Setup (2 Minutes)

### Option 1: Use the Built-in Tool (Easiest)

1. **In your app**, navigate to **Settings → Diagnostic** (or wherever the diagnostic view is located)
2. Scroll down to **"Create project_transactions Table"** card
3. Click **"Copy SQL to Clipboard"**
4. Open your [Supabase Dashboard](https://supabase.com/dashboard)
5. Go to **SQL Editor**
6. Click **New Query**
7. **Paste** the SQL and click **Run**
8. **Refresh** the app

### Option 2: Manual Setup

1. Open the file `/supabase/migrations/create_project_transactions.sql`
2. Copy the entire contents
3. Open your [Supabase Dashboard](https://supabase.com/dashboard)
4. Navigate to **SQL Editor** in the left sidebar
5. Click **New Query**
6. Paste the SQL into the editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Wait for the success message
9. Refresh your app

---

## ✅ What This Creates

The migration creates a `project_transactions` table that:

- ✅ Tracks both **purchases** (materials, tools) and **payments** (labor, services)
- ✅ Links transactions to projects and phases
- ✅ Supports optional inventory integration
- ✅ Has proper Row Level Security (RLS) policies
- ✅ Includes real-time subscription support
- ✅ Uses proper database constraints (e.g., `type IN ('purchase', 'payment')`)

---

## 🎯 After Setup

Once the table is created, you'll be able to:

1. **Record Purchases**: Track materials and tools with vendor, quantity, and cost
2. **Record Payments**: Track labor, subcontractor payments, and other expenses
3. **Link to Inventory**: Optionally add purchases to your inventory system
4. **Track by Phase**: Associate transactions with project phases
5. **View Finance Reports**: See total spending per project and phase
6. **Real-time Updates**: Changes sync automatically across all open sessions

---

## 🔍 Verify Setup

After running the migration, verify it worked:

1. Go to **Settings → Diagnostic**
2. Find the **"Database Schema Inspector"** card
3. Click **"Inspect project_transactions Table"**
4. You should see: **"✅ Table Exists!"**

---

## ❓ Troubleshooting

### Issue: "Table not found" error persists after running migration

**Solution:**
1. Go to Supabase Dashboard → **Settings → API**
2. Find the **PostgREST** section
3. Click **Restart**
4. Wait 30 seconds
5. Hard refresh your browser (Cmd/Ctrl + Shift + R)

### Issue: SQL migration fails with "already exists" errors

**Solution:** This is okay! It means the table was already created. The migration uses `CREATE TABLE IF NOT EXISTS` so it's safe to run multiple times.

### Issue: Can't access Supabase Dashboard

**Solution:** 
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Log in with your Supabase account
3. Select your project from the project list
4. If you don't have access, contact your Supabase project admin

---

## 📚 Technical Details

### Table Schema

```sql
CREATE TABLE public.project_transactions (
  id uuid PRIMARY KEY,
  project_id uuid NOT NULL,
  phase_name text,
  type text CHECK (type IN ('purchase', 'payment')),
  amount numeric NOT NULL,
  reference text,        -- vendor/payee name
  description text,      -- item/service description
  notes text,
  date timestamptz,
  quantity numeric,      -- for purchases
  unit_cost numeric,     -- for purchases
  inventory_id uuid,     -- optional link to inventory
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz
);
```

### Why a Separate Table?

We use a dedicated `project_transactions` table (instead of `inventory_transactions`) because:

1. **Separation of Concerns**: Financial transactions ≠ Inventory movements
2. **Cleaner Schema**: Payments don't need inventory-specific fields
3. **Better Performance**: Smaller, focused table with optimized indexes
4. **Easier Maintenance**: Changes to one system don't affect the other

---

## 🎉 You're All Set!

After completing the setup, your Project Transactions feature will be fully operational. You'll be able to track all project expenses, generate financial reports, and manage your project budgets effectively.

Need help? Check the diagnostic tools built into the app at **Settings → Diagnostic**.
