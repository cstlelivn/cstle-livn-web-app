import { useEffect, useRef, useState, useCallback } from 'react';
import { listTransactions } from './api';
import { subscribeTableMulti } from '../../lib/realtime';

export function useTransactions(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT') {
          // Transform snake_case to camelCase for realtime inserts
          const transformed = {
            ...p.new,
            type: p.new.transaction_type, // Map transaction_type to type
            projectId: p.new.project_id,
            phaseName: p.new.phase_name,
          };
          m.set(p.new.id, transformed);
        }
        if (p.eventType === 'UPDATE') {
          // Transform snake_case to camelCase for realtime updates
          const transformed = {
            ...p.new,
            type: p.new.transaction_type, // Map transaction_type to type
            projectId: p.new.project_id,
            phaseName: p.new.phase_name,
          };
          m.set(p.new.id, { ...m.get(p.new.id), ...transformed });
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
      const data = await listTransactions();
      setRows(data);
    } catch (error) {
      console.error('Error refreshing transactions:', error);
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
        const data = await listTransactions();
        setRows(data);
        setLoading(false);

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'transactions',
          'transactions',
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
        console.error('Error loading transactions:', error);
        setLoading(false);
      }
    })();

    return () => {
      off();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [flush, enabled]);

  return { transactions: rows, loading, refresh };
}