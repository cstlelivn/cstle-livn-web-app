import { useState, useCallback, useEffect } from 'react';
import { listReminders } from './api';

// One-shot fetch on mount/refresh, matching this app's other low-frequency
// CRM data (permits, phase QC) -- no realtime channel needed. Gated by
// `enabled` (canViewCRM) the same way useLeads/useClients are, so a role
// without CRM access never issues the query.
export function useReminders(enabled = true) {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!enabled) { setReminders([]); setLoading(false); return; }
    setLoading(true);
    try {
      setReminders(await listReminders());
    } catch (err) {
      console.warn('[useReminders] load error:', err);
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { load(); }, [load]);

  return { reminders, loading, refresh: load };
}
