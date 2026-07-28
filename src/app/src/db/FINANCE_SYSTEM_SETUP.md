# Project-Client Finance System Setup Guide

This guide will help you implement the complete finance tracking system for Cstle Livn admin panel.

## 🎯 Overview

The finance system enables:
- **Project Budget Management**: Track budget totals, spending, and remaining amounts
- **Client Payment Ledger**: Record payments received from clients
- **Project Expenses**: Track all project-related expenses
- **Realtime Updates**: All changes sync instantly across the app
- **Automatic Calculations**: Profit/loss, budget status, and balances calculated automatically

## 📋 Step 1: Run Database Migrations

### 1.1 Run the Finance Migration

1. Go to your Supabase Dashboard → SQL Editor
2. Open and run `/src/db/migrations/003_project_client_finances.sql`

This will:
- Add budget fields to `projects` table (`budget_total`, `budget_spent`, `budget_remaining`, `budget_status`)
- Add account fields to `clients` table (`total_billed`, `total_paid`, `account_balance`)
- Create `payments_received` table for client payments
- Create `project_expenses` table for project expenses
- Set up automatic triggers for budget and balance calculations
- Enable Row Level Security (RLS) policies

### 1.2 Enable Realtime for New Tables

1. In Supabase Dashboard → SQL Editor
2. Run the updated `/src/db/enable-realtime.sql` script

This enables WebSocket subscriptions for:
- `payments_received`
- `project_expenses`
- All existing tables

## 📊 Step 2: Database Schema Overview

### Projects Table (Updated)
```sql
- budget_total: DECIMAL(10, 2)      -- Total project budget
- budget_spent: DECIMAL(10, 2)      -- Amount spent (auto-calculated)
- budget_remaining: DECIMAL(10, 2)  -- Remaining (auto-calculated)
- budget_status: TEXT                -- 'On Track', 'Warning', 'At Risk', 'Over Budget'
```

### Clients Table (Updated)
```sql
- total_billed: DECIMAL(10, 2)     -- Sum of all project budgets
- total_paid: DECIMAL(10, 2)       -- Sum of all payments received
- account_balance: DECIMAL(10, 2)  -- Outstanding balance (auto-calculated)
```

### Payments Received Table (New)
```sql
id: UUID
client_id: UUID → clients(id)
project_id: UUID → projects(id) (optional)
payment_date: DATE
payment_amount: DECIMAL(10, 2)
payment_method: TEXT (E-Transfer, Cash, Cheque, etc.)
reference_number: TEXT (optional)
notes: TEXT (optional)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Project Expenses Table (New)
```sql
id: UUID
project_id: UUID → projects(id)
expense_date: DATE
expense_amount: DECIMAL(10, 2)
expense_category: TEXT (Materials, Labor, Equipment, etc.)
vendor_id: UUID → vendors(id) (optional)
description: TEXT
receipt_url: TEXT (optional)
notes: TEXT (optional)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

## 🔧 Step 3: Automatic Calculations

The system includes database triggers that automatically:

1. **Update `budget_spent` when**:
   - A project expense is added/updated/deleted
   - An inventory item is used on the project

2. **Update `budget_status` when**:
   - `budget_spent` changes
   - Status is calculated as:
     - < 75%: "On Track" (Green)
     - 75-89%: "Warning" (Yellow)
     - 90-99%: "At Risk" (Orange)
     - ≥ 100%: "Over Budget" (Red)

3. **Update client `total_paid` when**:
   - A payment is recorded/updated/deleted

4. **Update client `total_billed` when**:
   - A project's `budget_total` changes
   - A new project is created for the client

## 🎨 Step 4: UI Components Created

### Components Available

1. **`RecordPaymentDialog`** (`/components/RecordPaymentDialog.tsx`)
   - Record client payments
   - Allocate to specific projects
   - Track payment method and reference numbers

2. **`RecordExpenseDialog`** (`/components/RecordExpenseDialog.tsx`)
   - Record project expenses
   - Categorize expenses
   - Link to vendors
   - Attach receipt URLs

3. **`ProjectFinanceTab`** (`/components/ProjectFinanceTab.tsx`)
   - Complete finance view for projects
   - Budget overview with progress bars
   - Payments and expenses lists
   - Profit/Loss calculations
   - Budget editing

### Realtime Hooks Created

1. **`usePayments`** (`/src/features/payments/usePayments.ts`)
   - Fetch and subscribe to payment changes
   - Filter by client or project

2. **`useExpenses`** (`/src/features/expenses/useExpenses.ts`)
   - Fetch and subscribe to expense changes
   - Filter by project or vendor

## 🚀 Step 5: Integration Instructions

### 5.1 Add Finance Tab to Project Details

In your `ProjectDetails` component, add the Finance tab:

```tsx
import ProjectFinanceTab from "./ProjectFinanceTab";

// In your tab navigation:
<Tab value="finance" label="💰 Finance" />

// In your tab content:
{activeTab === "finance" && (
  <ProjectFinanceTab projectId={project.id} />
)}
```

