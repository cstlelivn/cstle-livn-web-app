import { useEffect, useRef, useState, useCallback } from 'react';
import { listQCRequests } from './api';
import { subscribeTableMulti } from '../../lib/realtime';

export function useQCQueue() {
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
        (a, b) => (b.updated_at || '').localeCompare(a.updated_at || '')
      );
    });
    raf.current = null;
  }, []);

  useEffect(() => {
    let off = () => {};

    (async () => {
      try {
        const data = await listQCRequests();
        setRows(data);
        setLoading(false);

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'qc-requests',
          'qc_requests',
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
  }, [flush]);

  return { qcRequests: rows, loading };
}