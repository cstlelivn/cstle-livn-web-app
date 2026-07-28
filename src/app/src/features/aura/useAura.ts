/**
 * React hooks for Aura Performance System
 */

import { useState, useEffect, useCallback } from 'react';
import {
  AuraTask,
  AuraSummary,
  AuraLedgerEntry,
  PayPeriod,
  getWorkerTasks,
  getWorkerAuraSummary,
  getWorkerAuraLedger,
  getCurrentPayPeriod,
  getAllAuraSummaries,
  createAuraTask,
  updateAuraTask,
  completeTask,
  finalizeTask,
  deleteAuraTask
} from './api';
import { supabase } from '../../../utils/supabase/client.tsx';

/**
 * Hook to manage worker's Aura tasks
 */
export function useWorkerTasks(workerId: string | undefined) {
  const [tasks, setTasks] = useState<AuraTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!workerId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getWorkerTasks(workerId);
      setTasks(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching worker tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!workerId) return;

    const channel = supabase
      .channel(`worker_tasks_${workerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assignee_id=eq.${workerId}`
        },
        (payload) => {
          console.log('Task change detected:', payload);
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workerId, fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}

/**
 * Hook to manage worker's Aura summary
 */
export function useWorkerAuraSummary(workerId: string | undefined) {
  const [summary, setSummary] = useState<AuraSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!workerId) {
      setSummary(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getWorkerAuraSummary(workerId);
      setSummary(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching Aura summary:', err);
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!workerId) return;

    const channel = supabase
      .channel(`aura_summary_${workerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aura_summary',
          filter: `worker_id=eq.${workerId}`
        },
        (payload) => {
          console.log('Aura summary change detected:', payload);
          fetchSummary();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workerId, fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}

/**
 * Hook to manage worker's Aura ledger
 */
export function useWorkerAuraLedger(workerId: string | undefined) {
  const [ledger, setLedger] = useState<AuraLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = useCallback(async () => {
    if (!workerId) {
      setLedger([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await getWorkerAuraLedger(workerId);
      setLedger(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching Aura ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [workerId]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!workerId) return;

    const channel = supabase
      .channel(`aura_ledger_${workerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aura_ledger',
          filter: `worker_id=eq.${workerId}`
        },
        (payload) => {
          console.log('Aura ledger change detected:', payload);
          fetchLedger();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workerId, fetchLedger]);

  return { ledger, loading, error, refetch: fetchLedger };
}

/**
 * Hook to get current pay period
 */
export function useCurrentPayPeriod() {
  const [payPeriod, setPayPeriod] = useState<PayPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPayPeriod() {
      try {
        setLoading(true);
        const data = await getCurrentPayPeriod();
        setPayPeriod(data);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching pay period:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPayPeriod();
  }, []);

  return { payPeriod, loading, error };
}

/**
 * Hook to get all Aura summaries (for payroll)
 */
export function useAllAuraSummaries() {
  const [summaries, setSummaries] = useState<AuraSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllAuraSummaries();
      setSummaries(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching all Aura summaries:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('all_aura_summaries')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'aura_summary'
        },
        (payload) => {
          console.log('Aura summary change detected:', payload);
          fetchSummaries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSummaries]);

  return { summaries, loading, error, refetch: fetchSummaries };
}

/**
 * Hook for task operations
 */
export function useAuraTaskOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (task: Partial<AuraTask>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await createAuraTask(task);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (taskId: string, updates: Partial<AuraTask>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await updateAuraTask(taskId, updates);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const complete = useCallback(async (
    taskId: string,
    notes?: string,
    photos?: string[]
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await completeTask(taskId, notes, photos);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const finalize = useCallback(async (
    taskId: string,
    actualHours: number,
    qualityRating: number,
    reworkHours: number = 0,
    notes?: string,
    finalizedBy?: string
  ) => {
    try {
      setLoading(true);
      setError(null);
      const result = await finalizeTask(
        taskId,
        actualHours,
        qualityRating,
        reworkHours,
        notes,
        finalizedBy
      );
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (taskId: string) => {
    try {
      setLoading(true);
      setError(null);
      await deleteAuraTask(taskId);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    create,
    update,
    complete,
    finalize,
    remove,
    loading,
    error
  };
}