# Inventory → Finance Integration Setup Guide

## Overview
This guide will help you set up the complete integration between Inventory, Projects, and Finance systems. The integration allows inventory items to be linked to projects, automatically creating purchase transactions and updating financial summaries.

---

## Current Implementation Status

✅ **Application Code**: Fully implemented
- Inventory items can be linked to projects and phases
- Purchase transactions are automatically created
- Project financial tracking is functional
- UI displays linked projects and phases

⚠️ **Database Schema**: Requires migration (optional enhancement)
- Current approach uses `inventory_transactions` table (works now)
- Enhanced approach adds direct columns to `inventory` table (better performance)

---

## How It Works Now (Without Migration)

### Data Flow
```
1. User creates inventory item with project link
   ↓
2. Item is created in `inventory` table
   ↓
3. Purchase transaction created in `inventory_transactions` table
   - Links to project_id
   - Links to phase_name
   - Records quantity, cost, vendor
   ↓
4. Project's `spent` field is updated
   ↓
5. Finance views show updated totals
```

### Tables Used
- `inventory` - Stores inventory items
- `inventory_transactions` - Stores purchase records with project links
- `projects` - Updated with spending totals
- `transactions` - Future enhancement for unified finance

---

## Optional Database Enhancement

For improved performance and additional features, you can run the migration in `/src/db/inventory_finance_integration.sql`.

### What The Migration Adds

1. **Direct Project Links in Inventory**
   - Adds `project_id` column to `inventory` table
   - Adds `phase_name` column to `inventory` table
   - Adds `total_cost` computed column
   - Adds `linked_transaction_id` reference

2. **Enhanced Transactions Table**
   - Adds `inventory_id` column
   - Adds `phase_name` column
   - Adds `client_id` column (auto-populated from project)

3. **Automatic Triggers**
   - Auto-create transaction when inventory is linked to project
   - Auto-update transaction when inventory is modified
   - Auto-void transaction when inventory is deleted
   - Auto-recalculate project totals

4. **Financial Views**
   - `project_financial_summary` - Real-time project finances
   - `phase_financial_summary` - Per-phase cost tracking

### How to Run Migration

**Option A: Supabase Dashboard (Recommended)**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Create new query
4. Copy contents of `/src/db/inventory_finance_integration.sql`
5. Run the query
6. Verify no errors

**Option B: Supabase CLI**
```bash
supabase db push
```

---

## Testing the Integration

### Test 1: Create Inventory with Project Link

1. Navigate to **Inventory** module
2. Click **Add New Item**
3. Fill in item details:
   - Name: "Paint - Interior White"
   - Type: "Consumable"
   - Category: "Painting"
   - Quantity: 5
   - Unit: "Gallon"
   - Cost: 45.00
   - Project: Select a project
   - Phase: Select a phase
4. Click **Add Item**

**Expected Results:**
✅ Item created in inventory
✅ Purchase transaction created
✅ Appears in project's Purchases tab
✅ Project "spent" total updated
✅ Finance dashboard shows updated totals

### Test 2: Edit Inventory Project Link

1. Find the item you just created
2. Click **Edit**
3. Change the **Project** or **Phase**
4. Click **Save Changes**

**Expected Results:**
✅ Item updated
✅ Purchase transaction updated to new project/phase
✅ Old project's totals decrease
✅ New project's totals increase

### Test 3: View in Finance

1. Navigate to **Finance** module
2. Find the project you linked to
3. Check the "Spent" column

**Expected Results:**
✅ Spent amount includes inventory purchase
✅ Profit/margin calculations are correct

### Test 4: View in Project Purchases

1. Navigate to **Projects**
2. Open the project you linked to
3. Go to **Purchases** tab

**Expected Results:**
✅ Inventory item appears in purchases list
✅ Shows correct quantity, cost, phase
✅ Shows vendor if selected
✅ Date matches last restocked date

---

## Data Structure

### Inventory Item (with Project Link)
```javascript
{
  id: "uuid",
  name: "Paint - Interior White",
  type: "Consumable",
  category: "Painting",
  quantity: 5,
  unit: "Gallon",
  cost: 45.00,
  supplier: "vendor-uuid",
  // Link stored in inventory_transactions table
}
```

### Purchase Transaction (auto-created)
```javascript
{
  id: "uuid",
  inventory_id: "inventory-uuid",
  project_id: "project-uuid",
  phase_name: "Painting",
  type: "purchase",
  quantity_change: 5,
  quantity_after: 5,
  unit_cost: 45.00,
  total_cost: 225.00,
  vendor_id: "vendor-uuid",
  date: "2025-11-08",
  notes: "Inventory purchase: Paint - Interior White"
}
```

---

## Troubleshooting

### Issue: "Could not find 'phase_name' column"
**Cause**: Trying to write to inventory table columns that don't exist yet
**Solution**: This is expected before migration. App uses inventory_transactions table instead.
**Status**: ✅ Fixed - app now works without migration

### Issue: Item created but not linked to project
**Cause**: Purchase transaction creation failed
**Solution**: 
1. Check console for error messages
2. Verify project has phases defined
3. Ensure phase name matches exactly

### Issue: Project totals not updating
**Cause**: Transaction not created or project spent field not updated
**Solution**:
1. Check `inventory_transactions` table for the purchase record
2. Verify `project_id` is set correctly
3. Check if realtime subscriptions are active

### Issue: Duplicate quantities
**Cause**: Both inventory and transaction adding quantity
**Solution**: ✅ Fixed - app creates item with correct quantity once

---

## API Reference

### Create Inventory with Project Link
```typescript
await addInventoryItem({
  name: "Material Name",
  type: "Consumable",
  category: "Category",
  quantity: 10,
  unit: "Pcs",
  cost: 25.00,
  supplier: vendorId,
  // ... other fields
});

// Then create purchase transaction
await createPurchaseTransactions({
  project_id: projectId,
  vendor_id: vendorId,
  items: [{
    inventory_id: createdItem.id,
    phase_name: "Phase Name",
    quantity: 10,
    unit_cost: 25.00,
  }]
});
```

### Update Project Link
```typescript
await updateInventoryProjectLink(
  inventoryId,
  newProjectId,
  newPhaseName,
  quantity,
  unitCost,
  vendorId
);
```

### Get Project Link
```typescript
const link = await getInventoryProjectLink(inventoryId);
// Returns: { projectId, phaseName, transactionId }
```

---

## Future Enhancements

1. **Consumption Tracking**
   - Track when inventory is used on projects
   - Deduct from inventory quantity
   - Create consumption transactions

2. **Transfer Between Projects**
   - Move inventory items between projects
   - Update both projects' financials

3. **Vendor Performance**
   - Track delivery times
   - Quality ratings per purchase

4. **Budget Alerts**
   - Warn when purchase exceeds budget
   - Phase-level budget tracking

5. **Approval Workflows**
   - Require approval for large purchases
   - Multi-level approval chains

---

## Support

For issues or questions:
1. Check console logs for errors
2. Verify database schema matches expected structure
3. Review this guide's troubleshooting section
4. Check `/src/db/inventory_finance_integration.sql` for schema details

---

## Summary

✅ **Current Status**: Fully functional without migration
- Inventory can be linked to projects
- Purchase transactions are created automatically
- Finance totals update correctly
- UI displays all information

🚀 **With Migration**: Enhanced performance and features
- Faster queries (direct table columns)
- Automatic triggers (less code)
- Financial summary views
- Better data integrity

Choose the approach that fits your needs. The system works great as-is, and the migration is an optional enhancement for better performance at scale.
