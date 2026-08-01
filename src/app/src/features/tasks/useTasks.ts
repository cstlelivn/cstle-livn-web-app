import { useEffect, useRef, useState, useCallback } from 'react';
import { getTask, listTasks } from './api';
import { registerSafetySync, subscribeScopedInvalidations } from '../../lib/scopedBroadcast';
import { mergeEntityById, removeEntityById } from '../../lib/entityCache';

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

export function useTasks(enabled = true, role = '', userId = '') {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const targetedFetches = useRef(new Set<string>());

  const mergeTask = useCallback((task: any) => {
    const transformed = transformTaskRow(task);
    setRows((curr) => mergeEntityById(curr, transformed,
        (a, b) => (b.updated_at || b.createdAt || '').localeCompare(a.updated_at || a.createdAt || '')
      ));
  }, []);

  const removeTask = useCallback((id: string | number) => {
    setRows((curr) => removeEntityById(curr, id));
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
    let stopSafetySync = () => {};
    let subscribedOnce = false;

    const recover = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      listTasks().then(setRows).catch(() => {});
    };

    (async () => {
      try {
        const data = await listTasks();
        // API already transforms the data, don't transform again
        setRows(data);
        setLoading(false);

        off = subscribeScopedInvalidations(
          role,
          userId,
          (event) => {
            if (event.entity !== 'task') return;
            if (event.operation === 'DELETE') {
              removeTask(event.id);
              return;
            }
            if (targetedFetches.current.has(event.id)) return;
            targetedFetches.current.add(event.id);
            getTask(event.id)
              .then((task) => task ? mergeTask(task) : removeTask(event.id))
              .catch(() => {})
              .finally(() => targetedFetches.current.delete(event.id));
          },
          (status) => {
            if (status !== 'SUBSCRIBED') return;
            if (subscribedOnce) recover();
            subscribedOnce = true;
          }
        );
        stopSafetySync = registerSafetySync(recover);
      } catch (error) {
        setLoading(false);
      }
    })();

    return () => {
      off();
      stopSafetySync();
    };
  }, [enabled, mergeTask, removeTask, role, userId]);

  return { tasks: rows, loading, refresh, mergeTask, removeTask };
}
