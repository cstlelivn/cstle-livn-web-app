# Inventory System - Testing Checklist

## Pre-Test Setup

### Database Migration
- [ ] Run `/src/db/inventory_transactions_schema.sql` in Supabase SQL Editor
- [ ] Verify `inventory_transactions` table exists in Supabase dashboard
- [ ] Check that RLS policies are enabled

### Code Integration
- [ ] Update `/App.tsx` to import `InventoryModuleRefactored` instead of `InventoryModule`
- [ ] Restart development server
- [ ] No compilation errors

---

## Test Scenario 1: Create New Inventory Item ✅

**Goal**: Verify item creation works end-to-end

### Steps:
1. [ ] Navigate to Inventory module
2. [ ] Click "Add Item" button
3. [ ] Fill in form:
   - [ ] Item Name: "Test Paint - White"
   - [ ] Type: "Consumable"
   - [ ] Category: "Painting"
   - [ ] Quantity: 50
   - [ ] Unit: "Can"
   - [ ] Reorder Level: 10
   - [ ] Unit Cost: 25.00
   - [ ] Location: "Warehouse A"
4. [ ] Click "Create Item"
5. [ ] Success toast appears: "Inventory item created successfully"
6. [ ] Item appears in inventory list
7. [ ] Dialog closes automatically

### Verification:
- [ ] Item name matches what you entered
- [ ] Quantity shows "50 Can"
- [ ] Status badge shows "In Stock" (green)
- [ ] "View" and "Edit" buttons are visible

**Pass/Fail**: ___________

---

## Test Scenario 2: Edit Existing Item ✅

**Goal**: Verify all fields can be edited and persist

### Steps:
1. [ ] Find the item you just created
2. [ ] Click "Edit" button
3. [ ] Update fields:
   - [ ] Change name to "Premium Paint - White"
   - [ ] Change category to "Finishing"
   - [ ] Change location to "Warehouse B"
   - [ ] Change unit cost to 30.00
   - [ ] Change reorder level to 15
4. [ ] Click "Save Changes"
5. [ ] Success toast appears

### Verification:
- [ ] Refresh the page (F5)
- [ ] Item still shows updated name
- [ ] Location shows "Warehouse B"
- [ ] Cost shows $30.00
- [ ] Reorder level shows 15

**Note**: Quantity should NOT be editable in edit dialog (by design)

**Pass/Fail**: ___________

---

## Test Scenario 3: View Item Details ✅

**Goal**: Verify detail view displays all information

### Steps:
1. [ ] Click "View" button on any item
2. [ ] Detail page loads

### Verification:
- [ ] See "Back to Inventory" button
- [ ] See "Edit Item" button
- [ ] Item Details card shows:
  - [ ] Type
  - [ ] Category
  - [ ] Location
  - [ ] Unit Cost
  - [ ] Current Quantity
  - [ ] Reorder Level
- [ ] Stock Actions card shows:
  - [ ] "Receive Stock" button
  - [ ] "Issue / Use Stock" button
  - [ ] "Adjust Stock" button
- [ ] Transaction History section visible (may be empty)

**Pass/Fail**: ___________

---

## Test Scenario 4: Receive Stock ✅

**Goal**: Verify stock increase via transaction

### Steps:
1. [ ] On item detail page, click "Receive Stock"
2. [ ] Enter:
   - [ ] Quantity: 25
   - [ ] Reference: "INV-12345"
   - [ ] Notes: "Delivery from supplier"
3. [ ] Click "Receive Stock"
4. [ ] Success toast appears

### Verification:
- [ ] Quantity increased by 25 (e.g., 50 → 75)
- [ ] Transaction History shows new entry:
  - [ ] Type: "purchase"
  - [ ] Change: "+25 Can"
  - [ ] Reference: "INV-12345"
  - [ ] Notes: "Delivery from supplier"
  - [ ] Date: Today's date
- [ ] "Last Restocked" date updated to today

**Pass/Fail**: ___________

---

## Test Scenario 5: Issue Stock ✅

**Goal**: Verify stock decrease via transaction

### Steps:
1. [ ] On item detail page, click "Issue / Use Stock"
2. [ ] Enter:
   - [ ] Quantity: 20
   - [ ] Reference: "Project ABC"
   - [ ] Notes: "Used for main bedroom"
3. [ ] Click "Issue Stock"
4. [ ] Success toast appears

### Verification:
- [ ] Quantity decreased by 20 (e.g., 75 → 55)
- [ ] Transaction History shows new entry:
  - [ ] Type: "consumption"
  - [ ] Change: "-20 Can" (red color)
  - [ ] Reference: "Project ABC"
  - [ ] Notes: "Used for main bedroom"

**Pass/Fail**: ___________

---

## Test Scenario 6: Issue More Than Available (Error Case) ❌

**Goal**: Verify negative quantity prevention

### Steps:
1. [ ] Note current quantity (e.g., 55)
2. [ ] Click "Issue / Use Stock"
3. [ ] Enter quantity GREATER than available (e.g., 100)
4. [ ] Click "Issue Stock"

### Verification:
- [ ] Error toast appears: "Cannot issue more than available quantity"
- [ ] Dialog does NOT close
- [ ] Quantity remains unchanged
- [ ] No transaction created

**Pass/Fail**: ___________

---

## Test Scenario 7: Adjust Stock (Positive) ✅

**Goal**: Verify manual adjustment with reason

### Steps:
1. [ ] On item detail page, click "Adjust Stock"
2. [ ] Enter:
   - [ ] Quantity Change: +10
   - [ ] Reason: "Physical count found extra units"
   - [ ] Reference: "Count-2025-01"
