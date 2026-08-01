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
          }
        );
      } catch (error) {
        setLoading(false);
      }
    })();

    // Safety net: postgres_changes broadcasts are usually near-instant, but
    // aren't guaranteed delivery -- a dropped/delayed message on Supabase's
    // side (separate from this socket's own connected/disconnected state,
    // which gives no signal when a message is silently missed) would
    // otherwise leave this tab showing stale task status/QC state
    // indefinitely, with no visible way to know something changed
    // elsewhere. This is the app's only correctness backstop for that.
    // Was 30s -- a full table re-fetch every 30s in every open tab, all day,
    // turned out to be the actual driver of a real Supabase egress overage
    // (245% over the free-tier bandwidth cap), since realtime already
    // handles the normal case near-instantly. 5 minutes is still fast
    // enough for a backstop that only matters when a message was silently
    // dropped, which is rare.
    const poll = setInterval(() => {
      listTasks().then(setRows).catch(() => {});
    }, 300000);

    return () => {
      off();
      if (raf.current) cancelAnimationFrame(raf.current);
      clearInterval(poll);
    };
  }, [flush, enabled]);

  return { tasks: rows, loading, refresh };
}