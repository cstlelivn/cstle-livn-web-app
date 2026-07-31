import { useEffect, useState, useCallback } from 'react';
import { startSession, pauseSession, resumeSession, finishSession } from './api';
import {
  addPendingAction,
  removePendingAction,
  updatePendingAction,
  listPendingActions,
  setSessionOverlay,
  clearSessionOverlay,
  listSessionOverlays,
  mapLocalSessionKey,
  resolveLocalSessionKey,
  type PendingSessionAction,
  type LocalSessionOverlay,
} from '../../lib/offlineDb';

// This is offline support scoped specifically to the work-session timer --
// not a full offline app shell. The goal: a Start/Pause/Resume/Finish tap
// on a job site with no signal is never lost. It queues locally (with a
// client-generated idempotency key) and syncs automatically once back
// online; the RPCs it calls (20240016) are idempotent, so a retried or
// replayed action is always a safe no-op, never double-counted time.
//
// Actions that fail because the SERVER rejected them (wrong state, not
// your session, not assigned) are dropped, not retried -- retrying a
// rejection can't ever succeed. Actions that fail because the network
// itself is unreachable stay queued and get retried automatically.

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() {
  listeners.forEach((l) => l());
}
export function subscribeOfflineQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function isNetworkError(error: any): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const message = String(error?.message || error || '');
  return /fetch|network|timeout|offline/i.test(message);
}

