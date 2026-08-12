import { useState, useCallback, useEffect } from 'react';
import { listProjectPermits, type ProjectPermit } from './api';

// Permits change rarely (a handful of city calls/updates over weeks), so a
// one-shot fetch on mount/refresh is enough -- no realtime channel, matching
// this app's other low-frequency admin data (phase QC, procurement).
export function usePermits(projectId: string | number | null) {
  const [permits, setPermits] = useState<ProjectPermit[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) { setPermits([]); setLoading(false); return; }
    setLoading(true);
    try {
      setPermits(await listProjectPermits(String(projectId)));
    } catch (err) {
      console.warn('[usePermits] load error:', err);
      setPermits([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  return { permits, loading, refresh: load };
}