3. [ ] Click "Adjust Stock"
4. [ ] Success toast appears

### Verification:
- [ ] Quantity increased by 10
- [ ] Transaction History shows:
  - [ ] Type: "adjustment"
  - [ ] Change: "+10 Can" (green color)
  - [ ] Notes: "Physical count found extra units"
  - [ ] Reference: "Count-2025-01"

**Pass/Fail**: ___________

---

## Test Scenario 8: Adjust Stock Without Reason (Error Case) ❌

**Goal**: Verify reason is required for adjustments

### Steps:
1. [ ] Click "Adjust Stock"
2. [ ] Enter:
   - [ ] Quantity Change: -5
   - [ ] Leave "Reason" field EMPTY
3. [ ] Try to click "Adjust Stock"

### Verification:
- [ ] Button is disabled OR error toast appears: "Reason is required for stock adjustments"
- [ ] Transaction not created
- [ ] Quantity unchanged

**Pass/Fail**: ___________

---

## Test Scenario 9: Low Stock Alert ⚠️

**Goal**: Verify low stock visual indicators

### Steps:
1. [ ] Find or create an item with quantity < reorder level
   - Option A: Edit existing item, set reorder level ABOVE current quantity
   - Option B: Issue stock until quantity drops below reorder level
2. [ ] Return to inventory list

### Verification:
- [ ] Item row has colored background (light red)
- [ ] Warning triangle icon (⚠️) appears next to item name
- [ ] Status badge shows "Low Stock" (yellow) or "Critical" (red)
- [ ] Alert banner appears at top: "X items need restocking"
- [ ] Stats card shows correct "Low Stock" count

**Pass/Fail**: ___________

---

## Test Scenario 10: Transaction History Persistence ✅

**Goal**: Verify transactions persist across sessions

### Steps:
1. [ ] Note the number of transactions for a specific item
2. [ ] Refresh the page (F5)
3. [ ] Navigate back to the same item's detail page

### Verification:
- [ ] All transactions still appear
- [ ] Same number of transactions
- [ ] Correct quantity displayed
- [ ] Dates and references match

**Pass/Fail**: ___________

---

## Test Scenario 11: Filter and Sort ✅

**Goal**: Verify table filtering works

### Steps:
1. [ ] Return to inventory list
2. [ ] Use search box: enter "Paint"
3. [ ] Verify only items with "Paint" in name appear
4. [ ] Clear search
5. [ ] Use "Status" filter: select "Low Stock"
6. [ ] Verify only low stock items appear
7. [ ] Use sort: "Quantity" ascending
8. [ ] Verify items sorted by quantity (lowest first)

### Verification:
- [ ] Search filters items correctly
- [ ] Status filter works
- [ ] Type filter works (Equipment/Consumable)
- [ ] Sorting works

**Pass/Fail**: ___________

---

## Test Scenario 12: Custom Units ✅

**Goal**: Verify custom unit creation and persistence

### Steps:
1. [ ] Create new item or edit existing
2. [ ] In "Unit" dropdown, select "Other"
3. [ ] Enter custom unit: "Bundle"
4. [ ] Save item
5. [ ] Create another new item
6. [ ] Check "Unit" dropdown

### Verification:
- [ ] "Bundle" appears as an option in dropdown
- [ ] Custom unit persists across sessions (stored in localStorage)
- [ ] Item displays with custom unit correctly

**Pass/Fail**: ___________

---

## Test Scenario 13: Design System Compliance 🎨

**Goal**: Verify CSS variables are used

### Steps:
1. [ ] Open browser DevTools
2. [ ] Inspect any heading (h2, h3, h4)
3. [ ] Check "Computed" styles

### Verification:
- [ ] Headings use "Anybody" font family
- [ ] Font variation settings: "'wdth' 137"
- [ ] Body text uses "Roboto Mono"
- [ ] Colors use CSS variable names (--accent, --primary, etc.)
- [ ] Spacing uses consistent values

**Pass/Fail**: ___________

---

## Performance & UX Tests

### Realtime Updates
- [ ] Open app in two browser tabs
- [ ] Create item in Tab 1
- [ ] Verify item appears in Tab 2 automatically (within ~1 second)

### Loading States
- [ ] Refresh page
- [ ] See "Loading..." state before data appears
- [ ] No flash of empty state

### Responsive Design
- [ ] Resize browser window
- [ ] Table columns adjust appropriately
- [ ] Mobile view shows simplified layout

---

## Final Checks

### Data Integrity
- [ ] No duplicate items created
- [ ] Quantities match transaction history
- [ ] No negative quantities exist
- [ ] All required fields are enforced

### Error Handling
- [ ] Network errors show user-friendly messages
- [ ] Validation errors are clear
- [ ] Failed operations don't corrupt data

### User Experience
- [ ] All buttons have clear labels
- [ ] Success/error feedback is immediate
- [ ] Navigation is intuitive
- [ ] No broken links or 404 errors

---

## Test Results Summary

**Date**: ___________  
**Tester**: ___________  
**Environment**: [ ] Dev [ ] Staging [ ] Production

**Total Scenarios**: 13  
**Passed**: _____ / 13  
**Failed**: _____ / 13  
**Blocked**: _____ / 13  

### Critical Issues Found:
1. _______________________________
2. _______________________________
3. _______________________________

### Notes:
_________________________________________________
_________________________________________________
_________________________________________________

### Recommendation:
[ ] ✅ Ready for production  
[ ] ⚠️ Minor fixes needed  
[ ] ❌ Major issues, do not deploy  

---

**Sign-off**: ___________  
**Date**: ___________
