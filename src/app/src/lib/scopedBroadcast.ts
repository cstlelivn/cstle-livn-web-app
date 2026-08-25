import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '../../utils/supabase/client.tsx';
import { recordChannelClosed, recordChannelOpened } from './syncMetrics';

export interface EntityInvalidation {
  entity: 'task' | 'project';
  id: string;
  project_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  updated_at: string;
}

type ChannelStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';
type Listener = (event: EntityInvalidation) => void;
type StatusListener = (status: ChannelStatus) => void;

interface SharedChannel {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
  statusListeners: Set<StatusListener>;
}

const supabase = createClient();
const channels = new Map<string, SharedChannel>();
const broadRoles = new Set(['Super Admin', 'Admin', 'Manager', 'Accountant']);
const safetySyncCallbacks = new Set<() => void>();
let safetySyncTimer: number | null = null;

function runSafetySync() {
  if (document.visibilityState !== 'visible' || !navigator.onLine) return;
  for (const callback of safetySyncCallbacks) callback();
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') runSafetySync();
}

function topicFor(role: string, userId: string) {
  return broadRoles.has(role) ? 'organization:cstle' : `associate:${userId}`;
}

export function subscribeScopedInvalidations(
  role: string,
  userId: string,
  listener: Listener,
  onStatus?: StatusListener
) {
  const topic = topicFor(role, userId);
  let shared = channels.get(topic);

  if (!shared) {
    const listeners = new Set<Listener>();
    const statusListeners = new Set<StatusListener>();
    const channel = supabase
      .channel(topic, { config: { private: true, broadcast: { self: false } } })
      .on('broadcast', { event: 'entity_changed' }, ({ payload }) => {
        const event = payload as EntityInvalidation;
        for (const activeListener of listeners) activeListener(event);
      })
      .subscribe((status) => {
        for (const activeListener of statusListeners) activeListener(status as ChannelStatus);
      });
    shared = { channel, listeners, statusListeners };
    channels.set(topic, shared);
    recordChannelOpened();
  }

  shared.listeners.add(listener);
  if (onStatus) shared.statusListeners.add(onStatus);

  return () => {
    const active = channels.get(topic);
    if (!active) return;
    active.listeners.delete(listener);
    if (onStatus) active.statusListeners.delete(onStatus);
    if (active.listeners.size === 0) {
      channels.delete(topic);
      supabase.removeChannel(active.channel);
      recordChannelClosed();
    }
  };
}

// One application-wide recovery scheduler. Feature stores register callbacks,
// but only this module owns the timer and browser event listeners.
export function registerSafetySync(callback: () => void) {
  safetySyncCallbacks.add(callback);
  if (safetySyncCallbacks.size === 1) {
    safetySyncTimer = window.setInterval(runSafetySync, 15 * 60 * 1000);
    window.addEventListener('online', runSafetySync);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }
  return () => {
    safetySyncCallbacks.delete(callback);
    if (safetySyncCallbacks.size === 0) {
      if (safetySyncTimer !== null) window.clearInterval(safetySyncTimer);
      safetySyncTimer = null;
      window.removeEventListener('online', runSafetySync);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };
}
