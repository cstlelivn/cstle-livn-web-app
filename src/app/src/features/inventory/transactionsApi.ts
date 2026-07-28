import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';
import { getInventoryItem, updateInventoryItem } from './api';

const supabase = createClient();

export interface InventoryTransactionInput {
  inventoryId: string;
  type: 'purchase' | 'consumption' | 'adjustment' | 'transfer';
  quantityChange: number;
  reference?: string;
  notes?: string;
}

export interface InventoryTransaction {
  id: string;
  inventoryId: string;
  type: string;
  quantityChange: number;
  quantityAfter: number;
  reference?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// Transform database snake_case to frontend camelCase
function fromDbFormat(row: any): InventoryTransaction {
  return {
    id: row.id,
    inventoryId: row.inventory_id,
    type: row.type,
    quantityChange: row.quantity_change,
    quantityAfter: row.quantity_after,
    reference: row.reference,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// List all transactions for a specific inventory item
export async function listInventoryTransactions(inventoryId: string): Promise<InventoryTransaction[]> {
  const { data, error } = await supabase
    .from('inventory_transactions')
    .select('*')
    .eq('inventory_id', inventoryId)
    .order('created_at', { ascending: false })
    .limit(100);
  
  failIf(error, 'Failed to list inventory transactions');
  return (data ?? []).map(fromDbFormat);
}

// Create a stock movement transaction
export async function createStockMovement(input: InventoryTransactionInput): Promise<InventoryTransaction> {
  try {
    // Get current inventory item
    const item = await getInventoryItem(input.inventoryId);
    if (!item) {
      throw new Error('Inventory item not found');
    }

    const currentQuantity = item.quantity || 0;
    const newQuantity = currentQuantity + input.quantityChange;

    // Validate: don't allow negative quantity
    if (newQuantity < 0) {
      throw new Error(`Cannot process transaction: would result in negative quantity (current: ${currentQuantity}, change: ${input.quantityChange})`);
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Insert transaction record
    const { data: transaction, error: txError } = await supabase
      .from('inventory_transactions')
      .insert({
        inventory_id: input.inventoryId,
        type: input.type,
        quantity_change: input.quantityChange,
        quantity_after: newQuantity,
        reference: input.reference || null,
        notes: input.notes || null,
        created_by: user?.id || null,
        created_at: now(),
        updated_at: now(),
      })
      .select()
      .single();

    failIf(txError, 'Failed to create inventory transaction');

    // Update inventory item quantity
    await updateInventoryItem(input.inventoryId, {
      quantity: newQuantity,
      // Update lastRestocked if it's a purchase
      ...(input.type === 'purchase' && { lastRestocked: now() }),
    });

    return fromDbFormat(transaction);
  } catch (error: any) {
    console.error('Error creating stock movement:', error);
    throw new Error(error.message || 'Failed to create stock movement');
  }
}

// Convenience functions for specific transaction types

export async function receiveStock(
  inventoryId: string,
  quantity: number,
  reference?: string,
  notes?: string
): Promise<InventoryTransaction> {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive for receiving stock');
  }
  
  return createStockMovement({
    inventoryId,
    type: 'purchase',
    quantityChange: quantity,
    reference,
    notes,
  });
}

export async function issueStock(
  inventoryId: string,
  quantity: number,
  reference?: string,
  notes?: string
): Promise<InventoryTransaction> {
  if (quantity <= 0) {
    throw new Error('Quantity must be positive for issuing stock');
  }
  
  return createStockMovement({
    inventoryId,
    type: 'consumption',
    quantityChange: -quantity, // Negative for consumption
    reference,
    notes,
  });
}

export async function adjustStock(
  inventoryId: string,
  quantityChange: number,
  reason: string,
  reference?: string
): Promise<InventoryTransaction> {
  if (!reason || reason.trim() === '') {
    throw new Error('Reason is required for stock adjustments');
  }
  
  return createStockMovement({
    inventoryId,
    type: 'adjustment',
    quantityChange,
    reference,
    notes: reason,
  });
}