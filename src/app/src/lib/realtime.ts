import { createClient } from '../../utils/supabase/client.tsx';
import type { RealtimeChannel } from '@supabase/supabase-js';

const supabase = createClient();

type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type RealtimeStatus = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

// Track realtime connection status
let hasLoggedRealtimeStatus = false;

/**
 * Subscribe to Postgres changes on a table via Supabase Realtime
 * Returns an unsubscribe function to clean up on unmount
 * 
 * @param key - Unique key for this subscription (e.g., 'team_members', 'projects')
 * @param table - Database table name to subscribe to
 * @param event - Type of event to listen for (INSERT, UPDATE, DELETE, or *)
 * @param handler - Callback function to handle the event payload
 * @param filter - Optional Supabase filter (e.g., 'id=eq.123')
 * @returns Unsubscribe function to clean up the subscription
 */
export function subscribeTable(
  key: string,
  table: string,
  event: ChangeEvent,
  handler: (payload: any) => void,
  filter?: string
): () => void {
  const channelName = `${key}:${table}`;
  
  let channel: RealtimeChannel;
  
  if (filter) {
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
          filter,
        },
        handler
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !hasLoggedRealtimeStatus) {
          hasLoggedRealtimeStatus = true;
          console.log('✅ Realtime WebSockets Connected - Live updates enabled');
        } else if (status === 'CHANNEL_ERROR' && !hasLoggedRealtimeStatus) {
          hasLoggedRealtimeStatus = true;
          console.warn(
            '⚠️  Realtime Setup Required\n' +
            '   → Run /src/db/enable-realtime.sql in your Supabase SQL Editor\n' +
            '   → App will work normally but changes require manual refresh\n' +
            '   → See documentation: /src/db/REALTIME_SETUP.md'
          );
        }
      });
  } else {
    channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table,
        },
        handler
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED' && !hasLoggedRealtimeStatus) {
          hasLoggedRealtimeStatus = true;
          console.log('✅ Realtime WebSockets Connected - Live updates enabled');
        } else if (status === 'CHANNEL_ERROR' && !hasLoggedRealtimeStatus) {
          hasLoggedRealtimeStatus = true;
          console.warn(
            '⚠️  Realtime Setup Required\n' +
            '   → Run /src/db/enable-realtime.sql in your Supabase SQL Editor\n' +
            '   → App will work normally but changes require manual refresh\n' +
            '   → See documentation: /src/db/REALTIME_SETUP.md'
          );
        }
      });
  }

  return () => {
    channel.unsubscribe();
  };
}

/**
 * Subscribe to multiple events on the same table
 * Useful for listening to INSERT, UPDATE, DELETE simultaneously
 */
export function subscribeTableMulti(
  key: string,
  table: string,
  handlers: {
    onInsert?: (payload: any) => void;
    onUpdate?: (payload: any) => void;
    onDelete?: (payload: any) => void;
  },
  filter?: string,
  onStatus?: (status: RealtimeStatus) => void
): () => void {
  const channelName = `${key}:${table}`;
  let channel: RealtimeChannel = supabase.channel(channelName);
  const config = (event: ChangeEvent) => ({
    event,
    schema: 'public' as const,
    table,
    ...(filter ? { filter } : {}),
  });

  if (handlers.onInsert) {
    channel = channel.on('postgres_changes', config('INSERT'), handlers.onInsert);
  }
  if (handlers.onUpdate) {
    channel = channel.on('postgres_changes', config('UPDATE'), handlers.onUpdate);
  }
  if (handlers.onDelete) {
    channel = channel.on('postgres_changes', config('DELETE'), handlers.onDelete);
  }

  channel.subscribe((status) => {
    const typedStatus = status as RealtimeStatus;
    onStatus?.(typedStatus);
    if (status === 'SUBSCRIBED' && !hasLoggedRealtimeStatus) {
      hasLoggedRealtimeStatus = true;
      console.log('✅ Realtime WebSockets Connected - Live updates enabled');
    } else if (status === 'CHANNEL_ERROR' && !hasLoggedRealtimeStatus) {
      hasLoggedRealtimeStatus = true;
      console.warn(
        '⚠️  Realtime Setup Required\n' +
        '   → Run /src/db/enable-realtime.sql in your Supabase SQL Editor\n' +
        '   → App will work normally but changes require manual refresh\n' +
        '   → See documentation: /src/db/REALTIME_SETUP.md'
      );
    }
  });

  return () => {
    channel.unsubscribe();
  };
}
