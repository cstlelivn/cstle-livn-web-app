import { useEffect, useRef, useState, useCallback } from 'react';
import { listClients } from './api';
import { subscribeTableMulti } from '../../lib/realtime';

export function useClients(enabled = true) {
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
        (a, b) => (a.name || '').localeCompare(b.name || '')
      );
    });
    raf.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await listClients();
      setRows(data);
    } catch (error: any) {
      console.error('Error refreshing clients:', error);
      // Check if it's a JWT expired error
      if (error.message?.includes('Session expired') || error.message?.includes('JWT')) {
        // Redirect to login
        window.location.href = '/';
      }
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
        const data = await listClients();
        setRows(data);
        setLoading(false);

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'clients',
          'clients',
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
      } catch (error: any) {
        console.error('Error loading clients:', error);
        setLoading(false);
        // Check if it's a JWT expired error
        if (error.message?.includes('Session expired') || error.message?.includes('JWT')) {
          // Show a notification before redirecting
          alert('Your session has expired. Please log in again.');
          // Redirect to login
          window.location.href = '/';
        }
      }
    })();

    return () => {
      off();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [flush, enabled]);

  return { clients: rows, loading, refresh };
}