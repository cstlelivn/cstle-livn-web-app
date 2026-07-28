# Purchase System Testing & Verification Guide

## System Overview

The upgraded purchase system allows adding receipt-style purchases to projects with optional inventory creation. It works with the existing `project_expenses` table schema.

## Database Schema Mapping

The system adapts the new purchase workflow to the existing `project_expenses` table:

**Existing `project_expenses` columns:**
- `expense_date` ← stores purchase date
- `expense_amount` ← stores total cost
- `expense_category` ← stores phase name
- `description` ← stores item name
- `vendor_id` ← vendor reference
- `notes` ← stores JSON metadata (vendor name, quantity, unit cost, inventory link, user notes)

**Frontend Interface (`ProjectPurchase`):**
- Uses camelCase names
- Presents clean purchase-focused fields
- Automatically transforms to/from database schema

## Testing Checklist

### 1. Create a New Purchase ✓

**Steps:**
1. Navigate to Project Details → Purchases tab
2. Click "Add Purchase" button
3. Fill in the form:
   - Item Name: "2x4 Lumber"
   - Vendor: "Rona Rochdale"
   - Phase: Select any phase (e.g., "Framing")
   - Quantity: 50
   - Unit Cost: 8.50
   - Purchase Date: (today's date)
   - Notes: "For main structure"
4. Leave "Add to Inventory?" toggle OFF
5. Click "Save Purchase"

**Expected Results:**
- Success toast: "Purchase recorded: 2x4 Lumber - $425.00"
- Purchase appears in table immediately
- Project total spent increases by $425.00
- Table shows: Date, "2x4 Lumber", "Rona Rochdale", Phase, 50, $8.50, $425.00

### 2. Create Purchase WITH Inventory ✓

**Steps:**
1. Click "Add Purchase" again
2. Fill in:
   - Item Name: "Paint Gallon - White"
   - Vendor: "Home Depot East"
   - Phase: "Painting"
   - Quantity: 10
   - Unit Cost: 35.00
   - Total Cost: $350.00 (auto-calculated)
3. Toggle "Add to Inventory?" to ON
4. Fill inventory fields:
   - Inventory Type: Material
   - Unit: gal
   - Inventory Location: "Warehouse A"
   - Reorder Level: 5
5. Click "Save Purchase"

**Expected Results:**
- Success toast: "Purchase recorded: Paint Gallon - White - $350.00 (added to inventory)"
- New inventory item created with quantity 10
- Purchase linked to inventory (shows "Inv" badge in table)
- Project spent increases by $350.00

### 3. Edit a Purchase ✓

**Steps:**
1. Click on any purchase row in the table (or click Edit button)
2. Edit dialog opens with pre-filled data
3. Change quantity from 50 to 60
4. Click "Update Purchase"

**Expected Results:**
- Success toast: "Purchase updated"
- Total cost recalculates: 60 × $8.50 = $510.00
- Project spent adjusts by difference: +$85.00
- Table updates immediately

### 4. Delete a Purchase ✓

**Steps:**
1. Click delete button (trash icon) on a purchase
2. Confirmation dialog appears
3. Review the amount that will be deducted
4. Click "Delete"

**Expected Results:**
- Success toast: "Purchase deleted successfully"
- Purchase removed from table
- Project spent decreases by purchase amount
- Inventory NOT deleted (only the link is removed)

### 5. Filter Purchases ✓

**Steps:**
1. Use phase dropdown to filter by specific phase
2. Set "From Date" and "To Date" filters
3. Verify only matching purchases show
4. Total spent updates to reflect filtered purchases

**Expected Results:**
- Table shows only purchases matching filters
- Total spent shows filtered amount
- Phase badge in filter title shows selected phase

### 6. Realtime Updates ✓

**Steps:**
1. Open project in two browser tabs
2. Add a purchase in Tab 1
3. Watch Tab 2 for automatic update

**Expected Results:**
- Tab 2 purchase list refreshes automatically
- New purchase appears without manual reload
- Project finance updates in both tabs

## Data Verification

### Check Database Records

```sql
-- View all expenses for a project
SELECT 
  id,
  expense_date,
  description,
  expense_category,
  expense_amount,
  notes
FROM project_expenses
WHERE project_id = '<your-project-id>'
ORDER BY expense_date DESC;

-- Check notes field (should contain JSON metadata)
SELECT notes FROM project_expenses LIMIT 1;
-- Should return something like:
-- {"vendor":"Rona Rochdale","quantity":50,"unitCost":8.5,"userNotes":"For main structure"}
```

### Check Project Spent

```sql
-- Verify project spent is correct
SELECT 
  p.name,
  p.spent,
  COALESCE(SUM(pe.expense_amount), 0) as calculated_spent
FROM projects p
LEFT JOIN project_expenses pe ON p.id = pe.project_id
WHERE p.id = '<your-project-id>'
GROUP BY p.id, p.name, p.spent;
-- spent should equal calculated_spent
```

### Check Inventory Linkage

```sql
-- Find purchases linked to inventory
SELECT 
  pe.description,
  pe.expense_amount,
  pe.notes,
  i.name as inventory_name,
  i.quantity as inventory_quantity
FROM project_expenses pe
LEFT JOIN inventory i ON (pe.notes::json->>'inventoryId')::uuid = i.id
WHERE pe.project_id = '<your-project-id>'
  AND pe.notes::json->>'inventoryId' IS NOT NULL;
```

## Common Issues & Solutions

### Issue: "Could not find table project_purchases"
**Solution:** ✓ FIXED - Now using correct table name `project_expenses`

### Issue: Purchase data looks wrong in table
**Solution:** Check the `fromDbFormat()` function - it parses JSON from notes field

### Issue: Vendor name not showing
**Solution:** Vendor is stored in JSON notes, not vendor_id (unless you want to link to vendors table)

### Issue: Inventory not created
**Solution:** Check AddProjectPurchaseDialog - ensure toggle is ON and all required fields filled

### Issue: Project spent not updating
**Solution:** Check project ID is correct, verify update query in createProjectPurchase()

### Issue: Realtime not working
**Solution:** Verify enable-realtime.sql ran, check browser console for subscription errors

## API Functions Reference

```typescript
// Create purchase (with optional inventory)
createProjectPurchase(input: CreateProjectPurchaseInput): Promise<ProjectPurchase>

// Get all purchases for project
getProjectPurchases(projectId: string): Promise<ProjectPurchase[]>

// Get purchases for specific phase
getPhasePurchases(projectId: string, phaseName: string): Promise<ProjectPurchase[]>

// Update purchase
updateProjectPurchase(id: string, updates: UpdateProjectPurchaseInput): Promise<ProjectPurchase>

// Delete purchase
deleteProjectPurchase(id: string): Promise<void>

// Calculate spend
calculateProjectPurchaseSpend(projectId: string): Promise<number>
calculatePhasePurchaseSpend(projectId: string, phaseName: string): Promise<number>
```

## Files Modified/Created

### New Files:
- `/src/features/purchases/projectPurchasesApi.ts` - Core API
- `/components/AddProjectPurchaseDialog.tsx` - Add purchase modal
- `/components/EditProjectPurchaseDialog.tsx` - Edit purchase modal

### Modified Files:
- `/components/ProjectPurchasesView.tsx` - Updated to use new API
- `/components/ProjectDetailsReal.tsx` - Integrated new purchase dialog

## Success Criteria

✅ Can add purchases without inventory
✅ Can add purchases with inventory creation
✅ Purchases appear in table immediately
✅ Can edit purchases (updates cost calculations)
✅ Can delete purchases (reverses spend)
✅ Filters work correctly
✅ Project finances update automatically
✅ Realtime updates work across tabs
✅ All styling uses CSS design system variables
✅ Data persists correctly in database
✅ Inventory linkage works when enabled

## Next Steps

After verifying all tests pass:

1. **Performance**: Monitor query performance for projects with many purchases
2. **Reporting**: Add purchase reports/exports if needed
3. **Vendor Linking**: Consider linking to vendors table instead of storing name as string
4. **Receipts**: Add receipt upload functionality using `receipt_url` field
5. **Bulk Import**: Allow CSV/Excel import of multiple purchases
6. **Purchase Orders**: Extend to support PO workflow if needed

---

**Testing Status:** Ready for testing
**Last Updated:** 2024-11-24
**Tested By:** [Your Name]
**Status:** [ ] PASS / [ ] FAIL (with notes)
