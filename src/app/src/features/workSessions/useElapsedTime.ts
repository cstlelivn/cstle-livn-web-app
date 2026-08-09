import { useEffect, useState } from 'react';
import { dayKeyInOrgTz, formatShortDateInOrgTz } from '../../lib/timezone';

// Live-ticking elapsed time for a session, computed purely client-side
// (Date.now() against the session's own numbers) so it keeps counting even
// with no network at all -- this is a display-only preview, never the
// number that gets saved. The authoritative active_seconds is always
// recomputed server-side, from the actual event timestamps, at the next
// pause/resume/finish call (see the RPCs in 20240016) -- so a session that
// started offline and syncs later will self-correct to the true value the
// moment it's next paused or finished, even if this live preview drifted a
// few seconds in the meantime.
export function useElapsedTime(session: { status: string; activeSeconds: number; updatedAt: string } | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!session || session.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session?.status, session?.updatedAt]);

  if (!session) return 0;
  if (session.status !== 'running') return session.activeSeconds;

  const anchor = new Date(session.updatedAt).getTime();
  const liveExtra = Math.max(0, Math.floor((now - anchor) / 1000));
  return session.activeSeconds + liveExtra;
}

/** Compact "2h 12m" / "45m" style duration, for summaries where the h:mm:ss stopwatch format reads too dense. */
export function formatDurationCompact(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

// Groups a task's sessions (any team member's, any status) by the job-site
// calendar day they started on, summing each day's active_seconds -- "you
// spent 2h12m yesterday and 2h05m today, 4h17m total" instead of one opaque
// running total. A session's stored active_seconds is only as fresh as its
// last pause/resume/finish (a still-running session's live extra seconds
// aren't reflected here), which is an acceptable approximation for a
// summary -- the live-ticking total shown elsewhere already covers "right
// now" precisely.
export function groupSessionsByDay(
  sessions: { startedAt: string; activeSeconds: number }[]
): { dayKey: string; label: string; seconds: number }[] {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    if (!s.startedAt) continue;
    const key = dayKeyInOrgTz(new Date(s.startedAt));
    byDay.set(key, (byDay.get(key) ?? 0) + (s.activeSeconds || 0));
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dayKey, seconds]) => ({ dayKey, label: formatShortDateInOrgTz(new Date(`${dayKey}T12:00:00`)), seconds }));
}

export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
  return `${m}:${String(sec).padStart(2, '0')}`;
}