### 5.2 Add "Record Payment" Button to Client Details

```tsx
import RecordPaymentDialog from "./RecordPaymentDialog";
import { useState } from "react";

// In your component:
const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);

// In your UI:
<Button onClick={() => setIsRecordPaymentOpen(true)}>
  <DollarSign className="w-4 h-4 mr-2" />
  Record Payment
</Button>

<RecordPaymentDialog
  isOpen={isRecordPaymentOpen}
  onClose={() => setIsRecordPaymentOpen(false)}
  clientId={String(client.id)}
/>
```

### 5.3 Display Client Account Balance

In client details or list views:

```tsx
const { payments } = usePayments(true, { clientId: String(client.id) });

const totalPaid = payments.reduce((sum, p) => sum + Number(p.payment_amount), 0);
const accountBalance = (client.total_billed || 0) - totalPaid;

// Display:
<div>
  <p>Total Billed: ${client.total_billed?.toFixed(2)}</p>
  <p>Total Paid: ${totalPaid.toFixed(2)}</p>
  <p>Balance Due: ${accountBalance.toFixed(2)}</p>
</div>
```

## 📈 Step 6: Finance Dashboard Integration

Update your Finance Dashboard to show:

```tsx
import { usePayments } from "../src/features/payments/usePayments";
import { useExpenses } from "../src/features/expenses/useExpenses";

function FinanceDashboard() {
  const { payments } = usePayments();
  const { expenses } = useExpenses();
  
  const totalIncome = payments.reduce((sum, p) => sum + Number(p.payment_amount), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.expense_amount), 0);
  const netProfit = totalIncome - totalExpenses;
  
  return (
    <div>
      <StatCard title="Total Income" value={`$${totalIncome.toFixed(2)}`} />
      <StatCard title="Total Expenses" value={`$${totalExpenses.toFixed(2)}`} />
      <StatCard title="Net Profit" value={`$${netProfit.toFixed(2)}`} />
    </div>
  );
}
```

## ✅ Step 7: Testing Checklist

### Test Budget Management
- [ ] Set a project budget in Project Finance tab
- [ ] Verify budget appears immediately without refresh
- [ ] Add an expense and verify budget_spent updates automatically
- [ ] Check that budget status changes based on spending percentage

### Test Payment Recording
- [ ] Record a payment for a client
- [ ] Verify payment appears in project finance immediately
- [ ] Check that client's total_paid updates automatically
- [ ] Record payment without project (general payment)

### Test Expense Recording
- [ ] Add an expense to a project
- [ ] Verify it appears in project finance tab immediately
- [ ] Check that budget_spent increases
- [ ] Link expense to a vendor

### Test Realtime Sync
- [ ] Open two browser tabs with the same project
- [ ] Record a payment in one tab
- [ ] Verify it appears in the other tab without refresh
- [ ] Repeat for expenses

### Test Calculations
- [ ] Create a project with budget_total = $10,000
- [ ] Add expenses totaling $7,500
- [ ] Verify budget_spent shows $7,500
- [ ] Verify budget_remaining shows $2,500
- [ ] Verify budget_status shows "Warning"
- [ ] Record payments totaling $12,000
- [ ] Verify profit/loss shows +$4,500

## 🎯 Expected Outcome

After complete implementation:

1. **Project Finance Tab** shows:
   - Budget total, spent, and remaining
   - All payments received for the project
   - All expenses for the project
   - Real-time profit/loss calculation

2. **Client Account** shows:
   - Total amount billed (sum of all project budgets)
   - Total payments received
   - Outstanding balance
   - Full payment history

3. **Finance Dashboard** shows:
   - Total income from all payments
   - Total expenses from all projects
   - Net profit/loss
   - Financial trends

4. **Realtime Updates**:
   - Recording a payment instantly updates client balance
   - Adding an expense instantly updates project budget
   - All changes sync across all open tabs/users

## 🆘 Troubleshooting

### Realtime not working
- Ensure you ran `/src/db/enable-realtime.sql`
- Check Supabase Dashboard → Database → Replication
- Verify tables are in `supabase_realtime` publication

### Calculations not updating
- Verify triggers exist: Check SQL Editor → Database Functions
- Test manually: Add expense, check if `budget_spent` updates
- Check browser console for errors

### Permission errors
- Verify RLS policies are enabled
- Check user authentication
- Ensure user has correct permissions in AuthContext

## 📚 Additional Resources

- API Functions: `/src/features/payments/api.ts` and `/src/features/expenses/api.ts`
- Realtime Hooks: `/src/features/payments/usePayments.ts` and `/src/features/expenses/useExpenses.ts`
- UI Components: `/components/RecordPaymentDialog.tsx`, `/components/RecordExpenseDialog.tsx`, `/components/ProjectFinanceTab.tsx`
- Migration Script: `/src/db/migrations/003_project_client_finances.sql`

---

**Next Steps**: After completing this setup, you can extend the system with:
- Invoice generation
- Payment reminders
- Expense categories breakdown charts
- Financial reports export
- Multi-currency support
- Tax calculation