function newId(): string {
  return (globalThis.crypto as any)?.randomUUID
    ? (globalThis.crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function overlayKey(taskId: string, teamMemberId: string) {
  return `${taskId}:${teamMemberId}`;
}

export interface SessionActionInput {
  type: 'start' | 'pause' | 'resume' | 'finish';
  taskId: string;
  teamMemberId: string;
  sessionId?: string; // real id, or `local:<key>` for an unsynced session
  notes?: string;
  delayReason?: string;
  blocker?: string;
}

// Main entry point for the UI -- always resolves (never throws) for a
// queued/offline outcome; throws only when the server has actively
// rejected the action (so the UI can show a real error, not a false
// "queued" success).
export async function queueSessionAction(input: SessionActionInput): Promise<void> {
  const nowIso = new Date().toISOString();

  if (input.type === 'start') {
    const localKey = newId();
    try {
      const session = await startSession(input.taskId, { clientEventId: localKey, clientEventAt: nowIso });
      await mapLocalSessionKey(localKey, session.id);
      notify();
      return;
    } catch (error: any) {
      if (!isNetworkError(error)) throw error;
      await addPendingAction({
        clientActionId: localKey,
        type: 'start',
        taskId: input.taskId,
        localSessionKey: localKey,
        clientEventAt: nowIso,
        createdAt: nowIso,
        retryCount: 0,
      });
      await setSessionOverlay({
        key: overlayKey(input.taskId, input.teamMemberId),
        localSessionKey: localKey,
        taskId: input.taskId,
        teamMemberId: input.teamMemberId,
        status: 'running',
        activeSeconds: 0,
        updatedAt: nowIso,
      });
      notify();
      return;
    }
  }

  // pause / resume / finish
  const sessionId = input.sessionId || '';
  const isLocal = sessionId.startsWith('local:');
  const localKey = isLocal ? sessionId.slice('local:'.length) : undefined;
  const resolvedRealId = isLocal ? await resolveLocalSessionKey(localKey!) : sessionId;

  const rpcCall = async (realId: string) => {
    if (input.type === 'pause') {
      return pauseSession(realId, { notes: input.notes, delayReason: input.delayReason, blocker: input.blocker }, { clientEventId: newId(), clientEventAt: nowIso });
    }
    if (input.type === 'resume') {
      return resumeSession(realId, { clientEventId: newId(), clientEventAt: nowIso });
    }
    return finishSession(realId, { notes: input.notes }, { clientEventId: newId(), clientEventAt: nowIso });
  };

  if (resolvedRealId) {
    try {
      await rpcCall(resolvedRealId);
      await clearSessionOverlay(overlayKey(input.taskId, input.teamMemberId));
      notify();
      return;
    } catch (error: any) {
      if (!isNetworkError(error)) throw error;
      // fall through to queue below
    }
  }

  // Either genuinely offline, or this session was itself created offline
  // and hasn't synced yet -- queue it and update the local overlay so the
  // UI reflects the action immediately regardless.
  const actionId = newId();
  await addPendingAction({
    clientActionId: actionId,
    type: input.type,
    sessionId: isLocal ? undefined : sessionId,
    localSessionKey: localKey,
    notes: input.notes,
    delayReason: input.delayReason,
    blocker: input.blocker,
    clientEventAt: nowIso,
    createdAt: nowIso,
    retryCount: 0,
  });

  const overlays = await listSessionOverlays();
  const existing = overlays.find((o) => o.key === overlayKey(input.taskId, input.teamMemberId));
  const prevActive = existing?.activeSeconds ?? 0;
  const prevUpdated = existing ? new Date(existing.updatedAt).getTime() : Date.now();
  const elapsedSincePrev = existing?.status === 'running' ? Math.max(0, Math.floor((Date.now() - prevUpdated) / 1000)) : 0;

  await setSessionOverlay({
    key: overlayKey(input.taskId, input.teamMemberId),
    localSessionKey: localKey || existing?.localSessionKey || newId(),
    taskId: input.taskId,
    teamMemberId: input.teamMemberId,
    status: input.type === 'pause' ? 'paused' : input.type === 'finish' ? 'finished' : 'running',
    activeSeconds: prevActive + elapsedSincePrev,
    updatedAt: nowIso,
    notes: input.notes ?? existing?.notes,
    delayReason: input.delayReason ?? existing?.delayReason,
    blocker: input.blocker ?? existing?.blocker,
  });
  notify();
}

// Merge server truth with any not-yet-synced local action for the same
// person+task, so the timer keeps showing the right thing even before the
// server has confirmed it.
export function effectiveSession(
  taskId: string,
  teamMemberId: string,
  realtimeSession: any | undefined,
  overlays: LocalSessionOverlay[]
): any | undefined {
  const overlay = overlays.find((o) => o.key === overlayKey(taskId, teamMemberId));
  if (!overlay) return realtimeSession;
  if (overlay.status === 'finished') return realtimeSession; // nothing open locally to show
  // A local overlay only exists while its action(s) haven't synced -- prefer
  // it over server truth (which would still show the pre-action state).
  return {
    id: `local:${overlay.localSessionKey}`,
    taskId: overlay.taskId,
    teamMemberId: overlay.teamMemberId,
    status: overlay.status,
    activeSeconds: overlay.activeSeconds,
    updatedAt: overlay.updatedAt,
    notes: overlay.notes,
    delayReason: overlay.delayReason,
    blocker: overlay.blocker,
    clockSuspect: false,
    isLocalOnly: true,
  };
}

export async function getPendingCount(): Promise<number> {
  const actions = await listPendingActions();
  return actions.length;
}

let flushing = false;

export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  flushing = true;
  try {
    const actions = await listPendingActions();
    for (const action of actions) {
      try {
        if (action.type === 'start') {
          const session = await startSession(action.taskId!, {
            clientEventId: action.clientActionId,
            clientEventAt: action.clientEventAt,
          });
          await mapLocalSessionKey(action.clientActionId, session.id);
          await removePendingAction(action.clientActionId);
          continue;
        }

        let realId = action.sessionId;
        if (!realId && action.localSessionKey) {
          realId = await resolveLocalSessionKey(action.localSessionKey);
        }
        if (!realId) {
          // The session this action depends on hasn't synced (its own
          // 'start' is still queued, or was itself dropped) -- nothing to
          // apply this against yet. Leave it queued; a later pass will
          // pick it up once the start syncs, or it'll be cleaned up if the
          // start was rejected.
          continue;
        }

        if (action.type === 'pause') {
          await pauseSession(realId, { notes: action.notes, delayReason: action.delayReason, blocker: action.blocker }, { clientEventId: action.clientActionId, clientEventAt: action.clientEventAt });
        } else if (action.type === 'resume') {
          await resumeSession(realId, { clientEventId: action.clientActionId, clientEventAt: action.clientEventAt });
        } else if (action.type === 'finish') {
          await finishSession(realId, { notes: action.notes }, { clientEventId: action.clientActionId, clientEventAt: action.clientEventAt });
        }
        await removePendingAction(action.clientActionId);
      } catch (error: any) {
        if (isNetworkError(error)) {
          // Still offline (or flaky) -- stop this pass, retry the whole
          // queue next cycle rather than racing ahead out of order.
          break;
        }
        // The server actively rejected this action (stale state, task
        // reassigned out from under it, etc.) -- retrying can't help.
        // Drop it and clear any overlay so the UI stops showing a stuck
        // local-only state.
        console.warn('Dropping rejected offline work-session action:', action, error?.message);
        await removePendingAction(action.clientActionId);
      }
    }
  } finally {
    flushing = false;
    // Clear overlays for anything that's no longer referenced by a pending
    // action -- realtime data is authoritative again for those.
    const remaining = await listPendingActions();
    const stillPendingKeys = new Set(remaining.map((a) => a.localSessionKey || a.sessionId));
    const overlays = await listSessionOverlays();
    for (const o of overlays) {
      if (!stillPendingKeys.has(o.localSessionKey)) {
        await clearSessionOverlay(o.key);
      }
    }
    notify();
  }
}

let syncStarted = false;
export function startOfflineSync() {
  if (syncStarted || typeof window === 'undefined') return;
  syncStarted = true;
  window.addEventListener('online', () => { flushQueue(); });
  setInterval(() => { flushQueue(); }, 30000);
  flushQueue();
}

// React hook: current local overlays (not-yet-synced session state) and how
// many actions are still waiting to sync, re-rendering whenever the queue
// changes (an action is queued, synced, or dropped).
export function useOfflineOverlay() {
  const [overlays, setOverlaysState] = useState<LocalSessionOverlay[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  const refresh = useCallback(async () => {
    const [ov, actions] = await Promise.all([listSessionOverlays(), listPendingActions()]);
    setOverlaysState(ov);
    setPendingCount(actions.length);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribeOfflineQueue(refresh);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      unsub();
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh]);

  return { overlays, pendingCount, isOnline };
}
