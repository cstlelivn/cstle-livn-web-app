import { useEffect, useState } from 'react';

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
