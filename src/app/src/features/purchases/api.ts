import { createClient } from "../../../utils/supabase/client.tsx";

export interface PurchaseLineItem {
  inventory_id: string;
  phase_name: string;
  quantity: number;
  unit_cost: number;
  notes?: string;
}

export interface CreatePurchaseParams {
  project_id: string;
  vendor_id?: string;
  date?: string;
  items: PurchaseLineItem[];
}

export interface PurchaseTransaction {
  id: string;
  inventory_id: string;
  project_id: string;
  phase_name: string;
  type: string;
  quantity_change: number;
  quantity_after: number;
  unit_cost: number;
  total_cost: number;
  vendor_id?: string;
  date: string;
  notes?: string;
  reference?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Create purchase transactions for a project
 * This will:
 * 1. Insert transaction records for each line item
 * 2. Update inventory quantities
 * 3. Update project spent amount
 */
export async function createPurchaseTransactions(params: CreatePurchaseParams): Promise<PurchaseTransaction[]> {
  const supabase = createClient();
  const { project_id, vendor_id, date, items } = params;

  if (!items || items.length === 0) {
    throw new Error("At least one purchase item is required");
  }

  // Validate all items
  for (const item of items) {
    if (!item.inventory_id || !item.phase_name) {
      throw new Error("Each item must have inventory_id and phase_name");
    }
    if (item.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    if (item.unit_cost < 0) {
      throw new Error("Unit cost cannot be negative");
    }
  }

  const transactionDate = date || new Date().toISOString();
  const createdTransactions: PurchaseTransaction[] = [];

  try {
    // Process each line item
    for (const item of items) {
      // 1. Get current inventory quantity
      const { data: inventoryItem, error: fetchError } = await supabase
        .from("inventory")
        .select("quantity, unit")
        .eq("id", item.inventory_id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch inventory item: ${fetchError.message}`);
      }

      const currentQuantity = inventoryItem.quantity || 0;
      const newQuantity = currentQuantity + item.quantity;
      const totalCost = item.quantity * item.unit_cost;

      // 2. Create transaction record
      const { data: transaction, error: transactionError } = await supabase
        .from("inventory_transactions")
        .insert({
          inventory_id: item.inventory_id,
          project_id,
          phase_name: item.phase_name,
          type: "purchase",
          quantity_change: item.quantity,
          quantity_after: newQuantity,
          unit_cost: item.unit_cost,
          total_cost: totalCost,
          vendor_id: vendor_id || null,
          date: transactionDate,
          notes: item.notes || null,
          reference: `Project Purchase`,
        })
        .select()
        .single();

      if (transactionError) {
        throw new Error(`Failed to create transaction: ${transactionError.message}`);
      }

      // 3. Update inventory quantity and last_restocked
      const { error: updateError } = await supabase
        .from("inventory")
        .update({
          quantity: newQuantity,
          last_restocked: transactionDate,
        })
        .eq("id", item.inventory_id);

      if (updateError) {
        throw new Error(`Failed to update inventory: ${updateError.message}`);
      }

      createdTransactions.push(transaction);
    }

    // 4. Calculate total purchase cost
    const totalPurchaseCost = items.reduce(
      (sum, item) => sum + item.quantity * item.unit_cost,
      0
    );

    // 5. Update project spent amount
    const { data: project, error: projectFetchError } = await supabase
      .from("projects")
      .select("spent")
      .eq("id", project_id)
      .single();

    if (projectFetchError) {
      throw new Error(`Failed to fetch project: ${projectFetchError.message}`);
    }

    const currentSpent = project.spent || 0;
    const newSpent = currentSpent + totalPurchaseCost;

    const { error: projectUpdateError } = await supabase
      .from("projects")
      .update({ spent: newSpent })
      .eq("id", project_id);

    if (projectUpdateError) {
      throw new Error(`Failed to update project spent: ${projectUpdateError.message}`);
    }

    return createdTransactions;
  } catch (error: any) {
    console.error("Error creating purchase transactions:", error);
    throw error;
  }
}

/**
 * Get all purchase transactions for a project
 */
export async function getProjectPurchases(projectId: string): Promise<PurchaseTransaction[]> {
  try {
    const supabase = createClient();
    
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return [];
    }

    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("project_id", projectId)
      .eq("type", "purchase")
      .order("date", { ascending: false });

    if (error) {
      console.error("Supabase error fetching purchases:", error);
      throw new Error(`Failed to fetch project purchases: ${error.message}`);
    }

    return data || [];
  } catch (error: any) {
    console.error("Error in getProjectPurchases:", error);
    throw error;
  }
}

/**
 * Get purchase transactions for a specific phase
 */
export async function getPhasePurchases(projectId: string, phaseName: string): Promise<PurchaseTransaction[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("project_id", projectId)
    .eq("phase_name", phaseName)
    .eq("type", "purchase")
    .order("date", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch phase purchases: ${error.message}`);
  }

  return data || [];
}

/**
 * Calculate total spend for a project
 */
export async function calculateProjectSpend(projectId: string): Promise<number> {
  try {
    const supabase = createClient();
    
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return 0;
    }

    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("total_cost")
      .eq("project_id", projectId)
      .eq("type", "purchase");

    if (error) {
      console.error("Supabase error calculating project spend:", error);
      throw new Error(`Failed to calculate project spend: ${error.message}`);
    }

    return (data || []).reduce((sum, t) => sum + (t.total_cost || 0), 0);
  } catch (error: any) {
    console.error("Error in calculateProjectSpend:", error);
    return 0; // Return 0 instead of throwing to prevent UI crashes
  }
}

/**
 * Calculate spend for a specific phase
 */
export async function calculatePhaseSpend(projectId: string, phaseName: string): Promise<number> {
  try {
    const supabase = createClient();
    
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return 0;
    }

    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("total_cost")
      .eq("project_id", projectId)
      .eq("phase_name", phaseName)
      .eq("type", "purchase");

    if (error) {
      console.error("Supabase error calculating phase spend:", error);
      throw new Error(`Failed to calculate phase spend: ${error.message}`);
    }

    return (data || []).reduce((sum, t) => sum + (t.total_cost || 0), 0);
  } catch (error: any) {
    console.error("Error in calculatePhaseSpend:", error);
    return 0; // Return 0 instead of throwing to prevent UI crashes
  }
}

/**
 * Delete a purchase transaction
 * This will reverse the inventory update and project spend
 */
export async function deletePurchaseTransaction(transactionId: string): Promise<void> {
  const supabase = createClient();

  // 1. Get transaction details
  const { data: transaction, error: fetchError } = await supabase
    .from("inventory_transactions")
    .select("*")
    .eq("id", transactionId)
    .single();

  if (fetchError) {
    throw new Error(`Failed to fetch transaction: ${fetchError.message}`);
  }

  if (transaction.type !== "purchase") {
    throw new Error("Can only delete purchase transactions");
  }

  // 2. Get current inventory quantity
  const { data: inventoryItem, error: invError } = await supabase
    .from("inventory")
    .select("quantity")
    .eq("id", transaction.inventory_id)
    .single();

  if (invError) {
    throw new Error(`Failed to fetch inventory: ${invError.message}`);
  }

  const newQuantity = inventoryItem.quantity - transaction.quantity_change;

  if (newQuantity < 0) {
    throw new Error("Cannot delete purchase: would result in negative inventory");
  }

  // 3. Update inventory
  const { error: updateInvError } = await supabase
    .from("inventory")
    .update({ quantity: newQuantity })
    .eq("id", transaction.inventory_id);

  if (updateInvError) {
    throw new Error(`Failed to update inventory: ${updateInvError.message}`);
  }

  // 4. Update project spent
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("spent")
    .eq("id", transaction.project_id)
    .single();

  if (projectError) {
    throw new Error(`Failed to fetch project: ${projectError.message}`);
  }

  const newSpent = Math.max(0, (project.spent || 0) - (transaction.total_cost || 0));

  const { error: updateProjectError } = await supabase
    .from("projects")
    .update({ spent: newSpent })
    .eq("id", transaction.project_id);

  if (updateProjectError) {
    throw new Error(`Failed to update project: ${updateProjectError.message}`);
  }

  // 5. Delete transaction
  const { error: deleteError } = await supabase
    .from("inventory_transactions")
    .delete()
    .eq("id", transactionId);

  if (deleteError) {
    throw new Error(`Failed to delete transaction: ${deleteError.message}`);
  }
}