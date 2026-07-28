import { createClient } from "../../../utils/supabase/client.tsx";
import { createInventoryItem } from "../inventory/api";

const supabase = createClient();

// Transaction types
export type TransactionType = "purchase" | "payment";

// Frontend interface (camelCase)
export interface ProjectTransaction {
  id: string;
  projectId: string;
  transactionType: TransactionType;
  phaseName?: string;
  vendorOrRecipient: string;
  itemOrDescription: string;
  amount: number;
  date: string;
  notes?: string;
  // Purchase-specific fields
  quantity?: number;
  unitCost?: number;
  inventoryId?: string;
  // Metadata
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectTransactionInput {
  projectId: string;
  transactionType: TransactionType;
  phaseName?: string;
  vendorOrRecipient: string;
  itemOrDescription: string;
  amount?: number; // Optional for purchases (calculated), required for payments
  date: string;
  notes?: string;
  // Purchase-specific fields
  quantity?: number;
  unitCost?: number;
  linkToInventory?: boolean;
  // Optional inventory creation (for purchases only)
  inventoryType?: string;
  inventoryLocation?: string;
  inventoryReorderLevel?: number;
  inventoryUnit?: string;
}

export interface UpdateProjectTransactionInput {
  transactionType?: TransactionType;
  phaseName?: string;
  vendorOrRecipient?: string;
  itemOrDescription?: string;
  amount?: number;
  date?: string;
  notes?: string;
  quantity?: number;
  unitCost?: number;
  inventoryId?: string;
}

// Transform database snake_case to frontend camelCase
function fromDbFormat(row: any): ProjectTransaction {
  if (!row) return row;
  
  return {
    id: row.id,
    projectId: row.project_id,
    transactionType: row.type,
    phaseName: row.phase_name,
    vendorOrRecipient: row.reference || '',
    itemOrDescription: row.description || '',
    amount: row.amount || 0,
    date: row.date,
    notes: row.notes,
    quantity: row.quantity,
    unitCost: row.unit_cost,
    inventoryId: row.inventory_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a new project transaction (purchase or payment)
 */
export async function createProjectTransaction(input: CreateProjectTransactionInput): Promise<ProjectTransaction> {
  const {
    projectId,
    transactionType,
    phaseName,
    vendorOrRecipient,
    itemOrDescription,
    amount,
    date,
    notes,
    quantity,
    unitCost,
    linkToInventory,
    inventoryType,
    inventoryLocation,
    inventoryReorderLevel,
    inventoryUnit,
  } = input;

  // Validation
  if (!projectId || !transactionType || !vendorOrRecipient || !itemOrDescription) {
    throw new Error("Project ID, transaction type, vendor/recipient, and item/description are required");
  }

  // Purchase-specific validation
  if (transactionType === "purchase") {
    if (!quantity || quantity <= 0) {
      throw new Error("Quantity must be greater than 0 for purchases");
    }
    if (unitCost === undefined || unitCost < 0) {
      throw new Error("Unit cost is required for purchases and cannot be negative");
    }
  }

  // Payment-specific validation
  if (transactionType === "payment") {
    if (!amount || amount <= 0) {
      throw new Error("Amount must be greater than 0 for payments");
    }
  }

  // Calculate amount for purchases
  const finalAmount = transactionType === "purchase" 
    ? (quantity || 0) * (unitCost || 0)
    : amount || 0;

  let inventoryId: string | undefined;

  try {
    // 1. Create inventory item if requested (purchases only)
    if (transactionType === "purchase" && linkToInventory) {
      if (!inventoryType || !inventoryLocation) {
        throw new Error("Inventory type and location are required when linking to inventory");
      }

      const inventoryItem = await createInventoryItem({
        name: itemOrDescription,
        type: inventoryType,
        category: inventoryType,
        quantity: quantity || 0,
        unit: inventoryUnit || "unit",
        minStock: inventoryReorderLevel || 0,
        cost: unitCost || 0,
        location: inventoryLocation,
        lastRestocked: date,
        status: "Active",
      });

      inventoryId = inventoryItem.id;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Create transaction record in project_transactions table
    const { data, error } = await supabase
      .from("project_transactions")
      .insert({
        project_id: projectId,
        phase_name: phaseName || null,
        type: transactionType,
        amount: finalAmount,
        reference: vendorOrRecipient,
        description: itemOrDescription,
        date: date,
        notes: notes || null,
        quantity: transactionType === "purchase" ? quantity : null,
        unit_cost: transactionType === "purchase" ? unitCost : null,
        inventory_id: inventoryId || null,
        created_by: user?.id || null,
        created_at: now(),
        updated_at: now(),
      })
      .select()
      .single();

    failIf(error, `Failed to create project transaction`);

    // 3. Update project spent amount
    const { data: project, error: projectFetchError } = await supabase
      .from("projects")
      .select("spent")
      .eq("id", projectId)
      .single();

    if (projectFetchError) {
      console.warn("Failed to fetch project for spent update:", projectFetchError.message);
    } else {
      const currentSpent = project?.spent || 0;
      const newSpent = currentSpent + finalAmount;

      const { error: projectUpdateError } = await supabase
        .from("projects")
        .update({ spent: newSpent })
        .eq("id", projectId);

      if (projectUpdateError) {
        console.warn("Failed to update project spent:", projectUpdateError.message);
      }
    }

    return fromDbFormat(data);
  } catch (error: any) {
    console.error("Error creating project transaction:", error);
    throw error;
  }
}

/**
 * Get all transactions for a project
 */
export async function getProjectTransactions(projectId: string): Promise<ProjectTransaction[]> {
  try {
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return [];
    }

    const { data, error } = await supabase
      .from("project_transactions")
      .select("*")
      .eq("project_id", projectId)
      .order("date", { ascending: false });

    if (error) {
      // Check if table doesn't exist yet (setup not complete)
      if (error.message?.includes('relation "public.project_transactions" does not exist') ||
          error.message?.includes('Failed to fetch') ||
          error.code === 'PGRST116') {
        console.warn('⚠️ project_transactions table not set up yet');
        return [];
      }
      console.error("Supabase error fetching project transactions:", error);
      throw new Error(`Failed to fetch project transactions: ${error.message}`);
    }

    return (data || []).map(fromDbFormat);
  } catch (error: any) {
    // Silently return empty array for network/fetch errors
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.warn('⚠️ Network error fetching transactions');
      return [];
    }
    console.error("Error in getProjectTransactions:", error);
    throw error;
  }
}

/**
 * Get transactions for a specific phase
 */
export async function getPhaseTransactions(projectId: string, phaseName: string): Promise<ProjectTransaction[]> {
  try {
    const { data, error } = await supabase
      .from("project_transactions")
      .select("*")
      .eq("project_id", projectId)
      .eq("phase_name", phaseName)
      .order("date", { ascending: false });

    if (error) {
      // Check if table doesn't exist yet (setup not complete)
      if (error.message?.includes('relation "public.project_transactions" does not exist') ||
          error.message?.includes('Failed to fetch') ||
          error.code === 'PGRST116') {
        console.warn('⚠️ project_transactions table not set up yet');
        return [];
      }
      console.error("Supabase error fetching phase transactions:", error);
      return [];
    }

    return (data || []).map(fromDbFormat);
  } catch (error: any) {
    // Silently return empty array for network/fetch errors
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.warn('⚠️ Network error fetching phase transactions');
      return [];
    }
    console.error("Error in getPhaseTransactions:", error);
    return [];
  }
}

/**
 * Update a project transaction
 */
export async function updateProjectTransaction(
  id: string,
  updates: UpdateProjectTransactionInput
): Promise<ProjectTransaction> {
  // Get current record
  const { data: current, error: fetchError } = await supabase
    .from("project_transactions")
    .select("*")
    .eq("id", id)
    .single();

  failIf(fetchError, "Failed to fetch current transaction");

  // Calculate new amount
  let newAmount: number;
  
  if (current.type === "purchase") {
    const newQuantity = updates.quantity !== undefined ? updates.quantity : current.quantity;
    const newUnitCost = updates.unitCost !== undefined ? updates.unitCost : current.unit_cost;
    newAmount = (newQuantity || 0) * (newUnitCost || 0);
  } else {
    // For payments, use the provided amount or keep current
    newAmount = updates.amount !== undefined ? updates.amount : current.amount;
  }

  const dbUpdates: any = {};
  if (updates.transactionType !== undefined) dbUpdates.type = updates.transactionType;
  if (updates.phaseName !== undefined) dbUpdates.phase_name = updates.phaseName || null;
  if (updates.vendorOrRecipient !== undefined) dbUpdates.reference = updates.vendorOrRecipient;
  if (updates.itemOrDescription !== undefined) dbUpdates.description = updates.itemOrDescription;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
  if (updates.unitCost !== undefined) dbUpdates.unit_cost = updates.unitCost;
  if (updates.inventoryId !== undefined) dbUpdates.inventory_id = updates.inventoryId || null;
  dbUpdates.amount = newAmount;
  dbUpdates.updated_at = now();

  // Update project spent if amount changed
  const oldAmount = current.amount;
  const amountDifference = newAmount - oldAmount;
  
  if (amountDifference !== 0) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("spent")
      .eq("id", current.project_id)
      .single();

    if (!projectError && project) {
      const newSpent = (project.spent || 0) + amountDifference;
      await supabase
        .from("projects")
        .update({ spent: newSpent })
        .eq("id", current.project_id);
    }
  }

