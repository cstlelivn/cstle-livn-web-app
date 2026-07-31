import { useEffect, useRef, useState, useCallback } from 'react';
import { listLeads } from './api';
import { subscribeTableMulti } from '../../lib/realtime';

// A lead captured from a partial contact/booking form can land with a null
// name/email (e.g. the submitter abandoned the form partway) -- every
// consumer calls .toLowerCase()/.localeCompare() directly on these fields
// (search filters, sort comparators in CRMModule.tsx), so default them here
// once instead of guarding every call site.
function normalizeLead(row: any) {
  return {
    ...row,
    name: row.name ?? '',
    email: row.email ?? '',
    phone: row.phone ?? '',
  };
}

export function useLeads(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT') {
          m.set(p.new.id, normalizeLead(p.new));
        }
        if (p.eventType === 'UPDATE') {
          m.set(p.new.id, normalizeLead({ ...m.get(p.new.id), ...p.new }));
        }
        if (p.eventType === 'DELETE') {
          m.delete(p.old.id);
        }
      }
      q.current = [];
      return [...m.values()].sort(
        (a, b) => (b.created_at || '').localeCompare(a.created_at || '')
      );
    });
    raf.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      console.log('🔄 Refreshing leads...');
      setLoading(true);
      const data = await listLeads();
      console.log('✅ Leads refreshed:', data.length, 'leads');
      setRows(data.map(normalizeLead));
    } catch (error) {
      console.error('❌ Error refreshing leads:', error);
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
        const data = await listLeads();
        setRows(data.map(normalizeLead));
        setLoading(false);

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'leads',
          'leads',
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

  return { leads: rows, loading, refresh };
}