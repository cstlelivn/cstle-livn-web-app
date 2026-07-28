import { useEffect, useRef, useState, useCallback } from 'react';
import { getProjectTransactions } from './projectTransactionsApi';
import { subscribeTableMulti } from '../../lib/realtime';

export function useProjectTransactions(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT') {
          m.set(p.new.id, p.new);
        }
        if (p.eventType === 'UPDATE') {
          m.set(p.new.id, { ...m.get(p.new.id), ...p.new });
        }
        if (p.eventType === 'DELETE') {
          m.delete(p.old.id);
        }
      }
      q.current = [];
      return [...m.values()].sort(
        (a, b) => (b.date || '').localeCompare(a.date || '')
      );
    });
    raf.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      // Fetch all project transactions (not filtered by project)
      const allTransactions: any[] = [];
      // Since getProjectTransactions requires a projectId, we'll need to use a direct query
      // For now, return empty array and we'll handle this differently
      setRows([]);
    } catch (error) {
      console.error('Error refreshing project transactions:', error);
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
        // We can't easily get ALL project transactions without a full table scan
        // So we'll just rely on realtime updates
        setRows([]);
        setLoading(false);

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'project_transactions',
          'project_transactions',
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
        console.error('Error setting up project transactions subscription:', error);
        setLoading(false);
      }
    })();

    return () => {
      off();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [flush, enabled]);

  return { projectTransactions: rows, loading, refresh };
}
