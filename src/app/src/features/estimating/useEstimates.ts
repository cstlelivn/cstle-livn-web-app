import { useState, useCallback, useEffect } from 'react';
import { listEstimates, getEstimate, type Estimate } from './api';

// One-shot fetch, no realtime -- estimates change at the pace of a human
// working through the pipeline, not fast enough to need a live channel
// (matches the usePermits/PhaseView procurement pattern for other
// low-frequency admin data in this app).
export function useEstimates() {
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEstimates(await listEstimates());
    } catch (err) {
      console.warn('[useEstimates] load error:', err);
      setEstimates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { estimates, loading, refresh: load };
}

export function useEstimate(estimateId: string | null) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!estimateId) { setEstimate(null); setLoading(false); return; }
    setLoading(true);
    try {
      setEstimate(await getEstimate(estimateId));
    } catch (err) {
      console.warn('[useEstimate] load error:', err);
      setEstimate(null);
    } finally {
      setLoading(false);
    }
  }, [estimateId]);

  useEffect(() => { load(); }, [load]);

  return { estimate, loading, refresh: load, setEstimate };
}
