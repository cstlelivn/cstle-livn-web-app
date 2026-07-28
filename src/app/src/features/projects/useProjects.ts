import { useState, useEffect, useCallback, useRef } from 'react';
import { listProjects, createProject, updateProject, deleteProject, getProject } from './api';
import type { ProjectInput, ProjectUpdate } from './api';
import { subscribeTableMulti } from '../../lib/realtime';
import { createClient } from '../../../utils/supabase/client.tsx';

const supabase = createClient();

export function useProjects(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientMap, setClientMap] = useState<Map<string, string>>(new Map());
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  // Fetch and cache client names
  const fetchClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name');
    
    if (data) {
      const map = new Map(data.map((c: any) => [String(c.id), c.name]));
      setClientMap(map);
    }
  }, []);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT') {
          // Map client ID to name
          const project = {
            ...p.new,
            client: clientMap.get(String(p.new.client)) || p.new.client,
            clientId: p.new.client,
          };
          m.set(p.new.id, project);
        }
        if (p.eventType === 'UPDATE') {
          // Map client ID to name
          const project = {
            ...p.new,
            client: clientMap.get(String(p.new.client)) || p.new.client,
            clientId: p.new.client,
          };
          m.set(p.new.id, { ...m.get(p.new.id), ...project });
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
  }, [clientMap]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await listProjects();
      setRows(data);
    } catch (error) {
      // Error refreshing projects
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
        const data = await listProjects();
        setRows(data);
        setLoading(false);

        // Fetch client names
        await fetchClients();

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'projects',
          'projects',
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
  }, [flush, enabled, fetchClients]);

  return { projects: rows, loading, refresh };
}