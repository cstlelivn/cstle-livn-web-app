import { useEffect, useRef, useState, useCallback } from 'react';
import { listTeamMembers } from './api';
import { subscribeTableMulti } from '../../lib/realtime';
import { registerSafetySync } from '../../lib/scopedBroadcast';

// Transform database row to match TeamMember format (snake_case to camelCase)
function transformTeamMemberRow(dbMember: any) {
  return {
    ...dbMember,
    // Map snake_case to camelCase for frontend compatibility. Nullable
    // string/array fields are defaulted here so every consumer (initials,
    // search filters, specialties.join, etc.) doesn't need its own guard --
    // a null `name`/`role`/`specialties` from a partially-set-up account was
    // crashing Team Management, Edit Team Member, and Task Management.
    name: dbMember.name ?? "",
    role: dbMember.role ?? "",
    email: dbMember.email ?? "",
    phone: dbMember.phone ?? "",
    specialties: dbMember.specialties ?? [],
    auraRating: dbMember.aura_rating ?? dbMember.auraRating ?? 0,
    authUserId: dbMember.auth_user_id ?? dbMember.authUserId ?? null,
    tasksCompleted: dbMember.tasks_completed ?? dbMember.tasksCompleted ?? 0,
    tasksOnTime: dbMember.tasks_on_time ?? dbMember.tasksOnTime ?? 0,
    createdAt: dbMember.created_at ?? dbMember.createdAt,
    updatedAt: dbMember.updated_at ?? dbMember.updatedAt,
  };
}

export function useTeamMembers(enabled = true) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const q = useRef<any[]>([]);
  const raf = useRef<number | null>(null);

  const flush = useCallback(() => {
    setRows((curr) => {
      const m = new Map(curr.map((r) => [r.id, r]));
      for (const p of q.current) {
        if (p.eventType === 'INSERT') {
          console.log('🔵 [useTeamMembers] INSERT event, raw data:', p.new);
          const transformed = transformTeamMemberRow(p.new);
          console.log('🔵 [useTeamMembers] Transformed INSERT data:', transformed);
          m.set(p.new.id, transformed);
        }
        if (p.eventType === 'UPDATE') {
          console.log('🔵 [useTeamMembers] UPDATE event, raw data:', p.new);
          const existing = m.get(p.new.id) || {};
          const transformed = transformTeamMemberRow({ ...existing, ...p.new });
          console.log('🔵 [useTeamMembers] Transformed UPDATE data:', { existing, new: p.new, result: transformed });
          m.set(p.new.id, transformed);
        }
        if (p.eventType === 'DELETE') {
          m.delete(p.old.id);
        }
      }
      q.current = [];
      return [...m.values()].sort(
        (a, b) => (a.name || '').localeCompare(b.name || '')
      );
    });
    raf.current = null;
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      setLoading(true);
      const data = await listTeamMembers();
      // Transform snake_case to camelCase for frontend compatibility
      const transformed = data.map(transformTeamMemberRow);
      setRows(transformed);
    } catch (error) {
      // Error refreshing team members
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

    // Unlike useTasks/useProjects/useTaskAssignees, this hook previously had
    // no reconnect/visibility recovery at all -- if both the initial fetch
    // and its one retry lost the sign-in session-hydration race, the team
    // list stayed empty for the rest of the tab's life (nothing else ever
    // triggered another attempt), which is exactly the "list is blank until
    // I reload a few times" symptom this was supposed to fix. Reproduced
    // live: teamMembers stayed `[]` indefinitely after a fresh load even
    // though the same query succeeded when run manually a moment later.
    const recover = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      listTeamMembers().then((data) => setRows(data.map(transformTeamMemberRow))).catch(() => {});
    };

    (async () => {
      try {
        let data;
        try {
          data = await listTeamMembers();
        } catch (firstError) {
          // Same sign-in startup race as tasks/projects -- one retry
          // instead of silently coming up empty until a manual reload.
          await new Promise((resolve) => setTimeout(resolve, 1200));
          data = await listTeamMembers();
        }
        // Transform snake_case to camelCase for frontend compatibility
        const transformed = data.map(transformTeamMemberRow);
        setRows(transformed);
        setLoading(false);

        // Subscribe to realtime updates
        off = subscribeTableMulti(
          'team_members',
          'team_members',
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

  return { teamMembers: rows, loading, refresh };
}
