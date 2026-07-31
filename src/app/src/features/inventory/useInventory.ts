import { useEffect, useRef, useState, useCallback } from 'react';
import { listInventory } from './api';
import { subscribeTableMulti } from '../../lib/realtime';

// Transform database snake_case to frontend camelCase for realtime updates
function transformRealtimeRow(row: any): any {
  if (!row) return row;
  
  return {
    id: row.id,
    // Defaulted: InventoryModule's search filter calls .toLowerCase()
    // directly on these and crashes on a null value (e.g. a row inserted
    // directly via SQL/migration with no name/category set).
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

export function useInventory(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT') {
          m.set(p.new.id, transformRealtimeRow(p.new));
        }
        if (p.eventType === 'UPDATE') {
          m.set(p.new.id, { ...m.get(p.new.id), ...transformRealtimeRow(p.new) });
        }
        if (p.eventType === 'DELETE') {
          m.delete(p.old.id);
        }
      }
      q.current = [];
      return [...m.values()].sort(
        (a, b) => (a.name || '').localeCompare(b.name || '')
      );
    });
    raf.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await listInventory();
      setRows(data);
    } catch (error) {
      // Error refreshing inventory
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }

    let off = () => {};

    (async () => {
      try {
        const data = await listInventory();
        setRows(data);
        setLoading(false);

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'inventory',
          'inventory',
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
        setLoading(false);
      }
    })();

    return () => {
      off();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [flush, enabled]);

  return { inventory: rows, loading, refresh };
}