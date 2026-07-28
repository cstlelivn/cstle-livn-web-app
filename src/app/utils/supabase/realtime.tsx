import { createClient } from './client';

// Realtime broadcast channels for WebSocket updates
// This uses Supabase Broadcast (not Postgres Changes) so it works with KV store

const CHANNEL_PREFIX = 'cstle-livn';

export type RealtimeEvent = 
  | { type: 'project:created'; data: any }
  | { type: 'project:updated'; data: any }
  | { type: 'project:deleted'; data: { id: number } }
  | { type: 'task:created'; data: any }
  | { type: 'task:updated'; data: any }
  | { type: 'task:deleted'; data: { id: number } }
  | { type: 'team:created'; data: any }
  | { type: 'team:updated'; data: any }
  | { type: 'team:deleted'; data: { id: number } }
  | { type: 'vendor:created'; data: any }
  | { type: 'vendor:updated'; data: any }
  | { type: 'vendor:deleted'; data: { id: number } }
  | { type: 'client:created'; data: any }
  | { type: 'client:updated'; data: any }
  | { type: 'client:deleted'; data: { id: number } }
  | { type: 'lead:created'; data: any }
  | { type: 'lead:updated'; data: any }
  | { type: 'lead:deleted'; data: { id: number } }
  | { type: 'inventory:created'; data: any }
  | { type: 'inventory:updated'; data: any }
  | { type: 'inventory:deleted'; data: { id: number } }
  | { type: 'transaction:created'; data: any }
  | { type: 'transaction:updated'; data: any }
  | { type: 'transaction:deleted'; data: { id: number } }
  | { type: 'activity:created'; data: any }
  | { type: 'qc_review:created'; data: any }
  | { type: 'qc_review:updated'; data: any }
  | { type: 'phase_qc:created'; data: any }
  | { type: 'phase_qc:updated'; data: any };

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

/**
 * Subscribe to realtime updates for a specific resource type
 * Uses Supabase Broadcast (WebSockets) - works with KV store
 */
export function subscribeToResource(
  resource: 'projects' | 'tasks' | 'team' | 'vendors' | 'clients' | 'leads' | 'inventory' | 'transactions' | 'activities' | 'qc_reviews' | 'phase_qc',
  handler: (event: RealtimeEvent) => void
): RealtimeSubscription {
  const supabase = createClient();
  const channelName = `${CHANNEL_PREFIX}:${resource}`;
  
  // console.log(`📡 Subscribing to realtime channel: ${channelName}`);
  
  const channel = supabase
    .channel(channelName, {
      config: {
        broadcast: { self: true }, // Receive own broadcasts for immediate feedback
      },
    })
    .on('broadcast', { event: '*' }, ({ payload }) => {
      // console.log(`📨 Received realtime event:`, payload);
      handler(payload as RealtimeEvent);
    })
    .subscribe();

  return {
    unsubscribe: () => {
      // console.log(`🔌 Unsubscribing from ${channelName}`);
      channel.unsubscribe();
    },
  };
}

/**
 * Broadcast a realtime event to all subscribers
 * Call this from the frontend after successful API updates
 */
export async function broadcastEvent(
  resource: 'projects' | 'tasks' | 'team' | 'vendors' | 'clients' | 'leads' | 'inventory' | 'transactions' | 'activities' | 'qc_reviews' | 'phase_qc',
  event: RealtimeEvent
): Promise<void> {
  const supabase = createClient();
  const channelName = `${CHANNEL_PREFIX}:${resource}`;
  
  const channel = supabase.channel(channelName);
  
  await channel.send({
    type: 'broadcast',
    event: event.type,
    payload: event,
  });
}
