import { useEffect, useState, useCallback } from 'react';
import { listDeclinedAssignments } from './api';
import { useTaskAssignees } from './useTaskAssignees';
import { subscribeTableMulti } from '../../lib/realtime';

// Surfaces tasks that were declined and still have nobody active assigned --
// i.e. a manager/supervisor needs to step in and reassign. Resolves itself
// automatically once someone new is assigned (the task then has an active
// row again and drops out of this list), no separate "resolved" flag needed.
export function useDeclinedTasksNeedingReassignment(tasks: any[], enabled = true) {
  const { taskAssignees: activeAssignees } = useTaskAssignees(enabled);
  const [declined, setDeclined] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const rows = await listDeclinedAssignments();
      setDeclined(rows);
    } catch {
      // swallow -- this is a supplementary notification, not core data
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
    let subscribedOnce = false;
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) refresh();
    };
    const off = subscribeTableMulti(
      'declined-task-assignments',
      'task_assignees',
      {
        onInsert: refresh,
        onUpdate: refresh,
        onDelete: refresh,
      },
      undefined,
      (status) => {
        if (status !== 'SUBSCRIBED') return;
        if (subscribedOnce) refresh();
        subscribedOnce = true;
      }
    );
    window.addEventListener('online', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      off();
      window.removeEventListener('online', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  if (!enabled) return { items: [], refresh };

  const activeTaskIds = new Set(activeAssignees.map((a: any) => String(a.taskId)));
  const seenTaskIds = new Set<string>();
  const items: any[] = [];

  for (const row of declined) {
    const taskId = String(row.taskId);
    if (activeTaskIds.has(taskId) || seenTaskIds.has(taskId)) continue;
    const task = tasks.find((t: any) => String(t.id) === taskId);
    if (!task || task.status === 'Completed') continue;
    seenTaskIds.add(taskId);
    items.push({ ...row, task });
  }

  return { items, refresh };
}
