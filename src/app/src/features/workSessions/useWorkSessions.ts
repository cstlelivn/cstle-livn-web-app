import { useEffect, useRef, useState, useCallback } from 'react';
import { listAllSessions } from './api';
import { subscribeTableMulti } from '../../lib/realtime';

function transformSessionRow(row: any) {
  return {
    id: row.id,
    taskId: row.task_id,
    projectId: row.project_id,
    teamMemberId: row.team_member_id,
    status: row.status,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    activeSeconds: row.active_seconds,
    notes: row.notes,
    delayReason: row.delay_reason,
    blocker: row.blocker,
    qcResult: row.qc_result,
    rework: row.rework,
    completionStatus: row.completion_status,
    clockSuspect: row.clock_suspect,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// RLS decides scope here, same as the initial fetch: an Associate only ever
// gets their own sessions back (start/pause/resume/finish on someone else's
// task never shows up), Manager+/QC/Accountant get everyone's.
export function useWorkSessions(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT' || p.eventType === 'UPDATE') {
          m.set(p.new.id, transformSessionRow(p.new));
        }
        if (p.eventType === 'DELETE') {
          m.delete(p.old.id);
        }
      }
      q.current = [];
      return [...m.values()].sort(
        (a, b) => (b.startedAt || '').localeCompare(a.startedAt || '')
      );
    });
    raf.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await listAllSessions();
      setRows(data);
    } catch (error) {
      // realtime/poll fallback will retry
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
        const data = await listAllSessions();
        setRows(data);
        setLoading(false);

        off = subscribeTableMulti('task_work_sessions', 'task_work_sessions', {
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
        });
      } catch (error) {
        setLoading(false);
      }
    })();

    // Same rationale as useTasks.ts: postgres_changes delivery isn't
    // guaranteed, so a background re-fetch is the correctness backstop, not
    // the primary update path.
    const poll = setInterval(() => {
      listAllSessions().then(setRows).catch(() => {});
    }, 30000);

    return () => {
      off();
      if (raf.current) cancelAnimationFrame(raf.current);
      clearInterval(poll);
    };
  }, [flush, enabled]);

  return { workSessions: rows, loading, refresh };
}