  const { data, error } = await supabase
    .from("project_transactions")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  failIf(error, "Failed to update project transaction");
  return fromDbFormat(data);
}

/**
 * Delete a project transaction
 */
export async function deleteProjectTransaction(id: string): Promise<void> {
  // 1. Get transaction details
  const { data: transaction, error: fetchError } = await supabase
    .from("project_transactions")
    .select("*")
    .eq("id", id)
    .single();

  failIf(fetchError, "Failed to fetch transaction");

  // 2. Update project spent
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("spent")
    .eq("id", transaction.project_id)
    .single();

  if (!projectError && project) {
    const newSpent = Math.max(0, (project.spent || 0) - (transaction.amount || 0));
    await supabase
      .from("projects")
      .update({ spent: newSpent })
      .eq("id", transaction.project_id);
  }

  // 3. Delete transaction
  const { error: deleteError } = await supabase
    .from("project_transactions")
    .delete()
    .eq("id", id);

  failIf(deleteError, "Failed to delete project transaction");
}

/**
 * Calculate total spending from project_transactions table
 * Returns 0 if table doesn't exist (graceful fallback)
 */
export async function calculateProjectTransactionSpend(projectId: string): Promise<number> {
  try {
    const { data, error } = await supabase
      .from('project_transactions')
      .select('amount')
      .eq('project_id', projectId);

    if (error) {
      // Table doesn't exist - this is expected if migration hasn't been run
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return 0; // Silent fallback - user will see setup banner
      }
      console.error('Supabase error calculating transaction spend:', error);
      return 0;
    }

    if (!data || data.length === 0) {
      return 0;
    }

    const total = data.reduce((sum, record) => sum + (Number(record.amount) || 0), 0);
    return total;
  } catch (error) {
    console.error('Error calculating transaction spend:', error);
    return 0;
  }
}

