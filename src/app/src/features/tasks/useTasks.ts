import { useEffect, useRef, useState, useCallback } from 'react';
import { listTasks } from './api';
import { subscribeTableMulti } from '../../lib/realtime';

// Transform database row to match Task format (same as in api.ts)
function transformTaskRow(dbTask: any) {
  return {
    ...dbTask,
    // Map project_id to projectId for frontend compatibility
    projectId: dbTask.project_id || dbTask.projectId,
    // Map assignee_id to assignee for frontend compatibility
    assignee: dbTask.assignee_id || dbTask.assignee || '',
    dueDate: dbTask.due_date || dbTask.dueDate || '',
    completedDate: dbTask.completed_date || dbTask.completedDate || '',
    startedAt: dbTask.started_at || dbTask.startedAt || '',
    submittedAt: dbTask.submitted_at || dbTask.submittedAt || '',
    reviewFeedback: dbTask.review_feedback || dbTask.reviewFeedback || '',
    ratingMetrics: dbTask.rating_metrics || dbTask.ratingMetrics,
    createdAt: dbTask.created_at || dbTask.createdAt,
  };
}

export function useTasks(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT') {
          console.log('🔵 [useTasks] INSERT event, raw data:', p.new);
          const transformed = transformTaskRow(p.new);
          console.log('🔵 [useTasks] Transformed INSERT data:', transformed);
          m.set(p.new.id, transformed);
        }
        if (p.eventType === 'UPDATE') {
          console.log('🔵 [useTasks] UPDATE event, raw data:', p.new);
          const existing = m.get(p.new.id) || {};
          const transformed = transformTaskRow({ ...existing, ...p.new });
          console.log('🔵 [useTasks] Transformed UPDATE data:', { existing, new: p.new, result: transformed });
          m.set(p.new.id, transformed);
        }
        if (p.eventType === 'DELETE') {
          m.delete(p.old.id);
        }
      }
      q.current = [];
      return [...m.values()].sort(
        (a, b) => (b.created_at || b.createdAt || '').localeCompare(a.created_at || a.createdAt || '')
      );
    });
    raf.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await listTasks();
      // API already transforms the data, don't transform again
      setRows(data);
    } catch (error) {
      // Error refreshing tasks
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
    let subscribedOnce = false;

    const recover = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      listTasks().then(setRows).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') recover();
    };

    (async () => {
      try {
        const data = await listTasks();
        // API already transforms the data, don't transform again
        setRows(data);
        setLoading(false);

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'tasks',
          'tasks',
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
          },
          undefined,
          (status) => {
            if (status !== 'SUBSCRIBED') return;
            if (subscribedOnce) recover();
            subscribedOnce = true;
          }
        );
      } catch (error) {
        setLoading(false);
      }
    })();

    window.addEventListener('online', recover);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      off();
      if (raf.current) cancelAnimationFrame(raf.current);
      window.removeEventListener('online', recover);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [flush, enabled]);

  return { tasks: rows, loading, refresh };
}
