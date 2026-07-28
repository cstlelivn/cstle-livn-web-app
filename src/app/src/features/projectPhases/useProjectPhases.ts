import { useState, useCallback, useEffect, useRef } from 'react';
import { listProjectPhases, updateProjectPhase, recalculatePhaseProgress } from './api';
import { createClient } from '../../../utils/supabase/client.tsx';

const supabase = createClient();

export function useProjectPhases(projectId: string | number | null) {
  const [phases, setPhases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Track whether the table exists so we skip realtime when it doesn't
  const tableAvailable = useRef(true);

  const load = useCallback(async () => {
    if (!projectId) { setPhases([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await listProjectPhases(String(projectId));
      tableAvailable.current = true;
      setPhases(data);
    } catch (err) {
      console.warn('[useProjectPhases] load error — phases unavailable:', err);
      tableAvailable.current = false;
      setPhases([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription — unique channel name prevents StrictMode double-subscribe crash
  useEffect(() => {
    if (!projectId) return;
    // Skip subscription if table is known to be missing
    if (!tableAvailable.current) return;
    const channelName = `project_phases:${projectId}:${Date.now()}`;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes' as any, {
          event: '*',
          schema: 'public',
          table: 'project_phases',
          filter: `project_id=eq.${projectId}`,
        }, () => { if (tableAvailable.current) load(); })
        .subscribe();
    } catch (err) {
      console.warn('[useProjectPhases] realtime subscription failed:', err);
    }
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [projectId, load]);

  const refreshPhaseProgress = useCallback(async (phaseId: string) => {
    const progress = await recalculatePhaseProgress(phaseId);
    setPhases(prev => prev.map(p => p.id === phaseId ? { ...p, progress } : p));
    return progress;
  }, []);

  const updatePhase = useCallback(async (id: string, updates: any) => {
    const updated = await updateProjectPhase(id, updates);
    setPhases(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
    return updated;
  }, []);

  return { phases, loading, refresh: load, updatePhase, refreshPhaseProgress };
}
