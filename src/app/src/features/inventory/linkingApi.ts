import { createClient } from '../../../utils/supabase/client.tsx';

const supabase = createClient();

/**
 * Get project and phase linked to an inventory item
 * Queries the inventory_transactions table to find purchase transactions
 */
export async function getInventoryProjectLink(inventoryId: string): Promise<{
  projectId: string | null;
  phaseName: string | null;
  transactionId: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('inventory_transactions')
      .select('project_id, phase_name, id')
      .eq('inventory_id', inventoryId)
      .eq('type', 'purchase')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // No linked project found
      return null;
    }

    return {
      projectId: data.project_id,
      phaseName: data.phase_name,
      transactionId: data.id,
    };
  } catch (error) {
    console.error('Error fetching inventory project link:', error);
    return null;
  }
}

/**
 * Update the project/phase link for an inventory item
 * This updates the existing transaction or creates a new one
 */
export async function updateInventoryProjectLink(
  inventoryId: string,
  projectId: string | null,
  phaseName: string | null,
  quantity: number,
  unitCost: number,
  vendorId?: string
): Promise<void> {
  try {
    // Get existing transaction
    const existing = await getInventoryProjectLink(inventoryId);

    if (projectId && phaseName) {
      // Get current inventory quantity for quantity_after calculation
      const { data: inventoryItem, error: fetchError } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('id', inventoryId)
        .single();

      if (fetchError) {
        console.error('Error fetching inventory item:', fetchError);
        throw new Error(`Failed to fetch inventory: ${fetchError.message}`);
      }

      const currentQuantity = inventoryItem?.quantity || 0;

      if (existing?.transactionId) {
        // Update existing transaction
        const { error } = await supabase
          .from('inventory_transactions')
          .update({
            project_id: projectId,
            phase_name: phaseName,
            unit_cost: unitCost,
            total_cost: quantity * unitCost,
            quantity_change: quantity,
            quantity_after: currentQuantity,
            vendor_id: vendorId || null,
            date: new Date().toISOString(),
          })
          .eq('id', existing.transactionId);

        if (error) {
          console.error('Error updating transaction:', error);
          throw error;
        }
      } else {
        // Create new transaction using the same pattern as createPurchaseTransactions
        const { error } = await supabase
          .from('inventory_transactions')
          .insert({
            inventory_id: inventoryId,
            project_id: projectId,
            phase_name: phaseName,
            type: 'purchase',
            quantity_change: quantity,
            quantity_after: currentQuantity,
            unit_cost: unitCost,
            total_cost: quantity * unitCost,
            vendor_id: vendorId || null,
            date: new Date().toISOString(),
            reference: 'Project Link',
            notes: 'Linked to project via inventory edit',
          });

        if (error) {
          console.error('Error creating transaction:', error);
          throw error;
        }

        // Update project spent amount
        const { data: project, error: projectFetchError } = await supabase
          .from('projects')
          .select('spent')
          .eq('id', projectId)
          .single();

        if (projectFetchError) {
          console.error('Error fetching project:', projectFetchError);
          // Don't throw - transaction was created successfully
        } else {
          const currentSpent = project?.spent || 0;
          const newSpent = currentSpent + (quantity * unitCost);

          const { error: projectUpdateError } = await supabase
            .from('projects')
            .update({ spent: newSpent })
            .eq('id', projectId);

          if (projectUpdateError) {
            console.error('Error updating project spent:', projectUpdateError);
            // Don't throw - transaction was created successfully
          }
        }
      }
    } else if (existing?.transactionId) {
      // Get transaction details before deleting to update project spent
      const { data: transaction, error: fetchTxError } = await supabase
        .from('inventory_transactions')
        .select('project_id, total_cost')
        .eq('id', existing.transactionId)
        .single();

      if (fetchTxError) {
        console.error('Error fetching transaction:', fetchTxError);
      }

      // Remove link by deleting transaction
      const { error } = await supabase
        .from('inventory_transactions')
        .delete()
        .eq('id', existing.transactionId);

      if (error) {
        console.error('Error deleting transaction:', error);
        throw error;
      }

      // Update project spent to remove this purchase
      if (transaction?.project_id && transaction?.total_cost) {
        const { data: project, error: projectFetchError } = await supabase
          .from('projects')
          .select('spent')
          .eq('id', transaction.project_id)
          .single();

        if (!projectFetchError && project) {
          const currentSpent = project.spent || 0;
          const newSpent = Math.max(0, currentSpent - transaction.total_cost);

          const { error: projectUpdateError } = await supabase
            .from('projects')
            .update({ spent: newSpent })
            .eq('id', transaction.project_id);

          if (projectUpdateError) {
            console.error('Error updating project spent:', projectUpdateError);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Error updating inventory project link:', error);
    throw new Error(`Failed to update project link: ${error.message}`);
  }
}