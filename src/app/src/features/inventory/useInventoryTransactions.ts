import { useEffect, useRef, useState, useCallback } from 'react';
import { listInventoryTransactions, InventoryTransaction } from './transactionsApi';
import { subscribeTableMulti } from '../../lib/realtime';

// Transform database snake_case to frontend camelCase for realtime updates
function transformRealtimeRow(row: any): InventoryTransaction {
  if (!row) return row;
  
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

/**
 * Hook to fetch and subscribe to inventory transactions with realtime updates
 * @param inventoryId - The inventory item ID to fetch transactions for
 * @param enabled - Whether to enable the hook (default: true)
 */
export function useInventoryTransactions(inventoryId: string | null, enabled = true) {
  const [rows, setRows] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT') {
          const transformed = transformRealtimeRow(p.new);
          // Only add if it belongs to this inventory item
          if (transformed.inventoryId === inventoryId) {
            m.set(transformed.id, transformed);
          }
        }
        if (p.eventType === 'UPDATE') {
          const transformed = transformRealtimeRow(p.new);
          if (transformed.inventoryId === inventoryId) {
            m.set(transformed.id, { ...m.get(transformed.id), ...transformed });
          }
        }
        if (p.eventType === 'DELETE') {
          m.delete(p.old.id);
        }
      }
      q.current = [];
      return [...m.values()].sort(
        (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')
      );
    });
    raf.current = null;
  }, [inventoryId]);

  const refresh = useCallback(async () => {
    if (!enabled || !inventoryId) return;
    try {
      setLoading(true);
      const data = await listInventoryTransactions(inventoryId);
      setRows(data);
    } catch (error) {
      console.error('Error refreshing inventory transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [enabled, inventoryId]);

  useEffect(() => {
    if (!enabled || !inventoryId) {
      setRows([]);
      setLoading(false);
      return;
    }

    let off = () => {};

    (async () => {
      try {
        const data = await listInventoryTransactions(inventoryId);
        setRows(data);
        setLoading(false);

        // Subscribe to realtime updates for this specific inventory item
        // Using filter to only get transactions for this inventory item
        off = subscribeTableMulti(
          `inventory_transactions_${inventoryId}`,
          'inventory_transactions',
          {
            onInsert: (p: any) => {
              q.current.push(p);
              if (!raf.current) raf.current = requestAnimationFrame(flush);
            },
            onUpdate: (p: any) => {
              q.current.push(p);
              if (!raf.current) raf.current = requestAnimationFrame(flush);
            },
            onDelete: (p: any) => {
              q.current.push(p);
              if (!raf.current) raf.current = requestAnimationFrame(flush);
            },
          }
        );
      } catch (error) {
        console.error('Error loading inventory transactions:', error);
        setLoading(false);
      }
    })();

    return () => {
      off();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [flush, enabled, inventoryId]);

  return { transactions: rows, loading, refresh };
}
