import { createClient } from "../../../utils/supabase/client.tsx";
import { createInventoryItem } from "../inventory/api";
import { failIf } from "../../lib/errors";
import { now } from "../../lib/dates";

const supabase = createClient();

// Frontend interface (camelCase)
export interface ProjectPurchase {
  id: string;
  projectId: string;
  phaseName: string;
  itemName: string;
  vendor: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  purchaseDate: string;
  notes?: string;
  inventoryId?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectPurchaseInput {
  projectId: string;
  phaseName: string;
  itemName: string;
  vendor: string;
  quantity: number;
  unitCost: number;
  purchaseDate: string;
  notes?: string;
  // Optional inventory creation
  addToInventory?: boolean;
  inventoryType?: string; // "Tool" | "Material"
  inventoryLocation?: string;
  inventoryReorderLevel?: number;
  inventoryUnit?: string;
}

export interface UpdateProjectPurchaseInput {
  phaseName?: string;
  itemName?: string;
  vendor?: string;
  quantity?: number;
  unitCost?: number;
  purchaseDate?: string;
  notes?: string;
  inventoryId?: string;
}

// Transform frontend camelCase to database snake_case
function toDbFormat(input: any): any {
  const result: any = {};
  
  if (input.projectId !== undefined) result.project_id = input.projectId;
  if (input.phaseName !== undefined) result.phase_name = input.phaseName;
  if (input.itemName !== undefined) result.item_name = input.itemName;
  if (input.vendor !== undefined) result.vendor = input.vendor;
  if (input.quantity !== undefined) result.quantity = input.quantity;
  if (input.unitCost !== undefined) result.unit_cost = input.unitCost;
  if (input.totalCost !== undefined) result.total_cost = input.totalCost;
  if (input.purchaseDate !== undefined) result.purchase_date = input.purchaseDate;
  if (input.notes !== undefined) result.notes = input.notes || null;
  if (input.inventoryId !== undefined) result.inventory_id = input.inventoryId || null;
  if (input.createdBy !== undefined) result.created_by = input.createdBy;
  
  return result;
}

// Transform database snake_case to frontend camelCase
function fromDbFormat(row: any): ProjectPurchase {
  if (!row) return row;
  
  return {
    id: row.id,
    projectId: row.project_id,
    phaseName: row.phase_name,
    itemName: row.item_name,
    vendor: row.vendor,
    quantity: row.quantity,
    unitCost: row.unit_cost,
    totalCost: row.total_cost,
    purchaseDate: row.purchase_date,
    notes: row.notes,
    inventoryId: row.inventory_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a new project purchase
 * Optionally creates an inventory item if addToInventory is true
 */
export async function createProjectPurchase(input: CreateProjectPurchaseInput): Promise<ProjectPurchase> {
  const {
    projectId,
    phaseName,
    itemName,
    vendor,
    quantity,
    unitCost,
    purchaseDate,
    notes,
    addToInventory,
    inventoryType,
    inventoryLocation,
    inventoryReorderLevel,
    inventoryUnit,
  } = input;

  // Validation
  if (!projectId || !phaseName || !itemName || !vendor) {
    throw new Error("Project ID, phase name, item name, and vendor are required");
  }
  if (quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }
  if (unitCost < 0) {
    throw new Error("Unit cost cannot be negative");
  }

  const totalCost = quantity * unitCost;
  let inventoryId: string | undefined;

  try {
    // 1. Create inventory item if requested
    if (addToInventory) {
      if (!inventoryType || !inventoryLocation) {
        throw new Error("Inventory type and location are required when adding to inventory");
      }

      const inventoryItem = await createInventoryItem({
        name: itemName,
        type: inventoryType,
        category: inventoryType,
        quantity: quantity,
        unit: inventoryUnit || "unit",
        minStock: inventoryReorderLevel || 0,
        cost: unitCost,
        location: inventoryLocation,
        lastRestocked: purchaseDate,
        status: "Active",
      });

      inventoryId = inventoryItem.id;
    }

    // 2. Create project purchase record
    const { data, error } = await supabase
      .from("project_purchases")
      .insert({
        project_id: projectId,
        phase_name: phaseName,
        item_name: itemName,
        vendor: vendor,
        quantity: quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        purchase_date: purchaseDate,
        notes: notes || null,
        inventory_id: inventoryId || null,
        created_at: now(),
        updated_at: now(),
      })
      .select()
      .single();

    failIf(error, `Failed to create project purchase`);

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
      const newSpent = currentSpent + totalCost;

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
    console.error("Error creating project purchase:", error);
    throw error;
  }
}

/**
 * Get all purchases for a project
 */
export async function getProjectPurchases(projectId: string): Promise<ProjectPurchase[]> {
  try {
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return [];
    }

    const { data, error } = await supabase
      .from("project_purchases")
      .select("*")
      .eq("project_id", projectId)
      .order("purchase_date", { ascending: false });

    if (error) {
      // Check if table doesn't exist yet (setup not complete)
      if (error.message?.includes('relation "public.project_purchases" does not exist') ||
          error.message?.includes('Failed to fetch') ||
          error.code === 'PGRST116') {
        console.warn('⚠️ project_purchases table not set up yet - see /SETUP_NOW.md for instructions');
        return [];
      }
      console.error("Supabase error fetching project purchases:", error);
      throw new Error(`Failed to fetch project purchases: ${error.message}`);
    }

    return (data || []).map(fromDbFormat);
  } catch (error: any) {
    // Silently return empty array for network/fetch errors
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.warn('⚠️ Network error fetching purchases - table may not exist yet. See /SETUP_NOW.md');
      return [];
    }
    console.error("Error in getProjectPurchases:", error);
    throw error;
  }
}

/**
 * Get purchases for a specific phase
 */
export async function getPhasePurchases(projectId: string, phaseName: string): Promise<ProjectPurchase[]> {
  const { data, error } = await supabase
    .from("project_purchases")
    .select("*")
    .eq("project_id", projectId)
    .eq("phase_name", phaseName)
    .order("purchase_date", { ascending: false });

  failIf(error, "Failed to fetch phase purchases");
  return (data || []).map(fromDbFormat);
}

/**
 * Update a project purchase
 */
export async function updateProjectPurchase(
  id: string,
  updates: UpdateProjectPurchaseInput
): Promise<ProjectPurchase> {
  // Get current record
  const { data: current, error: fetchError } = await supabase
    .from("project_purchases")
    .select("*")
    .eq("id", id)
    .single();

  failIf(fetchError, "Failed to fetch current purchase");

  // Calculate new values
  const newQuantity = updates.quantity !== undefined ? updates.quantity : current.quantity;
  const newUnitCost = updates.unitCost !== undefined ? updates.unitCost : current.unit_cost;
  const newTotalCost = newQuantity * newUnitCost;

  const dbUpdates: any = {};
  if (updates.phaseName !== undefined) dbUpdates.phase_name = updates.phaseName;
  if (updates.itemName !== undefined) dbUpdates.item_name = updates.itemName;
  if (updates.vendor !== undefined) dbUpdates.vendor = updates.vendor;
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
  if (updates.unitCost !== undefined) dbUpdates.unit_cost = updates.unitCost;
  if (updates.purchaseDate !== undefined) dbUpdates.purchase_date = updates.purchaseDate;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
  if (updates.inventoryId !== undefined) dbUpdates.inventory_id = updates.inventoryId || null;
  dbUpdates.total_cost = newTotalCost;
  dbUpdates.updated_at = now();

  // Update project spent if cost changed
  const oldTotalCost = current.total_cost;
  const costDifference = newTotalCost - oldTotalCost;
  
  if (costDifference !== 0) {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("spent")
      .eq("id", current.project_id)
      .single();

    if (!projectError && project) {
      const newSpent = (project.spent || 0) + costDifference;
      await supabase
        .from("projects")
        .update({ spent: newSpent })
        .eq("id", current.project_id);
    }
  }

  const { data, error } = await supabase
    .from("project_purchases")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  failIf(error, "Failed to update project purchase");
  return fromDbFormat(data);
}

/**
 * Delete a project purchase
 */
export async function deleteProjectPurchase(id: string): Promise<void> {
  // 1. Get purchase details
  const { data: purchase, error: fetchError } = await supabase
    .from("project_purchases")
    .select("*")
    .eq("id", id)
    .single();

  failIf(fetchError, "Failed to fetch purchase");

  // 2. Update project spent
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("spent")
    .eq("id", purchase.project_id)
    .single();

  if (!projectError && project) {
    const newSpent = Math.max(0, (project.spent || 0) - (purchase.total_cost || 0));
    await supabase
      .from("projects")
      .update({ spent: newSpent })
      .eq("id", purchase.project_id);
  }

  // 3. Delete purchase
  const { error: deleteError } = await supabase
    .from("project_purchases")
    .delete()
    .eq("id", id);

  failIf(deleteError, "Failed to delete project purchase");
}

/**
 * Calculate total spend for a project from project_purchases
 */
export async function calculateProjectPurchaseSpend(projectId: string): Promise<number> {
  try {
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return 0;
    }

    const { data, error } = await supabase
      .from("project_purchases")
      .select("total_cost")
      .eq("project_id", projectId);

    if (error) {
      // Check if table doesn't exist yet (setup not complete)
      if (error.message?.includes('relation "public.project_purchases" does not exist') ||
          error.message?.includes('Failed to fetch') ||
          error.code === 'PGRST116') {
        console.warn('⚠️ project_purchases table not set up yet - returning 0');
        return 0;
      }
      console.error("Supabase error calculating purchase spend:", error);
      return 0;
    }

    return (data || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
  } catch (error: any) {
    // Silently return 0 for any network/fetch errors
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.warn('⚠️ Network error calculating purchase spend - table may not exist yet');
      return 0;
    }
    console.error("Error in calculateProjectPurchaseSpend:", error);
    return 0;
  }
}

/**
 * Calculate spend for a specific phase
 */
export async function calculatePhasePurchaseSpend(projectId: string, phaseName: string): Promise<number> {
  try {
    if (!supabase) {
      console.error("Supabase client is not initialized");
      return 0;
    }

    const { data, error } = await supabase
      .from("project_purchases")
      .select("total_cost")
      .eq("project_id", projectId)
      .eq("phase_name", phaseName);

    if (error) {
      // Check if table doesn't exist yet (setup not complete)
      if (error.message?.includes('relation "public.project_purchases" does not exist') ||
          error.message?.includes('Failed to fetch') ||
          error.code === 'PGRST116') {
        console.warn('⚠️ project_purchases table not set up yet - returning 0');
        return 0;
      }
      console.error("Supabase error calculating phase purchase spend:", error);
      return 0;
    }

    return (data || []).reduce((sum, p) => sum + (p.total_cost || 0), 0);
  } catch (error: any) {
    // Silently return 0 for any network/fetch errors
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.warn('⚠️ Network error calculating phase purchase spend - table may not exist yet');
      return 0;
    }
    console.error("Error in calculatePhasePurchaseSpend:", error);
    return 0;
  }
}