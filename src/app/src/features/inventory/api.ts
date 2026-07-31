import { createClient } from '../../../utils/supabase/client.tsx';
import { failIf } from '../../lib/errors';
import { now } from '../../lib/dates';

const supabase = createClient();

// Frontend interface (camelCase)
export interface InventoryInput {
  name: string;
  category?: string;
  type?: string;
  quantity?: number;
  unit?: string;
  minStock?: number;
  cost?: number;
  supplier?: number; // Vendor ID
  location?: string;
  lastRestocked?: string;
  lastUsed?: string;
  assignedTo?: string;
  status?: string;
  condition?: string;
}

export interface InventoryUpdate {
  name?: string;
  category?: string;
  type?: string;
  quantity?: number;
  unit?: string;
  minStock?: number;
  cost?: number;
  supplier?: number; // Vendor ID
  location?: string;
  lastRestocked?: string;
  lastUsed?: string;
  assignedTo?: string;
  status?: string;
  condition?: string;
}

// Transform frontend camelCase to database snake_case
function toDbFormat(input: any): any {
  const result: any = {};
  
  if (input.name !== undefined) result.name = input.name;
  if (input.category !== undefined) result.category = input.category;
  if (input.type !== undefined) result.type = input.type;
  if (input.quantity !== undefined) result.quantity = input.quantity;
  if (input.unit !== undefined) result.unit = input.unit;
  if (input.minStock !== undefined) result.min_stock = input.minStock;
  if (input.cost !== undefined) result.cost = input.cost;
  // Handle supplier: if it's 0 or falsy, set to null; otherwise use the value
  if (input.supplier !== undefined) {
    result.supplier_id = input.supplier && input.supplier !== 0 ? input.supplier : null;
  }
  if (input.location !== undefined) result.location = input.location;
  if (input.lastRestocked !== undefined) result.last_restocked = input.lastRestocked || null;
  if (input.lastUsed !== undefined) result.last_used = input.lastUsed || null;
  if (input.assignedTo !== undefined) result.assigned_to = input.assignedTo || null;
  if (input.status !== undefined) result.status = input.status;
  if (input.condition !== undefined) result.condition = input.condition;
  
  return result;
}

// Transform database snake_case to frontend camelCase
function fromDbFormat(row: any): any {
  if (!row) return row;
  
  return {
    id: row.id,
    name: row.name ?? "",
    category: row.category ?? "",
    type: row.type,
    quantity: row.quantity,
    unit: row.unit,
    minStock: row.min_stock,
    cost: row.cost,
    supplier: row.supplier_id,
    location: row.location,
    lastRestocked: row.last_restocked,
    lastUsed: row.last_used,
    assignedTo: row.assigned_to,
    status: row.status,
    condition: row.condition,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .order('name', { ascending: true })
    .limit(300);
  
  failIf(error, 'Failed to list inventory');
  return (data ?? []).map(fromDbFormat);
}

export async function getInventoryItem(id: string) {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('id', id)
    .single();
  
  failIf(error, 'Failed to get inventory item');
  return fromDbFormat(data);
}

export async function createInventoryItem(input: InventoryInput) {
  const dbData = toDbFormat(input);
  
  const { data, error } = await supabase
    .from('inventory')
    .insert({
      ...dbData,
      created_at: now(),
      updated_at: now(),
    })
    .select()
    .single();
  
  failIf(error, 'Failed to create inventory item');
  return fromDbFormat(data);
}

export async function updateInventoryItem(id: string, updates: InventoryUpdate) {
  const dbUpdates = toDbFormat(updates);
  
  const { data, error } = await supabase
    .from('inventory')
    .update({
      ...dbUpdates,
      updated_at: now(),
    })
    .eq('id', id)
    .select()
    .single();
  
  failIf(error, 'Failed to update inventory item');
  return fromDbFormat(data);
}

export async function deleteInventoryItem(id: string) {
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);
  
  failIf(error, 'Failed to delete inventory item');
}