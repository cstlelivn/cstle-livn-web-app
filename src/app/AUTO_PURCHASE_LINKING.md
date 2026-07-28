# Automatic Project Purchase Linking

## Overview
When creating an inventory item linked to a project, the system now automatically creates a purchase transaction that appears in the project's Purchases tab.

## How It Works

### 1. Inventory Creation Flow
When a user creates an inventory item:
- Fill in all required fields (name, type, category, quantity, unit, cost)
- Optionally link to a **Project** and **Phase**
- Click "Add Item"

### 2. Automatic Purchase Transaction
If the item is linked to a project:

1. **Inventory item is created with quantity 0**
   - The item exists in inventory but starts with no stock

2. **Purchase transaction is automatically created**
   - Records the purchase for the specified project and phase
   - Adds the quantity to the inventory item
   - Updates the project's spent amount
   - Links to the vendor if one was selected
   - Uses the last restocked date as the purchase date

3. **Purchase appears in Project Purchases tab**
   - All details are properly filled:
     - Item name and category
     - Quantity and unit
     - Unit cost and total cost
     - Phase assignment
     - Vendor (if specified)
     - Purchase date
     - Notes: "Initial inventory purchase for [item name]"

### 3. Benefits

✅ **Single Entry** - Enter inventory once, automatically tracks purchase
✅ **Accurate Project Costs** - Purchase is recorded against project budget
✅ **Phase Tracking** - Know exactly which phase the materials were purchased for
✅ **Vendor History** - Maintains vendor relationship for project purchases
✅ **Audit Trail** - Complete record of when and what was purchased

## Validation

The system validates:
- ✅ If project is selected, phase must also be selected
- ✅ Quantity must be greater than 0
- ✅ Unit cost cannot be negative
- ✅ All required fields must be filled

## Error Handling

If purchase creation fails:
- Inventory item is still created successfully
- Warning message shows the item was created but not linked
- Purchase can be manually added later from the project's Purchases tab

## Example Workflow

**Scenario**: Purchasing paint for "Smith Residence" basement finishing project

1. Navigate to Inventory → Create New Item
2. Fill in:
   - Name: "Premium Interior Paint - Eggshell White"
   - Type: "Consumable"
   - Category: "Painting"
   - Quantity: 5
   - Unit: "Gallon"
   - Cost: 45.00 (per gallon)
   - Supplier: "ABC Paint Supply"
   - Project: "Smith Residence"
   - Phase: "Painting"
3. Click "Add Item"

**Result**:
- Inventory item created with 5 gallons
- Purchase transaction created:
  - Project: Smith Residence
  - Phase: Painting
  - Item: Premium Interior Paint - Eggshell White
  - Quantity: 5 Gallon
  - Unit Cost: $45.00
  - Total: $225.00
  - Vendor: ABC Paint Supply
- Project "spent" increased by $225.00
- Purchase visible in Smith Residence → Purchases tab

## Technical Details

### API Flow
```
1. addInventoryItem() → Creates item with quantity 0
2. createPurchaseTransactions() → 
   - Creates purchase transaction record
   - Adds quantity to inventory
   - Updates project spent
3. Realtime updates trigger UI refresh
```

### Database Updates
- `inventory` table: New item record
- `inventory_transactions` table: Purchase transaction
- `projects` table: Updated `spent` amount

### Files Modified
- `/components/InventoryModule.tsx` - Added automatic purchase creation
- Imports `createPurchaseTransactions` from purchases API
- Validates project/phase linking
- Creates purchase transaction after successful inventory creation

## Notes

- This feature only applies to **new** inventory items
- Editing existing inventory items does not create purchases
- Manual purchases can still be added via the Purchases tab
- The automatic purchase uses the "last restocked" date as the purchase date