/**
 * Calculate spend for a specific phase
 */
export async function calculatePhaseTransactionSpend(projectId: string, phaseName: string): Promise<number> {
  try {
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return 0;
    }

    const { data, error } = await supabase
      .from("project_transactions")
      .select("amount")
      .eq("project_id", projectId)
      .eq("phase_name", phaseName);

    if (error) {
      // Table doesn't exist - this is expected if migration hasn't been run
      if (error.code === 'PGRST116' || 
          error.code === 'PGRST205' || 
          error.message?.includes('relation "public.project_transactions" does not exist') ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('Failed to fetch')) {
        return 0; // Silent fallback - user will see setup banner
      }
      console.error("Supabase error calculating phase transaction spend:", error);
      return 0;
    }

    return (data || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  } catch (error: any) {
    // Silently return 0 for any network/fetch errors or missing table
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('TypeError') ||
        error.name === 'TypeError') {
      return 0;
    }
    console.error("Error in calculatePhaseTransactionSpend:", error);
    return 0;
  }
}

/**
 * Get transactions filtered by type
 */
export async function getTransactionsByType(
  projectId: string,
  transactionType: TransactionType
): Promise<ProjectTransaction[]> {
  try {
    const { data, error } = await supabase
      .from("project_transactions")
      .select("*")
      .eq("project_id", projectId)
      .eq("type", transactionType)
      .order("date", { ascending: false });

    if (error) {
      // Check if table doesn't exist yet (setup not complete)
      if (error.message?.includes('relation "public.project_transactions" does not exist') ||
          error.message?.includes('Failed to fetch') ||
          error.code === 'PGRST116') {
        console.warn('⚠️ project_transactions table not set up yet');
        return [];
      }
      console.error("Supabase error fetching transactions by type:", error);
      return [];
    }

    return (data || []).map(fromDbFormat);
  } catch (error: any) {
    // Silently return empty array for network/fetch errors
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.warn('⚠️ Network error fetching transactions by type');
      return [];
    }
    console.error("Error in getTransactionsByType:", error);
    return [];
  }
}

/**
 * Get ALL project transactions across all projects (for Finance module)
 */
export async function getAllProjectTransactions(): Promise<ProjectTransaction[]> {
  try {
    const { data, error } = await supabase
      .from("project_transactions")
      .select("*")
      .order("date", { ascending: false });

    if (error) {
      // Check if table doesn't exist yet (setup not complete)
      if (error.message?.includes('relation "public.project_transactions" does not exist') ||
          error.message?.includes('Failed to fetch') ||
          error.code === 'PGRST116') {
        console.warn('⚠️ project_transactions table not set up yet');
        return [];
      }
      console.error("Supabase error fetching all project transactions:", error);
      throw new Error(`Failed to fetch all project transactions: ${error.message}`);
    }

    return (data || []).map(fromDbFormat);
  } catch (error: any) {
    // Silently return empty array for network/fetch errors
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.warn('⚠️ Network error fetching all project transactions');
      return [];
    }
    console.error("Error in getAllProjectTransactions:", error);
    return [];
  }
}