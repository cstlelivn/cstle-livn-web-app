import { useEffect, useRef, useState, useCallback } from 'react';
import { listActiveTaskAssignees } from './api';
import { subscribeTableMulti } from '../../lib/realtime';
import { registerSafetySync } from '../../lib/scopedBroadcast';

function transformAssigneeRow(row: any) {
  return {
    id: row.id,
    taskId: row.task_id,
    teamMemberId: row.team_member_id,
    assignedBy: row.assigned_by,
    assignedAt: row.assigned_at,
    unassignedAt: row.unassigned_at,
    isActive: row.is_active,
  };
}

// Fetches every currently-active task<->person assignment company-wide (RLS
// scopes this the same way it scopes tasks -- everyone can see who's
// assigned to what) and keeps it live via realtime, mirroring useTasks.ts's
// pattern so components can look up "who's assigned to task X" without an
// N+1 query per task.
export function useTaskAssignees(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') {
          const transformed = transformAssigneeRow(p.new);
          if (transformed.isActive) {
            m.set(transformed.id, transformed);
          } else {
            m.delete(transformed.id);
          }
        }
        if (p.eventType === 'DELETE') {
          m.delete(p.old.id);
        }
      }
      q.current = [];
      return [...m.values()];
    });
    raf.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await listActiveTaskAssignees();
      setRows(data);
    } catch (error) {
      // swallow -- realtime/reconnect recovery will retry
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
      listActiveTaskAssignees().then(setRows).catch(() => {});
    };

    (async () => {
      try {
        let data;
        try {
          data = await listActiveTaskAssignees();
        } catch (firstError) {
          // Same sign-in startup race as tasks/projects -- one retry
          // instead of silently coming up empty until a manual reload.
          await new Promise((resolve) => setTimeout(resolve, 1200));
          data = await listActiveTaskAssignees();
        }
        setRows(data);
        setLoading(false);

        off = subscribeTableMulti('task_assignees', 'task_assignees', {
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
        }, undefined, (status) => {
          if (status !== 'SUBSCRIBED') return;
          if (subscribedOnce) recover();
          subscribedOnce = true;
        });
        stopSafetySync = registerSafetySync(recover);
      } catch (error) {
        setLoading(false);
      }
    })();

    return () => {
      off();
      stopSafetySync();
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [flush, enabled]);

  return { taskAssignees: rows, loading, refresh };
}

// Lookup helper: which team_member ids are actively assigned to a task.
export function assigneeIdsForTask(taskAssignees: any[], taskId: string | number): string[] {
  return taskAssignees
    .filter((a) => String(a.taskId) === String(taskId))
    .map((a) => String(a.teamMemberId));
}
